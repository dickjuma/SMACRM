import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/http";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getDocumentSettings, mergeAppSettings } from "../utils/documentSettings";
import {
  Search, FileSearch, Phone, Printer, Download, ArrowLeft, ShieldCheck,
  Globe, Mail, MapPin, CheckCircle2, Filter,
  Calendar, Clock, Building, User, CreditCard,
  Hash, BarChart3, Eye, EyeOff, Copy,
  Lock, QrCode, TrendingUp, Archive, Share2,
  FileText, RefreshCw, ChevronDown, Database,
  ChevronRight, ChevronLeft, CheckSquare, Square,
  X, FileSpreadsheet, Send, Edit, Trash2,
  DollarSign, PercentCircle, AlertTriangle, Check,
  Receipt, FileCheck, MoreVertical, FileBox,
  Shield, FileDigit, Wallet, Coins, Bell,
  Users, Target, PieChart, Calculator, Tag,
  FileBarChart, FileStack, FileCode, FileImage
} from "lucide-react";

const API_URL = "/receipts";

// Helper function to extract data
const extractData = (response) => {
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && response.data.data) {
    return response.data.data;
  } else if (response.data) {
    if (response.data.success && response.data.data !== undefined) {
      return response.data.data;
    }
    return [response.data];
  }
  return [];
};

// API Functions - Fetch receipts directly from receipts endpoint
const fetchReceipts = async (params = {}) => {
  const response = await api.get(API_URL, { params });
  return extractData(response);
};

const fetchReceiptStats = async () => {
  const response = await api.get(`${API_URL}/stats`);
  return response.data.data || response.data || {};
};

const fetchAppSettings = async () => {
  const response = await api.get("/settings", { params: { _t: Date.now() } });
  return mergeAppSettings(response.data?.data || {});
};

// Constants
const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar", rate: 1 },
  { code: "KES", symbol: "KSh", label: "Kenya Shilling", rate: 150 },
  { code: "EUR", symbol: "€", label: "Euro", rate: 0.92 },
  { code: "GBP", symbol: "£", label: "British Pound", rate: 0.79 },
  { code: "UGX", symbol: "USh", label: "Uganda Shilling", rate: 3700 },
];

const PAYMENT_METHODS = [
  { id: "bank_transfer", name: "Bank Transfer", icon: Building },
  { id: "credit_card", name: "Credit Card", icon: CreditCard },
  { id: "mpesa", name: "M-Pesa", icon: Bell },
  { id: "paypal", name: "PayPal", icon: Globe },
  { id: "cash", name: "Cash", icon: DollarSign },
  { id: "cheque", name: "Cheque", icon: FileCheck },
  { id: "other", name: "Other", icon: MoreVertical },
];

// Helper Functions
const formatCurrency = (amount, currency = "USD") => {
  const currencyObj = CURRENCIES.find(c => c.code === currency);
  const symbol = currencyObj?.symbol || "$";
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace(currency, symbol);
  } catch (error) {
    return `${symbol}${amount.toFixed(2)}`;
  }
};

// Main Component
const Receipts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isMobileList, setIsMobileList] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: "all",
    amountRange: "all",
    paymentMethod: "all"
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [receiptStats, setReceiptStats] = useState(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const printRef = useRef();

  // Queries
  const { data: receipts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["receipts", filters, currentPage, itemsPerPage, sortBy, sortOrder],
    queryFn: () => fetchReceipts({
      page: currentPage,
      limit: itemsPerPage,
      sortBy,
      sortOrder,
      ...filters
    }),
    staleTime: 60000,
    cacheTime: 300000,
    onSuccess: (data) => {
      if (data.length > 0 && !selectedReceipt && window.innerWidth > 768) {
        setSelectedReceipt(data[0]);
      }
      calculateStats(data);
    },
    onError: (error) => {
      console.error("Error fetching receipts:", error);
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["receipt-stats"],
    queryFn: fetchReceiptStats,
    staleTime: 30000,
  });

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const receiptDocSettings = useMemo(
    () => getDocumentSettings(appSettings, "receipt"),
    [appSettings]
  );

  const calculateStats = useCallback((data) => {
    if (!data || data.length === 0) {
      setReceiptStats(null);
      return;
    }

    const totalAmount = data.reduce((sum, receipt) => sum + (receipt.total || 0), 0);
    const totalTax = data.reduce((sum, receipt) => sum + (receipt.taxAmount || 0), 0);
    
    const uniqueClients = new Set(data.map(receipt => 
      receipt.client?._id || receipt.client?.email || receipt.client?.name
    ));
    
    const paymentMethods = data.reduce((acc, receipt) => {
      const method = receipt.paymentMethod || 'Unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    setReceiptStats({
      total: data.length,
      totalAmount,
      totalTax,
      uniqueClients: uniqueClients.size,
      averageAmount: totalAmount / data.length,
      paymentMethods,
      currency: data[0]?.currency || "USD"
    });
  }, []);

  const selectReceipt = useCallback((receipt) => {
    setSelectedReceipt(receipt);
    setIsMobileList(false);
  }, []);

  // Enhanced PDF Download
  const downloadPDF = async (receipt) => {
    if (!receipt) return;
    
    const toastId = toast.loading("Generating PDF...", {
      style: {
        background: '#3B82F6',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        borderRadius: '8px',
        border: '1px solid #1D4ED8',
        padding: '12px 16px',
      }
    });
    
    try {
      if (!selectedReceipt || selectedReceipt._id !== receipt._id) {
        setSelectedReceipt(receipt);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const element = printRef.current;
      if (!element) {
        toast.error("PDF element not found", { id: toastId });
        return;
      }
      
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        removeContainer: true
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      const fileName = `RECEIPT_${receipt.receiptNumber || receipt._id?.slice(-8).toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF downloaded successfully!", { 
        id: toastId,
        duration: 3000,
        icon: '✅',
        style: {
          background: '#10B981',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '8px',
          border: '1px solid #047857',
          padding: '12px 16px',
        }
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF. Please try again.", { 
        id: toastId,
        duration: 4000,
        icon: '❌',
        style: {
          background: '#EF4444',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '8px',
          border: '1px solid #DC2626',
          padding: '12px 16px',
        }
      });
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `RECEIPT_${selectedReceipt?.receiptNumber || selectedReceipt?._id?.slice(-8).toUpperCase()}`,
    onBeforeGetContent: () => {
      toast.loading("Preparing for printing...");
      return Promise.resolve();
    },
    onAfterPrint: () => {
      toast.success("Print command sent to printer");
    },
  });

  const downloadCSV = useCallback(() => {
    if (!Array.isArray(receipts) || receipts.length === 0) {
      toast.error("No receipts to export");
      return;
    }
    
    const headers = [
      "Receipt Number",
      "Invoice Number",
      "Client",
      "Date",
      "Payment Date",
      "Total Amount",
      "Currency",
      "Payment Method",
      "Transaction ID",
      "Status"
    ];
    
    const data = receipts.map(receipt => [
      receipt.receiptNumber || `RCT-${receipt._id?.slice(-8).toUpperCase()}`,
      receipt.invoiceNumber || "N/A",
      receipt.client?.name || "N/A",
      receipt.date || "N/A",
      receipt.paymentDate || receipt.date || "N/A",
      receipt.total || 0,
      receipt.currency || "USD",
      receipt.paymentMethod || "N/A",
      receipt.transactionId || "N/A",
      receipt.status || "PAID"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...data.map(row => row.map(cell => `"${cell?.toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipts_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    
    toast.success("CSV export completed!");
  }, [receipts]);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, []);

  const shareReceipt = useCallback(async () => {
    if (!selectedReceipt) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${selectedReceipt.receiptNumber || `RCT-${selectedReceipt._id?.slice(-8).toUpperCase()}`}`,
          text: `Receipt from ${selectedReceipt.client?.name} - ${formatCurrency(selectedReceipt.total || 0, selectedReceipt.currency)}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Sharing cancelled');
      }
    } else {
      copyToClipboard(window.location.href);
    }
  }, [selectedReceipt, copyToClipboard]);

  const filteredReceipts = useMemo(() => {
    if (!Array.isArray(receipts)) {
      console.error('receipts is not an array:', receipts);
      return [];
    }
    
    let filtered = [...receipts];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(receipt =>
        (receipt.receiptNumber?.toLowerCase().includes(searchLower)) ||
        (receipt.invoiceNumber?.toLowerCase().includes(searchLower)) ||
        (receipt.client?.name?.toLowerCase().includes(searchLower)) ||
        (receipt.client?.email?.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.amountRange !== "all") {
      const ranges = {
        "0-1000": [0, 1000],
        "1000-5000": [1000, 5000],
        "5000-10000": [5000, 10000],
        "10000-50000": [10000, 50000],
        "50000+": [50000, Infinity]
      };
      
      const [min, max] = ranges[filters.amountRange] || [0, Infinity];
      filtered = filtered.filter(receipt => {
        const amount = receipt.total || 0;
        return amount >= min && amount <= max;
      });
    }
    
    if (filters.paymentMethod !== "all") {
      filtered = filtered.filter(receipt => 
        (receipt.paymentMethod || "Unknown") === filters.paymentMethod
      );
    }
    
    if (filters.dateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateRange) {
        case "today":
          filtered = filtered.filter(receipt => 
            receipt.paymentDate && new Date(receipt.paymentDate).toDateString() === today.toDateString()
          );
          break;
        case "this_week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          filtered = filtered.filter(receipt => 
            receipt.paymentDate && new Date(receipt.paymentDate) >= weekStart
          );
          break;
        case "this_month":
          filtered = filtered.filter(receipt => 
            receipt.paymentDate &&
            new Date(receipt.paymentDate).getMonth() === today.getMonth() &&
            new Date(receipt.paymentDate).getFullYear() === today.getFullYear()
          );
          break;
        case "this_quarter":
          const quarterStart = new Date(today);
          const currentQuarter = Math.floor(today.getMonth() / 3);
          quarterStart.setMonth(currentQuarter * 3);
          quarterStart.setDate(1);
          quarterStart.setHours(0, 0, 0, 0);
          filtered = filtered.filter(receipt => 
            receipt.paymentDate && new Date(receipt.paymentDate) >= quarterStart
          );
          break;
        case "this_year":
          filtered = filtered.filter(receipt => 
            receipt.paymentDate &&
            new Date(receipt.paymentDate).getFullYear() === today.getFullYear()
          );
          break;
        default:
          break;
      }
    }
    
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "date":
          aValue = new Date(a.paymentDate || a.date);
          bValue = new Date(b.paymentDate || b.date);
          break;
        case "amount":
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        case "client":
          aValue = a.client?.name || "";
          bValue = b.client?.name || "";
          break;
        case "number":
          aValue = a.receiptNumber || "";
          bValue = b.receiptNumber || "";
          break;
        default:
          aValue = new Date(a.createdAt || a.paymentDate || a.date);
          bValue = new Date(b.createdAt || b.paymentDate || b.date);
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [receipts, search, filters, sortBy, sortOrder]);

  const paginatedReceipts = useMemo(() => {
    if (!Array.isArray(filteredReceipts)) {
      console.error('filteredReceipts is not an array:', filteredReceipts);
      return [];
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReceipts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage) || 1;

  const handleSelectAll = useCallback(() => {
    if (!Array.isArray(paginatedReceipts)) return;
    
    if (selectedReceipts.length === paginatedReceipts.length) {
      setSelectedReceipts([]);
    } else {
      setSelectedReceipts(paginatedReceipts.map(receipt => receipt._id));
    }
  }, [paginatedReceipts, selectedReceipts.length]);

  const handleSelectReceipt = useCallback((receiptId) => {
    setSelectedReceipts(prev =>
      prev.includes(receiptId)
        ? prev.filter(id => id !== receiptId)
        : [...prev, receiptId]
    );
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setIsMobileList(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAmountRangeOptions = useCallback(() => [
    { value: "all", label: "All Amounts" },
    { value: "0-1000", label: "Under $1,000" },
    { value: "1000-5000", label: "$1,000 - $5,000" },
    { value: "5000-10000", label: "$5,000 - $10,000" },
    { value: "10000-50000", label: "$10,000 - $50,000" },
    { value: "50000+", label: "Over $50,000" }
  ], []);

  const getPaymentMethodOptions = useCallback(() => {
    if (!receiptStats?.paymentMethods) return [{ value: "all", label: "All Methods" }];
    
    const methods = Object.keys(receiptStats.paymentMethods);
    return [
      { value: "all", label: "All Methods" },
      ...methods.map(method => ({ 
        value: method, 
        label: PAYMENT_METHODS.find(m => m.id === method)?.name || method 
      }))
    ];
  }, [receiptStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 text-slate-800 font-sans antialiased">
      <Toaster 
        position="top-right"
        containerStyle={{ top: 76, zIndex: 1200 }}
        toastOptions={{
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '8px',
              border: '1px solid #047857',
              padding: '12px 16px',
            },
            icon: '✅',
          },
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '8px',
              border: '1px solid #DC2626',
              padding: '12px 16px',
            },
            icon: '❌',
          },
          loading: {
            duration: Infinity,
            style: {
              background: '#3B82F6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '8px',
              border: '1px solid #1D4ED8',
              padding: '12px 16px',
            },
          },
        }}
      />
      
      {/* Navigation Header - White/Blue Theme */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl shadow-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Payment Receipts</h1>
                <p className="text-xs text-slate-500 font-medium">Official Payment Verification System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search receipts..."
                  className="pl-10 pr-4 py-2.5 w-64 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                  title="Analytics"
                >
                  <BarChart3 size={18} />
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                  title="Filters"
                >
                  <Filter size={18} />
                </button>
                
                <button
                  onClick={() => refetch()}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                  title="Refresh"
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
                
                <button
                  onClick={downloadCSV}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  <FileSpreadsheet size={18} />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Analytics Dashboard */}
      {showAnalytics && receiptStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">Receipt Analytics</h2>
              <button
                onClick={() => setShowAnalytics(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700">Total Receipts</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {receiptStats.total.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700">Total Received</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(receiptStats.totalAmount, receiptStats.currency)}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700">Unique Clients</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {receiptStats.uniqueClients.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700">Average Receipt</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(receiptStats.averageAmount, receiptStats.currency)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-slate-900 mb-4">Payment Methods Distribution</h3>
                <div className="space-y-3">
                  {receiptStats.paymentMethods && Object.entries(receiptStats.paymentMethods).map(([method, count]) => {
                    const methodName = PAYMENT_METHODS.find(m => m.id === method)?.name || method;
                    return (
                      <div key={method} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{methodName}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-blue-100 rounded-full h-2">
                            <div 
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${(count / receiptStats.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-slate-900 mb-4">Monthly Trends</h3>
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-blue-300 mx-auto mb-2" />
                    <p className="text-sm text-blue-600">Monthly breakdown coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-slate-900">Advanced Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount Range</label>
                <select
                  value={filters.amountRange}
                  onChange={(e) => setFilters({...filters, amountRange: e.target.value})}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {getAmountRangeOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {getPaymentMethodOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setFilters({
                  dateRange: "all",
                  amountRange: "all",
                  paymentMethod: "all"
                })}
                className="px-4 py-2 border border-blue-200 text-slate-700 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bulk Actions Bar */}
        {selectedReceipts.length > 0 && (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-blue-600"
                  >
                    {selectedReceipts.length === paginatedReceipts.length ? (
                      <CheckSquare size={20} className="text-blue-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedReceipts.length} receipt(s) selected
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    selectedReceipts.forEach(id => downloadPDF(receipts.find(r => r._id === id)));
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <Download size={14} />
                  Download Selected
                </button>
                <button
                  onClick={() => setSelectedReceipts([])}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex bg-white border border-blue-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded transition-all ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <FileBox size={18} />
                </button>
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="client">Sort by Client</option>
                <option value="number">Sort by Receipt #</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
              
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={downloadCSV}
                className="p-2.5 bg-white border border-blue-100 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                title="Export CSV"
              >
                <FileSpreadsheet size={18} />
              </button>
              <button
                onClick={() => {
                  if (selectedReceipt) {
                    downloadPDF(selectedReceipt);
                  } else {
                    toast.error("Please select a receipt first");
                  }
                }}
                className="p-2.5 bg-white border border-blue-100 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                title="Export PDF"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => {
                  if (selectedReceipt) {
                    handlePrint();
                  } else {
                    toast.error("Please select a receipt first");
                  }
                }}
                className="p-2.5 bg-white border border-blue-100 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                title="Print"
              >
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex h-[calc(100vh-280px)] min-w-0 gap-4 md:gap-6 overflow-hidden">
          {/* Left Panel - Receipts List */}
          <div className={`${isMobileList ? 'block' : 'hidden'} md:block w-full md:w-[400px] shrink-0 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden`}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-blue-100 bg-blue-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Payment Receipts ({filteredReceipts.length})</h3>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    Verified
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : isError ? (
                  <div className="p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Failed to load receipts</p>
                  </div>
                ) : !Array.isArray(receipts) || receipts.length === 0 ? (
                  <div className="p-4 text-center">
                    <FileSearch className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No payment receipts found</p>
                  </div>
                ) : (
                  paginatedReceipts.map((receipt) => (
                    <div
                      key={receipt._id}
                      onClick={() => selectReceipt(receipt)}
                      className={`p-4 border-b border-blue-50 cursor-pointer transition-all hover:bg-blue-50 ${
                        selectedReceipt?._id === receipt._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {receipt.receiptNumber || `RCT-${receipt._id?.slice(-8).toUpperCase()}`}
                          </span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                          PAID
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-900 font-medium mb-1">
                        {receipt.client?.name || "Unknown Client"}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(receipt.paymentDate || receipt.date).toLocaleDateString()}
                        </span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(receipt.total || 0, receipt.currency)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Pagination */}
              {!isLoading && !isError && filteredReceipts.length > 0 && (
                <div className="p-4 border-t border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Panel - Receipt Preview */}
          <div className={`${!isMobileList ? 'block' : 'hidden'} md:block flex-1 min-w-0 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden`}>
            {selectedReceipt ? (
              <>
                <div className="h-full flex flex-col">
                  <div className="p-3 sm:p-4 border-b border-blue-100 bg-blue-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => setIsMobileList(true)}
                        className="md:hidden p-1.5 text-slate-600 hover:text-blue-600"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">Receipt Preview</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {selectedReceipt.receiptNumber || `RCT-${selectedReceipt._id?.slice(-8).toUpperCase()}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                      <button
                        onClick={() => setShowSensitiveData(!showSensitiveData)}
                        className="p-1.5 text-slate-400 hover:text-blue-600"
                        title={showSensitiveData ? "Hide sensitive data" : "Show sensitive data"}
                      >
                        {showSensitiveData ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedReceipt._id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600"
                        title="Copy Receipt ID"
                      >
                        <Copy size={18} />
                      </button>
                      <button
                        onClick={shareReceipt}
                        className="p-1.5 text-slate-400 hover:text-blue-600"
                        title="Share"
                      >
                        <Share2 size={18} />
                      </button>
                      <button
                        onClick={() => downloadPDF(selectedReceipt)}
                        className="p-1.5 text-slate-400 hover:text-blue-600"
                        title="Download PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handlePrint()}
                        className="p-1.5 text-slate-400 hover:text-blue-600"
                        title="Print"
                      >
                        <Printer size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 sm:p-6" ref={printRef}>
                    {/* Receipt Content */}
                    <div className="max-w-4xl mx-auto">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 sm:p-8 mb-6 text-white">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-lg">
                                <ShieldCheck className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold break-words">{receiptDocSettings.companyName}</h1>
                                <p className="text-blue-100 text-sm">{receiptDocSettings.tagline}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-sm text-blue-100">
                              <div className="flex items-center gap-2 break-all">
                                <Phone size={14} />
                                <span>{receiptDocSettings.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 break-all">
                                <Mail size={14} />
                                <span>{receiptDocSettings.email}</span>
                              </div>
                              <div className="flex items-center gap-2 break-all">
                                <Globe size={14} />
                                <span>{receiptDocSettings.website}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-left md:text-right">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                              {(receiptDocSettings.title || "RECEIPT").toUpperCase()}
                            </h2>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">Receipt #: {selectedReceipt.receiptNumber || `RCT-${selectedReceipt._id?.slice(-8).toUpperCase()}`}</p>
                              <p className="text-sm">Date: {new Date(selectedReceipt.paymentDate || selectedReceipt.date).toLocaleDateString()}</p>
                              {selectedReceipt.invoiceNumber && (
                                <p className="text-sm">Ref: {selectedReceipt.invoiceNumber}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Client & Payment Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Billed To</h3>
                          <div className="space-y-2">
                            <p className="text-lg font-bold text-slate-900">{selectedReceipt.client?.name || "Client Name"}</p>
                            <p className="text-sm text-slate-600">{selectedReceipt.client?.email || "client@example.com"}</p>
                            <p className="text-sm text-slate-600">{selectedReceipt.client?.phone || "Phone: N/A"}</p>
                            {showSensitiveData && selectedReceipt.client?.address && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <p className="text-sm text-slate-600">{selectedReceipt.client.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Payment Details</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Status</span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                PAID
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Method</span>
                              <span className="font-medium text-slate-900">
                                {PAYMENT_METHODS.find(m => m.id === selectedReceipt.paymentMethod)?.name || selectedReceipt.paymentMethod}
                              </span>
                            </div>
                            {selectedReceipt.transactionId && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Transaction ID</span>
                                <span className="font-mono text-xs text-slate-900">
                                  {selectedReceipt.transactionId.slice(0, 12)}...
                                </span>
                              </div>
                            )}
                            {showSensitiveData && selectedReceipt.paymentDetails && (
                              <div className="pt-3 border-t border-blue-200">
                                <p className="text-xs text-slate-600">Auth: {selectedReceipt.paymentDetails.authCode || 'N/A'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Items Table */}
                      <div className="mb-8">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Transaction Items</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] border-collapse">
                            <thead>
                              <tr className="bg-blue-50 border-b border-blue-100">
                                <th className="text-left p-3 font-semibold text-slate-700">Description</th>
                                <th className="text-center p-3 font-semibold text-slate-700">Qty</th>
                                <th className="text-right p-3 font-semibold text-slate-700">Unit Price</th>
                                <th className="text-right p-3 font-semibold text-slate-700">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedReceipt.items?.map((item, index) => (
                                <tr key={index} className="border-b border-blue-50">
                                  <td className="p-3">
                                    <p className="font-medium text-slate-900">{item.description || 'Item'}</p>
                                    <p className="text-xs text-slate-500">SKU: {item.product?.sku || 'N/A'}</p>
                                  </td>
                                  <td className="p-3 text-center text-slate-700">{item.quantity}</td>
                                  <td className="p-3 text-right text-slate-700">
                                    {formatCurrency(item.price || 0, selectedReceipt.currency)}
                                  </td>
                                  <td className="p-3 text-right font-medium text-slate-900">
                                    {formatCurrency(item.total || 0, selectedReceipt.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {/* Totals */}
                      <div className="flex justify-end">
                        <div className="w-full md:w-96">
                          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Subtotal</span>
                                <span className="font-medium">
                                  {formatCurrency(selectedReceipt.subtotal || 0, selectedReceipt.currency)}
                                </span>
                              </div>
                              
                              {selectedReceipt.taxAmount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Tax ({selectedReceipt.taxRate || 0}%)</span>
                                  <span className="font-medium">
                                    {formatCurrency(selectedReceipt.taxAmount, selectedReceipt.currency)}
                                  </span>
                                </div>
                              )}
                              
                              {selectedReceipt.discount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Discount</span>
                                  <span className="font-medium text-red-600">
                                    -{formatCurrency(selectedReceipt.discount, selectedReceipt.currency)}
                                  </span>
                                </div>
                              )}
                              
                              <div className="border-t border-blue-300 pt-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-bold text-slate-900">Total Paid</span>
                                  <span className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(selectedReceipt.total || 0, selectedReceipt.currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="mt-8 pt-6 border-t border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2">Payment Information</h4>
                            <p className="text-sm text-slate-600">{receiptDocSettings.addressLine1}</p>
                            <p className="text-sm text-slate-600">{receiptDocSettings.addressLine2}</p>
                            {!!receiptDocSettings.taxIdValue && (
                              <p className="text-sm text-slate-600">
                                {receiptDocSettings.taxIdLabel}: {receiptDocSettings.taxIdValue}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2">Verification</h4>
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-slate-600">Payment Verified</span>
                            </div>
                            <div className="flex items-center gap-2 justify-center md:justify-start mt-1">
                              <Shield className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-slate-600">{receiptDocSettings.footerNote}</span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2">Contact</h4>
                            <p className="text-sm text-slate-600">{receiptDocSettings.email}</p>
                            <p className="text-sm text-slate-600">{receiptDocSettings.phone}</p>
                            <p className="text-sm text-slate-600">{receiptDocSettings.website}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <Receipt className="w-16 h-16 text-blue-200 mb-4" />
                <p className="text-slate-600 font-medium mb-2">No receipt selected</p>
                <p className="text-slate-500 text-sm">Select a receipt from the list to preview</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Receipts;
