import { createContext, useContext, useState, useCallback } from 'react';

const TestContext = createContext();

export function TestProvider({ children }) {
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedRoom, setVerifiedRoom] = useState(null);

  const setVerification = useCallback((verified, room) => {
    setIsVerified(verified);
    setVerifiedRoom(room);
  }, []);

  return (
    <TestContext.Provider value={{ 
      isVerified, 
      verifiedRoom, 
      setVerification 
    }}>
      {children}
    </TestContext.Provider>
  );
}

export function useTest() {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
} 