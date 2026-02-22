import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Menu, Moon, Shield, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { getSidebarNavigationForRole } from "./navigationConfig";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const role = user?.role || "user";

  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_expanded");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebar_expanded", JSON.stringify(open));
  }, [open]);

  useEffect(() => {
    const root = window.document.documentElement;
    isDarkMode ? root.classList.add("dark") : root.classList.remove("dark");
    localStorage.setItem("theme_dark", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleLogout = () => {
    toast.success("Signing out...");
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 400);
  };

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed right-4 top-4 z-[160] rounded-lg bg-indigo-600 p-2.5 text-white shadow md:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`fixed left-0 top-0 z-[80] flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-[#0B1120] md:sticky md:top-16 md:h-[calc(100vh-4rem)] ${
          open ? "w-64" : "w-0 -translate-x-full md:w-20 md:translate-x-0"
        }`}
      >
        <div className="flex h-16 items-center border-b border-slate-200 px-4 dark:border-slate-800">
          <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white ${open ? "" : "mx-auto"}`}>
            <Shield size={16} />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {getSidebarNavigationForRole(role).map((group) => (
            <div key={group.title} className="mb-5">
              {open && (
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.link;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.link}
                      to={item.link}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      } ${!open ? "justify-center" : ""}`}
                      title={!open ? item.label : undefined}
                    >
                      <Icon size={18} />
                      {open && <span className="font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div
            className={`mb-3 flex items-center gap-2 rounded-lg bg-slate-100 p-2 dark:bg-slate-800 ${!open ? "justify-center" : ""}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white dark:bg-slate-700">
              {user?.name?.charAt(0) || "U"}
            </div>
            {open && (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{user?.name || "User"}</p>
                <p className="truncate text-[10px] uppercase tracking-wide text-slate-500">{user?.role || "Account"}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="flex justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="flex justify-center rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>

          <button
            onClick={() => setOpen((prev) => !prev)}
            className="mt-3 hidden w-full items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:flex"
            title="Collapse sidebar"
          >
            <ChevronLeft className={`${!open ? "rotate-180" : ""} transition-transform`} size={16} />
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-[70] bg-slate-950/50 md:hidden" onClick={() => setOpen(false)} />}
    </>
  );
};

export default Sidebar;
