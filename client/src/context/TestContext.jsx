import { createContext, useContext, useState } from 'react';

const TestContext = createContext();

export function TestProvider({ children }) {
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedRoom, setVerifiedRoom] = useState(null);

  return (
    <TestContext.Provider value={{ isVerified, setIsVerified, verifiedRoom, setVerifiedRoom }}>
      {children}
    </TestContext.Provider>
  );
}

export function useTest() {
  return useContext(TestContext);
} 