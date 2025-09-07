'use client';

import { useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Check for guest mode
    const guestMode = localStorage.getItem('guestMode');
    if (guestMode === 'true') {
      setIsGuest(true);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setIsGuest(false);
      localStorage.removeItem('guestMode');
      return result;
    } catch (error) {
      throw error;
    }
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    setLoading(false);
    localStorage.setItem('guestMode', 'true');
  };

  const logout = async () => {
    try {
      if (user) {
        await signOut(auth);
      }
      setIsGuest(false);
      localStorage.removeItem('guestMode');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user,
    loading,
    isGuest,
    login,
    loginAsGuest,
    logout,
    isAuthenticated: !!user || isGuest
  };
}