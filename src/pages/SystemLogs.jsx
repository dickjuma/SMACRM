import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/http";
import socketService from "../services/socket";
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Terminal,
  Clock,
  User,
  Database,
  Server,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Calendar as CalendarIcon,
  X as XIcon
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

// Helper to determine severity color
const getSeverityColor = (severity, status) => {
  const s = String(severity || "").toLowerCase();
  const st = String(status || "").toLowerCase();
  
  if (st === "failed" || s === "high" || s === "critical") return "text-red-500 bg-red-50 border-red-100";
  if (s === "medium" || s === "warning") return "text-amber-500 bg-amber-50 border-amber-100";
  return "text-emerald-500 bg-emerald-50 border-emerald-100";
};

const SystemLogs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ search: "", module: "all", severity: "all" });
  const [dateRange, setDateRange] = useState(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [stats, setStats] = useState({ total: 0, errors: 0, warnings: 0 });
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const scrollRef = useRef(null);
  const datePickerRef = useRef(null);

  // Read search query from URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userSearch = params.get('search');
    if (userSearch) {
      setFilter(prev => ({ ...prev, search: userSearch }));
    }
  }, [location.search]);

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState(filter.search);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filter.search);
    }, 500);
    return () => clearTimeout(handler);
  }, [filter.search]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filter.module !== "all") params.append("module", filter.module);
      if (filter.severity !== "all") params.append("severity", filter.severity);
      if (dateRange?.from) {
        params.append("startDate", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        params.append("endDate", endOfDay.toISOString());
      }
      
      const response = await api.get(`/admin/activity?${params.toString()}`);
      const data = response?.data?.notifications || response?.data?.activities || [];
      
      setLogs(data);
      updateStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      toast.error("Could not load system logs");
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (data) => {
    const errors = data.filter(l => l.severity === 'high' || l.status === 'failed').length;
    const warnings = data.filter(l => l.severity === 'medium').length;
    setStats({ total: data.length, errors, warnings });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (debouncedSearch) params.set('search', debouncedSearch); else params.delete('search');
    if (filter.module !== 'all') params.set('module', filter.module); else params.delete('module');
    if (filter.severity !== 'all') params.set('severity', filter.severity); else params.delete('severity');
    if (dateRange?.from) params.set('from', dateRange.from.toISOString().split('T')[0]); else params.delete('from');
    if (dateRange?.to) params.set('to', dateRange.to.toISOString().split('T')[0]); else params.delete('to');
    navigate({ search: params.toString() }, { replace: true });

    fetchLogs();
  }, [debouncedSearch, filter.module, filter.severity, dateRange]);

  // Close date picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearFilters = () => {
    setFilter({ search: "", module: "all", severity: "all" });
    setDateRange(undefined);
  };

  const toggleRow = (id) => {
    setExpandedRowId(prev => prev === id ? null : id);
  };

  const copyToClipboard = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success("Payload copied to clipboard");
  };

  const hasActiveFilters = filter.search || filter.module !== "all" || filter.severity !== "all" || dateRange;

  // Real-time updates
  useEffect(() => {
    if (!isLive) return;

    socketService.connect();
    const unsub = socketService.on("activity:new", (payload) => {
      if (!payload) return;
      
      setLogs(prev => {
        const newLog = {
          ...payload,
          id: payload._id || payload.id || Date.now(),
          createdAt: payload.createdAt || new Date().toISOString()
        };
        
        // Apply client-side filtering for live updates
        if (filter.module !== "all" && newLog.module !== filter.module) return prev;
        if (filter.severity !== "all" && newLog.severity !== filter.severity) return prev;
        
        const updated = [newLog, ...prev].slice(0, 200); // Keep last 200
        updateStats(updated);
        setLastUpdate(new Date());
        return updated;
      });
    });

    return () => {
      unsub?.();
      socketService.disconnect();
    };
  }, [isLive, filter.module, filter.severity]);

  const handleExport = () => {
    const csvContent = [
      ["Timestamp", "Module", "Action", "User", "Status", "Message"],
      ...logs.map(log => [
        log.createdAt,
        log.module,
        log.actionType,
        log.actorName || "System",
        log.status,
        `"${log.message?.replace(/"/g, '""')}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system_logs_${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-mono text-sm">
      {/* Header Section */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="h-6 w-6 text-slate-700" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Logs</h1>
          </div>
          <p className="mt-1 text-slate-500">
            Real-time tracking of system activities, user actions, and security events.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-slate-200 shadow-sm">
            <div className={`h-2.5 w-2.5 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
            <span className="text-xs font-medium text-slate-600">
              {isLive ? "Live Stream" : "Paused"}
            </span>
          </div>
          <button 
            onClick={() => setIsLive(!isLive)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            title={isLive ? "Pause updates" : "Resume updates"}
          >
            {isLive ? <Activity size={18} /> : <RefreshCw size={18} />}
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Database size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Events</p>
              <p className="text-xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Warnings</p>
              <p className="text-xl font-bold text-slate-900">{stats.warnings}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Critical Errors</p>
              <p className="text-xl font-bold text-slate-900">{stats.errors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filter.module}
          onChange={(e) => setFilter(prev => ({ ...prev, module: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="all">All Modules</option>
          <option value="auth">Auth</option>
          <option value="users">Users</option>
          <option value="invoices">Invoices</option>
          <option value="clients">Clients</option>
          <option value="system">System</option>
        </select>

        <select
          value={filter.severity}
          onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="all">All Severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <CalendarIcon size={16} className="text-slate-500" />
            <span className="text-slate-700">
              {dateRange?.from ? (
                dateRange.to ? (
                  `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                "Select date range"
              )}
            </span>
            {dateRange && (
              <button onClick={(e) => { e.stopPropagation(); setDateRange(undefined); }} className="ml-1 text-slate-400 hover:text-slate-600">
                <XIcon size={14} />
              </button>
            )}
          </button>
          {showDatePicker && (
            <div className="absolute z-10 mt-2 rounded-xl border bg-white shadow-lg">
              <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            <XIcon size={16} />
            Clear Filters
          </button>
        )}

        <div className="ml-auto text-xs text-slate-400 flex items-center gap-1">
          <Clock size={12} />
          Last updated: {format(lastUpdate, "HH:mm:ss")}
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3 w-40">Timestamp</th>
                <th className="px-4 py-3 w-32">Module</th>
                <th className="px-4 py-3 w-48">User</th>
                <th className="px-4 py-3">Action Details</th>
                <th className="px-4 py-3 w-24 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
                    Loading system activity...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                    No logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedRowId === (log.id || log._id);
                  return (
                  <React.Fragment key={log.id || log._id}>
                  <tr onClick={() => toggleRow(log.id || log._id)} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${isExpanded ? "bg-slate-50" : ""}`}>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {format(new Date(log.createdAt), "MMM dd, HH:mm:ss")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 uppercase tracking-wide border border-slate-200">
                        {log.module || "System"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                          {(log.actorName || "S").charAt(0)}
                        </div>
                        <button 
                          onClick={() => setFilter(prev => ({ ...prev, search: log.actorName || "System" }))}
                          className="text-slate-700 font-medium truncate max-w-[150px] hover:text-indigo-600 hover:underline text-left"
                          title={`Filter by ${log.actorName || "System"}`}
                        >
                          {log.actorName || "System"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-medium">{log.message || log.action}</span>
                        <span className="text-xs text-slate-500 font-mono mt-0.5">
                          {log.actionType?.toUpperCase()} {log.target ? `• ${log.target}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getSeverityColor(log.severity, log.status)}`}>
                        {log.status || "Success"}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50">
                      <td colSpan="5" className="px-4 py-3 border-b border-slate-100">
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                              <Code size={14} />
                              Full Event Payload
                            </div>
                            <button onClick={(e) => copyToClipboard(JSON.stringify(log, null, 2), e)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Copy JSON">
                              <Copy size={14} />
                            </button>
                          </div>
                          <pre className="text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap break-all bg-slate-50 p-3 rounded border border-slate-100 max-h-96 overflow-y-auto">{JSON.stringify(log, null, 2)}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;