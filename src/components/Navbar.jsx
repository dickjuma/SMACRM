import { useState, useEffect } from "react";
import { Shield, LogOut, Sun, Moon, Clock, ChevronDown, User, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // --- THEME LOGIC ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    isDarkMode ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem("theme_dark", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // --- SESSION COUNTER ---
  useEffect(() => {
    const timer = setInterval(() => setSeconds(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b transition-all duration-300 bg-white dark:bg-[#020617] border-slate-200 dark:border-slate-800/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-8">
        
        {/* BRAND */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-black tracking-tighter dark:text-white uppercase">SMA.CORE</span>
        </div>

        {/* ACTIONS & PROFILE */}
        <div className="flex items-center gap-4">
          
          {/* THEME TOGGLE */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* USER PROFILE DROPDOWN TRIGGER */}
          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center gap-3 pl-3 py-1 pr-1 rounded-full border transition-all ${
                profileOpen 
                ? "bg-slate-100 dark:bg-white/10 border-indigo-500/50" 
                : "bg-transparent border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] font-black dark:text-white uppercase tracking-tight">
                  {user?.name || "Dickson Juma"}
                </span>
                <span className="text-[8px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">
                  {user?.role || "Administrator"}
                </span>
              </div>
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                {user?.name?.charAt(0) || "D"}
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${profileOpen && 'rotate-180'}`} />
            </button>

            {/* THE ENTERPRISE DROPDOWN */}
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-20 dark:border-slate-800 dark:bg-[#0B1120] animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* HEADER: Identity */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                        <User size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black dark:text-white uppercase tracking-tight">
                          {user?.name || "Dickson Juma"}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {user?.email || "dickson.j@sma-core.io"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BODY: Session Status */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Activity size={12} className="text-emerald-500 animate-pulse" />
                        Status
                      </div>
                      <span className="text-[9px] font-black text-emerald-500 uppercase">Active Now</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-2 text-center">Active In</p>
                      <div className="flex items-center justify-center gap-2 text-indigo-500 font-mono text-lg font-black italic">
                        <Clock size={16} />
                        <span>{formatTime(seconds)}</span>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER: Action */}
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => { logout(); navigate("/login"); }}
                      className="flex w-full items-center justify-center gap-3 rounded-lg py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/10 transition-all group"
                    >
                      <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                      Terminate Session
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;