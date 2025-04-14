import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const AdminPanel = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Verify token on component mount
    const verifyAccess = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const response = await fetch('https://exam-server-gecv.onrender.com/api/verify-admin', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('isAdminLoggedIn');
          navigate('/');
        }
      } catch (error) {
        console.error('Verification failed:', error);
        navigate('/');
      }
    };

    verifyAccess();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdminLoggedIn');
    navigate('/');
  };

  const handleCreateTest = () => {
    navigate('/create-test');
  };

  const handleViewResponses = () => {
    navigate('/view-responses');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <button 
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition duration-200"
            >
              Logout
            </button>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition duration-200">
              <h2 className="text-xl font-semibold mb-4">Create New Test</h2>
              <p className="text-gray-400 mb-6">Create a new test with objective and subjective questions.</p>
              <button 
                onClick={handleCreateTest}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
              >
                Create Test
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition duration-200">
              <h2 className="text-xl font-semibold mb-4">View Test Responses</h2>
              <p className="text-gray-400 mb-6">View and analyze student responses for all tests.</p>
              <button 
                onClick={handleViewResponses}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-200"
              >
                View Responses
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 