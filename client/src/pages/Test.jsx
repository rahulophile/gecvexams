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
  const { isVerified, verifiedRoom, isInitialized } = useTest();
  const { roomNumber } = useParams();
  const navigate = useNavigate();
  const [testStage, setTestStage] = useState('details'); // 'details', 'instructions', 'test'
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
  const [showEntryPopup, setShowEntryPopup] = useState(true);
  const [showSubmissionPopup, setShowSubmissionPopup] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationCountdown, setViolationCountdown] = useState(5);
  const testContainerRef = useRef(null);
  const [showTestInstructions, setShowTestInstructions] = useState(false);
  const [studentDetailsSubmitted, setStudentDetailsSubmitted] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [autoSaveInterval, setAutoSaveInterval] = useState(null);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [showSubmissionSummary, setShowSubmissionSummary] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!isInitialized) return;

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
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`https://exam-server-gecv.onrender.com/api/get-test/${roomNumber}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error("Failed to fetch test data");
        }

        const data = await res.json();
        if (data.success) {
          setTestData(data.test);
          setShowEntryPopup(true);
        } else {
          setAlert({ 
            show: true, 
            type: 'error', 
            title: 'Error', 
            message: data.message || 'Failed to load test data' 
          });
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching test:", error);
        setAlert({ 
          show: true, 
          type: 'error', 
          title: 'Server Error', 
          message: 'Unable to connect to server' 
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTest();
  }, [roomNumber, navigate, isVerified, verifiedRoom, isInitialized]);

  useEffect(() => {
    if (testData && !testStarted) {
      setTimeLeft(testData.duration * 60);
    }
  }, [testData, testStarted]);

  const updateTimer = useCallback(() => {
    setTimeLeft(prev => Math.max(prev - 1, 0));
  }, []);

  const calculateScore = () => {
    if (!testData || !testData.questions) return 0;
    
    let totalScore = 0;
    
    // Calculate score for objective questions
    Object.entries(selectedAnswers).forEach(([questionIndex, answer]) => {
      const question = testData.questions[parseInt(questionIndex)];
      if (!question || question.type !== 'objective') return;
      
      if (answer === question.correctAnswer) {
        totalScore += question.marks;
      }
    });
    
    // Calculate score for subjective questions
    Object.entries(subjectiveAnswers).forEach(([questionIndex, answer]) => {
      const question = testData.questions[parseInt(questionIndex)];
      if (!question || question.type !== 'subjective') return;
      
      // For subjective questions, we'll just count them as answered
      // The actual grading will be done by the teacher
      if (answer && answer.trim() !== '') {
        totalScore += question.marks;
      }
    });
    
    return totalScore;
  };

  // Add auto-save functionality
  useEffect(() => {
    if (testStarted) {
      const interval = setInterval(async () => {
        try {
          await autoSaveProgress();
          setLastSavedTime(new Date());
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      }, 300000); // Auto-save every 5 minutes

      setAutoSaveInterval(interval);
      return () => clearInterval(interval);
    }
  }, [testStarted]);

  const autoSaveProgress = async () => {
    try {
      const response = await fetch("https://exam-server-gecv.onrender.com/api/save-progress", {
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
          currentQuestionIndex
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save progress");
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      throw error;
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!testStarted) return;

    // Show submission confirmation dialog
    setShowSubmitConfirm(true);
  }, [testStarted]);

  const confirmSubmit = async () => {
    setShowSubmitConfirm(false);
    setShowSubmissionSummary(true);
  };

  const finalizeSubmission = async () => {
    try {
      setIsSubmitting(true);
      setSubmissionProgress(0);
      setSubmissionError(null);

      // Check if test has expired
      if (timeLeft <= 0) {
        throw new Error("Test time has expired. Your responses will be submitted automatically.");
      }

      // Validate test data
      if (!testData || !testData.questions || testData.questions.length === 0) {
        throw new Error("Test data is not available. Please refresh the page and try again.");
      }

      // Validate user details
      if (!userDetails || !userDetails.name || !userDetails.regNo || !userDetails.branch) {
        throw new Error("Please enter all your details before submitting the test.");
      }

      // Check if registration number is already used
      const checkResponse = await fetch("https://exam-server-gecv.onrender.com/api/check-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          roomNumber,
          regNo: userDetails.regNo
        })
      });

      const checkData = await checkResponse.json();
      if (!checkData.success) {
        throw new Error(checkData.message || "This registration number has already submitted the test.");
      }

      // Check if test time has expired on server
      const timeCheckResponse = await fetch(`https://exam-server-gecv.onrender.com/api/verify-room/${roomNumber}`);
      const timeCheckData = await timeCheckResponse.json();
      
      if (!timeCheckData.success) {
        if (timeCheckData.testEnded) {
          throw new Error("Test time has expired. Submissions are no longer accepted.");
        } else if (timeCheckData.notStarted) {
          throw new Error("Test has not started yet.");
        }
      }

      // Prepare answers object with default empty values for unanswered questions
      const allAnswers = {};
      testData.questions.forEach((_, index) => {
        allAnswers[index] = selectedAnswers[index] || subjectiveAnswers[index] || null;
      });

      // Prepare submission data
      const submissionData = {
        roomNumber,
        userDetails: {
          name: userDetails.name,
          regNo: userDetails.regNo,
          branch: userDetails.branch
        },
        answers: allAnswers
      };

      // Submit test with retry mechanism
      let success = false;
      let error = null;

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          setSubmissionProgress((i / MAX_RETRIES) * 100);
          const response = await fetch("https://exam-server-gecv.onrender.com/api/submit-test", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(submissionData)
          });

          const data = await response.json();
          
          if (data.success) {
            success = true;
            setSubmissionStatus('success');
            setShowSubmissionPopup(true);
            setCountdown(10);
            
            // Show success message
            setAlert({
              show: true,
              type: 'success',
              title: 'Test Submitted',
              message: 'Your test has been submitted successfully.'
            });
            
            break;
          } else {
            error = data.message || "Failed to submit test";
            if (i < MAX_RETRIES - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (err) {
          error = err.message;
          if (i < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!success) {
        throw new Error(error || "Failed to submit test after multiple attempts");
      }

    } catch (error) {
      console.error("Error submitting test:", error);
      setSubmissionError(error.message);
      setAlert({
        show: true,
        type: 'error',
        title: 'Submission Error',
        message: error.message || 'Failed to submit test. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmissionSummary(false);
    }
  };

  useEffect(() => {
    if (!testStarted || timeLeft === null) return;

    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [testStarted, timeLeft, updateTimer, handleSubmit]);

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

  const handleStudentDetailsSubmit = async () => {
    if (!userDetails.name || !userDetails.regNo || !userDetails.branch) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Missing Details',
        message: 'Please fill in all the required details.'
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
      if (data.exists) {
        setAlert({
          show: true,
          type: 'error',
          title: 'Registration Error',
          message: 'This registration number has already taken the test.'
        });
        return;
      }

      setTestStage('instructions');
    } catch (error) {
      console.error("Error checking registration:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Server Error',
        message: 'Failed to verify registration. Please try again.'
      });
    }
  };

  const handleStartTest = async () => {
    setTestStage('test');
    setTestStarted(true);
    enterFullscreen();
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
      if (e.key === 'Escape' && testStarted) {
        e.preventDefault();
        handleSubmit();
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

  const renderCurrentStage = () => {
    switch (testStage) {
      case 'details':
        return (
          <div className="relative container mx-auto px-4 py-8">
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
                  onClick={handleStudentDetailsSubmit}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
                >
                  Submit Details
                </button>
              </div>
            </div>
          </div>
        );

      case 'instructions':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">Test Instructions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">General Instructions:</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>You have {testData.duration} minutes to complete the test.</li>
                    <li>Do not switch tabs or windows during the test.</li>
                    <li>Do not use any external resources.</li>
                    <li>Do not copy/paste or take screenshots.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Scoring Information:</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Each correct answer gives you {testData.marksPerCorrect} mark(s).</li>
                    <li>Each wrong answer deducts {testData.negativeMarking} mark(s).</li>
                    <li>Unanswered questions do not affect your score.</li>
                    <li>Your final score cannot go below 0.</li>
                  </ul>
                </div>

                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    onClick={handleStartTest}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition duration-200"
                  >
                    Begin Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="relative container mx-auto px-4 py-8">
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
                        <h2 className="text-base sm:text-lg font-semibold sm:font-bold mb-4 text-gray-800 break-words whitespace-pre-wrap">
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
                                    <span className="text-sm sm:text-base text-gray-700">{option}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {testData.questions[currentQuestionIndex].type === 'subjective' && (
                          <div className="mb-6">
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

                  {/* Question Navigator */}
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
        );

      default:
        return null;
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

      {isLoading ? (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      ) : (
        <>
          {renderCurrentStage()}
          <CustomAlert
            isOpen={alert.show}
            onClose={() => setAlert({ show: false, type: '', title: '', message: '' })}
            type={alert.type}
            title={alert.title}
            message={alert.message}
          />
          {/* Submission Confirmation Dialog */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Confirm Submission</h2>
                <p className="mb-4">Are you sure you want to submit your test? This action cannot be undone.</p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSubmit}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submission Summary */}
          {showSubmissionSummary && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Test Submission Summary</h2>
                
                {/* Progress Bar */}
                {isSubmitting && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${submissionProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Submitting your test... {Math.round(submissionProgress)}%</p>
                  </div>
                )}

                {/* Error Message */}
                {submissionError && (
                  <div className="mb-4 p-4 bg-red-900/50 rounded-lg">
                    <p className="text-red-400">{submissionError}</p>
                  </div>
                )}

                {/* Summary Content */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Your Details</h3>
                      <p>Name: {userDetails.name}</p>
                      <p>Registration No: {userDetails.regNo}</p>
                      <p>Branch: {userDetails.branch}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Test Progress</h3>
                      <p>Questions Attempted: {Object.keys(selectedAnswers).length + Object.keys(subjectiveAnswers).length}</p>
                      <p>Questions Marked for Review: {Object.keys(review).length}</p>
                      <p>Time Remaining: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</p>
                    </div>
                  </div>

                  {/* Last Saved Time */}
                  {lastSavedTime && (
                    <p className="text-sm text-gray-400">
                      Last auto-saved: {lastSavedTime.toLocaleTimeString()}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 mt-6">
                    <button
                      onClick={() => setShowSubmissionSummary(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Back to Test
                    </button>
                    <button
                      onClick={finalizeSubmission}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Test'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showSubmissionPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="mb-4">
                    <FaCheckCircle className="text-green-500 text-6xl mx-auto" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Test Submitted Successfully!</h2>
                  <p className="text-gray-400 mb-4">
                    Redirecting to home page in {countdown} seconds...
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Home Page
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}






