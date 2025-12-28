import { useState, useEffect } from "react";
import { Shield, LogOut, Sun, Moon, Clock, ChevronDown, User, Activity, Bell, Search } from "lucide-react";
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
    <nav className="sticky top-0 z-[60] w-full border-b transition-all duration-300 bg-white/80 dark:bg-[#020617]/80 border-slate-200 dark:border-slate-800/60 backdrop-blur-xl">
      {/* The 'max-w-[1600px]' matches your App.js container.
          The 'px-4 md:px-8' ensures it doesn't hug the edges on small screens.
      */}
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:px-8">
        
        {/* LEFT: BRAND (Visible only on Desktop to avoid clutter with Sidebar toggle on Mobile) */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-black tracking-tighter dark:text-white uppercase">SMA.CORE</span>
          </div>
          
          {/* MOBILE SEARCH ICON (Visible only on mobile) */}
          <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">
            <Search size={20} />
          </button>
        </div>

        {/* CENTER: SEARCH BAR (Desktop Only) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
           <div className="relative w-full group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
             <input 
              type="text" 
              placeholder="Search financials or clients..." 
              className="w-full bg-slate-100 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-slate-900 border focus:border-indigo-500/50 rounded-xl py-2 pl-10 pr-4 text-xs font-medium outline-none transition-all"
             />
           </div>
        </div>

        {/* RIGHT: ACTIONS & PROFILE */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* NOTIFICATIONS */}
          <button className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group">
            <Bell size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-[#020617] animate-pulse"></span>
          </button>

          {/* THEME TOGGLE */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* DIVIDER (Desktop Only) */}
          <div className="hidden md:block h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>

          {/* USER PROFILE DROPDOWN TRIGGER */}
          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center gap-2 md:gap-3 pl-2 py-1 pr-1 rounded-full border transition-all ${
                profileOpen 
                ? "bg-slate-100 dark:bg-white/10 border-indigo-500/50" 
                : "bg-transparent border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 shadow-sm"
              }`}
            >
              {/* Name - Hidden on tiny screens */}
              <div className="hidden sm:flex flex-col items-end leading-none">
                <span className="text-[10px] font-black dark:text-white uppercase tracking-tight">
                  {user?.name || "Dickson Juma"}
                </span>
                <span className="text-[8px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">
                  {user?.role || "Administrator"}
                </span>
              </div>

              {/* Avatar */}
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shadow-inner">
                {user?.name?.charAt(0) || "D"}
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${profileOpen && 'rotate-180'}`} />
            </button>

            {/* DROPDOWN MENU */}
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-20 dark:border-slate-800 dark:bg-[#0B1120] animate-in fade-in slide-in-from-top-2 duration-200">
                  
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
                        <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                          {user?.email || "dickson.j@sma-core.io"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BODY: Status and Counter */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Activity size={12} className="text-emerald-500 animate-pulse" />
                        Session Live
                      </div>
                      <span className="text-[10px] font-mono font-black text-indigo-500">{formatTime(seconds)}</span>
                    </div>
                    
                    {/* Progress Bar (Purely Visual for 'Cool' factor) */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                       <div className="bg-indigo-500 h-full w-2/3 rounded-full animate-pulse"></div>
                    </div>
                  </div>

                  {/* FOOTER: Logout */}
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => { logout(); navigate("/login"); }}
                      className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/10 transition-all group"
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