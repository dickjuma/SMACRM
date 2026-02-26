import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/http'; // Assuming this is your configured axios instance
import { authApi } from '../services/authApi'; // As seen in Profile.jsx

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The login function, called from the Login page
  const login = useCallback((userData, token) => {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  }, []);

  // The logout function, used in Navbar and here for session expiry
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionId');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  // A function to update user data across the app (e.g., after profile update)
  const updateUser = useCallback((updatedData) => {
    setUser(currentUser => ({ ...currentUser, ...updatedData }));
  }, []);

  // Effect to verify user on initial application load
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          // This call is based on Profile.jsx's usage of authApi
          const profileData = await authApi.getProfile();
          setUser(profileData);
        } catch (error) {
          console.error("Auth verification failed, logging out.", error);
          logout(); // Token is likely expired or invalid
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, [logout]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser
  }), [user, loading, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// The custom hook that components will use to access the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};