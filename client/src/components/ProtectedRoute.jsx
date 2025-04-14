import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          navigate('/');
          return;
        }

        const response = await fetch('https://exam-server-gecv.onrender.com/api/verify-admin', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // If token verification fails, clear storage and redirect
          localStorage.removeItem('adminToken');
          localStorage.removeItem('isAdminLoggedIn');
          navigate('/');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('isAdminLoggedIn');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  const isLoggedIn = localStorage.getItem('adminToken');
  return isLoggedIn ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
