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

  const calculateScore = useCallback(() => {
    if (!testData) return 0;

    let correct = 0;
    let incorrect = 0;
    let marksForCorrect = 0;
    let marksDeducted = 0;

    // Calculate for objective questions
    Object.entries(selectedAnswers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      const question = testData.questions[questionIndex];
      
      if (question.type === 'objective') {
        if (answer === testData.correctAnswers[questionIndex]) {
          correct++;
          marksForCorrect += testData.marksPerCorrect;
        } else {
          incorrect++;
          marksDeducted += testData.negativeMarking;
        }
      }
    });

    // Calculate for subjective questions
    Object.entries(subjectiveAnswers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      const question = testData.questions[questionIndex];
      
      if (question.type === 'subjective' && answer) {
        correct++;
        marksForCorrect += testData.marksPerCorrect;
      }
    });

    const finalScore = Math.max(0, marksForCorrect - marksDeducted);

    return {
      correct,
      incorrect,
      final: finalScore,
      negativeMarking: testData.negativeMarking,
      marksPerCorrect: testData.marksPerCorrect,
      marksForCorrect,
      marksDeducted
    };
  }, [testData, selectedAnswers, subjectiveAnswers]);

  const handleSubmit = useCallback(async () => {
    if (!testStarted) return;

    // Validate user details
    if (!userDetails || !userDetails.name || !userDetails.regNo || !userDetails.branch) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Missing Details',
        message: 'Please enter all your details before submitting the test.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      
      // Calculate scores
      const score = calculateScore();
      
      // Prepare submission data
      const submissionData = {
        roomNumber,
        regNo: userDetails.regNo,
        name: userDetails.name,
        branch: userDetails.branch,
        answers: {
          ...selectedAnswers,
          ...subjectiveAnswers
        },
        score: score
      };

      // Submit test
      const response = await fetch("https://exam-server-gecv.onrender.com/api/submit-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to submit test');
      }

      // Show success message
      setAlert({
        show: true,
        type: 'success',
        title: 'Test Submitted',
        message: 'Your test has been submitted successfully.'
      });

      // Wait for 2 seconds before navigation
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error("Error submitting test:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Submission Error',
        message: error.message || 'Failed to submit test. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [testStarted, userDetails, roomNumber, selectedAnswers, subjectiveAnswers, navigate, calculateScore]);

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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">Enter Your Details</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={userDetails.name}
                  onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Registration Number"
                  value={userDetails.regNo}
                  onChange={(e) => setUserDetails({ ...userDetails, regNo: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Branch"
                  value={userDetails.branch}
                  onChange={(e) => setUserDetails({ ...userDetails, branch: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <button
                  onClick={handleStudentDetailsSubmit}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                >
                  Submit Details
                </button>
              </div>
            </div>
          </div>
        );

      case 'instructions':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Test Instructions</h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Please read the following instructions carefully before starting the test:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li>The test duration is {testData?.duration} minutes.</li>
                  <li>Each correct answer carries {testData?.marksPerCorrect} marks.</li>
                  <li>Negative marking of {testData?.negativeMarking} marks for each wrong answer.</li>
                  <li>Do not switch tabs or windows during the test.</li>
                  <li>Do not use any external resources or devices.</li>
                  <li>Fullscreen mode will be enabled when you start the test.</li>
                  <li>You cannot go back once you start the test.</li>
                </ul>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={handleStartTest}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                  >
                    Start Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="min-h-screen bg-gray-100">
            {/* Test interface */}
            {/* ... existing test interface code ... */}
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
    <div className="min-h-screen bg-gray-100" ref={testContainerRef}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
        </>
      )}
    </div>
  );
}






