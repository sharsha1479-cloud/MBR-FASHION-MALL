import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getUserFromStorage, login as loginRequest, removeUserFromStorage, signup as signupRequest } from '../services/auth';

type AuthUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role: 'admin' | 'user';
  token: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthUser>;
  signup: (data: { name: string; email: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getUserFromStorage());

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user?.token),
    login: async (credentials) => {
      const loggedInUser = await loginRequest(credentials);
      setUser(loggedInUser);
      return loggedInUser;
    },
    signup: async (data) => {
      const signedUpUser = await signupRequest(data);
      setUser(signedUpUser);
      return signedUpUser;
    },
    logout: () => {
      removeUserFromStorage();
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
