import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  User,
  Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getRouteSearchIndexForRole, getSidebarNavigationForRole } from "./navigationConfig";
import { getInitials, resolveAvatarUrl } from "../utils/avatar";

const Navbar = () => {
  const { user, logout } = useAuth();
  const role = String(user?.role || "user").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const profileItems = useMemo(() => {
    const items = [{ label: "Profile", to: "/profile", icon: <User size={15} /> }];
    if (isAdmin) items.push({ label: "User Management", to: "/useradmin", icon: <Users size={15} /> });
    items.push({ label: "Settings", to: "/settings", icon: <Settings size={15} /> });
    return items;
  }, [isAdmin]);

  const mobileNavItems = useMemo(() => {
    const roleNavItems = getSidebarNavigationForRole(role).flatMap((group) => group.items);
    const seen = new Set();
    const merged = [];

    [...profileItems, ...roleNavItems].forEach((item) => {
      const target = item.to || item.link;
      if (!target || seen.has(target)) return;
      seen.add(target);

      const iconNode = (() => {
        if (!item.icon) return <User size={15} />;
        if (typeof item.icon === "object" && item.icon.$$typeof && "props" in item.icon) return item.icon;
        const Icon = item.icon;
        return <Icon size={15} />;
      })();

      merged.push({
        label: item.label,
        to: target,
        icon: iconNode
      });
    });

    return merged;
  }, [profileItems, role]);

  // Dark mode sync
  useEffect(() => {
    const root = window.document.documentElement;
    isDarkMode ? root.classList.add("dark") : root.classList.remove("dark");
    localStorage.setItem("theme_dark", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Outside click handler
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Close dropdowns when mobile menu opens
  useEffect(() => {
    const onMobileMenuOpen = () => {
      setProfileOpen(false);
    };
    window.addEventListener("sma:mobile-menu-open", onMobileMenuOpen);
    return () => window.removeEventListener("sma:mobile-menu-open", onMobileMenuOpen);
  }, []);

  // Close dropdowns on navigation
  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const match = getRouteSearchIndexForRole(role).find((route) => route.label.toLowerCase().includes(query));
    if (match) {
      navigate(match.link);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-[90] border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0F172A]/95">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col">
        {/* Top row */}
        <div className="flex items-center gap-1 py-1 pl-14 pr-2 sm:py-2 sm:pl-14 sm:pr-3 md:gap-3 md:py-0 md:pl-14 lg:px-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 sm:gap-2 sm:px-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Shield size={16} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-sm">
                SMA Core
              </p>
              <p className="hidden text-[10px] uppercase tracking-[0.14em] text-slate-500 xs:block sm:hidden">
                SMA
              </p>
              <p className="hidden text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:block">
                Enterprise Console
              </p>
            </div>
          </button>

          {/* Desktop search */}
          <form onSubmit={handleSearchSubmit} className="ml-auto hidden max-w-md flex-1 lg:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find module (clients, invoices, receipts)"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setProfileOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      window.dispatchEvent(new CustomEvent("sma:navbar-menu-open"));
                    }
                    return next;
                  });
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-1.5 py-1.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 sm:gap-2 sm:px-2"
              >
                {resolveAvatarUrl(user?.avatar) ? (
                  <img
                    src={resolveAvatarUrl(user?.avatar)}
                    alt={user?.name || "Profile"}
                    className="h-7 w-7 rounded-lg object-cover sm:h-8 sm:w-8"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-slate-700 sm:h-8 sm:w-8">
                    {getInitials(user?.name)}
                  </div>
                )}
                <div className="hidden text-left lg:block">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{user?.name || "User"}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {user?.role || "Account"}
                  </p>
                </div>
                <ChevronDown size={14} className="hidden text-slate-500 lg:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 max-h-[75dvh] w-[min(94vw,360px)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{user?.name || "User"}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {user?.role || "Account"}
                    </p>
                  </div>

                  <div className="hidden md:block">
                    {profileItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => navigate(item.to)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="md:hidden">
                    <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                      All Menu
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {mobileNavItems.map((item) => (
                        <button
                          key={item.to}
                          onClick={() => navigate(item.to)}
                          className="flex w-full items-center gap-2 rounded-md border border-slate-200 px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        <form onSubmit={handleSearchSubmit} className="w-full px-2 pb-1 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </form>
      </div>
    </header>
  );
};

export default Navbar;