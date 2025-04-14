import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import CustomAlert from '../components/CustomAlert';

const ViewTestResponses = () => {
  const [roomNumber, setRoomNumber] = useState("");
  const [responses, setResponses] = useState([]);
  const [hasSubjective, setHasSubjective] = useState(false);
  const [error, setError] = useState(null);
  const [testInfo, setTestInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', title: '', message: '' });

  const formatTo12Hour = (time24) => {
    try {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      return time24;
    }
  };

  const fetchTestResponses = async () => {
    if (!roomNumber.trim()) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'Please enter a room number'
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setTestInfo(null);
    setResponses([]);

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setAlert({
          show: true,
          type: 'error',
          title: 'Authentication Error',
          message: 'Please login again'
        });
        return;
      }
      
      const res = await fetch(`https://exam-server-gecv.onrender.com/api/get-test-responses/${roomNumber}`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch responses");
      }

      if (data.success) {
        // Ensure each response has a valid score object
        const processedResponses = data.responses.map(response => ({
          ...response,
          score: response.score || {
            final: 0,
            correct: 0,
            incorrect: 0,
            marksPerCorrect: 0,
            marksForCorrect: 0,
            marksDeducted: 0
          },
          answers: response.answers || {}
        }));
        
        setResponses(processedResponses);
        setHasSubjective(data.hasSubjective);
        setTestInfo(data.testDetails);
      } else {
        setAlert({
          show: true,
          type: 'error',
          title: 'Error',
          message: data.message
        });
      }
    } catch (error) {
      console.error("Error fetching responses:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: error.message || "Failed to fetch responses"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResponsesAsPDF = () => {
    if (!responses.length || !testInfo) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No responses available to download'
      });
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Add header with logo and title
      doc.setFontSize(24);
      doc.setTextColor(41, 128, 185); // Blue color
      doc.text('GEC Vaishali Examination System', 105, 20, { align: 'center' });
      
      // Add subtitle
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('Test Response Report', 105, 30, { align: 'center' });
      
      // Add footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Designed and Developed by Rahul Raj', 105, 285, { align: 'center' });

      // Add test information
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Test Information', 14, 45);
      doc.setFontSize(12);
      
      // Test info in a table
      const testInfoData = [
        ['Room Number', testInfo.roomNumber || 'Not Available'],
        ['Date', testInfo.date || 'Not Available'],
        ['Time', formatTo12Hour(testInfo.time) || 'Not Available'],
        ['Duration', `${testInfo.duration || 0} minutes`],
        ['Marks Per Correct', `${testInfo.marksPerCorrect || 0} marks`],
        ['Negative Marking', `${testInfo.negativeMarking || 0} marks per wrong answer`]
      ];
      
      doc.autoTable({
        startY: 50,
        head: [['Field', 'Value']],
        body: testInfoData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 }
      });

      // Sort responses by score
      const sortedResponses = [...responses].sort((a, b) => (b.score?.final || 0) - (a.score?.final || 0));

      // Add responses
      sortedResponses.forEach((response, index) => {
        if (index > 0) doc.addPage();
        
        const startY = index === 0 ? doc.previousAutoTable.finalY + 20 : 20;
        
        // Student info
        doc.setFontSize(16);
        doc.setTextColor(41, 128, 185);
        doc.text(`Student ${index + 1}`, 14, startY);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        const studentInfo = [
          ['Name', response.studentName || 'Not Available'],
          ['Registration', response.regNo || 'Not Available'],
          ['Branch', response.branch || 'Not Available']
        ];
        
        doc.autoTable({
          startY: startY + 10,
          head: [['Field', 'Value']],
          body: studentInfo,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 10 }
        });

        // Score information
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text('Score Information', 14, doc.previousAutoTable.finalY + 20);
        
        const scoreInfo = [
          ['Final Score', response.score?.final || 0],
          ['Correct Answers', response.score?.correct || 0],
          ['Incorrect Answers', response.score?.incorrect || 0],
          ['Marks Per Correct', response.score?.marksPerCorrect || 0],
          ['Marks Awarded', response.score?.marksForCorrect || 0],
          ['Marks Deducted', response.score?.marksDeducted || 0]
        ];
        
        doc.autoTable({
          startY: doc.previousAutoTable.finalY + 25,
          head: [['Field', 'Value']],
          body: scoreInfo,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 10 }
        });

        // Objective Questions
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text('Objective Questions', 14, doc.previousAutoTable.finalY + 20);
        
        const objectiveQuestions = testInfo.questions
          .filter(q => q.type === 'objective')
          .map((question, qIndex) => {
            const studentAnswer = response.answers?.[qIndex] || 'Not Attempted';
            const isCorrect = studentAnswer === testInfo.correctAnswers?.[qIndex];
            return [
              `Q${qIndex + 1}`,
              question.text || 'Not Available',
              studentAnswer,
              isCorrect ? 'Correct' : 'Incorrect'
            ];
          });
        
        doc.autoTable({
          startY: doc.previousAutoTable.finalY + 25,
          head: [['Q.No', 'Question', 'Answer', 'Status']],
          body: objectiveQuestions,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 10 }
        });

        // Subjective Questions
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text('Subjective Questions', 14, doc.previousAutoTable.finalY + 20);
        
        const subjectiveQuestions = testInfo.questions
          .filter(q => q.type === 'subjective')
          .map((question, qIndex) => {
            const objIndex = testInfo.questions.findIndex(q => q.type === 'subjective');
            const studentAnswer = response.answers?.[objIndex] || 'Not Attempted';
            return [
              `Q${objIndex + 1}`,
              question.text || 'Not Available',
              studentAnswer,
              testInfo.correctAnswers?.[objIndex] || 'Not Available'
            ];
          });
        
        doc.autoTable({
          startY: doc.previousAutoTable.finalY + 25,
          head: [['Q.No', 'Question', 'Student Answer', 'Correct Answer']],
          body: subjectiveQuestions,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 10 }
        });
      });

      doc.save(`test_responses_${roomNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to generate PDF'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">View Test Responses</h1>
            <p className="text-gray-400">Enter room number to view student responses</p>
          </div>

          {/* Search Box */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="Enter Room Number"
                className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={fetchTestResponses}
                disabled={isLoading}
                className={`${
                  isLoading 
                    ? 'bg-gray-600' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white px-6 py-2 rounded-lg transition duration-200`}
              >
                {isLoading ? 'Loading...' : 'Fetch Responses'}
              </button>
            </div>
          </div>

          {/* Alert Component */}
          {alert.show && (
            <CustomAlert
              type={alert.type}
              title={alert.title}
              message={alert.message}
              onClose={() => setAlert({ show: false, type: '', title: '', message: '' })}
            />
          )}

          {/* Test Info */}
          {testInfo && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-xl font-semibold mb-4">Test Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Room Number</p>
                  <p className="font-medium">{testInfo.roomNumber || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Date</p>
                  <p className="font-medium">{testInfo.date || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Time</p>
                  <p className="font-medium">{formatTo12Hour(testInfo.time) || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Duration</p>
                  <p className="font-medium">{testInfo.duration || 0} minutes</p>
                </div>
                <div>
                  <p className="text-gray-400">Marks Per Correct Answer</p>
                  <p className="font-medium">{testInfo.marksPerCorrect || 0} marks</p>
                </div>
                <div>
                  <p className="text-gray-400">Negative Marking</p>
                  <p className="font-medium">{testInfo.negativeMarking || 0} marks per wrong answer</p>
                </div>
              </div>
            </div>
          )}

          {/* Download Button */}
          {responses.length > 0 && (
            <div className="flex justify-end mb-6">
              <button
                onClick={downloadResponsesAsPDF}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Download Responses as PDF</span>
              </button>
            </div>
          )}

          {/* Responses Section */}
          {responses.length > 0 && (
            <div className="space-y-6">
              {responses.map((response, index) => (
                <div key={index} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Student Info */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Student Information</h3>
                      <div className="space-y-2">
                        <p><span className="text-gray-400">Name:</span> {response.studentName || 'Not Available'}</p>
                        <p><span className="text-gray-400">Registration:</span> {response.regNo || 'Not Available'}</p>
                        <p><span className="text-gray-400">Branch:</span> {response.branch || 'Not Available'}</p>
                      </div>
                    </div>

                    {/* Score Info */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">Score Information</h3>
                      <div className="space-y-2">
                        <p><span className="text-gray-400">Final Score:</span> {response.score?.final || 0}</p>
                        <p><span className="text-gray-400">Correct Answers:</span> {response.score?.correct || 0}</p>
                        <p><span className="text-gray-400">Incorrect Answers:</span> {response.score?.incorrect || 0}</p>
                        <p><span className="text-gray-400">Marks Per Correct:</span> {response.score?.marksPerCorrect || 0}</p>
                        <p><span className="text-gray-400">Marks Awarded:</span> {response.score?.marksForCorrect || 0}</p>
                        <p><span className="text-gray-400">Marks Deducted:</span> {response.score?.marksDeducted || 0}</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Score calculation: {response.score?.marksForCorrect || 0} - {response.score?.marksDeducted || 0} = {response.score?.final || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Answers Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Student Answers</h3>
                    <div className="space-y-4">
                      {/* Objective Questions */}
                      {testInfo?.questions?.filter(q => q.type === 'objective').map((question, index) => (
                        <div key={index} className="bg-gray-700 p-4 rounded-lg">
                          <p className="font-medium mb-2">Question {index + 1}: {question.text || 'Not Available'}</p>
                          <div className="space-y-2">
                            {question.options?.map((option, optIndex) => (
                              <div 
                                key={optIndex}
                                className={`p-2 rounded ${
                                  response.answers?.[index] === option
                                    ? response.answers?.[index] === testInfo.correctAnswers?.[index]
                                      ? 'bg-green-900/50 border border-green-500'
                                      : 'bg-red-900/50 border border-red-500'
                                    : 'bg-gray-800'
                                }`}
                              >
                                {option}
                                {response.answers?.[index] === option && (
                                  <span className="ml-2">
                                    {response.answers?.[index] === testInfo.correctAnswers?.[index] ? '✓' : '✗'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Subjective Questions */}
                      {testInfo?.questions?.filter(q => q.type === 'subjective').map((question, index) => {
                        const objIndex = testInfo.questions.findIndex(q => q.type === 'subjective');
                        return (
                          <div key={index} className="bg-gray-700 p-4 rounded-lg">
                            <p className="font-medium mb-2">Question {objIndex + 1}: {question.text || 'Not Available'}</p>
                            {question.image && (
                              <img 
                                src={question.image} 
                                alt="Question Image" 
                                className="max-w-full h-auto mb-4 rounded"
                              />
                            )}
                            <div className="bg-gray-800 p-3 rounded">
                              <p className="text-gray-400 mb-1">Student's Answer:</p>
                              <p>{response.answers?.[objIndex] || 'No answer provided'}</p>
                            </div>
                            <div className="mt-2 bg-gray-800 p-3 rounded">
                              <p className="text-gray-400 mb-1">Correct Answer:</p>
                              <p>{testInfo.correctAnswers?.[objIndex] || 'Not Available'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewTestResponses;

