import { createContext, useContext, useState, useEffect } from 'react';
import { verifyCode } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessCode, setAccessCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('tadipaar_code');
    if (stored) {
      verifyCode(stored)
        .then(() => setAccessCode(stored))
        .catch(() => localStorage.removeItem('tadipaar_code'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (code) => {
    localStorage.setItem('tadipaar_code', code);
    setAccessCode(code);
  };

  const logout = () => {
    localStorage.removeItem('tadipaar_code');
    setAccessCode(null);
  };

  return (
    <AuthContext.Provider value={{ accessCode, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
