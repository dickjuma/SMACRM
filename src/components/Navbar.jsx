import { useState, useEffect } from "react";
import { Shield, LogOut, Sun, Moon, Clock, ChevronDown, User, Activity, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="sticky top-0 z-[110] isolate w-full border-b bg-white/80 dark:bg-[#020617]/90 border-slate-200 dark:border-slate-800/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg"><Shield className="h-4 w-4 text-white" /></div>
          <span className="text-xs font-black dark:text-white uppercase tracking-tighter hidden sm:block">SMA.CORE</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500"><Bell size={18} /><span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-[#020617]"></span></button>
          
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-3 pl-3 py-1 pr-1 rounded-full border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-black dark:text-white uppercase hidden md:block">{user?.name || "Dickson Juma"}</div>
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">{user?.name?.charAt(0) || "D"}</div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 mb-2">
                  <p className="text-xs font-black dark:text-white uppercase">{user?.name || "Dickson Juma"}</p>
                  <p className="text-[10px] text-slate-500">{user?.role || "Administrator"}</p>
                </div>
                <button onClick={() => { logout(); navigate("/login"); }} className="flex w-full items-center gap-3 p-3 text-red-500 text-[10px] font-black uppercase hover:bg-red-500/10 rounded-xl transition-all">
                  <LogOut size={16} /> Terminate Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;