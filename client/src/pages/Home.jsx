import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { useNavigate } from "react-router-dom";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import CustomAlert from '../components/CustomAlert';
import { useTest } from '../context/TestContext';

export default function Home() {
  const [isJoinOpen, setJoinOpen] = useState(false);
  const [isAdminOpen, setAdminOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', title: '', message: '' });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setVerification } = useTest();

  const verifyRoom = async () => {
    if (!roomNumber.trim()) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Missing Room Number',
        message: 'Please enter a room number.'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`https://exam-server-gecv.onrender.com/api/verify-room/${roomNumber}`);
      const data = await res.json();
      
      if (data.success) {
        if (data.inGracePeriod) {
          setAlert({
            show: true,
            type: 'warning',
            title: 'Grace Period',
            message: data.message
          });
          setVerification(true, roomNumber);
          setTimeout(() => {
            navigate(`/test/${roomNumber}`);
          }, 3000);
        } else {
          setVerification(true, roomNumber);
          navigate(`/test/${roomNumber}`);
        }
      } else if (data.testEnded) {
        setAlert({
          show: true,
          type: 'error',
          title: 'Test Ended',
          message: `This test was conducted on ${data.testInfo.date} at ${data.testInfo.time} for ${data.testInfo.duration} minutes. The test officially ended at ${data.testInfo.endTime}, and the grace period ended at ${data.testInfo.graceEndTime}.`
        });
      } else if (data.notStarted) {
        setAlert({
          show: true,
          type: 'info',
          title: 'Test Not Started',
          message: `This test will start on ${data.startTime.date} at ${data.startTime.time}. Time remaining: ${data.startTime.days} days, ${data.startTime.hours} hours, and ${data.startTime.minutes} minutes.`
        });
      } else {
        setAlert({
          show: true,
          type: 'error',
          title: 'Invalid Room',
          message: 'The room number you entered does not exist.'
        });
      }
    } catch (error) {
      console.error("Error verifying room:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Server Error',
        message: 'Failed to verify room. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async () => {
    if (!adminId || !adminPass) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Missing Credentials',
        message: 'Please enter both Admin ID and Password.'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://exam-server-gecv.onrender.com/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminId, password: adminPass }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("isAdminLoggedIn", "true");
        navigate("/admin-panel");
      } else {
        setAlert({
          show: true,
          type: 'error',
          title: 'Login Failed',
          message: 'Please check your credentials and try again.'
        });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Server Error',
        message: 'Unable to connect to server. Please try again later.'
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="animate-float1 absolute -top-4 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        <div className="animate-float2 absolute top-1/2 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        <div className="animate-float3 absolute -bottom-8 left-1/2 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen px-4 space-y-8 pb-20">
        {/* Logo or title section */}
        <div className="text-center space-y-4 animate-fadeIn">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            GEC Vaishali Live Test
          </h1>
          <p className="text-xl text-gray-300">
            Join our challenges and test your skills!
          </p>
        </div>

        {/* Buttons */}
        <div className="space-x-6 animate-fadeIn">
          <button 
            onClick={() => setJoinOpen(true)} 
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Join Test
          </button>
          <button 
            onClick={() => setAdminOpen(true)} 
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Admin Login
          </button>
        </div>

        {/* Developer info */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/90 to-transparent backdrop-blur-sm py-4 text-center space-y-2 animate-fadeIn">
          <p className="text-gray-400">Developed with ❤️ and ☕️ by <span style="color: "blue":">Coding Club</span></p>
          <div className="flex justify-center space-x-4">
            <a 
              href="https://github.com/rahulophile" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaGithub size={24} />
            </a>
            <a 
              href="https://linkedin.com/in/rahulophile" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaLinkedin size={24} />
            </a>
          </div>
        </div>

        {/* Enter Room Modal */}
        <Dialog 
          open={isJoinOpen} 
          onClose={() => setJoinOpen(false)} 
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 z-50"
        >
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl transform transition-all animate-modalSlide">
            <div className="relative p-6">
              <button 
                onClick={() => setJoinOpen(false)} 
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Enter Test Room</h2>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Room Number" 
                  value={roomNumber} 
                  onChange={(e) => setRoomNumber(e.target.value)} 
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-800"
                />
                
                <button 
                  onClick={verifyRoom} 
                  disabled={loading} 
                  className={`w-full py-3 rounded-lg text-white font-medium transition-all ${
                    loading 
                      ? "bg-blue-400 cursor-not-allowed" 
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-[0.98]"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : "Join Test"}
                </button>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Admin Login Modal */}
        <Dialog 
          open={isAdminOpen} 
          onClose={() => setAdminOpen(false)} 
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 z-50"
        >
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl transform transition-all animate-modalSlide">
            <div className="relative p-6">
              <button 
                onClick={() => setAdminOpen(false)} 
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Login</h2>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={adminId} 
                  onChange={(e) => setAdminId(e.target.value)} 
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-800"
                />
                
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={adminPass} 
                    onChange={(e) => setAdminPass(e.target.value)} 
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-800"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                
                <button 
                  onClick={adminLogin} 
                  disabled={loading} 
                  className={`w-full py-3 rounded-lg text-white font-medium transition-all ${
                    loading 
                      ? "bg-blue-400 cursor-not-allowed" 
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-[0.98]"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Logging in...
                    </span>
                  ) : "Login"}
                </button>
              </div>
            </div>
          </div>
        </Dialog>

        <CustomAlert
          isOpen={alert.show}
          onClose={() => setAlert({ show: false, type: '', title: '', message: '' })}
          type={alert.type}
          title={alert.title}
          message={alert.message}
        />
      </div>
    </div>
  );
}
