import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Test from './pages/Test'
import CreateTest from './pages/CreateTest'
import ViewTestResponses from './pages/ViewTestResponses'
import AdminPanel from './pages/AdminPanel'
import ProtectedRoute from './components/ProtectedRoute'
import { TestProvider } from './context/TestContext'



function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <TestProvider>
      <Routes>
        <Route path='/' element={<Home/>} />
        <Route path='/test/:roomNumber' element={<Test/>} />
        <Route 
          path='/create-test' 
          element={
            <ProtectedRoute>
              <CreateTest/>
            </ProtectedRoute>
          } 
        />
        <Route 
          path='/view-responses' 
          element={
            <ProtectedRoute>
              <ViewTestResponses/>
            </ProtectedRoute>
          } 
        />
        <Route 
          path='/admin-panel' 
          element={
            <ProtectedRoute>
              <AdminPanel/>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TestProvider>
  )
}

export default App
