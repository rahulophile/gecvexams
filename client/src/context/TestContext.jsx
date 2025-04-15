import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const TestContext = createContext();

export function TestProvider({ children }) {
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedRoom, setVerifiedRoom] = useState(null);

  const setVerification = useCallback((verified, room) => {
    setIsVerified(verified);
    setVerifiedRoom(room);
  }, []);

  const value = useMemo(() => ({
    isVerified,
    verifiedRoom,
    setVerification
  }), [isVerified, verifiedRoom, setVerification]);

  return (
    <TestContext.Provider value={value}>
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