import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Menu, Moon, Shield, Sun, X, User, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { getSidebarNavigationForRole } from "./navigationConfig";
import { getInitials, resolveAvatarUrl } from "../utils/avatar";

// Viewport detection helpers
const isDesktopViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
const isMobileViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const role = user?.role || "user";
  const isAdmin = role === "admin" || role === "superadmin";
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());

  // Sidebar open state – on desktop it's collapsible; on mobile it's overlay
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_expanded");
    if (saved !== null) return JSON.parse(saved);
    return isDesktopViewport();
  });

  // Dark mode state (syncs with root class)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Persist sidebar state on desktop only
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("sidebar_expanded", JSON.stringify(open));
    }
  }, [open, isMobile]);

  // Auto‑open sidebar when resizing from mobile to desktop
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const handleResize = (event) => {
      if (event.matches) setOpen(true);
    };
    media.addEventListener("change", handleResize);
    return () => media.removeEventListener("change", handleResize);
  }, []);

  // Handle mobile‑to‑desktop transition: close on mobile, restore saved state on desktop
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const handleMobileChange = (event) => {
      setIsMobile(event.matches);
      if (event.matches) {
        setOpen(false);
      } else {
        const saved = localStorage.getItem("sidebar_expanded");
        setOpen(saved !== null ? JSON.parse(saved) : true);
      }
    };
    media.addEventListener("change", handleMobileChange);
    return () => media.removeEventListener("change", handleMobileChange);
  }, []);

  // Close sidebar on navigation (mobile only)
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [location.pathname, isMobile]);

  // Prevent background scrolling when sidebar is open on mobile
  useEffect(() => {
    if (!isMobile) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open, isMobile]);

  // Close sidebar with Escape key on mobile
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && isMobile && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, open]);

  // Close sidebar when navbar menu opens (e.g., when profile dropdown opens)
  useEffect(() => {
    const onNavbarMenuOpen = () => {
      if (isMobile) setOpen(false);
    };
    window.addEventListener("sma:navbar-menu-open", onNavbarMenuOpen);
    return () => window.removeEventListener("sma:navbar-menu-open", onNavbarMenuOpen);
  }, [isMobile]);

  // Apply dark mode to root element and persist preference
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme_dark", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleLogout = () => {
    toast.success("Signing out...");
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 400);
  };

  const handleLinkClick = () => {
    if (isMobile) setOpen(false);
  };

  const userAvatar = user?.avatar ? resolveAvatarUrl(user.avatar) : null;
  const userInitials = getInitials(user?.name);

  return (
    <>
      {/* Mobile menu toggle button – visible only on small screens */}
      <button
        onClick={() => {
          const next = !open;
          if (next) {
            window.dispatchEvent(new CustomEvent("sma:mobile-menu-open"));
          }
          setOpen(next);
        }}
        className="fixed left-2 top-3 z-[200] inline-flex items-center justify-center rounded-lg bg-indigo-600 p-2 text-white shadow-xl ring-1 ring-indigo-500/40 transition-transform active:scale-95 md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed left-0 top-16 z-[80] flex h-[calc(100dvh-4rem)] flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-out dark:border-slate-800 dark:bg-[#0B1120] md:sticky md:top-16 md:h-[calc(100vh-4rem)] ${
          isMobile
            ? open
              ? "w-[85vw] max-w-[320px] translate-x-0 shadow-2xl"
              : "w-[85vw] max-w-[320px] -translate-x-full"
            : open
              ? "w-64"
              : "w-20"
        }`}
        aria-label="Main navigation"
      >
        {/* Sidebar header – SMA logo */}
        <div className="flex h-14 items-center border-b border-slate-200 px-3 dark:border-slate-800 md:h-16">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white transition-all sm:h-9 sm:w-9 ${
              open ? "" : "mx-auto"
            }`}
          >
            <Shield size={open ? 18 : 16} />
          </div>
          {open && (
            <span className="ml-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              SMA Core
            </span>
          )}
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {getSidebarNavigationForRole(role).map((group) => (
            <div key={group.title} className="mb-5">
              {open && (
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5 sm:space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.link;
                  const Icon = item.icon;
                  const linkClasses = `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  } ${!open && !isMobile ? "justify-center" : ""}`;

                  return (
                    <Link
                      key={item.link}
                      to={item.link}
                      className={linkClasses}
                      title={!open ? item.label : undefined}
                      onClick={handleLinkClick}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {open && <span className="truncate font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* System Logs for Admins */}
          {isAdmin && (
            <div className="mb-5">
              {open && (
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  System
                </p>
              )}
              <div className="space-y-0.5 sm:space-y-1">
                <Link
                  to="/systemlogs"
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    location.pathname === "/system-logs"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  } ${!open && !isMobile ? "justify-center" : ""}`}
                  title={!open ? "System Logs" : undefined}
                  onClick={handleLinkClick}
                >
                  <ClipboardList size={18} className="flex-shrink-0" />
                  {open && <span className="truncate font-medium">System Logs</span>}
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Footer: user info, theme toggle, logout, collapse button */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          {/* User profile summary – clickable to go to profile */}
          <Link
            to="/profile"
            onClick={handleLinkClick}
            className={`mb-3 flex items-center gap-2 rounded-lg bg-slate-100 p-2 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 ${
              !open ? "justify-center" : ""
            }`}
            title={!open ? "Profile" : undefined}
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={user?.name || "User"}
                className="h-8 w-8 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white dark:bg-slate-700">
                {userInitials}
              </div>
            )}
            {open && (
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-[10px] uppercase tracking-wide text-slate-500">
                  {user?.role || "Account"}
                </p>
              </div>
            )}
          </Link>

          {/* Theme toggle and logout buttons */}
          <div className={`grid gap-2 ${open ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="flex justify-center rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="flex justify-center rounded-lg border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Desktop collapse toggle */}
          {!isMobile && (
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="mt-3 hidden w-full items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:flex"
              title={open ? "Collapse sidebar" : "Expand sidebar"}
            >
              <ChevronLeft
                className={`transition-transform ${!open ? "rotate-180" : ""}`}
                size={16}
              />
            </button>
          )}
        </div>
      </aside>

      {/* Backdrop overlay for mobile – closes sidebar when tapped */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;