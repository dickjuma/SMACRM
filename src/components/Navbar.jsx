import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
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
import api from "../services/http";
import socketService from "../services/socket";
import { getRouteSearchIndexForRole } from "./navigationConfig";
import { getInitials, resolveAvatarUrl } from "../utils/avatar";

const toEpoch = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const getSeverity = (item = {}) => {
  if (item?.severity) return String(item.severity).toLowerCase();
  if (String(item?.status || "").toLowerCase() === "failed") return "high";
  if (["delete", "auth"].includes(String(item?.actionType || "").toLowerCase())) return "medium";
  return "low";
};

const buildNotification = (item = {}) => {
  const createdAt = item?.createdAt || item?.timestamp || new Date().toISOString();
  return {
    id: item?.id || item?._id || `${item?.module || "system"}-${createdAt}`,
    title: item?.module ? String(item.module).toUpperCase() : "SYSTEM",
    message: item?.message || item?.action || "Activity update",
    actor: item?.actorName || item?.user || "System",
    module: item?.module || "system",
    actionType: item?.actionType || "activity",
    status: item?.status || "success",
    severity: getSeverity(item),
    createdAt,
    timeAgo: item?.timeAgo || "just now"
  };
};

const applyNotificationPrefs = (rows = [], prefs = {}) =>
  rows.filter((item) => {
    if (!prefs.emailNotifications) return false;
    const message = String(item?.message || "").toLowerCase();
    const moduleName = String(item?.module || "").toLowerCase();
    const actionType = String(item?.actionType || "").toLowerCase();
    if (!prefs.newClientCreated && moduleName === "clients" && actionType === "create") return false;
    if (!prefs.invoicePaid && moduleName === "invoices" && message.includes("paid")) return false;
    if (!prefs.invoiceOverdue && moduleName === "invoices" && message.includes("overdue")) return false;
    return true;
  });

const Navbar = () => {
  const { user, logout } = useAuth();
  const role = String(user?.role || "user").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    invoicePaid: true,
    invoiceOverdue: true,
    newClientCreated: true
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const profileItems = useMemo(() => {
    const items = [{ label: "Profile", to: "/profile", icon: <User size={15} /> }];
    if (isAdmin) items.push({ label: "User Management", to: "/useradmin", icon: <Users size={15} /> });
    items.push({ label: "Settings", to: "/settings", icon: <Settings size={15} /> });
    return items;
  }, [isAdmin]);

  useEffect(() => {
    const root = window.document.documentElement;
    isDarkMode ? root.classList.add("dark") : root.classList.remove("dark");
    localStorage.setItem("theme_dark", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setNotificationOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setNotificationOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const key = `notif_last_read_${user?._id || "anon"}`;
    const stored = Number(localStorage.getItem(key) || 0);
    setLastReadAt(stored);
  }, [user?._id]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    socketService.connect();
    const unsubActivity = socketService.on("activity:new", (payload) => {
      const next = buildNotification(payload || {});
      setNotifications((prev) => {
        if (prev.some((item) => item.id === next.id)) return prev;
        return [next, ...prev].slice(0, 100);
      });
    });
    return () => {
      unsubActivity?.();
      socketService.disconnect();
    };
  }, [isAdmin]);

  const fetchNotifications = async () => {
    if (!isAdmin) {
      setNotifications([]);
      return;
    }

    try {
      setNotificationsLoading(true);
      const [activityResponse, settingsResponse] = await Promise.all([
        api.get("/admin/activity", { params: { limit: 60 } }),
        api.get("/settings")
      ]);

      const prefs = settingsResponse?.data?.data?.notifications || {};
      setNotificationPrefs((prev) => ({ ...prev, ...prefs }));

      const rows = activityResponse?.data?.notifications || [];
      const mergedPrefs = { ...notificationPrefs, ...prefs };
      const filteredRows = applyNotificationPrefs(rows, mergedPrefs).map(buildNotification);
      setNotifications(filteredRows);
    } catch (error) {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return undefined;
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 20000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  const unreadCount = notifications.filter((item) => toEpoch(item.createdAt) > Number(lastReadAt || 0)).length;

  const markAllRead = () => {
    const nextRead = Date.now();
    const key = `notif_last_read_${user?._id || "anon"}`;
    localStorage.setItem(key, String(nextRead));
    setLastReadAt(nextRead);
  };

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
      <div className="mx-auto flex h-16 w-full max-w-[1800px] items-center gap-3 px-4 md:px-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Shield size={16} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">SMA Core</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Enterprise Console</p>
          </div>
        </button>

        <form onSubmit={handleSearchSubmit} className="ml-auto hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find module (clients, invoices, receipts)"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </form>

        <button
          onClick={() => setIsDarkMode((prev) => !prev)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Toggle theme"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {isAdmin && (
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                const next = !notificationOpen;
                setNotificationOpen(next);
                if (next) markAllRead();
              }}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-rose-500 px-1.5 text-center text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 max-h-[520px] w-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">Admin Notifications</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
                    >
                      Mark read
                    </button>
                    <button
                      onClick={fetchNotifications}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
                <div className="max-h-[460px] overflow-y-auto">
                  {notificationsLoading && (
                    <p className="px-4 py-3 text-sm text-slate-500">Loading notifications...</p>
                  )}
                  {!notificationsLoading && notifications.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-500">No recent notifications.</p>
                  )}
                  {!notificationsLoading &&
                    notifications.map((item) => (
                      <div key={item.id} className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{item.title}</p>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              item.severity === "high"
                                ? "bg-rose-100 text-rose-700"
                                : item.severity === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.severity}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                          <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{item.actor || "System"}</span>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {item.actionType || "activity"}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{item.module || "system"}</span>
                          <span>{item.timeAgo}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {resolveAvatarUrl(user?.avatar) ? (
              <img
                src={resolveAvatarUrl(user?.avatar)}
                alt={user?.name || "Profile"}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-slate-700">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{user?.name || "User"}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{user?.role || "Account"}</p>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
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
    </header>
  );
};

export default Navbar;
