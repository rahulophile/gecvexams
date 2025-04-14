import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ViewTestResponses = () => {
  const [roomNumber, setRoomNumber] = useState("");
  const [responses, setResponses] = useState([]);
  const [hasSubjective, setHasSubjective] = useState(false);
  const [error, setError] = useState(null);
  const [testInfo, setTestInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const formatTo12Hour = (time24) => {
    try {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      return time24; // Return original time if conversion fails
    }
  };

  const fetchTestResponses = async () => {
    if (!roomNumber.trim()) {
      setError("Please enter a room number");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTestInfo(null); // Reset testInfo when fetching new responses
    setResponses([]); // Reset responses when fetching new data

    try {
      const token = localStorage.getItem('adminToken');
      
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
        setTestInfo(data.testInfo);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error fetching responses:", error);
      setError(error.message || "Failed to fetch responses");
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
      
      // Add test information
      doc.setFontSize(16);
      doc.text('Test Responses', 14, 15);
      doc.setFontSize(12);
      doc.text(`Room Number: ${roomNumber}`, 14, 25);
      doc.text(`Date: ${testInfo.date}`, 14, 35);
      doc.text(`Time: ${formatTo12Hour(testInfo.time)}`, 14, 45);
      doc.text(`Duration: ${testInfo.duration} minutes`, 14, 55);
      doc.text(`Marks Per Correct Answer: ${testInfo.marksPerCorrect} marks`, 14, 65);
      doc.text(`Negative Marking: ${testInfo.negativeMarking} marks per wrong answer`, 14, 75);

      // Add responses
      responses.forEach((response, index) => {
        const startY = index === 0 ? 85 : doc.previousAutoTable.finalY + 20;
        
        // Student info
        doc.setFontSize(14);
        doc.text(`Student: ${response.studentName}`, 14, startY);
        doc.setFontSize(12);
        doc.text(`Registration: ${response.regNo}`, 14, startY + 10);
        doc.text(`Branch: ${response.branch}`, 14, startY + 20);
        
        // Score information
        doc.text(`Final Score: ${response.finalScore}`, 14, startY + 30);
        doc.text(`Correct Answers: ${response.correctAnswers}`, 14, startY + 40);
        doc.text(`Incorrect Answers: ${response.incorrectAnswers}`, 14, startY + 50);
        doc.text(`Marks Per Correct: ${response.marksPerCorrect}`, 14, startY + 60);
        doc.text(`Marks Awarded: ${response.marksForCorrect}`, 14, startY + 70);
        doc.text(`Marks Deducted: ${response.marksDeducted}`, 14, startY + 80);
        doc.text(`(Score calculated as: ${response.marksForCorrect} - ${response.marksDeducted} = ${response.finalScore})`, 14, startY + 90);
        
        // Objective answers
        if (response.objectiveAnswers && response.objectiveAnswers.length > 0) {
          doc.text('Objective Answers:', 14, startY + 100);
          const objectiveData = response.objectiveAnswers.map((answer, idx) => [
            `Q${idx + 1}`,
            answer.questionText,
            answer.selectedAnswer,
            answer.isCorrect ? 'Correct' : 'Incorrect'
          ]);
          
          doc.autoTable({
            startY: startY + 105,
            head: [['Q.No', 'Question', 'Answer', 'Status']],
            body: objectiveData,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 10 }
          });
        }

        // Subjective answers
        if (response.subjectiveAnswers && response.subjectiveAnswers.length > 0) {
          doc.text('Subjective Answers:', 14, doc.previousAutoTable.finalY + 20);
          response.subjectiveAnswers.forEach((answer, idx) => {
            const y = doc.previousAutoTable.finalY + 30 + (idx * 40);
            doc.text(`Q${answer.questionNumber}: ${answer.questionText}`, 14, y);
            doc.text(`Answer: ${answer.answer}`, 20, y + 10);
          });
        }

        // Add page break if not the last response
        if (index < responses.length - 1) {
          doc.addPage();
        }
      });

      // Save the PDF
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
            
            {error && (
              <div className="mt-4 p-3 bg-red-900/50 text-red-200 rounded-lg border border-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Test Info - Only show if we have testInfo */}
          {testInfo && (
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <h2 className="text-xl font-semibold mb-2">Test Information</h2>
              <p>Room Number: {testInfo.roomNumber}</p>
              <p>Date: {testInfo.date}</p>
              <p>Time: {formatTo12Hour(testInfo.time)}</p>
              <p>Duration: {testInfo.duration} minutes</p>
              <p>Marks Per Correct Answer: {testInfo.marksPerCorrect} marks</p>
              <p>Negative Marking: {testInfo.negativeMarking} marks per wrong answer</p>
            </div>
          )}

          {/* Add download button with improved styling */}
          {responses.length > 0 && (
            <div className="flex justify-end mb-4">
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

          {/* Responses section */}
          {responses.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Student Responses</h2>
                <button
                  onClick={downloadResponsesAsPDF}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Download PDF
                </button>
              </div>

              <div className="space-y-4">
                {responses.map((response, index) => (
                  <div key={index} className="border p-4 rounded">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="font-semibold">Student Name: {response.studentName}</p>
                        <p>Registration: {response.regNo}</p>
                        <p>Branch: {response.branch}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="font-semibold">Final Score: {response.finalScore}</p>
                        <p>Correct Answers: {response.correctAnswers}</p>
                        <p>Incorrect Answers: {response.incorrectAnswers}</p>
                        <p>Marks Per Correct: {response.marksPerCorrect}</p>
                        <p>Marks Awarded: {response.marksForCorrect}</p>
                        <p>Marks Deducted: {response.marksDeducted}</p>
                        <p className="text-sm text-gray-600">
                          (Score calculated as: {response.marksForCorrect} - {response.marksDeducted} = {response.finalScore})
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Answers:</h3>
                      <div className="space-y-2">
                        {Object.entries(response.answers).map(([qIndex, answer]) => (
                          <div key={qIndex} className="flex items-start gap-2">
                            <span className="font-semibold">Q{qIndex}:</span>
                            <span className={answer === testInfo.correctAnswers[qIndex] ? "text-green-600" : "text-red-600"}>
                              {answer}
                              {answer === testInfo.correctAnswers[qIndex] ? " ✓" : " ✗"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewTestResponses;
