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

        // Add page break if not the last response
        if (index < responses.length - 1) {
          doc.addPage();
        }
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
                        <p><span className="text-gray-400">Final Score:</span> {response.finalScore}</p>
                        <p><span className="text-gray-400">Correct Answers:</span> {response.correctAnswers}</p>
                        <p><span className="text-gray-400">Incorrect Answers:</span> {response.incorrectAnswers}</p>
                        <p><span className="text-gray-400">Marks Per Correct:</span> {response.marksPerCorrect}</p>
                        <p><span className="text-gray-400">Marks Awarded:</span> {response.marksForCorrect}</p>
                        <p><span className="text-gray-400">Marks Deducted:</span> {response.marksDeducted}</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Score calculation: {response.marksForCorrect} - {response.marksDeducted} = {response.finalScore}
                        </p>
                      </div>
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

