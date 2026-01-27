import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api"; // Import the configured axios instance

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Use the configured api service instead of fetch
      const response = await api.post("/auth/login", {
        email,
        password,
        rememberMe
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Login failed");
      }

      // Your backend returns token and user
      const token = data.token;
      const userData = data.user;
      const sessionId = data.sessionId;
      const expiresIn = data.expiresIn;

      if (!token || !userData) {
        throw new Error("Invalid response from server");
      }

      // Store rememberMe preference if needed
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        // Optionally store refresh token if your backend provides one
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('refreshToken');
      }

      // Store session info if needed
      if (sessionId) {
        localStorage.setItem('sessionId', sessionId);
      }

      // Call your auth context login
      login(userData, token);

      toast.success(`Welcome ${userData.name}!`);

      // Simple redirect after login
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);

    } catch (err) {
      console.error("Login error:", err);
      
      // Handle specific error messages from backend
      let errorMessage = err.message || "Login failed. Please try again.";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Map backend error codes to user-friendly messages
        const errorMessages = {
          'VALIDATION_ERROR': 'Please check your input and try again.',
          'INVALID_CREDENTIALS': 'Invalid email or password.',
          'ACCOUNT_DEACTIVATED': 'Your account has been deactivated. Please contact administrator.',
          'USER_NOT_FOUND': 'No account found with this email.',
          'SERVER_ERROR': 'Server error. Please try again later.',
          'TOO_MANY_ATTEMPTS': 'Too many login attempts. Please try again later.'
        };
        
        if (errorData.error && errorMessages[errorData.error]) {
          errorMessage = errorMessages[errorData.error];
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        // Log validation errors for debugging
        if (errorData.details) {
          console.log('Validation errors:', errorData.details);
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle demo login (optional - for testing)
  const handleDemoLogin = async () => {
    setEmail("demo@example.com");
    setPassword("demo123");
    
    // Auto-submit after a delay
    setTimeout(() => {
      const event = new Event('submit', { cancelable: true });
      document.querySelector('form').dispatchEvent(event);
    }, 100);
  };

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-500/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400 text-sm">Sign in to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6" onKeyPress={handleKeyPress}>
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                placeholder="Enter your email"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                placeholder="Enter your password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500 focus:ring-2"
                disabled={loading}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-400">
                Remember me
              </label>
            </div>
            <button
              type="button"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
              onClick={() => navigate("/forgot-password")}
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Demo Login Button (Optional - remove in production) */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors duration-200"
            >
              Try demo account
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center pt-4 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">
              Don't have an account?{" "}
              <button
                type="button"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
                onClick={() => navigate("/register")}
                disabled={loading}
              >
                Sign up
              </button>
            </p>
          </div>
        </form>
      </div>

      {/* Version Info */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-500">
        v1.0.0
      </div>

      {/* Simple CSS animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.2; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.5; }
        }
        .animate-float {
          animation: float 10s infinite ease-in-out;
        }
        
        /* Smooth focus styles */
        input:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        /* Disabled state */
        input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Login;