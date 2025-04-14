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
        setResponses(data.responses);
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
      // Create a PDF for each student
      responses.forEach((response, studentIndex) => {
        const doc = new jsPDF();
        
        // Add header
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text('GECV Examination System', 105, 20, { align: 'center' });
        
        // Add test information
        doc.setFontSize(14);
        doc.text('Test Details', 14, 35);
        doc.setFontSize(12);
        doc.text(`Room Number: ${roomNumber}`, 14, 45);
        doc.text(`Date: ${testInfo.date}`, 14, 55);
        doc.text(`Time: ${formatTo12Hour(testInfo.time)}`, 14, 65);
        
        // Add student information
        doc.setFontSize(14);
        doc.text('Student Information', 14, 85);
        doc.setFontSize(12);
        doc.text(`Name: ${response.studentName}`, 14, 95);
        doc.text(`Registration: ${response.regNo}`, 14, 105);
        doc.text(`Branch: ${response.branch}`, 14, 115);
        
        // Add score summary
        doc.setFontSize(14);
        doc.text('Score Summary', 14, 135);
        doc.setFontSize(12);
        doc.text(`Final Score: ${response.score.final}`, 14, 145);
        doc.text(`Correct Answers: ${response.score.correct}`, 14, 155);
        doc.text(`Incorrect Answers: ${response.score.incorrect}`, 14, 165);
        doc.text(`Marks Per Correct: ${response.score.marksPerCorrect}`, 14, 175);
        doc.text(`Marks Awarded: ${response.score.marksForCorrect}`, 14, 185);
        doc.text(`Marks Deducted: ${response.score.marksDeducted}`, 14, 195);
        
        // Add detailed answers section
        let yPosition = 215;
        doc.setFontSize(14);
        doc.text('Detailed Answers', 14, yPosition);
        yPosition += 15;
        
        // Add objective questions
        doc.setFontSize(12);
        doc.text('Objective Questions:', 14, yPosition);
        yPosition += 10;
        
        testInfo.questions.forEach((question, index) => {
          if (question.type === 'objective') {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }
            
            doc.setFontSize(10);
            doc.text(`Q${index + 1}: ${question.text}`, 14, yPosition);
            yPosition += 10;
            
            // Add options
            question.options.forEach((option, optIndex) => {
              const isCorrect = option === testInfo.correctAnswers[index];
              const isSelected = response.answers[index] === option;
              
              let optionText = `${String.fromCharCode(65 + optIndex)}) ${option}`;
              if (isCorrect) optionText += ' ✓';
              if (isSelected && !isCorrect) optionText += ' ✗';
              
              doc.setTextColor(isCorrect ? [0, 128, 0] : isSelected ? [255, 0, 0] : [0, 0, 0]);
              doc.text(optionText, 20, yPosition);
              yPosition += 7;
            });
            
            doc.setTextColor(0, 0, 0);
            yPosition += 10;
          }
        });
        
        // Add subjective questions if they exist
        if (testInfo.questions.some(q => q.type === 'subjective')) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(12);
          doc.text('Subjective Questions:', 14, yPosition);
          yPosition += 10;
          
          testInfo.questions.forEach((question, index) => {
            if (question.type === 'subjective') {
              if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
              }
              
              doc.setFontSize(10);
              doc.text(`Q${index + 1}: ${question.text}`, 14, yPosition);
              yPosition += 10;
              
              doc.text('Student\'s Answer:', 14, yPosition);
              yPosition += 7;
              doc.text(response.answers[index] || 'No answer provided', 20, yPosition);
              yPosition += 15;
              
              doc.text('Correct Answer:', 14, yPosition);
              yPosition += 7;
              doc.text(testInfo.correctAnswers[index], 20, yPosition);
              yPosition += 15;
            }
          });
        }
        
        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text('GECV Examination System - Design and Developed by Rahul Raj', 105, 285, { align: 'center' });
        }
        
        // Save the PDF
        doc.save(`test_response_${response.regNo}_${roomNumber}.pdf`);
      });
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
                  <p className="font-medium">{testInfo.roomNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400">Date</p>
                  <p className="font-medium">{testInfo.date}</p>
                </div>
                <div>
                  <p className="text-gray-400">Time</p>
                  <p className="font-medium">{formatTo12Hour(testInfo.time)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Duration</p>
                  <p className="font-medium">{testInfo.duration} minutes</p>
                </div>
                <div>
                  <p className="text-gray-400">Marks Per Correct Answer</p>
                  <p className="font-medium">{testInfo.marksPerCorrect} marks</p>
                </div>
                <div>
                  <p className="text-gray-400">Negative Marking</p>
                  <p className="font-medium">{testInfo.negativeMarking} marks per wrong answer</p>
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
                        <p><span className="text-gray-400">Name:</span> {response.studentName}</p>
                        <p><span className="text-gray-400">Registration:</span> {response.regNo}</p>
                        <p><span className="text-gray-400">Branch:</span> {response.branch}</p>
                      </div>
                    </div>

                    {/* Score Info */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">Score Information</h3>
                      <div className="space-y-2">
                        <p><span className="text-gray-400">Final Score:</span> {response.score.final}</p>
                        <p><span className="text-gray-400">Correct Answers:</span> {response.score.correct}</p>
                        <p><span className="text-gray-400">Incorrect Answers:</span> {response.score.incorrect}</p>
                        <p><span className="text-gray-400">Marks Per Correct:</span> {response.score.marksPerCorrect}</p>
                        <p><span className="text-gray-400">Marks Awarded:</span> {response.score.marksForCorrect}</p>
                        <p><span className="text-gray-400">Marks Deducted:</span> {response.score.marksDeducted}</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Score calculation: {response.score.marksForCorrect} - {response.score.marksDeducted} = {response.score.final}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Answers Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Student Answers</h3>
                    <div className="space-y-4">
                      {/* Objective Questions */}
                      {testInfo.questions.filter(q => q.type === 'objective').map((question, index) => (
                        <div key={index} className="bg-gray-700 p-4 rounded-lg">
                          <p className="font-medium mb-2">Question {index + 1}: {question.text}</p>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div 
                                key={optIndex}
                                className={`p-2 rounded ${
                                  response.answers[index] === option
                                    ? response.answers[index] === testInfo.correctAnswers[index]
                                      ? 'bg-green-900/50 border border-green-500'
                                      : 'bg-red-900/50 border border-red-500'
                                    : 'bg-gray-800'
                                }`}
                              >
                                {option}
                                {response.answers[index] === option && (
                                  <span className="ml-2">
                                    {response.answers[index] === testInfo.correctAnswers[index] ? '✓' : '✗'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Subjective Questions */}
                      {testInfo.questions.filter(q => q.type === 'subjective').map((question, index) => {
                        const objIndex = testInfo.questions.findIndex(q => q.type === 'subjective');
                        return (
                          <div key={index} className="bg-gray-700 p-4 rounded-lg">
                            <p className="font-medium mb-2">Question {objIndex + 1}: {question.text}</p>
                            {question.image && (
                              <img 
                                src={question.image} 
                                alt="Question Image" 
                                className="max-w-full h-auto mb-4 rounded"
                              />
                            )}
                            <div className="bg-gray-800 p-3 rounded">
                              <p className="text-gray-400 mb-1">Student's Answer:</p>
                              <p>{response.answers[objIndex] || 'No answer provided'}</p>
                            </div>
                            <div className="mt-2 bg-gray-800 p-3 rounded">
                              <p className="text-gray-400 mb-1">Correct Answer:</p>
                              <p>{testInfo.correctAnswers[objIndex]}</p>
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

