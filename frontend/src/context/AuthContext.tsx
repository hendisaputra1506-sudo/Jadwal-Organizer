import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index';
import { api } from '../services/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res: any = await api.get('/auth/me');
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch {
          // Token invalid or expired
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    }

    checkAuth();
  }, [token]);

  const login = async (username: string, password: string) => {
    const res: any = await api.post('/auth/login', { username, password });
    if (res.success && res.data) {
      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    api.post('/auth/logout').catch(() => {});
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
