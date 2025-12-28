import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Users, FileText, FileCheck, CreditCard, Send, Menu, X, 
  Shield, LogOut, Settings, LayoutGrid,
  ChevronLeft, Search, Moon, Sun, Bell, Command, Sparkles, Activity
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext"; 
import toast from "react-hot-toast";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const searchInputRef = useRef(null);

  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_expanded");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Sync state with LocalStorage and DOM
  useEffect(() => {
    localStorage.setItem("sidebar_expanded", JSON.stringify(open));
    const root = window.document.documentElement;
    isDarkMode ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem("theme_dark", JSON.stringify(isDarkMode));
  }, [open, isDarkMode]);

  const navigationGroups = useMemo(() => [
    {
      group: "Workspace",
      items: [
        { label: "Dashboard", link: "/", icon: <LayoutGrid size={20} />, badge: null },
        { label: "Clients", link: "/clients", icon: <Users size={20} />, badge: "12" },
      ]
    },
    {
      group: "Financials",
      items: [
        { label: "Quotations", link: "/quotations", icon: <FileText size={20} />, badge: null },
        { label: "Invoices", link: "/invoices", icon: <FileCheck size={20} />, badge: "NEW" },
        { label: "Receipts", link: "/receipts", icon: <CreditCard size={20} />, badge: null },
      ]
    },
    {
      group: "Infrastructure",
      items: [
        { label: "SMA Mailer", link: "/fincomm", icon: <Send size={20} />, badge: "LIVE" },
        { label: "User Manager", link: "/useradmin", icon: <Settings size={20} />, badge: null },
      ]
    }
  ], []);

  const filteredNav = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  const handleLogout = () => {
    toast.success("Securing session data...");
    setTimeout(() => { logout(); navigate("/login"); }, 800);
  };

  return (
    <>
      {/* MOBILE TOGGLE - Elevated Z-index to beat any page content */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 right-4 z-[160] bg-indigo-600 text-white p-3 rounded-2xl shadow-xl active:scale-90 transition-all"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* SIDEBAR ASIDE - Using 'isolate' to prevent sub-element bleed */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-[150] isolate flex flex-col border-r
          ${open ? "w-72" : "w-0 -translate-x-full md:w-[96px] md:translate-x-0"}
          ${isDarkMode ? "bg-[#020617]/95 border-slate-800/50" : "bg-white/95 border-slate-200 shadow-2xl"}
          backdrop-blur-xl
        `}
      >
        {/* BRAND LOGO AREA */}
        <div className="h-24 flex items-center px-7 shrink-0 relative overflow-hidden">
          <div className={`flex items-center gap-4 ${!open && "md:justify-center w-full"}`}>
            <div className="relative group shrink-0">
              <div className="absolute -inset-1.5 bg-indigo-500 rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative w-11 h-11 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform">
                <Shield size={22} className="text-white" />
              </div>
            </div>
            
            {open && (
              <div className="flex flex-col animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-2">
                   <h2 className={`font-black tracking-tighter text-xl ${isDarkMode ? "text-white" : "text-slate-900"}`}>SMA.CORE</h2>
                   <Sparkles size={14} className="text-indigo-500 animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CRM</span>
              </div>
            )}
          </div>
        </div>

        {/* SEARCH BAR - Shortcut visual added */}
        <div className={`px-5 mb-8 transition-all ${!open && "opacity-0 invisible md:visible md:opacity-100"}`}>
          <div className={`group flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300
            ${isDarkMode ? "bg-slate-900/50 border-slate-800 focus-within:ring-2 ring-indigo-500/20" : "bg-slate-50 border-slate-200 focus-within:ring-2 ring-indigo-500/10"}`}>
            <Search size={18} className="text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
            {open ? (
              <input 
                type="text"
                placeholder="Find anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm outline-none w-full text-slate-300 placeholder:text-slate-600 font-bold"
              />
            ) : (
              <Command size={14} className="text-slate-600" />
            )}
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-8 no-scrollbar scroll-smooth">
          {filteredNav.map((group) => (
            <div key={group.group} className="space-y-2">
              {open && (
                <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 opacity-70">
                  {group.group}
                </p>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.link;
                  return (
                    <Link
                      key={item.link}
                      to={item.link}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative
                        ${isActive 
                          ? "bg-indigo-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.4)]" 
                          : isDarkMode ? "text-slate-400 hover:bg-white/[0.05] hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                        }`}
                    >
                      <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : ""}`}>
                        {item.icon}
                      </span>
                      
                      {open && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
                      
                      {/* Dynamic Badges */}
                      {open && item.badge && (
                        <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-lg font-black tracking-tighter
                          ${item.badge === 'NEW' || item.badge === 'LIVE' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip for Closed Mini-Sidebar */}
                      {!open && (
                        <div className="fixed left-28 px-4 py-2 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all shadow-2xl z-[160] translate-x-[-10px] group-hover:translate-x-0">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* SYSTEM STATUS & FOOTER */}
        <div className="p-6 mt-auto">
          <div className={`p-4 rounded-3xl transition-all border ${isDarkMode ? "bg-slate-900/60 border-slate-800/50" : "bg-slate-50 border-slate-200"}`}>
            <div className={`flex items-center gap-3 ${!open && "justify-center"}`}>
               <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-500 font-black text-xs border border-indigo-500/20">
                    {user?.name?.charAt(0) || "D"}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-[#020617] rounded-full"></div>
               </div>
               {open && (
                 <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{user?.name || "Dickson Juma"}</p>
                    <div className="flex items-center gap-1.5">
                       <Activity size={10} className="text-emerald-500 animate-pulse" />
                       <span className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">System is Up & Optimal</span>
                    </div>
                 </div>
               )}
            </div>

            {open && (
              <div className="grid grid-cols-3 gap-2 mt-5">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex justify-center p-2.5 rounded-xl bg-slate-800/40 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button className="flex justify-center p-2.5 rounded-xl bg-slate-800/40 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all">
                  <Bell size={18} />
                </button>
                <button onClick={handleLogout} className="flex justify-center p-2.5 rounded-xl bg-slate-800/40 hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-all">
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setOpen(!open)} 
            className="hidden md:flex items-center justify-center w-full mt-6 group py-2"
          >
            <div className={`p-2 rounded-full transition-all duration-300 ${isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
              <ChevronLeft className={`text-slate-500 transition-transform duration-500 ${!open && "rotate-180"}`} />
            </div>
          </button>
        </div>
      </aside>

      {/* MOBILE BACKDROP */}
      {open && <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md md:hidden z-[140]" onClick={() => setOpen(false)} />}
    </>
  );
};

export default Sidebar;