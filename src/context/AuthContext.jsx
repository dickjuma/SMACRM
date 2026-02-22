import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi } from "../services/authApi";
import { setAccessToken, clearAuthStorage } from "../services/http";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  useEffect(() => {
    if (token) setAccessToken(token);
  }, [token]);

  const login = (userData, accessToken) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    setAccessToken(accessToken);
  };

  const updateUser = (nextUser) => {
    if (!nextUser) return;
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = async () => {
    try {
      if (token) await authApi.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with client-side logout even if API fails
    } finally {
      clearAuthStorage();
      // Clear state
      setToken(null);
      setUser(null);
      // Redirect to login
      window.location.href = '/login';
    }
  };

  // Function to refresh token (optional)
  const refreshToken = async () => {
    try {
      const response = await authApi.refreshToken(localStorage.getItem('refreshToken'));
      
      const newToken = response.token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setAccessToken(newToken);
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      updateUser,
      refreshToken,
      isAuthenticated: !!token 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
