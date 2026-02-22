import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import {
  Send, Mail, Check, Paperclip, Briefcase, Loader2,
  AlertCircle, Menu, LayoutGrid, X, RefreshCw, Shield, Zap,
  CheckSquare, Square, Users, Search, ChevronLeft, Type,
  Clock, Calendar, DollarSign, FileText, User, Settings,
  Eye, EyeOff, Download, Upload, Filter, SortAsc,
  MoreVertical, Trash2, Copy, Share, Archive, Link,
  BarChart, PieChart, LineChart, TrendingUp,
  Bell, HelpCircle, Info, ExternalLink, Maximize2,
  Minimize2, Lock, Unlock, Key, Hash, Tag,
  Building, CreditCard, FileCheck, FileDigit, Receipt,
  ClipboardList, Package, Target, ShieldCheck,
  Smartphone, Tablet, Monitor, Server, Cloud,
  MapPin, Phone, Globe2, Printer, Scan,
  Percent, Calculator, ChartBar as ChartBarIcon,
  TrendingDown, BellRing, MessageSquare, MailCheck,
  SendHorizonal, MailOpen, MailWarning, MailX,
  UploadCloud, DownloadCloud, Layers,
  Activity, Battery, Power, Rocket, Navigation2,
  FilePlus, FileMinus, FileSearch, FileSignature,
  BookOpen, Briefcase as BriefcaseIcon, Wallet,
  CreditCard as CreditCardIcon, Banknote, Coins,
  Percent as PercentIcon, Calculator as CalculatorIcon,
  TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon,
  ArrowUpRight, ArrowDownRight, CheckCircle,
  XCircle, AlertTriangle, Info as InfoIcon,
  ChevronRight, ChevronDown, Plus, Minus,
  MoreHorizontal, CalendarDays, Clock as ClockIcon,
  BellOff, Star, Heart, ThumbsUp, MessageCircle,
  Download as DownloadIcon, Share2, Bookmark,
  Eye as EyeIcon, EyeOff as EyeOffIcon, Lock as LockIcon,
  Unlock as UnlockIcon, Key as KeyIcon, QrCode,
  ShoppingCart, ShoppingBag, Package as PackageIcon,
  Truck, Home, Building2, Factory, Store,
  Users as UsersIcon, UserPlus, UserCheck,
  PhoneCall, Video, Headphones, Mailbox,
  Inbox, Send as SendIcon, Mail as MailIcon,
  File as FileIcon, Folder, FolderOpen,
  Database, HardDrive, Cpu, MemoryStick,
  Network, Wifi, Bluetooth, Radio,
  Camera, Image as ImageIcon, Film,
  Music, Mic, Headphones as HeadphonesIcon,
  Volume2, Video as VideoIcon, Tv,
  Gamepad2, Smartphone as SmartphoneIcon,
  Tablet as TabletIcon, Monitor as MonitorIcon,
  Server as ServerIcon, Cloud as CloudIcon,
  Globe, Sun, Moon, CloudSun, CloudRain,
  Wind, Thermometer, Droplets, Umbrella,
  Sunrise, Sunset, Navigation, Compass,
  Map, Layers as LayersIcon, Flag,
  Award, Trophy, Medal, Crown,
  Target as TargetIcon, Crosshair,
  Zap as ZapIcon, Flashlight, Candle,
  Anchor, Ship, Car, Bike, Bus,
  Train, Plane, Rocket as RocketIcon,
  Satellite, Navigation2 as Navigation2Icon,
  BookmarkPlus, FolderPlus, Hash as HashIcon,
  Pin, PinOff, MicOff, VolumeX,
  WifiOff, CloudOff, BatteryCharging,
  Cpu as CpuIcon, MemoryStick as MemoryStickIcon,
  Database as DatabaseIcon, HardDrive as HardDriveIcon,
  History, MousePointer, PenTool, UserX, ToggleLeft, ToggleRight
} from "lucide-react";

// ============================
// API CONFIGURATION
// ============================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Email API calls
const emailApi = {
  getRegistry: () => api.get('/email/registry/data'),
  getSignatures: () => api.get('/email/signatures'),
  getTemplates: () => api.get('/email/templates'),
  saveDraft: (data) => api.post('/email/drafts', data),
  getDrafts: () => api.get('/email/drafts'),
  deleteDraft: (id) => api.delete(`/email/drafts/${id}`),
  getSettings: () => api.get('/email/settings'),
  updateSettings: (data) => api.put('/email/settings', data),
  dispatchEmail: (formData) => api.post('/email/send', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getEmailStats: (period = '30d') => api.get('/email/stats', { params: { period } }),
  getEmailHistory: (filter = {}) => {
    const params = {};
    if (filter.filter) params.filter = filter.filter;
    if (filter.mode) params.mode = filter.mode;
    if (filter.search) params.search = filter.search;
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.limit) params.limit = filter.limit;
    if (filter.page) params.page = filter.page;
    return api.get('/email/history', { params });
  },
  getEmail: (id) => api.get(`/email/${id}`),
  resendEmail: (id) => api.post(`/email/${id}/resend`),
  deleteEmail: (id) => api.delete(`/email/${id}`),
  getBulkClients: (params) => api.get('/email/clients/bulk', { params }),
  applyTemplate: (data) => api.post('/email/template/apply', data),
  testEmail: () => api.post('/email/test'),
  healthCheck: () => api.get('/email/health'),
  bulkOperations: (data) => api.post('/email/bulk/operations', data),
  getAnalytics: (params) => api.get('/email/analytics/overview', { params }),
  getTrackingPixel: (trackingId) => `${API_BASE_URL}/email/track/open/${trackingId}`,
  getTrackingLink: (trackingId, url) => `${API_BASE_URL}/email/track/click/${trackingId}?url=${encodeURIComponent(url)}`
};

// Interceptors
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('sessionId');
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (error.response?.status === 404) {
      toast.error('Resource not found.');
    } else if (error.response?.status === 422) {
      const errors = error.response.data?.errors;
      if (errors && Array.isArray(errors)) {
        errors.forEach(err => toast.error(err.msg || 'Validation error'));
      } else {
        toast.error('Validation error');
      }
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

// ============================
// EMAIL TEMPLATES
// ============================

const TEMPLATES = {
  formal: {
    label: "Corporate Formal",
    icon: <Building size={16} className="text-blue-600" />,
    borderColor: "border-blue-200",
    bgColor: "bg-white",
    subject: (type, number, name) => `${type} ${number} - ${name} | ${new Date().getFullYear()}`,
    body: (type, name, number) => `Dear ${name},\n\nPlease find attached your ${type} ${number} for your records and processing.\n\nThis document requires your attention by the due date indicated.\n\nShould you have any queries, please contact our accounts department.\n\nKind regards,\nFinance Department\nCorporate Services`,
    tone: "Professional",
    category: "corporate"
  },
  modern: {
    label: "Business Modern",
    icon: <Zap size={16} className="text-blue-500" />,
    borderColor: "border-blue-100",
    bgColor: "bg-white",
    subject: (type, number, name) => `Your ${type} ${number} is ready for review`,
    body: (type, name, number) => `Hello ${name},\n\nWe've prepared your ${type} ${number} and it's now available for your review.\n\nYou can access the document through our client portal or via the attached file.\n\nBest regards,\nClient Services Team`,
    tone: "Contemporary",
    category: "business"
  },
  urgent: {
    label: "Priority Notice",
    icon: <AlertCircle size={16} className="text-red-500" />,
    borderColor: "border-red-100",
    bgColor: "bg-white",
    subject: (type, number, name) => `URGENT: ${type} ${number} - Action Required`,
    body: (type, name, number) => `ATTENTION: ${name}\n\nYour ${type} ${number} requires immediate attention.\n\nDue Date: ${new Date(Date.now() + 86400000).toLocaleDateString()}\n\nPlease process payment at your earliest convenience.\n\nSincerely,\nAccounts Receivable`,
    tone: "Urgent",
    category: "priority"
  },
  reminder: {
    label: "Payment Reminder",
    icon: <Clock size={16} className="text-emerald-600" />,
    borderColor: "border-emerald-100",
    bgColor: "bg-white",
    subject: (type, number, name) => `Reminder: ${type} ${number} - Payment Due`,
    body: (type, name, number) => `Dear ${name},\n\nThis is a courtesy reminder regarding your ${type} ${number}.\n\nDue Date: ${new Date(Date.now() + 259200000).toLocaleDateString()}\n\nPlease ensure payment is processed by the due date.\n\nThank you,\nAccounts Team`,
    tone: "Gentle",
    category: "followup"
  },
  summary: {
    label: "Monthly Summary",
    icon: <FileText size={16} className="text-indigo-600" />,
    borderColor: "border-indigo-100",
    bgColor: "bg-white",
    subject: (type, number, name) => `Monthly ${type} Summary - ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
    body: (type, name, number) => `Hello ${name},\n\nPlease find your monthly ${type.toLowerCase()} summary attached.\n\nThis document includes all transactions for the current period.\n\nBest regards,\nAccount Management`,
    tone: "Informative",
    category: "report"
  },
  followup: {
    label: "Follow-up",
    icon: <MailCheck size={16} className="text-purple-600" />,
    borderColor: "border-purple-100",
    bgColor: "bg-white",
    subject: (type, number, name) => `Follow-up: ${type} ${number}`,
    body: (type, name, number) => `Dear ${name},\n\nFollowing up on our previous email regarding your ${type} ${number}.\n\nPlease let us know if you have any questions or need further assistance.\n\nBest regards,\nCustomer Success Team`,
    tone: "Friendly",
    category: "followup"
  }
};

// Document Type Icons
const DOCUMENT_ICONS = {
  Invoices: <FileDigit size={18} className="text-blue-600" />,
  Quotations: <FileSignature size={18} className="text-purple-600" />,
  Receipts: <Receipt size={18} className="text-emerald-600" />,
  Services: <BriefcaseIcon size={18} className="text-amber-600" />,
  Clients: <UsersIcon size={18} className="text-indigo-600" />
};

// ============================
// COMPONENTS
// ============================

// Statistics Panel (kept)
const StatisticsPanel = ({ data }) => {
  const [stats, setStats] = useState({
    totalSent: 0,
    openRate: 0,
    delivered: 0,
    bounceRate: 0,
    clickRate: 0,
    unsubscribes: 0
  });

  const { data: emailStats, isLoading, error } = useQuery({
    queryKey: ['emailStats'],
    queryFn: async () => {
      try {
        const response = await emailApi.getEmailStats('30d');
        return response.data || response;
      } catch (err) {
        console.error('Failed to fetch email stats:', err);
        return {
          totalSent: 0,
          openRate: 0,
          delivered: 0,
          bounceRate: 0,
          clickRate: 0,
          unsubscribes: 0
        };
      }
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (emailStats) setStats(emailStats);
  }, [emailStats]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} className="text-blue-600" />
            Email Analytics
          </h3>
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-3 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} className="text-blue-600" />
          Email Analytics
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-lg">
            Last 30 days
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Sent", value: stats.totalSent || 0, icon: <Send size={12} />, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Open Rate", value: `${stats.openRate || 0}%`, icon: <EyeIcon size={12} />, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Delivered", value: `${stats.delivered || 0}%`, icon: <CheckCircle size={12} />, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Click Rate", value: `${stats.clickRate || 0}%`, icon: <MousePointer size={12} />, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Bounce Rate", value: `${stats.bounceRate || 0}%`, icon: <MailX size={12} />, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Unsubscribes", value: `${stats.unsubscribes || 0}%`, icon: <UserX size={12} />, color: "text-gray-600", bg: "bg-gray-50" },
        ].map((stat, index) => (
          <div key={index} className={`${stat.bg} rounded-lg p-3 border border-gray-100`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg.replace('50', '100')}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Document Preview
const DocumentPreview = ({ document, onAttach }) => {
  if (!document) return null;

  const handleDownload = () => toast.success("Document downloaded!");
  const handlePreview = () => toast.success("Opening document preview...");

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Document Preview</h3>
        <div className="flex items-center gap-2">
          <button onClick={handlePreview} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Preview">
            <EyeIcon size={16} className="text-gray-500" />
          </button>
          <button onClick={handleDownload} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
            <DownloadIcon size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 font-medium">Document Number</span>
          <span className="text-sm font-bold text-gray-800">{document.invoiceNumber || document.quotationNumber || document.receiptNumber || document.serviceNumber || document.documentNumber || `DOC-${document._id?.slice(-8).toUpperCase()}`}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 font-medium">Amount</span>
          <span className="text-lg font-bold text-blue-600">
            ${parseFloat(document.amount || document.total || document.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 font-medium">Due Date</span>
          <span className="text-sm font-medium text-gray-800">
            {document.dueDate || document.expiryDate ? new Date(document.dueDate || document.expiryDate).toLocaleDateString() : "Not set"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 font-medium">Status</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            document.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
            document.status === 'pending' ? 'bg-amber-100 text-amber-700' :
            document.status === 'sent' ? 'bg-blue-100 text-blue-700' :
            document.status === 'issued' ? 'bg-indigo-100 text-indigo-700' :
            document.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
            document.status === 'draft' ? 'bg-gray-100 text-gray-700' :
            document.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
            document.status === 'rejected' ? 'bg-red-100 text-red-700' :
            document.status === 'expired' ? 'bg-orange-100 text-orange-700' :
            document.status === 'completed' ? 'bg-indigo-100 text-indigo-700' :
            document.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
            document.status === 'cancelled' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {document.status || 'Draft'}
          </span>
        </div>
        <button
          onClick={() => onAttach(document)}
          className="w-full mt-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Paperclip size={16} />
          Attach Document
        </button>
      </div>
    </div>
  );
};

// Email Tracking
const EmailTracking = ({ tracking, setTracking }) => {
  const [trackingEnabled, setTrackingEnabled] = useState(tracking?.enabled ?? true);
  const [openTracking, setOpenTracking] = useState(tracking?.openTracking ?? true);
  const [clickTracking, setClickTracking] = useState(tracking?.clickTracking ?? true);
  const [linkTracking, setLinkTracking] = useState(tracking?.linkTracking ?? true);

  const updateTracking = useCallback(() => {
    setTracking({ enabled: trackingEnabled, openTracking, clickTracking, linkTracking });
  }, [trackingEnabled, openTracking, clickTracking, linkTracking, setTracking]);

  useEffect(() => { updateTracking(); }, [updateTracking]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <EyeIcon size={16} className="text-blue-600" />
          Email Tracking
        </h3>
        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${trackingEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
          {trackingEnabled ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeIcon size={14} className="text-gray-500" />
            <span className="text-sm text-gray-700">Open Tracking</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={openTracking} onChange={() => setOpenTracking(!openTracking)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MousePointer size={14} className="text-gray-500" />
            <span className="text-sm text-gray-700">Click Tracking</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={clickTracking} onChange={() => setClickTracking(!clickTracking)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link size={14} className="text-gray-500" />
            <span className="text-sm text-gray-700">Link Tracking</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={linkTracking} onChange={() => setLinkTracking(!linkTracking)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
      <button
        onClick={() => setTrackingEnabled(!trackingEnabled)}
        className={`w-full mt-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
          trackingEnabled 
            ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200' 
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
        }`}
      >
        {trackingEnabled ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
        {trackingEnabled ? 'Disable Tracking' : 'Enable Tracking'}
      </button>
    </div>
  );
};

// Email History
const EmailHistory = () => {
  const [filter, setFilter] = useState('all');
  
  const { data: emailHistory = [], isLoading, refetch } = useQuery({
    queryKey: ['emailHistory', filter],
    queryFn: async () => {
      try {
        const response = await emailApi.getEmailHistory({ filter });
        return response.data?.emails || response.emails || [];
      } catch (error) {
        console.error('Failed to fetch email history:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <History size={16} className="text-blue-600" />
            Recent Emails
          </h3>
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 border border-gray-100 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredHistory = emailHistory.filter(email => {
    if (filter === 'all') return true;
    return email.status === filter;
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <History size={16} className="text-blue-600" />
          Recent Emails
        </h3>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white outline-none"
        >
          <option value="all">All</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="partial">Partial</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {filteredHistory.map((email, index) => (
          <div key={email._id || index} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{email.subject}</p>
                <p className="text-xs text-gray-500 truncate">
                  {email.recipients?.length || 1} recipient{email.recipients?.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {(email.clientNames && email.clientNames.length > 0
                    ? email.clientNames.join(', ')
                    : (email.recipientResults?.find(r => r.clientName)?.clientName || 'Unknown Client'))}
                  {' • '}
                  {(email.documentModel || email.recipientResults?.[0]?.documentType || 'Document')}
                </p>
                {Array.isArray(email.recipientResults) && email.recipientResults.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {email.recipientResults.slice(0, 3).map((result, i) => (
                      <p key={`${result.email}-${i}`} className="text-[11px] text-gray-600 truncate">
                        {result.email} • {result.status}
                        {result.status === 'failed' && result.error ? ` (${result.error})` : ''}
                      </p>
                    ))}
                    {email.recipientResults.length > 3 && (
                      <p className="text-[11px] text-gray-500">+{email.recipientResults.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500">
                  {new Date(email.sentAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded mt-1 ${
                  email.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                  email.status === 'failed' ? 'bg-red-100 text-red-700' :
                  email.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {email.status || 'draft'}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredHistory.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No emails found</p>
          </div>
        )}
      </div>
      <button 
        onClick={() => refetch()}
        className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Refresh History
      </button>
    </div>
  );
};

// Email Signature
const EmailSignatureComponent = ({ onApplySignature }) => {
  const [signatures, setSignatures] = useState([]);
  const [activeSignature, setActiveSignature] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    try {
      setIsLoading(true);
      const response = await emailApi.getSignatures();
      setSignatures(response.data || []);
    } catch (error) {
      console.error('Failed to load signatures:', error);
      // Mock signatures
      setSignatures([
        { _id: '1', name: 'Professional', content: '\n\nBest regards,\n[Your Name]\n[Your Position]\n[Your Company]' },
        { _id: '2', name: 'Simple', content: '\n\nThanks,\n[Your Name]' },
        { _id: '3', name: 'Formal', content: '\n\nSincerely,\n[Your Name]\n[Your Position]\n[Your Company]\nPhone: [Your Phone]\nEmail: [Your Email]' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySignature = () => {
    if (signatures[activeSignature]) {
      onApplySignature(signatures[activeSignature].content);
      toast.success('Signature applied successfully!');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">Email Signature</h3>
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">Email Signature</h3>
        <PenTool size={16} className="text-gray-500" />
      </div>
      <div className="space-y-2">
        <select
          value={activeSignature}
          onChange={(e) => setActiveSignature(Number(e.target.value))}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        >
          {signatures.map((sig, index) => (
            <option key={sig._id || index} value={index}>{sig.name}</option>
          ))}
          {signatures.length === 0 && <option value={0}>No signatures available</option>}
        </select>
        <button 
          onClick={handleApplySignature}
          disabled={signatures.length === 0}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-blue-700 transition-colors border border-blue-200"
        >
          <span className="flex items-center gap-2">
            <PenTool size={16} className="text-blue-600" />
            Apply Signature
          </span>
          {signatures.length > 0 && (
            <span className="text-xs text-blue-500">{signatures[activeSignature]?.name}</span>
          )}
        </button>
      </div>
    </div>
  );
};

// Main Email Composer Content
const EmailComposerContent = () => {
  const [mode, setMode] = useState("single");
  const [activeTab, setActiveTab] = useState("Invoices");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [subject, setSubject] = useState(localStorage.getItem('draft_subject') || "");
  const [message, setMessage] = useState(localStorage.getItem('draft_message') || "");
  const [progress, setProgress] = useState(0);
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedDocuments, setAttachedDocuments] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [activeTemplate, setActiveTemplate] = useState("formal");
  const [showStats, setShowStats] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ccRecipients, setCcRecipients] = useState(["finance@smassystems.com"]);
  const [bccRecipients, setBccRecipients] = useState([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [lastSendSummary, setLastSendSummary] = useState(null);
  const [tracking, setTracking] = useState({
    enabled: true,
    openTracking: true,
    clickTracking: true,
    linkTracking: true
  });
  
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const queryClient = useQueryClient();

  // Email variables for template insertion
  const emailVariables = [
    { label: "Client Name", value: "{clientName}", icon: <User size={14} /> },
    { label: "Document Number", value: "{docNumber}", icon: <Hash size={14} /> },
    { label: "Amount", value: "{amount}", icon: <DollarSign size={14} /> },
    { label: "Due Date", value: "{dueDate}", icon: <Calendar size={14} /> },
    { label: "Today's Date", value: "{today}", icon: <CalendarDays size={14} /> },
    { label: "Company Name", value: "{company}", icon: <Building size={14} /> }
  ];

  // Persistence
  useEffect(() => {
    localStorage.setItem('draft_subject', subject);
    localStorage.setItem('draft_message', message);
  }, [subject, message]);

  // Query for finance registry
  const { data: registry = { Invoices: [], Quotations: [], Receipts: [], Services: [], Clients: [] }, isLoading, refetch } = useQuery({
    queryKey: ['financeRegistry'],
    queryFn: async () => {
      try {
        const response = await emailApi.getRegistry();
        const data = response.data || response;
        console.log('Registry data received:', data);
        
        const enhanceDocuments = (docs, type) => {
          if (!docs || !Array.isArray(docs)) return [];
          return docs.map(doc => ({
            ...doc,
            _id: doc._id || doc.id,
            formattedNumber: doc.invoiceNumber || doc.quotationNumber || doc.receiptNumber || doc.serviceNumber ||
              `${type.substring(0, 3).toUpperCase()}-${doc._id?.slice(-8).toUpperCase()}`,
            displayAmount: doc.amount ? `$${parseFloat(doc.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
                      doc.total ? `$${parseFloat(doc.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}` :
                      doc.rate ? `$${parseFloat(doc.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr` : '-',
            status: (doc.status || 'draft').toLowerCase()
          }));
        };
        
        const processClients = (clients) => {
          if (!clients || !Array.isArray(clients)) return [];
          return clients.map(client => ({
            ...client,
            _id: client._id || client.id,
            name: client.name || 'Unknown Client',
            email: client.email || '',
            company: client.company || '',
            phone: client.phone || ''
          }));
        };
        
        return {
          Invoices: enhanceDocuments(data.Invoices || [], 'Invoice'),
          Quotations: enhanceDocuments(data.Quotations || [], 'Quote'),
          Receipts: enhanceDocuments(data.Receipts || [], 'Receipt'),
          Services: enhanceDocuments(data.Services || [], 'Service'),
          Clients: processClients(data.Clients || [])
        };
      } catch (error) {
        console.error('Failed to fetch registry from API:', error);
        toast.error('Failed to load documents from server. Using demo data.');
        
        // Mock data
        const mockInvoices = [
          { _id: "1", invoiceNumber: "INV-2023-001", client: { name: "Acme Corp", email: "billing@acmecorp.com" }, amount: 12500.50, total: 12500.50, status: "pending", dueDate: "2023-12-15", createdAt: "2023-11-01", issueDate: "2023-11-01" },
          { _id: "2", invoiceNumber: "INV-2023-002", client: { name: "Global Tech", email: "finance@globaltech.com" }, amount: 8900.00, total: 8900.00, status: "paid", dueDate: "2023-11-30", createdAt: "2023-10-15", issueDate: "2023-10-15" }
        ];
        const mockClients = [
          { _id: "1", name: "Acme Corp", email: "billing@acmecorp.com", company: "Acme Corporation", phone: "+1 (555) 123-4567", status: "Active" },
          { _id: "2", name: "Global Tech", email: "finance@globaltech.com", company: "Global Technology Solutions", phone: "+1 (555) 987-6543", status: "Active" },
          { _id: "3", name: "Sunrise Inc", email: "accounting@sunrise.com", company: "Sunrise Industries", phone: "+1 (555) 456-7890", status: "Active" }
        ];
        
        const enhanceMockDocs = (docs, type) => docs.map(doc => ({
          ...doc,
          formattedNumber: doc.invoiceNumber || `DOC-${doc._id?.slice(-8).toUpperCase()}`,
          displayAmount: doc.amount ? `$${parseFloat(doc.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
          status: (doc.status || 'draft').toLowerCase()
        }));
        
        return {
          Invoices: enhanceMockDocs(mockInvoices, 'Invoice'),
          Quotations: [],
          Receipts: [],
          Services: [],
          Clients: mockClients
        };
      }
    },
    refetchInterval: 60000,
    retry: 2,
    retryDelay: 1000
  });

  // Mutation for sending email
  const dispatchMutation = useMutation({
    mutationFn: async (formData) => {
      const formDataObj = new FormData();
      formDataObj.append('mode', formData.mode);
      formDataObj.append('subject', formData.subject);
      formDataObj.append('message', formData.message);
      formDataObj.append('type', formData.type);
      
      if (formData.cc && formData.cc.length > 0) {
        formDataObj.append('cc', JSON.stringify(formData.cc));
      }
      if (formData.bcc && formData.bcc.length > 0) {
        formDataObj.append('bcc', JSON.stringify(formData.bcc));
      }
      if (formData.tracking) {
        formDataObj.append('tracking', JSON.stringify(formData.tracking));
      }
      if (formData.documents && formData.documents.length > 0) {
        formDataObj.append('documents', JSON.stringify(formData.documents));
      }
      
      if (formData.mode === "single") {
        if (formData.docId) formDataObj.append('docId', formData.docId);
        if (formData.recipient) formDataObj.append('recipient', formData.recipient);
        if (formData.document) formDataObj.append('document', JSON.stringify(formData.document));
      } else {
        if (formData.recipients && formData.recipients.length > 0) {
          formDataObj.append('recipients', JSON.stringify(formData.recipients));
        }
      }
      
      if (formData.file) {
        formDataObj.append('attachments', formData.file);
      }
      
      console.log('Sending email with form data:', {
        mode: formData.mode,
        subject: formData.subject,
        type: formData.type,
        hasFile: !!formData.file,
        documentCount: formData.documents?.length || 0
      });
      
      const response = await emailApi.dispatchEmail(formDataObj);
      return response;
    },
    onMutate: () => {
      setLastSendSummary(null);
      setProgress(0);
      const loadingToast = toast.loading("Sending email...");
      const interval = setInterval(() => {
        setProgress(prev => (prev < 95 ? prev + Math.floor(Math.random() * 15) : prev));
      }, 400);
      return { loadingToast, interval };
    },
    onSuccess: (data, variables, context) => {
      clearInterval(context.interval);
      setProgress(100);
      queryClient.invalidateQueries(['emailHistory']);
      queryClient.invalidateQueries(['emailStats']);
      toast.success(data.message || "Email sent successfully!", { id: context.loadingToast, duration: 3000 });
      if (Array.isArray(data.generatedFiles) && data.generatedFiles.length > 0) {
        toast.success(`${data.generatedFiles.length} PDF file(s) generated and attached automatically.`, { duration: 3500 });
      }
      setLastSendSummary({
        sentAt: new Date().toISOString(),
        message: data.message || "Email sent successfully!",
        generatedFiles: Array.isArray(data.generatedFiles) ? data.generatedFiles.length : 0
      });
      setSelectedClients([]);
      setAttachedFile(null);
      setAttachedDocuments([]);
      localStorage.removeItem('draft_subject');
      localStorage.removeItem('draft_message');
      setSubject("");
      setMessage("");
      dispatchMutation.reset();
      console.log('Email sent successfully:', data);
    },
    onError: (err, variables, context) => {
      if (context?.interval) clearInterval(context.interval);
      toast.dismiss(context?.loadingToast);
      const errorMessage = err.response?.data?.message || err.message || "Failed to send email. Please try again.";
      toast.error(errorMessage);
      console.error('Email sending error:', err);
    }
  });

  const applyTemplate = async (tempKey, doc = selectedDoc) => {
    if (!doc && mode === "single") {
      toast.error("Please select a document first");
      return;
    }
    
    try {
      const type = activeTab.endsWith('s') ? activeTab.slice(0, -1) : activeTab;
      const templateData = {
        templateName: tempKey,
        documentId: doc?._id,
        clientId: doc?.client?._id || doc?.clientDetails?._id
      };
      
      const response = await emailApi.applyTemplate(templateData);
      
      if (response.data) {
        setSubject(response.data.subject || TEMPLATES[tempKey].subject(type, doc?.formattedNumber || "000001", doc?.client?.name || "Valued Client"));
        setMessage(response.data.body || TEMPLATES[tempKey].body(type, doc?.client?.name || "Valued Client", doc?.formattedNumber || "000001"));
        setActiveTemplate(tempKey);
        toast.success(`"${TEMPLATES[tempKey].label}" template applied!`, { icon: '📧', duration: 2000 });
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
      // Fallback to local templates
      const type = activeTab.endsWith('s') ? activeTab.slice(0, -1) : activeTab;
      const clientName = doc?.client?.name || doc?.clientDetails?.name || doc?.name || "Valued Client";
      const number = doc?.invoiceNumber || doc?.quotationNumber || doc?.receiptNumber || doc?.serviceNumber || doc?.formattedNumber || "000001";
      const template = TEMPLATES[tempKey];

      setSubject(template.subject(type, number, clientName));
      setMessage(template.body(type, clientName, number));
      setActiveTemplate(tempKey);
      toast.success(`"${template.label}" template applied!`, { icon: '📧', duration: 2000 });
    }
  };

  const handleDocSelect = (doc) => {
    if (dispatchMutation.isSuccess) dispatchMutation.reset();
    setLastSendSummary(null);
    setSelectedDoc(doc);
    setAttachedDocuments([]);
    setAttachedFile(null);
    setProgress(0);
    if(window.innerWidth < 1024) setIsSidebarOpen(false);
    toast.success(`Selected ${doc.client?.name || doc.clientDetails?.name || 'document'}`, { duration: 1500 });
  };

  const handleAttachDocument = (doc) => {
    if (!attachedDocuments.some(d => d._id === doc._id)) {
      setAttachedDocuments([...attachedDocuments, doc]);
      toast.success("Document attached", { icon: '📎', duration: 2000 });
    } else {
      toast.error("Document already attached");
    }
  };

  const handleRemoveAttachment = (index, isFile = false) => {
    if (isFile) {
      setAttachedFile(null);
      toast.success("File removed");
    } else {
      setAttachedDocuments(attachedDocuments.filter((_, i) => i !== index));
      toast.success("Document removed");
    }
  };

  const filteredClients = useMemo(() => 
    (registry.Clients || []).filter(c => 
      c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.company?.toLowerCase().includes(clientSearch.toLowerCase())
    ), [registry.Clients, clientSearch]
  );

  const filteredDocuments = useMemo(() => 
    (registry[activeTab] || []).filter(doc => {
      const clientName = doc.client?.name || doc.clientDetails?.name || "";
      const docNumber = doc.invoiceNumber || doc.quotationNumber || doc.receiptNumber || doc.serviceNumber || "";
      return (
        clientName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        docNumber.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (doc._id && doc._id.toLowerCase().includes(clientSearch.toLowerCase()))
      );
    }), [registry, activeTab, clientSearch]
  );

  const handleSelectAll = () => {
    const allEmails = filteredClients.map(c => c.email).filter(e => e);
    if (selectedClients.length === allEmails.length) {
      setSelectedClients([]);
      toast.success("All clients deselected");
    } else {
      setSelectedClients(allEmails);
      toast.success(`${allEmails.length} clients selected`);
    }
  };

  const toggleClient = (email) => {
    if (dispatchMutation.isSuccess) dispatchMutation.reset();
    setLastSendSummary(null);
    if (!email) {
      toast.error("Client has no valid email");
      return;
    }
    setSelectedClients(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const addCcRecipient = () => {
    const newEmail = prompt("Enter CC email:");
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setCcRecipients([...ccRecipients, newEmail]);
      toast.success("CC added");
    } else if (newEmail) {
      toast.error("Invalid email address");
    }
  };

  const addBccRecipient = () => {
    const newEmail = prompt("Enter BCC email:");
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setBccRecipients([...bccRecipients, newEmail]);
      toast.success("BCC added");
    } else if (newEmail) {
      toast.error("Invalid email address");
    }
  };

  const removeCcRecipient = (index) => {
    setCcRecipients(ccRecipients.filter((_, i) => i !== index));
    toast.success("CC removed");
  };

  const removeBccRecipient = (index) => {
    setBccRecipients(bccRecipients.filter((_, i) => i !== index));
    toast.success("BCC removed");
  };

  const getDocNumber = (doc) =>
    doc?.invoiceNumber ||
    doc?.quotationNumber ||
    doc?.receiptNumber ||
    doc?.serviceNumber ||
    doc?.formattedNumber ||
    (doc?._id ? `DOC-${String(doc._id).slice(-8).toUpperCase()}` : "N/A");

  const getDocType = (doc) => {
    if (doc?.invoiceNumber) return "Invoice";
    if (doc?.quotationNumber) return "Quotation";
    if (doc?.receiptNumber) return "Receipt";
    if (doc?.serviceNumber) return "Service";
    return activeTab.endsWith('s') ? activeTab.slice(0, -1) : activeTab;
  };

  const getClientNameFromDoc = (doc) => doc?.client?.name || doc?.clientDetails?.name || doc?.name || null;

  const buildSmartComposerContent = () => {
    const docsForSummary = mode === "single"
      ? [selectedDoc, ...attachedDocuments.filter((d) => d?._id !== selectedDoc?._id)].filter(Boolean)
      : attachedDocuments;
    const docCount = docsForSummary.length;
    const primaryDoc = docsForSummary[0] || selectedDoc;
    const clientNames = [...new Set(docsForSummary.map(getClientNameFromDoc).filter(Boolean))];
    const taggedClients = clientNames.length ? clientNames.map((n) => `@${n}`).join(", ") : "@Valued Client";

    const generatedSubject = (subject || "").trim() || (() => {
      const type = primaryDoc ? getDocType(primaryDoc) : "Document";
      const number = primaryDoc ? getDocNumber(primaryDoc) : "Summary";
      const audience = mode === "bulk" ? `${selectedClients.length} Recipients` : "Client";
      return `${type} ${number} | ${audience} | ${new Date().toISOString().slice(0, 10)}`;
    })();

    const generatedMessage = (message || "").trim() || (() => {
      const details = docsForSummary.length
        ? docsForSummary.map((doc) => {
            const due = doc?.dueDate || doc?.expiryDate || doc?.date;
            const dueText = due ? new Date(due).toLocaleDateString() : "N/A";
            const amount = Number(doc?.total || doc?.amount || doc?.rate || 0);
            const amountText = Number.isFinite(amount)
              ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : "0.00";
            return `- ${getDocType(doc)} ${getDocNumber(doc)} | Client: ${getClientNameFromDoc(doc) || "N/A"} | Amount: ${amountText} | Due: ${dueText}`;
          }).join("\n")
        : "- No document references selected.";
      return `Hello,\n\nPlease find the related document details below.\n\nTagged Clients: ${taggedClients}\n\nDocument Details:\n${details}\n\nRegards,\nSMA Team`;
    })();

    return {
      generatedSubject,
      generatedMessage,
      docCount,
      taggedClients
    };
  };

  const handleDispatch = () => {
    if (mode === 'bulk' && selectedClients.length === 0) {
      toast.error("Please select recipients first");
      return;
    }
    if (mode === "single" && !selectedDoc) {
      toast.error("Please select a document first");
      return;
    }

    const { generatedSubject, generatedMessage, taggedClients } = buildSmartComposerContent();
    if (!subject.trim()) setSubject(generatedSubject);
    if (!message.trim()) setMessage(generatedMessage);

    const formData = {
      mode,
      subject: generatedSubject,
      message: generatedMessage,
      type: activeTab.endsWith('s') ? activeTab.slice(0, -1) : activeTab,
      cc: ccRecipients,
      bcc: bccRecipients,
      tracking,
      file: attachedFile,
      documents: attachedDocuments.map(d => d._id).filter(Boolean)
    };

    if (mode === "single") {
      formData.docId = selectedDoc._id;
      formData.recipient = selectedDoc.client?.email || selectedDoc.clientDetails?.email || selectedDoc.email;
      formData.document = selectedDoc;
    } else {
      formData.recipients = selectedClients;
    }
    
    console.log('Dispatching email:', {
      mode: formData.mode,
      subject: formData.subject,
      type: formData.type,
      recipientCount: mode === 'single' ? 1 : selectedClients.length,
      hasFile: !!attachedFile,
      taggedClients
    });
    
    dispatchMutation.mutate(formData);
  };

  const handleInsertVariable = (variable) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setMessage(prev => prev.substring(0, start) + variable + prev.substring(end));
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
    toast.success(`Variable "${variable}" inserted`, { duration: 2000 });
  };

  const handleApplySignature = (signatureContent) => {
    setMessage(prev => prev + "\n\n" + signatureContent);
    toast.success("Signature applied successfully!");
  };

  const handleClearAll = () => {
    dispatchMutation.reset();
    setLastSendSummary(null);
    setSubject("");
    setMessage("");
    setAttachedFile(null);
    setAttachedDocuments([]);
    setSelectedDoc(null);
    setSelectedClients([]);
    setCcRecipients(["finance@smassystems.com"]);
    setBccRecipients([]);
    toast.success("All fields cleared", { icon: '🧹', duration: 2000 });
  };

  const handleSaveDraft = () => {
    const draft = { subject, message, timestamp: new Date().toISOString() };
    localStorage.setItem('draft_saved_' + Date.now(), JSON.stringify(draft));
    toast.success("Draft saved successfully!", { icon: '💾', duration: 2000 });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setAttachedFile(file);
      toast.success(`File "${file.name}" attached`, { icon: '📎', duration: 2000 });
    }
  };

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-6">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Briefcase className="text-blue-600" size={24} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-800 mb-2">Loading Email Composer</p>
        <p className="text-sm text-gray-600">Fetching your documents and contacts...</p>
      </div>
    </div>
  );

  return (
    <div className={`h-screen w-full bg-white flex flex-col overflow-hidden text-gray-800 font-sans antialiased transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <Toaster 
        position="top-right"
        containerStyle={{ top: 76, zIndex: 1200 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
            style: { borderLeft: '4px solid #10b981' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
            style: { borderLeft: '4px solid #ef4444' },
          },
          loading: {
            style: { borderLeft: '4px solid #3b82f6' },
          },
        }}
      />
      
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.csv" />
      
      {/* HEADER */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-all lg:hidden text-gray-600 hover:text-gray-800">
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <Send size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold text-gray-800">Email Composer Pro</span>
              <p className="text-xs text-gray-500">Send emails & track history</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 ml-4">
            {["single", "bulk"].map(m => (
              <button key={m} onClick={() => { setMode(m); setSelectedDoc(null); setSelectedClients([]); setAttachedDocuments([]); setAttachedFile(null); setProgress(0); setLastSendSummary(null); dispatchMutation.reset(); }} className={`px-4 py-2 rounded-md text-xs font-medium uppercase transition-all ${
                mode === m ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
              }`}>
                {m === 'single' ? 'Single' : 'Bulk'} Mode
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          {showVariables && (
            <div className="absolute top-16 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">Variables</span>
                <button onClick={() => setShowVariables(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-1">
                {emailVariables.map((variable, index) => (
                  <button
                    key={index}
                    onClick={() => handleInsertVariable(variable.value)}
                    className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {variable.icon}
                    <span>{variable.label}</span>
                    <span className="ml-auto text-gray-400 text-xs">{variable.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showHistoryPanel && (
            <div className="absolute top-16 right-0 z-50 w-[380px] max-w-[92vw]">
              <EmailHistory />
            </div>
          )}

          <button onClick={() => setShowVariables(!showVariables)} className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" title="Insert Variables">
            <Hash size={18} />
          </button>
          
          <button onClick={() => setShowStats(!showStats)} className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" title="Statistics">
            <BarChart size={18} />
          </button>

          <button
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className={`p-2 rounded-lg transition-colors ${
              showHistoryPanel
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
            title="Email History"
          >
            <History size={18} />
          </button>
          
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          
          <button onClick={() => refetch()} className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw size={18} />
          </button>
          
          <button 
            onClick={handleDispatch} 
            disabled={dispatchMutation.isPending || (mode === 'single' && !selectedDoc) || (mode === 'bulk' && selectedClients.length === 0)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {dispatchMutation.isPending ? (
              <Loader2 size={16} className="animate-spin"/>
            ) : (
              <Send size={16} className="group-hover:translate-x-0.5 transition-transform"/>
            )}
            <span>{mode === 'bulk' ? `Send (${selectedClients.length})` : 'Send Now'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="p-5 space-y-6">
            <div className="relative group">
              <input type="text" placeholder="Search documents or clients..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-10 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400" />
              <Search className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <Filter className="absolute right-3 top-3 text-gray-400" size={18} />
            </div>

            {mode === "bulk" && (
              <div className="flex items-center justify-between px-2">
                <button onClick={handleSelectAll} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors font-medium text-sm">
                  {selectedClients.length === filteredClients.length ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18} className="text-gray-400"/>}
                  Select All
                </button>
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {selectedClients.length} selected
                </span>
              </div>
            )}

            {mode === "single" && (
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                {["Invoices", "Quotations", "Receipts", "Services"].map(t => (
                  <button key={t} onClick={() => { setActiveTab(t); setSelectedDoc(null); setAttachedDocuments([]); setAttachedFile(null); setProgress(0); setLastSendSummary(null); dispatchMutation.reset(); }} className={`py-2.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTab === t ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                  }`}>
                    {DOCUMENT_ICONS[t]}
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mode === "single" ? filteredDocuments.map(doc => (
              <button key={doc._id} onClick={() => handleDocSelect(doc)} className={`w-full text-left p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                selectedDoc?._id === doc._id ? "bg-blue-50 border-blue-200 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {DOCUMENT_ICONS[activeTab]}
                      <p className={`text-sm font-semibold truncate ${selectedDoc?._id === doc._id ? "text-blue-900" : "text-gray-800"}`}>
                        {doc.client?.name || doc.clientDetails?.name || "Unnamed Client"}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {doc.invoiceNumber || doc.quotationNumber || doc.receiptNumber || doc.serviceNumber || `DOC-${doc._id?.slice(-8).toUpperCase()}`}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        doc.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        doc.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        doc.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        doc.status === 'issued' ? 'bg-indigo-100 text-indigo-700' :
                        doc.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                        doc.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        doc.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                        doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        doc.status === 'expired' ? 'bg-orange-100 text-orange-700' :
                        doc.status === 'completed' ? 'bg-indigo-100 text-indigo-700' :
                        doc.status === 'on_hold' ? 'bg-yellow-100 text-yellow-700' :
                        doc.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {doc.status || 'Draft'}
                      </span>
                      {doc.amount && (
                        <span className="text-sm font-bold text-gray-800">
                          ${parseFloat(doc.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {new Date(doc.createdAt || doc.issueDate || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </button>
            )) : filteredClients.map(client => (
              <div key={client._id} onClick={() => toggleClient(client.email)} className={`p-4 rounded-lg cursor-pointer flex items-center gap-3 border transition-all hover:scale-[1.02] ${
                selectedClients.includes(client.email) ? "bg-blue-50 border-blue-200" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  selectedClients.includes(client.email) ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                }`}>
                  {selectedClients.includes(client.email) && <Check size={12} strokeWidth={3}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <User size={16} className="text-gray-600" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-gray-800 truncate">{client.name}</p>
                      {client.company && <p className="text-xs text-gray-600 truncate">{client.company}</p>}
                      <p className="text-xs text-gray-500 font-mono truncate">{client.email || 'No email'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN COMPOSER */}
        <main className="flex-1 bg-white overflow-y-auto relative">
          {/* Mobile Back Button */}
          {(selectedDoc || (mode === "bulk" && selectedClients.length > 0)) && (
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden fixed top-20 left-4 z-30 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-gray-700 shadow-sm font-medium text-sm hover:bg-gray-50 transition-all group">
              <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform"/> Back to Documents
            </button>
          )}

          {showStats && (
            <div className="absolute top-4 right-4 z-20 w-72">
              <StatisticsPanel />
            </div>
          )}

          {(selectedDoc || (mode === "bulk" && selectedClients.length > 0)) ? (
            <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 relative mt-8 lg:mt-0">
              {false && dispatchMutation.isSuccess ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 md:p-12 text-center shadow-sm">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                      <Check size={32} strokeWidth={3} />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Email Sent Successfully!</h2>
                  <p className="text-gray-600 text-sm mb-6">Your email has been sent to all recipients</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <button onClick={() => { dispatchMutation.reset(); setSelectedDoc(null); setSelectedClients([]); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
                      Compose New Email
                    </button>
                    <button onClick={() => window.print()} className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors">
                      Print Confirmation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {lastSendSummary && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <Check size={16} strokeWidth={3} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-900">{lastSendSummary.message}</p>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            {lastSendSummary.generatedFiles > 0
                              ? `${lastSendSummary.generatedFiles} generated PDF attachment(s) were added automatically.`
                              : "Ready to send another document."}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLastSendSummary(null)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                  {/* Template Controls */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-gray-800">Quick Templates</h3>
                      </div>
                      <span className="text-xs text-gray-500">Click to apply template</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(TEMPLATES).map(([key, t]) => (
                        <button key={key} onClick={() => applyTemplate(key)} className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all hover:scale-[1.02] ${
                          activeTemplate === key ? `${t.borderColor} ${t.bgColor} border-2 text-gray-800 shadow-sm` : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}>
                          {t.icon} <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Composer Area */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column - Tools */}
                    <div className="space-y-6">
                      <EmailTracking tracking={tracking} setTracking={setTracking} />
                      {selectedDoc && <DocumentPreview document={selectedDoc} onAttach={handleAttachDocument} />}
                      <EmailSignatureComponent onApplySignature={handleApplySignature} />
                    </div>

                    {/* Center Column - Email Composer */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden relative">
                        {dispatchMutation.isPending && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 z-50 overflow-hidden">
                            <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                        )}

                        <div className="p-5 md:p-6 space-y-6">
                          {/* Recipient Display */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-semibold text-gray-800">Recipients</label>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setShowCc(!showCc)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                  {showCc ? 'Hide CC' : 'Add CC'}
                                </button>
                                <button onClick={() => setShowBcc(!showBcc)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                  {showBcc ? 'Hide BCC' : 'Add BCC'}
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                                <Mail size={18} className="text-gray-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800">
                                    {mode === "single" 
                                      ? (selectedDoc?.client?.email || selectedDoc?.clientDetails?.email || selectedDoc?.email || "Select recipient")
                                      : selectedClients.length > 0 
                                        ? `${selectedClients.length} recipient${selectedClients.length > 1 ? 's' : ''} selected`
                                        : "No recipients selected"
                                    }
                                  </p>
                                </div>
                              </div>

                              {showCc && (
                                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                                  <span className="text-xs font-medium text-gray-600">CC:</span>
                                  <div className="flex-1 flex flex-wrap gap-2">
                                    {ccRecipients.map((email, idx) => (
                                      <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200">
                                        <span className="text-sm text-gray-800">{email}</span>
                                        <button onClick={() => removeCcRecipient(idx)} className="text-gray-400 hover:text-red-500">
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}
                                    <button onClick={addCcRecipient} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                      + Add
                                    </button>
                                  </div>
                                </div>
                              )}

                              {showBcc && (
                                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                                  <span className="text-xs font-medium text-gray-600">BCC:</span>
                                  <div className="flex-1 flex flex-wrap gap-2">
                                    {bccRecipients.map((email, idx) => (
                                      <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200">
                                        <span className="text-sm text-gray-800">{email}</span>
                                        <button onClick={() => removeBccRecipient(idx)} className="text-gray-400 hover:text-red-500">
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}
                                    <button onClick={addBccRecipient} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                      + Add
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Subject Line */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-semibold text-gray-800">Subject</label>
                              <span className="text-xs text-gray-500">{subject.length}/120 characters</span>
                            </div>
                            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} className="w-full bg-white border border-gray-300 px-4 py-3 rounded-lg text-base font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400" placeholder="Enter email subject..." />
                          </div>

                          {/* Content Area */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-semibold text-gray-800">Message</label>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">{message.length} characters</span>
                                <span className="text-xs text-gray-500">{message.split(/\s+/).filter(Boolean).length} words</span>
                              </div>
                            </div>
                            <textarea ref={editorRef} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-white border border-gray-300 p-4 rounded-lg text-sm font-normal text-gray-700 outline-none h-64 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all leading-relaxed font-sans shadow-inner" placeholder="Type your message here..." />
                          </div>

                          {/* Attachments Display */}
                          {(attachedFile || attachedDocuments.length > 0) && (
                            <div className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-800">Attachments</h4>
                                <span className="text-xs text-gray-500">{attachedDocuments.length + (attachedFile ? 1 : 0)} file(s)</span>
                              </div>
                              <div className="space-y-2">
                                {attachedFile && (
                                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <Paperclip size={16} className="text-gray-500" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">{attachedFile.name}</p>
                                        <p className="text-xs text-gray-500">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                                      </div>
                                    </div>
                                    <button onClick={() => handleRemoveAttachment(0, true)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                                      <Trash2 size={16} className="text-gray-500" />
                                    </button>
                                  </div>
                                )}
                                {attachedDocuments.map((doc, index) => (
                                  <div key={doc._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <FileText size={16} className="text-gray-500" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">{doc.invoiceNumber || doc.quotationNumber || doc.receiptNumber || doc.serviceNumber || `DOC-${doc._id?.slice(-8).toUpperCase()}`}</p>
                                        <p className="text-xs text-gray-500">{doc.client?.name || doc.clientDetails?.name}</p>
                                      </div>
                                    </div>
                                    <button onClick={() => handleRemoveAttachment(index)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                                      <Trash2 size={16} className="text-gray-500" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Attachment Handler */}
                          <div onClick={() => fileInputRef.current.click()} className={`p-5 rounded-lg border-2 border-dashed flex items-center justify-between cursor-pointer transition-all ${
                            attachedFile ? "bg-emerald-50 border-emerald-300" : "bg-gray-50 border-gray-300 hover:border-gray-400"
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${attachedFile ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600"}`}>
                                <Paperclip size={20}/>
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-800 truncate max-w-[200px] md:max-w-[300px]">
                                  {attachedFile ? attachedFile.name : 'No file attached'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {attachedFile ? `${(attachedFile.size / 1024).toFixed(1)} KB · Click to change` : 'Click to attach a file (PDF, DOC, IMG, etc.)'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {attachedFile && (
                                <button onClick={(e) => { e.stopPropagation(); setAttachedFile(null); }} className="p-2 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 size={18} className="text-red-500"/>
                                </button>
                              )}
                              <Upload size={18} className="text-gray-500" />
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3 pt-4">
                            <button onClick={handleClearAll} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                              Clear All
                            </button>
                            <button onClick={handleSaveDraft} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                              Save Draft
                            </button>
                            <div className="flex-1" />
                            <button onClick={handleDispatch} disabled={dispatchMutation.isPending || (mode === 'single' && !selectedDoc) || (mode === 'bulk' && selectedClients.length === 0)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                              {dispatchMutation.isPending ? (
                                <><Loader2 size={16} className="animate-spin" /> Sending...</>
                              ) : (
                                <><Send size={16} /> Send Email</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                  <Send size={48} strokeWidth={1} className="text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Start Composing Emails</h3>
              <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">
                {mode === 'single' 
                  ? 'Select a document from the sidebar to start composing an email.'
                  : 'Select clients from the sidebar to send bulk emails.'
                }
              </p>
              <div className="bg-gray-50 rounded-lg p-4 max-w-md">
                <p className="text-xs font-medium text-gray-700 mb-2">Quick Tips:</p>
                <ul className="text-xs text-gray-600 space-y-1 text-left">
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Use templates for consistent professional communication</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> All sent emails are tracked in history</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Attach files and documents easily</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    }
  },
});

const EmailComposer = () => (
  <QueryClientProvider client={queryClient}>
    <EmailComposerContent />
  </QueryClientProvider>
);

export default EmailComposer;
