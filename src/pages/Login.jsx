import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2, Shield } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials: "include" is only needed if you use HTTP-Only Cookies. 
        // If it still fails, try commenting this line out.
        credentials: "include", 
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Auth Response Received:", data); // DEBUG LOG

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("ACCESS_REVOKED: This account has been deactivated.");
        }
        throw new Error(data.message || "Login Failed");
      }

      // Check for token in different possible fields
      const token = data.accessToken || data.token;

      if (!token) {
        console.error("Token missing in response:", data);
        throw new Error("SERVER_ERROR: No access token provided.");
      }

      // BROADCAST TO CONTEXT
      // This updates the central state so Navbar/Sidebar show up
      login(data.user, token); 

      toast.success(`Access Granted: Welcome ${data.user.name}`);

      // Short delay to ensure localStorage is written and toast is visible
      setTimeout(() => {
        navigate("/", { replace: true }); 
      }, 800);

    } catch (err) {
      console.error("Login Process Error:", err.message);
      toast.error(err.message, {
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0F172A] flex items-center justify-center p-4">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-900 mb-4 shadow-lg shadow-emerald-500/20">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase">SMA_Systems</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Secure_Access_Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Identity_Endpoint</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700"
                  placeholder="email@company.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Access_Cipher</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all mt-4 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  Authorize_Entry
                  <Shield size={12} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
              Protected by SMA_CORE Security Engine v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;