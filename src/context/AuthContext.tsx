'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { updateUserUsername } from '@/lib/firestore';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updateOwnPassword: (newPassword: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: async () => {},
  updateUsername: async () => {},
  updateOwnPassword: async () => {},
  isLoading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check active session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const sessionUser = await res.json();
          if (sessionUser) {
            setUser(sessionUser);
          }
        }
      } catch (err) {
        console.error('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        return false;
      }

      const data = await res.json();
      setUser(data.user);
      return true;
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError('Connection failed. Please try again.');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    if (!user) throw new Error('No logged in user');
    await updateUserUsername(user.uid, username);
    setUser((prev) => (prev ? { ...prev, username: username.trim() } : prev));
  }, [user]);

  const updateOwnPassword = useCallback(async (newPassword: string) => {
    if (!user) throw new Error('No logged in user');
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

    const res = await fetch(`/api/users/${user.uid}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update password');
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUsername, updateOwnPassword, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
