import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  // Configure axios to include token in all requests
  useEffect(() => {
    if (token) {
      // Set default Authorization header for all axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      // Remove Authorization header if no token
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = (userData, accessToken) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    // Set axios header immediately
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  };

  const logout = async () => {
    try {
      // Call logout API endpoint if token exists
      if (token) {
        await axios.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with client-side logout even if API fails
    } finally {
      // Clear local storage
      localStorage.clear();
      // Clear axios headers
      delete axios.defaults.headers.common['Authorization'];
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
      const response = await axios.post('/auth/refresh', {
        refreshToken: localStorage.getItem('refreshToken')
      });
      
      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
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
      refreshToken,
      isAuthenticated: !!token 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);