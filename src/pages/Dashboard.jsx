import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../services/http";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FileCheck,
  FileText,
  Mail,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Users
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Legend
} from "recharts";

const fetchDashboardStats = async () => {
  const { data } = await api.get("/dashboard/stats");
  return data?.data || data?.stats || {};
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatNumber = (value) => Number(value || 0).toLocaleString();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const Dashboard = () => {
  const [tokenChecked, setTokenChecked] = useState(false);
  const [graphEntity, setGraphEntity] = useState("invoices");
  const token = localStorage.getItem("token");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
    enabled: !!token
  });

  useEffect(() => {
    setTokenChecked(true);
  }, []);

  const stats = useMemo(
    () => ({
      clients: data?.clients || 0,
      quotations: data?.quotations || 0,
      invoices: data?.invoices || 0,
      receipts: data?.receipts || 0,
      emailsSent: data?.emailsSent || 0,
      activeClients: data?.activeClients || 0,
      invoiceTurnover: data?.invoiceTurnover || 0,
      quotationTurnover: data?.quotationTurnover || 0,
      receiptTurnover: data?.receiptTurnover || 0,
      outstandingInvoiceAmount: data?.outstandingInvoiceAmount || 0,
      collectionRate: data?.collectionRate || 0,
      invoiceGrowth: data?.invoiceGrowth || 0,
      recentActivity: data?.recentActivity || {},
      statusBreakdown: data?.invoiceStatusBreakdown || {}
    }),
    [data]
  );

  const collectionRateSafe = clamp(Number(stats.collectionRate || 0), 0, 100);
  const overdueShare = stats.invoices > 0 ? ((stats.statusBreakdown.overdue || 0) / stats.invoices) * 100 : 0;
  const activeClientRate = stats.clients > 0 ? (stats.activeClients / stats.clients) * 100 : 0;

  const volumeData = [
    { name: "Clients", value: stats.clients, color: "#3B82F6" },
    { name: "Quotes", value: stats.quotations, color: "#10B981" },
    { name: "Invoices", value: stats.invoices, color: "#F59E0B" },
    { name: "Receipts", value: stats.receipts, color: "#6366F1" },
    { name: "Emails", value: stats.emailsSent, color: "#06B6D4" }
  ];

  const overallDistributionData = [
    { name: "Clients", value: stats.clients, fill: "#3B82F6" },
    { name: "Active Clients", value: stats.activeClients, fill: "#8B5CF6" },
    { name: "Quotations", value: stats.quotations, fill: "#10B981" },
    { name: "Invoices", value: stats.invoices, fill: "#F59E0B" },
    { name: "Receipts", value: stats.receipts, fill: "#6366F1" },
    { name: "Emails", value: stats.emailsSent, fill: "#06B6D4" }
  ];

  const graphConfig = useMemo(() => {
    const config = {
      invoices: {
        title: "Invoices",
        color: "#1D4ED8",
        data: [
          { name: "Total Count", value: stats.invoices },
          { name: "Turnover", value: stats.invoiceTurnover },
          { name: "New (30d)", value: stats.recentActivity.newInvoicesLast30Days || 0 },
          { name: "Paid", value: stats.statusBreakdown.paid || 0 },
          { name: "Overdue", value: stats.statusBreakdown.overdue || 0 },
          { name: "Partial", value: stats.statusBreakdown.partial || 0 }
        ]
      },
      receipts: {
        title: "Receipts",
        color: "#059669",
        data: [
          { name: "Total Count", value: stats.receipts },
          { name: "Turnover", value: stats.receiptTurnover },
          { name: "New (30d)", value: stats.recentActivity.newReceiptsLast30Days || 0 }
        ]
      },
      quotations: {
        title: "Quotations",
        color: "#7C3AED",
        data: [
          { name: "Total Count", value: stats.quotations },
          { name: "Value", value: stats.quotationTurnover },
          { name: "New (30d)", value: stats.recentActivity.newQuotationsLast30Days || 0 }
        ]
      }
    };

    return config[graphEntity] || config.invoices;
  }, [graphEntity, stats]);

  if (!token && tokenChecked) {
    return <Navigate to="/login" replace />;
  }

  const activity30DayData = [
    { name: "Clients", value: stats.recentActivity.newClientsLast30Days || 0, color: "#3B82F6" },
    { name: "Invoices", value: stats.recentActivity.newInvoicesLast30Days || 0, color: "#F59E0B" },
    { name: "Quotations", value: stats.recentActivity.newQuotationsLast30Days || 0, color: "#7C3AED" },
    { name: "Receipts", value: stats.recentActivity.newReceiptsLast30Days || 0, color: "#10B981" },
    { name: "Emails", value: stats.recentActivity.newEmailsLast30Days || 0, color: "#06B6D4" }
  ];

  const alerts = [
    {
      id: "outstanding",
      active: stats.outstandingInvoiceAmount > stats.invoiceTurnover * 0.35 && stats.invoiceTurnover > 0,
      title: "Outstanding exposure is high",
      detail: `Outstanding is ${formatCurrency(stats.outstandingInvoiceAmount)} against ${formatCurrency(stats.invoiceTurnover)} invoiced.`
    },
    {
      id: "overdue",
      active: overdueShare > 20,
      title: "Overdue invoice ratio above threshold",
      detail: `Overdue ratio is ${overdueShare.toFixed(1)}% of total invoices.`
    },
    {
      id: "collection",
      active: collectionRateSafe < 60,
      title: "Collection efficiency needs attention",
      detail: `Collection rate is ${collectionRateSafe.toFixed(1)}%.`
    }
  ].filter((item) => item.active);

  const kpiCards = [
    { id: "clients", label: "Total Clients", value: formatNumber(stats.clients), meta: `${activeClientRate.toFixed(1)}% active ratio`, icon: <Users />, tone: "text-slate-700 bg-slate-50 border-slate-200", accent: "bg-slate-500", link: "/clients" },
    { id: "quotes", label: "Quotations", value: formatNumber(stats.quotations), meta: `${formatCurrency(stats.quotationTurnover)} quoted value`, icon: <FileText />, tone: "text-slate-700 bg-slate-50 border-slate-200", accent: "bg-slate-500", link: "/quotations" },
    { id: "invoices", label: "Invoices", value: formatNumber(stats.invoices), meta: `${formatCurrency(stats.invoiceTurnover)} invoiced`, icon: <FileCheck />, tone: "text-slate-700 bg-slate-50 border-slate-200", accent: "bg-slate-500", link: "/invoices" },
    { id: "receipts", label: "Receipts", value: formatNumber(stats.receipts), meta: `${formatCurrency(stats.receiptTurnover)} collected`, icon: <CreditCard />, tone: "text-slate-700 bg-slate-50 border-slate-200", accent: "bg-slate-500", link: "/receipts" },
    { id: "emails", label: "Emails Sent", value: formatNumber(stats.emailsSent), meta: `${formatNumber(stats.recentActivity.newEmailsLast30Days)} in last 30 days`, icon: <Mail />, tone: "text-slate-700 bg-slate-50 border-slate-200", accent: "bg-slate-500", link: "/fincomm" },
    { id: "active", label: "Active Clients", value: formatNumber(stats.activeClients), meta: `${collectionRateSafe.toFixed(1)}% collection rate`, icon: <Activity />, tone: "text-slate-700 bg-slate-50 border-slate-200", accent: "bg-slate-500", link: "/clients" }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      <header className="sticky top-0 z-20 h-16 border-b border-slate-200 bg-white/90 backdrop-blur-xl md:h-20">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-3 sm:px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 md:h-10 md:w-10">
              <ShieldCheck className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-tight text-slate-900 sm:text-sm md:text-lg">Executive Finance Dashboard</h1>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:block">SMA Performance Office</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 transition-colors hover:bg-white md:p-3"
          >
            <RefreshCcw className={`h-4 w-4 text-slate-500 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-2 pt-4 sm:space-y-6 sm:px-3 sm:pt-6 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-2 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mb-2 flex items-center justify-between px-1 sm:mb-3 sm:px-0">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 sm:text-sm">Executive Snapshot</h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Live</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map((card) => (
            <Link
              key={card.id}
              to={card.link}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:rounded-2xl sm:p-4 lg:p-5 sm:hover:shadow-xl"
            >
              <div className={`absolute left-0 top-0 h-full w-0.5 sm:w-1 ${card.accent}`} />
              <div className="flex items-start justify-between pl-1 sm:pl-2">
                <div className={`rounded-lg border p-1.5 ${card.tone} sm:rounded-xl sm:px-3 sm:py-2`}>
                  {React.cloneElement(card.icon, { className: "h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" })}
                </div>
                <ArrowUpRight className="hidden h-3 w-3 text-slate-300 transition-colors group-hover:text-slate-700 sm:block sm:h-4 sm:w-4" />
              </div>
              <p className="mt-1.5 pl-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-500 sm:mt-3 sm:pl-2 sm:text-[10px] sm:tracking-[0.16em] sm:text-slate-400 lg:mt-4">{card.label}</p>
              <p className="mt-0.5 pl-1 text-sm font-black tracking-tight text-slate-900 sm:mt-1 sm:pl-2 sm:text-xl md:text-2xl lg:text-3xl">{isLoading ? "..." : card.value}</p>
              <p className="mt-0.5 hidden pl-1 text-[9px] font-medium text-slate-500 sm:block sm:mt-1 sm:pl-2 sm:text-xs lg:text-sm">{isLoading ? "Loading insights..." : card.meta}</p>
            </Link>
          ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6 lg:p-7 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">Cross-Module Activity</h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">Reporting View</span>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "#F8FAFC" }}
                    contentStyle={{ borderRadius: "14px", border: "1px solid #E2E8F0", boxShadow: "0 8px 18px rgb(15 23 42 / 0.08)" }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={30}>
                    {volumeData.map((item, idx) => (
                      <Cell key={`bar-${idx}`} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">Overall Distribution</h3>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overallDistributionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                  />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={20} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Clients: <strong>{formatNumber(stats.clients)}</strong> | Active: <strong>{formatNumber(stats.activeClients)}</strong> | Quotations: <strong>{formatNumber(stats.quotations)}</strong> | Invoices: <strong>{formatNumber(stats.invoices)}</strong> | Receipts: <strong>{formatNumber(stats.receipts)}</strong> | Emails: <strong>{formatNumber(stats.emailsSent)}</strong>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">Financial Composition</h4>
              <select
                value={graphEntity}
                onChange={(e) => setGraphEntity(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="invoices">Invoices</option>
                <option value="receipts">Receipts</option>
                <option value="quotations">Quotations</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Showing {graphConfig.title.toLowerCase()} count, money value, and recent activity.
            </p>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphConfig.data} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip
                    formatter={(val, _name, item) => {
                      const metric = String(item?.payload?.name || "").toLowerCase();
                      const moneyMetric = metric.includes("turnover") || metric.includes("value");
                      return moneyMetric ? formatCurrency(val) : formatNumber(val);
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {graphConfig.data.map((item, idx) => (
                      <Cell key={`mix-${idx}`} fill={graphConfig.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">Risk Register</h4>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    No threshold breaches
                  </div>
                  <p className="mt-1 text-xs">All monitored indicators are currently within policy range.</p>
                </div>
              )}
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-center gap-2 text-rose-700 text-sm font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    {alert.title}
                  </div>
                  <p className="mt-1 text-xs text-rose-700">{alert.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="font-semibold text-slate-600">Management Note</p>
              <p className="mt-1 text-slate-500">
                Prioritize overdue recovery and maintain collections above 70% to preserve cash flow quality.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">30-Day Activity Summary</h4>
            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity30DayData}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={26}>
                    {activity30DayData.map((item, idx) => (
                      <Cell key={`activity-${idx}`} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">Executive Indicators</h4>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collection Rate</p>
                <p className="mt-1 font-bold text-slate-900">{collectionRateSafe.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Growth (30d)</p>
                <p className="mt-1 font-bold text-slate-900">{Number(stats.invoiceGrowth || 0).toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Client Penetration</p>
                <p className="mt-1 font-bold text-slate-900">{activeClientRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email Reach (30d)</p>
                <p className="mt-1 font-bold text-slate-900">{formatNumber(stats.recentActivity.newEmailsLast30Days)}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
