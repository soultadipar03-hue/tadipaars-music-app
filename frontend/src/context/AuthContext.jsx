import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessCode, setAccessCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Never persist the code — always require manual entry on load
    setLoading(false);
  }, []);

  const login = (code) => {
    setAccessCode(code);
  };

  const logout = () => {
    setAccessCode(null);
  };

  return (
    <AuthContext.Provider value={{ accessCode, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
