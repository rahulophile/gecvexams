import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomAlert from '../components/CustomAlert';

export default function CreateTest() {
  const [roomNumber, setRoomNumber] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [negativeMarking, setNegativeMarking] = useState("");
  const [questionType, setQuestionType] = useState("objective");
  const [numObjective, setNumObjective] = useState(0);
  const [numSubjective, setNumSubjective] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState({});
  const [isCheckingRoom, setIsCheckingRoom] = useState(false);
  const [roomStatus, setRoomStatus] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', title: '', message: '' });
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("isAdminLoggedIn");
    navigate("/");
  };

  const generateQuestions = () => {
    let newQuestions = [];
    if (questionType === "objective" || questionType === "mixed") {
      for (let i = 0; i < numObjective; i++) {
        newQuestions.push({ type: "objective", text: "", options: ["", "", "", ""] });
      }
    }
    if (questionType === "subjective" || questionType === "mixed") {
      for (let i = 0; i < numSubjective; i++) {
        newQuestions.push({ type: "subjective", text: "", image: null });
      }
    }
    setQuestions(newQuestions);
  };

  const updateQuestion = (index, text) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index].text = text;
    setQuestions(updatedQuestions);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options[oIndex] = value;
    setQuestions(updatedQuestions);
  };

  const setCorrectAnswer = (index, value) => {
    setCorrectAnswers({ ...correctAnswers, [index]: value });
  };

  const handleImageUpload = async (index, file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://exam-server-gecv.onrender.com/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        const updatedQuestions = [...questions];
        let imageUrl = data.imageUrl;
        if (!imageUrl.startsWith('http')) {
          imageUrl = `https://exam-server-gecv.onrender.com${imageUrl}`;
        }
        updatedQuestions[index].image = imageUrl;
        setQuestions(updatedQuestions);
        
        console.log('Uploaded image URL:', imageUrl);
      } else {
        throw new Error(data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload image. Please try again.'
      });
    }
  };

  const checkRoomAvailability = async () => {
    if (!roomNumber.trim()) {
      setAlert({
        show: true,
        type: "warning",
        title: "Missing Room Number",
        message: "Please enter a room number to check."
      });
      return;
    }

    setIsCheckingRoom(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`https://exam-server-gecv.onrender.com/api/check-room/${roomNumber}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        setRoomStatus({
          isAvailable: data.available,
          message: data.available ? "Room number is available" : "Room number already exists"
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        type: "error",
        title: "Error",
        message: "Failed to check room availability"
      });
    } finally {
      setIsCheckingRoom(false);
    }
  };

  const createTest = async () => {
    try {
      // Detailed validation
      if (!roomNumber.trim()) {
        setAlert({
          show: true,
          type: "warning",
          title: "Missing Field",
          message: "Please enter a room number"
        });
        return;
      }

      if (!date) {
        setAlert({
          show: true,
          type: "warning",
          title: "Missing Field",
          message: "Please select a test date"
        });
        return;
      }

      if (!time) {
        setAlert({
          show: true,
          type: "warning",
          title: "Missing Field",
          message: "Please select a test time"
        });
        return;
      }

      if (!duration || duration <= 0) {
        setAlert({
          show: true,
          type: "warning",
          title: "Invalid Duration",
          message: "Please enter a valid test duration"
        });
        return;
      }

      if (negativeMarking === "") {
        setAlert({
          show: true,
          type: "warning",
          title: "Missing Field",
          message: "Please enter negative marking value"
        });
        return;
      }

      if (questions.length === 0) {
        setAlert({
          show: true,
          type: "warning",
          title: "No Questions",
          message: "Please generate and fill at least one question"
        });
        return;
      }

      // Validate each question
      for (let i = 0; i < questions.length; i++) {
        if (!questions[i].text.trim()) {
          setAlert({
            show: true,
            type: "warning",
            title: "Incomplete Question",
            message: `Question ${i + 1} is empty`
          });
          return;
        }

        if (questions[i].type === 'objective') {
          // Check if all options are filled
          if (questions[i].options.some(opt => !opt.trim())) {
            setAlert({
              show: true,
              type: "warning",
              title: "Incomplete Options",
              message: `Please fill all options for Question ${i + 1}`
            });
            return;
          }

          // Check if correct answer is selected
          if (!correctAnswers[i]) {
            setAlert({
              show: true,
              type: "warning",
              title: "Missing Correct Answer",
              message: `Please select correct answer for Question ${i + 1}`
            });
            return;
          }
        }
      }

      // Prepare questions with correct answers
      const preparedQuestions = questions.map((question, index) => {
        if (question.type === 'objective') {
          return {
            ...question,
            correctAnswer: correctAnswers[index] || question.options[0] // Use selected answer or first option as default
          };
        } else {
          return {
            ...question,
            correctAnswer: question.text // For subjective questions, use the question text as correct answer
          };
        }
      });

      const testData = {
        roomNumber: roomNumber.trim(),
        date,
        time,
        duration: Number(duration),
        negativeMarking: Number(negativeMarking),
        questions: preparedQuestions
      };

      console.log("Sending test data:", testData);

      const token = localStorage.getItem('adminToken');
      if (!token) {
        setAlert({
          show: true,
          type: "error",
          title: "Authentication Error",
          message: "Please login again"
        });
        navigate('/');
        return;
      }

      const response = await fetch("https://exam-server-gecv.onrender.com/api/create-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create test");
      }

      setAlert({
        show: true,
        type: "success",
        title: "Success",
        message: "Test created successfully!"
      });

      // Reset form
      setRoomNumber("");
      setDate("");
      setTime("");
      setDuration("");
      setNegativeMarking("");
      setQuestions([]);
      setCorrectAnswers({});
    } catch (error) {
      console.error("Error creating test:", error);
      setAlert({
        show: true,
        type: "error",
        title: "Error",
        message: error.message || "Failed to create test"
      });
    }
  };

  const handleViewResponses = () => {
    navigate("/view-responses");
  };

  const handleAlertClose = () => {
    setAlert({ ...alert, show: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <CustomAlert
        isOpen={alert.show}
        onClose={handleAlertClose}
        type={alert.type}
        title={alert.title}
        message={alert.message}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Test</h1>
            <p className="text-gray-400">Set up your test details and questions</p>
          </div>

          {/* Test Details Form */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Test Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-400 mb-2">Room Number <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter room number" 
                    value={roomNumber} 
                    onChange={(e) => {
                      setRoomNumber(e.target.value);
                      setRoomStatus(null); // Clear previous status
                    }}
                    required
                    className="border p-3 flex-1 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={checkRoomAvailability}
                    disabled={isCheckingRoom}
                    className={`px-4 py-2 rounded-lg transition duration-200 ${
                      isCheckingRoom 
                        ? 'bg-gray-600' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isCheckingRoom ? 'Checking...' : 'Check'}
                  </button>
                </div>
                {roomStatus && (
                  <p className={`mt-2 text-sm ${
                    roomStatus.isAvailable ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {roomStatus.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="border p-3 w-full rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Time</label>
                <input 
                  type="time" 
                  value={time} 
                  onChange={(e) => setTime(e.target.value)}
                  className="border p-3 w-full rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Duration (minutes)</label>
                <input 
                  type="number" 
                  placeholder="Enter duration" 
                  value={duration} 
                  onChange={(e) => setDuration(e.target.value)}
                  className="border p-3 w-full rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Negative Marking</label>
                <input 
                  type="number" 
                  placeholder="Points per wrong answer" 
                  value={negativeMarking} 
                  onChange={(e) => setNegativeMarking(e.target.value)}
                  className="border p-3 w-full rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Question Generation Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Question Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Question Type</label>
                <select 
                  value={questionType} 
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="border p-3 w-full rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="objective">Objective Only</option>
                  <option value="subjective">Subjective Only</option>
                  <option value="mixed">Mixed (Both Types)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(questionType === "objective" || questionType === "mixed") && (
                  <div>
                    <label className="block text-gray-400 mb-2">Number of Objective Questions</label>
                    <input 
                      type="number" 
                      placeholder="Enter number" 
                      value={numObjective} 
                      onChange={(e) => setNumObjective(e.target.value)}
                      className="border p-3 w-full rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                {(questionType === "subjective" || questionType === "mixed") && (
                  <div>
                    <label className="block text-gray-400 mb-2">Number of Subjective Questions</label>
                    <input 
                      type="number" 
                      placeholder="Enter number" 
                      value={numSubjective} 
                      onChange={(e) => setNumSubjective(e.target.value)}
                      className="border p-3 w-full rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={generateQuestions}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200 mt-4"
              >
                Generate Questions
              </button>
            </div>
          </div>

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Questions</h2>
              {questions.map((q, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base md:text-lg font-semibold">Question {index + 1}</h3>
                    <span className="px-2 py-1 bg-gray-700 rounded-full text-xs md:text-sm">
                      {q.type === 'objective' ? 'Objective' : 'Subjective'}
                    </span>
                  </div>
                  
                  <textarea 
                    placeholder="Enter your question here" 
                    value={q.text} 
                    onChange={(e) => updateQuestion(index, e.target.value)}
                    className="border p-2 w-full mb-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm md:text-base"
                    style={{ minHeight: '80px' }}
                  />

                  {q.type === "objective" && (
                    <div className="space-y-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center">
                          <span className="text-gray-400 mr-2 text-sm">{oIndex + 1}.</span>
                          <input 
                            type="text" 
                            placeholder={`Option ${oIndex + 1}`} 
                            value={opt}
                            onChange={(e) => updateOption(index, oIndex, e.target.value)}
                            className="border p-2 flex-1 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                          />
                        </div>
                      ))}
                      <select 
                        onChange={(e) => setCorrectAnswer(index, e.target.value)}
                        className="border p-2 w-full rounded-lg bg-gray-700 text-white mt-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                      >
                        <option value="">Select Correct Answer</option>
                        {q.options.map((opt, oIndex) => (
                          <option key={oIndex} value={opt}>Option {oIndex + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {q.type === "subjective" && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <label className="block">
                          <span className="text-gray-400 text-sm">Upload Image (Optional)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                handleImageUpload(index, e.target.files[0]);
                              }
                            }}
                            className="mt-1 block w-full text-xs md:text-sm text-gray-400
                              file:mr-2 file:py-1 file:px-2
                              file:rounded-full file:border-0
                              file:text-xs file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100"
                          />
                        </label>
                      </div>
                      
                      {q.image && (
                        <div className="mt-2">
                          <img 
                            src={q.image} 
                            alt="Question image" 
                            className="max-w-md max-h-32 md:max-h-40 object-contain rounded-lg border border-gray-700"
                          />
                          <button
                            onClick={() => {
                              const updatedQuestions = [...questions];
                              updatedQuestions[index].image = null;
                              setQuestions(updatedQuestions);
                            }}
                            className="mt-1 text-red-500 hover:text-red-700 text-xs md:text-sm"
                          >
                            Remove Image
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button 
              onClick={createTest}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-200"
            >
              Create Test
            </button>
            <button 
              onClick={() => navigate('/admin-panel')}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
