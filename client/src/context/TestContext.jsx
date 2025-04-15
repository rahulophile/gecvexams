import { createContext, useContext, useState, useCallback } from 'react';

const TestContext = createContext({
  isVerified: false,
  verifiedRoom: null,
  setVerification: () => {}
});

export function TestProvider({ children }) {
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedRoom, setVerifiedRoom] = useState(null);

  const setVerification = useCallback((verified, room) => {
    setIsVerified(verified);
    setVerifiedRoom(room);
  }, []);

  const value = {
    isVerified,
    verifiedRoom,
    setVerification
  };

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