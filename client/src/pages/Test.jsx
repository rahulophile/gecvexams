import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoMdClose } from "react-icons/io";
import CustomAlert from '../components/CustomAlert';
import { useTest } from '../context/TestContext';
import { FaRegClock, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from "react-icons/fa";
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Test() {
  const { isVerified, verifiedRoom } = useTest();
  const { roomNumber } = useParams();
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState({ name: "", branch: "", regNo: "" });
  const [testData, setTestData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [showPopup, setShowPopup] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [subjectiveAnswers, setSubjectiveAnswers] = useState({});
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', title: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [showEntryPopup, setShowEntryPopup] = useState(false);
  const [showSubmissionPopup, setShowSubmissionPopup] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationCountdown, setViolationCountdown] = useState(5);
  const testContainerRef = useRef(null);

  useEffect(() => {
    // If not verified or room numbers don't match, redirect to home
    if (!isVerified || verifiedRoom !== roomNumber) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Unauthorized Access',
        message: 'Please enter the test room through the home page.'
      });
      navigate('/');
      return;
    }

    const fetchTest = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('adminToken'); // Get the token from local storage
        const res = await fetch(`https://exam-server-gecv.onrender.com/api/get-test/${roomNumber}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // Include the token in the headers
          }
        });

        if (!res.ok) {
          throw new Error("Failed to fetch test data");
        }

        const data = await res.json();
        if (data.success) {
          setTestData(data.test);
        } else {
          setAlert({ show: true, type: 'error', title: 'Error', message: data.message });
        }
      } catch (error) {
        console.error("Error fetching test:", error);
        setAlert({ show: true, type: 'error', title: 'Server Error', message: 'Unable to connect to server' });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTest();
  }, [roomNumber, navigate, isVerified, verifiedRoom]);

  const updateTimer = useCallback(() => {
    setTimeLeft(prev => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    if (!testStarted || timeLeft === null) return;

    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [testStarted, timeLeft, updateTimer]);

  const handleAnswerChange = (questionIndex, selectedOption) => {
    if (testData.questions[questionIndex].type === 'subjective') {
      setSubjectiveAnswers(prev => ({
        ...prev,
        [questionIndex]: selectedOption
      }));
    } else {
      setSelectedAnswers(prev => ({
        ...prev,
        [questionIndex]: selectedOption
      }));
    }
  };

  const handleMarkForReview = (qIndex) => {
    setReview(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const handleClearResponse = (qIndex) => {
    setSelectedAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[qIndex];
      return newAnswers;
    });
  };

  const handleSubmit = () => {
    setShowSubmitConfirm(true);
  };

  const handleSubmitConfirmed = async (confirmed) => {
    if (confirmed) {
      try {
        const response = await fetch("https://exam-server-gecv.onrender.com/api/submit-test", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            roomNumber,
            userDetails,
            answers: {
              ...selectedAnswers,
              ...subjectiveAnswers
            }
          })
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (data.success) {
          // Exit fullscreen only after successful submission
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          } else if (document.webkitFullscreenElement) {
            await document.webkitExitFullscreen();
          } else if (document.mozFullScreenElement) {
            await document.mozCancelFullScreen();
          } else if (document.msFullscreenElement) {
            await document.msExitFullscreen();
          }

          setSubmissionStatus('success');
          setShowSubmissionPopup(true);
          // Navigate to home after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      } catch (error) {
        console.error("Error submitting test:", error);
        setSubmissionStatus('error');
        setShowSubmissionPopup(true);
      }
    }
    setShowSubmitConfirm(false);
  };

  const enterFullscreen = () => {
    if (testContainerRef.current) {
      if (testContainerRef.current.requestFullscreen) {
        testContainerRef.current.requestFullscreen();
      } else if (testContainerRef.current.webkitRequestFullscreen) {
        testContainerRef.current.webkitRequestFullscreen();
      } else if (testContainerRef.current.msRequestFullscreen) {
        testContainerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = async () => {
    setShowExitConfirm(true);
  };

  const handleStartTest = async () => {
    if (!userDetails.name || !userDetails.branch || !userDetails.regNo) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Missing Details',
        message: 'Please enter all details before starting.'
      });
      return;
    }

    try {
      // Check if registration number already exists
      const response = await fetch("https://exam-server-gecv.onrender.com/api/check-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          roomNumber,
          regNo: userDetails.regNo
        })
      });

      const data = await response.json();
      if (!data.success) {
        setAlert({
          show: true,
          type: 'error',
          title: 'Registration Error',
          message: data.message
        });
        return;
      }

      // Show test instructions after successful registration check
      setShowEntryPopup(true);
    } catch (error) {
      console.error("Error:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Server Error',
        message: 'Unable to verify registration. Please try again.'
      });
    }
  };

  const handleExitConfirm = async (confirmed) => {
    if (confirmed) {
      try {
        const response = await fetch("https://exam-server-gecv.onrender.com/api/submit-test", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            roomNumber,
            userDetails,
            answers: {
              ...selectedAnswers,
              ...subjectiveAnswers
            }
          })
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (data.success) {
          // Exit fullscreen only after successful submission
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          } else if (document.webkitFullscreenElement) {
            await document.webkitExitFullscreen();
          } else if (document.mozFullScreenElement) {
            await document.mozCancelFullScreen();
          } else if (document.msFullscreenElement) {
            await document.msExitFullscreen();
          }

          setAlert({
            show: true,
            type: 'success',
            title: 'Test Submitted',
            message: 'Your test has been submitted successfully!'
          });
          
          // Navigate after showing success message
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } catch (error) {
        console.error("Error submitting test:", error);
        setAlert({
          show: true,
          type: 'error',
          title: 'Submission Failed',
          message: error.message || 'Error submitting test. Please try again.'
        });
      }
    }
    setShowExitConfirm(false);
  };

  // Add security measures
  useEffect(() => {
    // Prevent copy, paste, cut
    const preventCopyPaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toast.warning('Copy/Paste is not allowed during the test');
      return false;
    };

    // Prevent screenshots
    const preventScreenshot = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toast.warning('Screenshots are not allowed during the test');
      return false;
    };

    // Prevent right-click menu
    const preventContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent print screen
    const preventPrintScreen = (e) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
        toast.warning('Print screen is not allowed during the test');
        return false;
      }
    };

    // Prevent F12 and other dev tools
    const preventDevTools = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'))) {
        e.preventDefault();
        e.stopPropagation();
        toast.warning('Developer tools are not allowed during the test');
        return false;
      }
    };

    // Add event listeners
    if (testStarted) {
      document.addEventListener('copy', preventCopyPaste, { capture: true });
      document.addEventListener('paste', preventCopyPaste, { capture: true });
      document.addEventListener('cut', preventCopyPaste, { capture: true });
      document.addEventListener('contextmenu', preventContextMenu, { capture: true });
      document.addEventListener('keydown', preventPrintScreen, { capture: true });
      document.addEventListener('keydown', preventDevTools, { capture: true });
      
      // Prevent drag and drop
      document.addEventListener('dragstart', preventScreenshot, { capture: true });
      document.addEventListener('drop', preventScreenshot, { capture: true });
      
      // Prevent taking screenshots using PrintScreen key
      document.addEventListener('keyup', (e) => {
        if (e.key === 'PrintScreen') {
          preventScreenshot(e);
        }
      }, { capture: true });
    }

    return () => {
      document.removeEventListener('copy', preventCopyPaste, { capture: true });
      document.removeEventListener('paste', preventCopyPaste, { capture: true });
      document.removeEventListener('cut', preventCopyPaste, { capture: true });
      document.removeEventListener('contextmenu', preventContextMenu, { capture: true });
      document.removeEventListener('keydown', preventPrintScreen, { capture: true });
      document.removeEventListener('keydown', preventDevTools, { capture: true });
      document.removeEventListener('dragstart', preventScreenshot, { capture: true });
      document.removeEventListener('drop', preventScreenshot, { capture: true });
    };
  }, [testStarted]);

  // Update keyboard event handler to include more restrictions
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow typing in textarea when focused
      if (isTextareaFocused) {
        return;
      }

      // Handle ESC key
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowSubmitConfirm(true);
        return false;
      }

      // Block Alt+Tab and Cmd+Tab
      if ((e.altKey && e.key === 'Tab') || (e.metaKey && e.key === 'Tab')) {
        e.preventDefault();
        e.stopPropagation();
        setViolationCount(prev => prev + 1);
        if (violationCount >= 2) {
          handleTestViolation();
        } else {
          toast.warning(`Warning: Switching tabs/windows is not allowed. ${2 - violationCount} warnings remaining.`);
        }
        return false;
      }

      // Block all other keyboard shortcuts and keys
      e.preventDefault();

      // Allow only arrow keys for navigation between questions
      if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
        handlePreviousQuestion();
      } else if (e.key === 'ArrowRight' && currentQuestionIndex < testData.questions.length - 1) {
        handleNextQuestion();
      }
    };

    if (testStarted) {
      window.addEventListener("keydown", handleKeyDown, { capture: true });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [testStarted, currentQuestionIndex, isTextareaFocused, testData?.questions, violationCount]);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const showAlert = (type, title, message, autoClose = 0) => {
    setAlert({ show: true, type, title, message });
    if (autoClose > 0) {
      setTimeout(() => {
        setAlert({ show: false, type: '', title: '', message: '' });
      }, autoClose);
    }
  };

  // Update handleVisibilityChange function
  const handleVisibilityChange = () => {
    if (document.hidden && testStarted) {
      setViolationCount(prev => prev + 1);
      if (violationCount >= 2) {
        setShowViolationWarning(true);
        // Don't start countdown here, just show warning
        toast.error('Inappropriate behavior detected! Your test will be submitted when you return.');
      } else {
        toast.warning(`Warning: Switching tabs/windows is not allowed. ${2 - violationCount} warnings remaining.`);
      }
    } else if (!document.hidden && showViolationWarning) {
      // Start countdown when user returns to the test
      setViolationCountdown(5);
      const countdownInterval = setInterval(() => {
        setViolationCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            handleTestViolation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Update the useEffect for event listeners
  useEffect(() => {
    // Fullscreen change listener
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    // Visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Before unload listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Copy/paste prevention
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);

    // Block ESC key globally
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [testStarted]);

  useEffect(() => {
    if (submissionStatus && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      navigate('/');
    }
  }, [countdown, submissionStatus, navigate]);

  // Function to check if document is in fullscreen
  const checkFullscreen = () => {
    const isFullscreen = document.fullscreenElement || 
                        document.webkitFullscreenElement || 
                        document.msFullscreenElement;
    setIsFullscreen(!!isFullscreen);
  };

  // Update handleTestViolation function
  const handleTestViolation = async () => {
    setIsSubmitting(true);
    setShowViolationWarning(false);
    toast.error('Test rules violated! Your responses are being submitted automatically.');
    
    try {
      const response = await fetch("https://exam-server-gecv.onrender.com/api/submit-test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          roomNumber,
          userDetails,
          answers: {
            ...selectedAnswers,
            ...subjectiveAnswers
          },
          violation: true
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      if (data.success) {
        setSubmissionStatus('success');
        setShowSubmissionPopup(true);
        // Navigate to home after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      setSubmissionStatus('error');
      setShowSubmissionPopup(true);
    }
  };

  // Handle beforeunload
  const handleBeforeUnload = (e) => {
    e.preventDefault();
    e.returnValue = '';
    handleTestViolation();
  };

  // Handle copy/paste
  const handleCopyPaste = (e) => {
    e.preventDefault();
    setViolationCount(prev => prev + 1);
    if (violationCount >= 2) {
      handleTestViolation();
    } else {
      toast.warning(`Warning: Copy/Paste is not allowed. ${2 - violationCount} warnings remaining.`);
    }
  };

  // Update handleFullscreenChange function
  const handleFullscreenChange = () => {
    const isFullscreenNow = !!(document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.mozFullScreenElement || 
                              document.msFullscreenElement);
    setIsFullscreen(isFullscreenNow);
    
    // If fullscreen is exited, re-enter it
    if (!isFullscreenNow && testStarted) {
      enterFullscreen();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!testData) {
    return null;
  }

  return (
    <div ref={testContainerRef} className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-y-auto">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="animate-float1 absolute -top-4 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10"></div>
        <div className="animate-float2 absolute top-1/2 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10"></div>
      </div>

      {/* Show fullscreen warning only if not in fullscreen and test is started */}
      {!isFullscreen && testStarted && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md text-center">
            <h2 className="text-xl font-bold mb-4">Fullscreen Required</h2>
            <p className="mb-4">Please enter fullscreen mode to continue the test.</p>
            <button
              onClick={enterFullscreen}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Show test content only if in fullscreen or test not started */}
      {(isFullscreen || !testStarted) && (
        <div className="relative container mx-auto px-4 py-8">
          {!testStarted ? (
            // User Details Form with better styling
            <div className="mt-10 max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl animate-fadeIn">
              <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-white">
                Enter Your Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={userDetails.name}
                    onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Branch</label>
                  <input
                    type="text"
                    value={userDetails.branch}
                    onChange={(e) => setUserDetails({ ...userDetails, branch: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your branch"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Registration Number</label>
                  <input
                    type="text"
                    value={userDetails.regNo}
                    onChange={(e) => setUserDetails({ ...userDetails, regNo: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your registration number"
                  />
                </div>
                <button
                  onClick={handleStartTest}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
                >
                  Start Test
                </button>
              </div>
            </div>
          ) : (
            // Test Interface with better styling
            <div className="animate-fadeIn">
              {/* Timer and Info Bar */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <div className="flex items-center space-x-2">
                    <FaRegClock className="text-blue-400" />
                    <span className="text-xl font-mono">
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-gray-300">
                    Question {currentQuestionIndex + 1} of {testData.questions.length}
                  </div>
                </div>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <span className="hidden sm:inline">Submit Test</span>
                  <span className="sm:hidden">Submit</span>
                </button>
              </div>

              {/* Question and Answer Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Main Question Area */}
                <div className="md:col-span-3 space-y-6">
                  <div className={`bg-gray-800/50 backdrop-blur-sm rounded-lg ${
                    window.innerWidth <= 768 ? 'p-0' : 'p-6'
                  }`}>
                    <div key={currentQuestionIndex} id={`q${currentQuestionIndex}`} className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                      <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 break-words whitespace-pre-wrap">
                        Q{currentQuestionIndex + 1}: {testData.questions[currentQuestionIndex].text}
                      </h2>
                      {testData.questions[currentQuestionIndex].type === "objective" && (
                        <div className="space-y-2">
                          {testData.questions[currentQuestionIndex].options.map((option, optionIndex) => {
                            const isSelected = selectedAnswers[currentQuestionIndex] === option;
                            
                            return (
                              <div 
                                key={`question-${currentQuestionIndex}-option-${optionIndex}`}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors break-words whitespace-pre-wrap ${
                                  isSelected ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50 border-gray-200'
                                }`}
                                onClick={() => handleAnswerChange(currentQuestionIndex, option)}
                              >
                                <div className="flex items-center">
                                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                                    isSelected ? 'border-blue-500' : 'border-gray-400'
                                  }`}>
                                    {isSelected && (
                                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    )}
                                  </div>
                                  <span className="text-gray-700">{option}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {testData.questions[currentQuestionIndex].type === 'subjective' && (
                        <div className="mb-6">
                          <p className="text-lg font-medium mb-2">{testData.questions[currentQuestionIndex].text}</p>
                          {testData.questions[currentQuestionIndex].image && (
                            <div className="my-4 w-full flex justify-center">
                              <div className="relative w-full max-w-2xl mx-auto">
                                <img 
                                  src={testData.questions[currentQuestionIndex].image} 
                                  alt="Question image" 
                                  className="w-full h-auto object-contain rounded-lg border border-gray-700"
                                  style={{ 
                                    maxHeight: '400px',
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block'
                                  }}
                                  onError={(e) => {
                                    console.error('Error loading image:', e);
                                    e.target.style.display = 'none';
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'text-red-500 text-center p-4 bg-red-100 rounded-lg';
                                    errorDiv.textContent = 'Failed to load image. Please try refreshing the page.';
                                    e.target.parentNode.appendChild(errorDiv);
                                    
                                    // Log the image URL for debugging
                                    console.log('Failed image URL:', testData.questions[currentQuestionIndex].image);
                                  }}
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          )}
                          <textarea
                            value={subjectiveAnswers[currentQuestionIndex] || ''}
                            onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                            onFocus={() => setIsTextareaFocused(true)}
                            onBlur={() => setIsTextareaFocused(false)}
                            placeholder="Enter your answer here"
                            className="w-full p-3 border rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            style={{ minHeight: '100px', maxHeight: '200px' }}
                          />
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className={`px-3 sm:px-4 py-2 rounded transition-colors ${
                            review[currentQuestionIndex] 
                              ? "bg-yellow-500 hover:bg-yellow-600" 
                              : "bg-yellow-400 hover:bg-yellow-500"
                          } text-white text-sm sm:text-base`}
                          onClick={() => handleMarkForReview(currentQuestionIndex)}
                        >
                          {review[currentQuestionIndex] ? "Unmark Review" : "Mark for Review"}
                        </button>
                        <button
                          className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded hover:bg-gray-600 transition-colors text-sm sm:text-base"
                          onClick={() => handleClearResponse(currentQuestionIndex)}
                        >
                          Clear Response
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Navigation buttons for previous and next questions */}
                  <div className="flex justify-between items-center mt-6">
                    <button
                      onClick={handlePreviousQuestion}
                      className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white transition-all duration-200 transform hover:scale-105"
                      disabled={currentQuestionIndex === 0}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden sm:inline">Previous Question</span>
                      <span className="sm:hidden">Previous</span>
                    </button>

                    <button
                      onClick={handleNextQuestion}
                      className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white transition-all duration-200 transform hover:scale-105"
                      disabled={currentQuestionIndex === testData.questions.length - 1}
                    >
                      <span className="hidden sm:inline">Next Question</span>
                      <span className="sm:hidden">Next</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 5.293a1 1 0 010 1.414L10.586 10 7.293 13.293a1 1 0 011.414 1.414l4-4a1 1 0 000-1.414l-4-4a1 1 0 00-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Question Navigator with better styling */}
                <div className="md:col-span-1">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 sticky top-4">
                    <h3 className="text-xl font-semibold mb-4 text-center text-gray-200">
                      Questions Overview
                    </h3>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {testData.questions.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`p-3 rounded-lg transition-all duration-200 ${
                            currentQuestionIndex === index
                              ? 'bg-blue-500 text-white'
                              : selectedAnswers[index]
                              ? 'bg-green-500 text-white'
                              : review[index]
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex items-center space-x-2">
                        <FaCheckCircle className="text-green-500" />
                        <span>Answered</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaExclamationCircle className="text-yellow-500" />
                        <span>Marked for Review</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FaTimesCircle className="text-gray-500" />
                        <span>Not Attempted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Exit Confirmation</h2>
            <p className="text-gray-600 mb-6">
              Exiting fullscreen will submit your test. Are you sure you want to exit?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => handleExitConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExitConfirm(true)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Exit & Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Submit Test</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your test? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitConfirmed(true)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
      <CustomAlert
        isOpen={alert.show}
        onClose={() => setAlert({ show: false, type: '', title: '', message: '' })}
        type={alert.type}
        title={alert.title}
        message={alert.message}
      />

      {/* Entry Popup - Show after student details */}
      {showEntryPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Test Instructions</h2>
              <button
                onClick={() => {
                  setShowEntryPopup(false);
                  setTestStarted(true);
                  setTimeLeft(testData.duration * 60);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                Please read the following instructions carefully:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Do not switch tabs or windows during the test</li>
                <li>Do not use any external resources</li>
                <li>Complete all questions within the time limit</li>
                <li>Keyboard shortcuts are disabled during the test</li>
                <li>You can only type in the answer box for subjective questions</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Submission Popup */}
      {showSubmissionPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="text-center">
              {submissionStatus === 'success' ? (
                <>
                  <div className="text-green-500 text-5xl mb-4">✓</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Test Submitted Successfully!</h2>
                  <p className="text-gray-600 mb-4">Redirecting to home in {countdown} seconds...</p>
                </>
              ) : (
                <>
                  <div className="text-red-500 text-5xl mb-4">✕</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Submission Failed</h2>
                  <p className="text-gray-600 mb-4">Please try again or contact support</p>
                </>
              )}
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add violation warning modal */}
      {showViolationWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md text-center">
            <h2 className="text-xl font-bold mb-4 text-red-500">Inappropriate Behavior Detected!</h2>
            <p className="mb-4">Your test will be automatically submitted in {violationCountdown} seconds.</p>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
              <div 
                className="bg-red-500 h-2.5 rounded-full transition-all duration-1000" 
                style={{ width: `${(violationCountdown / 5) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">Please do not switch tabs or windows during the test.</p>
          </div>
        </div>
      )}
    </div>
  );
}






