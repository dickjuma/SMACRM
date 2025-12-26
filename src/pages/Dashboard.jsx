import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, FileText, FileCheck, CreditCard, 
  RefreshCcw, ArrowUpRight, ShieldCheck, Activity, BarChart3
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip 
} from 'recharts';


const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); 
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/login"; 
    }
    return Promise.reject(error);
  }
);

const fetchDashboardStats = async () => {
  const { data } = await api.get("/dashboard/stats");
  return data;
};

const Dashboard = () => {

  const [lastSync, setLastSync] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false); // for token guard

  const token = localStorage.getItem("token");

  
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
    enabled: !!token,
  });

  // Set lastSync when data changes
  useEffect(() => {
    if (data) setLastSync(new Date().toLocaleTimeString());
  }, [data]);

  // ✅ Check token after hooks
  useEffect(() => {
    setTokenChecked(true);
  }, []);

  if (!token && tokenChecked) {
    // Redirect without ever skipping hooks
    return <Navigate to="/login" replace />;
  }

  // --- Prepare charts/cards ---
  const comparisonData = [
    { name: 'Clients', value: data?.clients || 0, color: '#3B82F6' },
    { name: 'Quotes', value: data?.quotations || 0, color: '#10B981' },
    { name: 'Invoices', value: data?.invoices || 0, color: '#F59E0B' },
    { name: 'Receipts', value: data?.receipts || 0, color: '#6366F1' },
  ];

  const cards = [
    { id: 1, label: "Total Clients", val: data?.clients || 0, icon: <Users />, color: "text-blue-600", bg: "bg-blue-50", link: "/clients" },
    { id: 2, label: "Quotations", val: data?.quotations || 0, icon: <FileText />, color: "text-emerald-600", bg: "bg-emerald-50", link: "/quotations" },
    { id: 3, label: "Invoices", val: data?.invoices || 0, icon: <FileCheck />, color: "text-amber-600", bg: "bg-amber-50", link: "/invoices" },
    { id: 4, label: "Receipts", val: data?.receipts || 0, icon: <CreditCard />, color: "text-indigo-600", bg: "bg-indigo-50", link: "/receipts" },
  ];

  // --- Render ---
  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <ShieldCheck className="text-indigo-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">Enterprise Ledger</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Live Intelligence Suite</p>
          </div>
        </div>

        <button 
          onClick={() => refetch()}
          className="p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white transition-all shadow-sm group"
        >
          <RefreshCcw className={`w-5 h-5 text-slate-400 group-hover:text-indigo-600 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card) => (
              <Link key={card.id} to={card.link} className="bg-white border border-slate-200 p-6 rounded-[2rem] hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>{card.icon}</div>
                  <ArrowUpRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-500" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                  {isLoading ? "..." : card.val.toLocaleString()}
                </h2>
              </Link>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Comparison Bar Chart */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <BarChart3 className="text-indigo-500 w-5 h-5" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Volume Distribution</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <Activity className="text-indigo-400 w-5 h-5" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">SMA Status</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-sm text-slate-400">Database Sync</span>
                      <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Operational
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-sm text-slate-400">Latest Sync Time</span>
                      <span className="text-sm font-bold">{lastSync || "Updating..."}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Powered by</span>
                      <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-500/30 uppercase">
                        SMA SYSTEMS
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-mono text-slate-500 leading-relaxed">
                  SYSTEM_DASHBOARD_V4: Connection established via encrypted tunnel. All ledger endpoints verified.
                </div>
              </div>
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px]" />
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default Dashboard;
