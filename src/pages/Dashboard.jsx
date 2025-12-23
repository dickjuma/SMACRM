import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { 
  Users, FileText, FileCheck, CreditCard, 
  RefreshCcw, ArrowUpRight, ShieldCheck, Activity 
} from "lucide-react";

const API_URL = "http://localhost:5000/api/dashboard/stats";

const Dashboard = () => {
  // Initialize with 0 (Numbers) to avoid "Object" errors during initial render
  const [stats, setStats] = useState({ 
    clients: 0, 
    quotations: 0, 
    invoices: 0, 
    receipts: 0 
  });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");

  const fetchRealData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      
      // Validation: Ensure the data is assigned as numbers
      if (response.data) {
        setStats({
          clients: Number(response.data.clients) || 0,
          quotations: Number(response.data.quotations) || 0,
          invoices: Number(response.data.invoices) || 0,
          receipts: Number(response.data.receipts) || 0
        });
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      // Small UX delay to show the spinner
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData]);

  const cards = [
    { id: 1, label: "Total Clients", val: stats.clients, icon: <Users />, color: "text-blue-600", bg: "bg-blue-50", link: "/clients" },
    { id: 2, label: "Quotations", val: stats.quotations, icon: <FileText />, color: "text-emerald-600", bg: "bg-emerald-50", link: "/quotations" },
    { id: 3, label: "Invoices", val: stats.invoices, icon: <FileCheck />, color: "text-amber-600", bg: "bg-amber-50", link: "/invoices" },
    { id: 4, label: "Receipts", val: stats.receipts, icon: <CreditCard />, color: "text-indigo-600", bg: "bg-indigo-50", link: "/receipts" },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* FIXED HEADER */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-indigo-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">Control Center</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Real-time Database Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Database Status</p>
            <p className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Connected
            </p>
          </div>
          <button 
            onClick={fetchRealData}
            className="p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white transition-all shadow-sm group"
          >
            <RefreshCcw className={`w-5 h-5 text-slate-400 group-hover:text-indigo-600 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* KPI GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card) => (
              <Link 
                key={card.id} 
                to={card.link} 
                className="bg-white border border-slate-200 p-6 rounded-[2.5rem] hover:shadow-2xl hover:shadow-indigo-100 transition-all group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-8">
                  <div className={`${card.bg} ${card.color} p-4 rounded-2xl`}>
                    {React.cloneElement(card.icon, { size: 24 })}
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-500 transition-colors" />
                </div>
                
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                  {loading ? "..." : card.val.toLocaleString()}
                </h2>

                {/* Decorative background element */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                  {React.cloneElement(card.icon, { size: 120 })}
                </div>
              </Link>
            ))}
          </div>

          {/* RECENT MONITORING AREA */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10">
            <div className="flex items-center gap-3 mb-8">
              <Activity className="text-indigo-500 w-5 h-5" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">System Activity Log</h3>
            </div>
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 italic">Latest Synchronization: {lastSync || "Awaiting Data..."}</span>
                <span className="bg-white px-4 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase border border-slate-200">Secure Protocol v2</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CUSTOM SCROLLBAR CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default Dashboard;