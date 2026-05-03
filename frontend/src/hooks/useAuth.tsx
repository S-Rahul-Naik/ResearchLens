import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  apiSignup,
  apiLogin,
  apiGetMe,
  apiUpdateProfile,
  apiUploadAvatar,
  apiUpdatePassword,
  getToken,
  setToken,
  clearToken,
  setUnauthorizedHandler,
  type AuthUser,
} from '../lib/api';

export type User = AuthUser;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthInitializing: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (name: string) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Restore session from stored JWT on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsAuthInitializing(false);
      return;
    }

    apiGetMe()
      .then(({ user: u }) => setUser(u))
      .catch(() => clearToken())
      .finally(() => setIsAuthInitializing(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { token, user: u } = await apiLogin(email, password);
      setToken(token);
      setUser(u);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const { token, user: u } = await apiSignup(name, email, password);
      setToken(token);
      setUser(u);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const updateProfile = async (name: string) => {
    try {
      const { user: updated } = await apiUpdateProfile(name);
      setUser(updated);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      const { user: updated } = await apiUploadAvatar(file);
      setUser(updated);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { token, user: updated } = await apiUpdatePassword(currentPassword, newPassword);
      setToken(token);
      setUser(updated);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthInitializing,
        login,
        signup,
        updateProfile,
        uploadAvatar,
        updatePassword,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

