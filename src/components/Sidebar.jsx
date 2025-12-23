import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Users, FileText, FileCheck, CreditCard, Send, Menu, X, 
  Shield, Cpu, LogOut, LogIn, Settings, LayoutGrid,
  ChevronLeft, Search, Moon, Sun, Bell
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext"; 
import toast from "react-hot-toast";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const searchInputRef = useRef(null);

  // --- 1. PERSISTENCE & THEME LOGIC ---
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_expanded");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Apply Sidebar state to LocalStorage
  useEffect(() => {
    localStorage.setItem("sidebar_expanded", JSON.stringify(open));
  }, [open]);

  // Apply Dark Mode to the HTML Document Root
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem("theme_dark", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Keyboard Shortcut: CMD/CTRL + K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- 2. NAVIGATION DEFINITION ---
  const navigationGroups = useMemo(() => [
    {
      group: "Workspace",
      items: [
        { label: "Dashboard", link: "/", icon: <LayoutGrid size={18} /> },
        { label: "Clients", link: "/clients", icon: <Users size={18} /> },
      ]
    },
    {
      group: "Financials",
      items: [
        { label: "Quotations", link: "/quotations", icon: <FileText size={18} /> },
        { label: "Invoices", link: "/invoices", icon: <FileCheck size={18} /> },
        { label: "Receipts", link: "/receipts", icon: <CreditCard size={18} /> },
      ]
    },
    {
      group: "Infrastructure",
      items: [
        { label: "SMA.Core Mailer", link: "/fincomm", icon: <Send size={18} /> },
        { label: "User Manager", link: "/useradmin", icon: <Settings size={18} />},
      ]
    }
  ], []);

  // --- 3. FILTER LOGIC (SEARCH + ROLES) ---
  const filteredNav = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase());
      const userRole = user?.role?.toLowerCase() || "user";
      const isAllowed = !item.adminOnly || userRole === 'admin';
      return matchesSearch && isAllowed;
    })
  })).filter(group => group.items.length > 0);

  const handleLogout = () => {
    toast.success("Terminating secure session...");
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 500);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-5 right-5 z-[70] bg-indigo-600 text-white p-3 rounded-xl shadow-lg"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div
        className={`fixed md:sticky top-0 left-0 h-screen transition-all duration-300 ease-in-out z-50 flex flex-col
          ${open ? "w-72" : "w-0 -translate-x-full md:w-24 md:translate-x-0"}
          ${isDarkMode ? "bg-slate-950 border-white/5" : "bg-white border-slate-200"} border-r
        `}
      >
        {/* Brand/Logo */}
        <div className="h-20 flex items-center px-6 mb-4">
          <div className={`flex items-center gap-3 ${!open && "md:justify-center w-full"}`}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
              <Shield size={20} className="text-white" />
            </div>
            {open && (
              <div className="overflow-hidden animate-in fade-in duration-500">
                <h2 className={`font-bold tracking-tight text-xl ${isDarkMode ? "text-white" : "text-slate-900"}`}>SMA.CORE</h2>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Enterprise v2</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {open && (
          <div className="px-6 mb-6">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${isDarkMode ? "bg-white/5 border-white/5 focus-within:border-indigo-500/50" : "bg-slate-100 border-slate-200 focus-within:border-indigo-500"}`}>
              <Search size={14} className="text-slate-500" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs outline-none w-full text-slate-400 placeholder:text-slate-600"
              />
              <kbd className="text-[10px] font-sans text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded">⌘K</kbd>
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-4 space-y-7 no-scrollbar">
          {filteredNav.map((group) => (
            <div key={group.group} className="space-y-1">
              {open && (
                <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  {group.group}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.link;
                return (
                  <Link
                    key={item.link}
                    to={item.link}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative ${
                      isActive 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                        : isDarkMode ? "text-slate-400 hover:bg-white/5 hover:text-slate-100" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className={`${isActive ? "text-white" : "text-slate-500 group-hover:text-indigo-400"}`}>
                      {item.icon}
                    </span>
                    {open && <span className="text-sm font-medium">{item.label}</span>}
                    {!open && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Panel */}
        <div className={`p-4 mt-auto border-t ${isDarkMode ? "border-white/5" : "border-slate-100"}`}>
          <div className={`flex flex-col gap-2 p-2 rounded-2xl ${isDarkMode ? "bg-white/5" : "bg-slate-50"}`}>
            <div className="flex items-center gap-3 p-2">
               <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0) || "U"}
               </div>
               {open && (
                 <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{user?.name || "System User"}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase">{user?.role || "Standard"}</p>
                 </div>
               )}
            </div>

            {open && (
              <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex justify-center p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors">
                  {isDarkMode ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} />}
                </button>
                <button className="flex justify-center p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors">
                  <Bell size={16} />
                </button>
                <button onClick={handleLogout} className="flex justify-center p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
          
          <button onClick={() => setOpen(!open)} className="hidden md:flex items-center justify-center w-full mt-4 py-2 text-slate-500 hover:text-indigo-500 transition-colors">
            <ChevronLeft size={20} className={`transition-transform duration-500 ${!open && "rotate-180"}`} />
          </button>
        </div>
      </div>

      {open && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-40" onClick={() => setOpen(false)} />}
    </>
  );
};

export default Sidebar;