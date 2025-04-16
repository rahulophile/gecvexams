import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const TestContext = createContext({
  isVerified: false,
  verifiedRoom: null,
  setVerification: () => {},
  isInitialized: false
});

export function TestProvider({ children }) {
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedRoom, setVerifiedRoom] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize context
    setIsInitialized(true);
  }, []);

  const setVerification = useCallback((verified, room) => {
    setIsVerified(verified);
    setVerifiedRoom(room);
  }, []);

  const value = useMemo(() => ({
    isVerified,
    verifiedRoom,
    setVerification,
    isInitialized
  }), [isVerified, verifiedRoom, setVerification, isInitialized]);

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