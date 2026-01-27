import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";

import {
  Eye, Edit, Trash2, Download, Printer, 
  Plus, RefreshCw, X, Search, FileText, FileSpreadsheet,
  Globe, Mail, MapPin, CheckCircle2, AlertCircle, Phone, ShieldCheck,
  PlusCircle, Minus, Coins, Percent, Tags, Calendar, Filter, 
  BarChart3, Users, DollarSign, CreditCard, Clock, CheckSquare,
  Square, ChevronLeft, ChevronRight, MoreVertical, Share2, Copy,
  Send, Archive, BookOpen, Settings, Layers, Package, Truck,
  FileCheck, FileX, FileWarning, FileSearch, TrendingUp, AlertTriangle,
  Bell, PrinterCheck, MailCheck, MessageSquare, Cloud, Database,
  Smartphone, Tablet, Laptop, Watch, Headphones, Camera,
  Music, Gamepad2, Book, Home, Briefcase, Star, Zap,
  Shield, Lock, Unlock, EyeOff, Eye as EyeIcon,
  Upload, UserPlus, Building, Hash, FileDigit,
  PercentCircle, Calculator, PieChart, Target, Wallet,
  Receipt, BookMarked, FileBarChart,
  FileStack, FileBox, FileCode, FileImage, FileAudio,
  FileVideo, FileArchive, FileJson, FileCog,
  ChevronDown, User
} from "lucide-react";

// API Config
const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API_URL = `${BASE_URL}/invoices`;
const CLIENTS_API_URL = `${BASE_URL}/clients`;
const PRODUCTS_API_URL = `${BASE_URL}/products`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
  return config;
}, (error) => Promise.reject(error));

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ ${error.response?.status || 'Network'} Error:`, {
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      toast.error("Session expired. Please login again.");
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else if (error.response?.status === 403) {
      toast.error("Access denied. Insufficient permissions.");
    } else if (error.response?.status === 404) {
      toast.error("Resource not found.");
    } else if (error.response?.status === 409) {
      toast.error("Duplicate entry detected.");
    } else if (error.response?.status === 422) {
      toast.error("Validation error. Please check your input.");
    } else if (error.response?.status === 500) {
      toast.error("Server error. Please try again later.");
    } else if (!error.response) {
      toast.error("Network error. Please check your connection.");
    }
    
    return Promise.reject(error);
  }
);

// Helper function to extract data from API response
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

// API Functions
const fetchInvoices = async (params = {}) => {
  const response = await api.get(API_URL, { params });
  return extractData(response);
};

const fetchClients = async () => {
  const response = await api.get(CLIENTS_API_URL);
  return extractData(response);
};

const fetchProducts = async () => {
  const response = await api.get(PRODUCTS_API_URL);
  return extractData(response);
};

const fetchInvoiceStats = async () => {
  const response = await api.get(`${API_URL}/stats`);
  return response.data.data || response.data || {};
};

// Constants
const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar", rate: 1 },
  { code: "KES", symbol: "KSh", label: "Kenya Shilling", rate: 150 },
  { code: "EUR", symbol: "€", label: "Euro", rate: 0.92 },
  { code: "GBP", symbol: "£", label: "British Pound", rate: 0.79 },
  { code: "UGX", symbol: "USh", label: "Uganda Shilling", rate: 3700 },
];

const TAX_RATES = [
  { id: "zero", name: "Zero Rate (0%)", rate: 0 },
  { id: "vat", name: "VAT (16%)", rate: 16 },
  { id: "vat_exempt", name: "VAT Exempt", rate: 0 },
  { id: "custom", name: "Custom Rate", rate: null },
];

const INVOICE_STATUSES = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  PAID: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  PARTIAL: { label: "Partial", color: "bg-yellow-100 text-yellow-700", icon: PercentCircle },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  CANCELLED: { label: "Cancelled", color: "bg-gray-300 text-gray-600", icon: FileX },
  REFUNDED: { label: "Refunded", color: "bg-purple-100 text-purple-700", icon: RefreshCw },
};

const PAYMENT_METHODS = [
  { id: "bank_transfer", name: "Bank Transfer", icon: Building },
  { id: "credit_card", name: "Credit Card", icon: CreditCard },
  { id: "mpesa", name: "M-Pesa", icon: Smartphone },
  { id: "paypal", name: "PayPal", icon: Globe },
  { id: "cash", name: "Cash", icon: DollarSign },
  { id: "cheque", name: "Cheque", icon: FileCheck },
  { id: "other", name: "Other", icon: MoreVertical },
];

// Helper Functions
const generateInvoiceNumber = () => {
  const prefix = "INV";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
};

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

const calculateDueDate = (issueDate, terms) => {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + terms);
  return date.toISOString().split('T')[0];
};

const calculateAge = (date) => {
  const today = new Date();
  const dueDate = new Date(date);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Main Component
const Invoices = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
    dateRange: "all",
    client: "all",
    amountRange: "all",
    dueDate: "all"
  });
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const printRef = useRef();

  const handlePrintTrigger = useReactToPrint({
    content: () => printRef.current,
    onBeforeGetContent: () => {
      toast.loading("Preparing for printing...");
      return Promise.resolve();
    },
    onAfterPrint: () => {
      toast.success("Print command sent to printer");
    },
    documentTitle: `Invoice_${viewing?.invoiceNumber || 'View'}`,
  });

  // Queries
  const { data: invoicesData = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["invoices", filters, currentPage, itemsPerPage, sortBy, sortOrder],
    queryFn: () => fetchInvoices({
      page: currentPage,
      limit: itemsPerPage,
      sortBy,
      sortOrder,
      ...filters
    }),
    staleTime: 60000,
    cacheTime: 300000,
    onError: (error) => {
      console.error("Error fetching invoices:", error);
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["invoice-stats"],
    queryFn: fetchInvoiceStats,
    staleTime: 30000,
  });

  const { data: clientsData = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
    staleTime: 60000,
  });

  const { data: productsData = [] } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 60000,
  });

  // Ensure data is always an array
  const invoices = useMemo(() => {
    if (Array.isArray(invoicesData)) return invoicesData;
    if (invoicesData && Array.isArray(invoicesData.data)) return invoicesData.data;
    if (invoicesData && invoicesData.data) return [invoicesData.data];
    return [];
  }, [invoicesData]);

  const clients = useMemo(() => {
    if (Array.isArray(clientsData)) return clientsData;
    if (clientsData && Array.isArray(clientsData.data)) return clientsData.data;
    return [];
  }, [clientsData]);

  const products = useMemo(() => {
    if (Array.isArray(productsData)) return productsData;
    if (productsData && Array.isArray(productsData.data)) return productsData.data;
    return [];
  }, [productsData]);

  // Calculate top clients for analytics
  const topClients = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    
    const clientTotals = invoices
      .filter(inv => inv.client?.name)
      .reduce((acc, inv) => {
        const clientName = inv.client.name;
        acc[clientName] = (acc[clientName] || 0) + (inv.total || 0);
        return acc;
      }, {});
    
    return Object.entries(clientTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }, [invoices]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        client: data.client?._id || data.client,
        items: data.items.map(item => ({
          ...item,
          product: item.product?._id || item.product
        }))
      };
      
      if (data._id) {
        return api.put(`${API_URL}/${data._id}`, payload);
      } else {
        return api.post(API_URL, payload);
      }
    },
    onSuccess: (response) => {
      toast.success(
        response.data._id ? "Invoice updated successfully!" : "Invoice created successfully!",
        {
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
        }
      );
      
      queryClient.invalidateQueries(["invoices"]);
      queryClient.invalidateQueries(["invoice-stats"]);
      
      setEditing(null);
      setAdding(false);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || "Failed to save invoice";
      toast.error(`Save failed: ${errorMessage}`, {
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_URL}/${id}`),
    onSuccess: () => {
      toast.success("Invoice deleted successfully", {
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
      
      queryClient.invalidateQueries(["invoices"]);
      queryClient.invalidateQueries(["invoice-stats"]);
      setSelectedInvoices([]);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete invoice";
      toast.error(`Delete failed: ${errorMessage}`, {
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
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => api.post(`${API_URL}/bulk-delete`, { ids }),
    onSuccess: () => {
      toast.success(`${selectedInvoices.length} invoices deleted successfully`, {
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
      
      setSelectedInvoices([]);
      setShowBulkActions(false);
      queryClient.invalidateQueries(["invoices"]);
      queryClient.invalidateQueries(["invoice-stats"]);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete invoices";
      toast.error(`Bulk delete failed: ${errorMessage}`, {
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
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: (invoiceId) => api.post(`${API_URL}/${invoiceId}/send-email`),
    onMutate: (invoiceId) => {
      toast.loading("Sending email...", {
        id: "email-send",
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
    },
    onSuccess: () => {
      toast.success("Email sent successfully!", { id: "email-send" });
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || "Failed to send email";
      toast.error(`Email failed: ${errorMessage}`, { id: "email-send" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (invoiceId) => api.post(`${API_URL}/${invoiceId}/duplicate`),
    onSuccess: (response) => {
      toast.success("Invoice duplicated successfully!");
      queryClient.invalidateQueries(["invoices"]);
      setEditing(response.data);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || "Failed to duplicate invoice";
      toast.error(`Duplication failed: ${errorMessage}`);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }) => api.post(`${API_URL}/bulk-status`, { ids, status }),
    onSuccess: () => {
      toast.success(`Status updated for ${selectedInvoices.length} invoices`);
      setSelectedInvoices([]);
      setShowBulkActions(false);
      queryClient.invalidateQueries(["invoices"]);
      queryClient.invalidateQueries(["invoice-stats"]);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update status";
      toast.error(`Status update failed: ${errorMessage}`);
    },
  });

  // Enhanced PDF Download Function
  const downloadPDF = async (invoice) => {
    if (!invoice) return;
    
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
      if (!viewing || viewing._id !== invoice._id) {
        setViewing(invoice);
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
        removeContainer: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 15000
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        floatPrecision: 16
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
      
      const fileName = `INVOICE_${invoice.invoiceNumber || invoice._id?.slice(-8).toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
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
      
      api.post(`${API_URL}/${invoice._id}/track-download`).catch(console.error);
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

  const downloadCSV = () => {
    if (!Array.isArray(invoices) || invoices.length === 0) {
      toast.error("No invoices to export");
      return;
    }
    
    const headers = [
      "Invoice Number",
      "Client",
      "Date",
      "Due Date",
      "Status",
      "Total Amount",
      "Paid Amount",
      "Balance",
      "Currency",
      "Payment Method",
      "Notes"
    ];
    
    const data = invoices.map(inv => [
      inv.invoiceNumber || inv._id?.slice(-8).toUpperCase() || "N/A",
      inv.client?.name || "N/A",
      inv.date || "N/A",
      inv.dueDate || "N/A",
      inv.status || "DRAFT",
      inv.total || 0,
      inv.paidAmount || 0,
      (inv.total || 0) - (inv.paidAmount || 0),
      inv.currency || "USD",
      inv.paymentMethod || "N/A",
      inv.notes || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...data.map(row => row.map(cell => `"${cell?.toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    
    toast.success("CSV export completed!");
  };

  const handleSelectAll = () => {
    if (!Array.isArray(paginatedInvoices)) return;
    
    if (selectedInvoices.length === paginatedInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(paginatedInvoices.map(inv => inv._id));
    }
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) {
      console.error('invoices is not an array:', invoices);
      return [];
    }
    
    let filtered = [...invoices];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(inv =>
        (inv.invoiceNumber?.toLowerCase().includes(searchLower)) ||
        (inv.client?.name?.toLowerCase().includes(searchLower)) ||
        (inv.client?.email?.toLowerCase().includes(searchLower)) ||
        (inv.notes?.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.status !== "all") {
      filtered = filtered.filter(inv => inv.status === filters.status);
    }
    
    if (filters.dateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateRange) {
        case "today":
          filtered = filtered.filter(inv => new Date(inv.date).toDateString() === today.toDateString());
          break;
        case "this_week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          filtered = filtered.filter(inv => new Date(inv.date) >= weekStart);
          break;
        case "this_month":
          filtered = filtered.filter(inv => 
            new Date(inv.date).getMonth() === today.getMonth() &&
            new Date(inv.date).getFullYear() === today.getFullYear()
          );
          break;
        case "this_year":
          filtered = filtered.filter(inv => 
            new Date(inv.date).getFullYear() === today.getFullYear()
          );
          break;
        case "overdue":
          filtered = filtered.filter(inv => 
            inv.status === "SENT" && 
            inv.dueDate && 
            new Date(inv.dueDate) < today
          );
          break;
        default:
          break;
      }
    }
    
    if (filters.client !== "all") {
      filtered = filtered.filter(inv => inv.client?._id === filters.client);
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
      filtered = filtered.filter(inv => {
        const amount = inv.total || 0;
        return amount >= min && amount <= max;
      });
    }
    
    if (filters.dueDate !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dueDate) {
        case "today":
          filtered = filtered.filter(inv => 
            inv.dueDate && 
            new Date(inv.dueDate).toDateString() === today.toDateString()
          );
          break;
        case "next_7_days":
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          filtered = filtered.filter(inv => 
            inv.dueDate && 
            new Date(inv.dueDate) >= today &&
            new Date(inv.dueDate) <= nextWeek
          );
          break;
        case "past_due":
          filtered = filtered.filter(inv => 
            inv.dueDate && 
            new Date(inv.dueDate) < today &&
            inv.status !== "PAID"
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
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case "dueDate":
          aValue = a.dueDate ? new Date(a.dueDate) : new Date(0);
          bValue = b.dueDate ? new Date(b.dueDate) : new Date(0);
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
          aValue = a.invoiceNumber || "";
          bValue = b.invoiceNumber || "";
          break;
        default:
          aValue = new Date(a.createdAt || a.date);
          bValue = new Date(b.createdAt || b.date);
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [invoices, search, filters, sortBy, sortOrder]);

  const paginatedInvoices = useMemo(() => {
    if (!Array.isArray(filteredInvoices)) {
      console.error('filteredInvoices is not an array:', filteredInvoices);
      return [];
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;

  const invoiceStats = useMemo(() => {
    if (!Array.isArray(invoices) || invoices.length === 0) return null;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const overdueAmount = invoices.filter(inv => 
      inv.status === "SENT" && 
      inv.dueDate && 
      new Date(inv.dueDate) < new Date()
    ).reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paidAmount || 0)), 0);
    
    const statusCounts = {
      DRAFT: invoices.filter(inv => inv.status === "DRAFT").length,
      SENT: invoices.filter(inv => inv.status === "SENT").length,
      PAID: invoices.filter(inv => inv.status === "PAID").length,
      PARTIAL: invoices.filter(inv => inv.status === "PARTIAL").length,
      OVERDUE: invoices.filter(inv => inv.status === "OVERDUE" || (
        inv.status === "SENT" && 
        inv.dueDate && 
        new Date(inv.dueDate) < new Date()
      )).length,
      CANCELLED: invoices.filter(inv => inv.status === "CANCELLED").length,
    };
    
    return {
      totalAmount,
      paidAmount,
      overdueAmount,
      outstandingAmount: totalAmount - paidAmount,
      statusCounts,
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(inv => inv.status === "PAID").length,
    };
  }, [invoices]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-700 font-sans antialiased">
      <Toaster 
        position="top-right"
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
      
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Invoice Management</h1>
                <p className="text-xs text-slate-500 font-medium">Enterprise Billing System v3.0</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  className="pl-10 pr-4 py-2.5 w-64 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                  title="Analytics"
                >
                  <BarChart3 size={18} />
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                  title="Filters"
                >
                  <Filter size={18} />
                </button>
                
                <button
                  onClick={() => refetch()}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                  title="Refresh"
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
                
                <button
                  onClick={() => setAdding(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Plus size={18} />
                  New Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Analytics Dashboard */}
      {showAnalytics && invoiceStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">Invoice Analytics</h2>
              <button
                onClick={() => setShowAnalytics(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-700">Total Revenue</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(invoiceStats.totalAmount, "USD")}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-slate-700">Paid Amount</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(invoiceStats.paidAmount, "USD")}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-slate-700">Outstanding</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(invoiceStats.outstandingAmount, "USD")}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-semibold text-slate-700">Overdue</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(invoiceStats.overdueAmount, "USD")}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Invoice Status Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(invoiceStats.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{INVOICE_STATUSES[status]?.label || status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-full rounded-full ${INVOICE_STATUSES[status]?.color.split(' ')[0]}`}
                            style={{ width: `${(count / invoiceStats.totalInvoices) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Top Clients</h3>
                <div className="space-y-3">
                  {topClients.map(([name, amount]) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-600">
                            {name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm text-slate-600 truncate">{name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(amount, "USD")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-slate-900">Advanced Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Statuses</option>
                  {Object.entries(INVOICE_STATUSES).map(([key, status]) => (
                    <option key={key} value={key}>{status.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Client</label>
                <select
                  value={filters.client}
                  onChange={(e) => setFilters({...filters, client: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Clients</option>
                  {Array.isArray(clients) && clients.map(client => (
                    <option key={client._id} value={client._id}>{client.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount Range</label>
                <select
                  value={filters.amountRange}
                  onChange={(e) => setFilters({...filters, amountRange: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Amounts</option>
                  <option value="0-1000">$0 - $1,000</option>
                  <option value="1000-5000">$1,000 - $5,000</option>
                  <option value="5000-10000">$5,000 - $10,000</option>
                  <option value="10000-50000">$10,000 - $50,000</option>
                  <option value="50000+">$50,000+</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                <select
                  value={filters.dueDate}
                  onChange={(e) => setFilters({...filters, dueDate: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Due Dates</option>
                  <option value="today">Due Today</option>
                  <option value="next_7_days">Next 7 Days</option>
                  <option value="next_30_days">Next 30 Days</option>
                  <option value="past_due">Past Due</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setFilters({
                  status: "all",
                  dateRange: "all",
                  client: "all",
                  amountRange: "all",
                  dueDate: "all"
                })}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
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
        {selectedInvoices.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-indigo-600"
                  >
                    {selectedInvoices.length === paginatedInvoices.length ? (
                      <CheckSquare size={20} className="text-indigo-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedInvoices.length} invoice(s) selected
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedInvoices, status: "SENT" })}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    Mark as Sent
                  </button>
                  <button
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedInvoices, status: "PAID" })}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${selectedInvoices.length} selected invoices?`)) {
                        bulkDeleteMutation.mutate(selectedInvoices);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedInvoices([])}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded transition-all ${viewMode === 'table' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Layers size={18} />
                </button>
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="date">Sort by Date</option>
                <option value="dueDate">Sort by Due Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="client">Sort by Client</option>
                <option value="number">Sort by Invoice #</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
              
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
                className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-green-600 hover:border-green-200 transition-all"
                title="Export CSV"
              >
                <FileSpreadsheet size={18} />
              </button>
              <button
                onClick={() => {
                  if (viewing) {
                    downloadPDF(viewing);
                  } else {
                    toast.error("Please select an invoice first");
                  }
                }}
                className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 transition-all"
                title="Export PDF"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => {
                  if (selectedInvoices.length > 0) {
                    selectedInvoices.forEach(id => sendEmailMutation.mutate(id));
                  } else {
                    toast.error("Please select invoices to send");
                  }
                }}
                className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                title="Send Email"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Loading invoices...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Failed to load invoices</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !Array.isArray(invoices) || invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
            <FileSearch className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium mb-2">No invoices found</p>
            <p className="text-slate-500 text-sm mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => setAdding(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Create Your First Invoice
            </button>
          </div>
        ) : viewMode === "table" ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4 w-12">
                        <button
                          onClick={handleSelectAll}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          {selectedInvoices.length === paginatedInvoices.length && paginatedInvoices.length > 0 ? (
                            <CheckSquare size={18} className="text-indigo-600" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4">Invoice</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Due Date</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(paginatedInvoices) && paginatedInvoices.map((invoice) => (
                      <tr 
                        key={invoice._id} 
                        className={`hover:bg-slate-50 transition-colors ${
                          selectedInvoices.includes(invoice._id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice._id)}
                            onChange={() => handleSelectInvoice(invoice._id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {invoice.invoiceNumber || `INV-${invoice._id?.slice(-8).toUpperCase()}`}
                              </p>
                              <p className="text-xs text-slate-500 font-mono">
                                #{invoice._id?.slice(-6).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{invoice.client?.name || "Unknown Client"}</p>
                            <p className="text-xs text-slate-500">{invoice.client?.email || "No email"}</p>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm text-slate-900">{invoice.date}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(invoice.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </p>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm text-slate-900">{invoice.dueDate || "N/A"}</p>
                            {invoice.dueDate && (
                              <p className={`text-xs ${
                                new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID'
                                  ? 'text-red-600 font-medium'
                                  : 'text-slate-500'
                              }`}>
                                {calculateAge(invoice.dueDate) > 0 
                                  ? `${calculateAge(invoice.dueDate)} days left`
                                  : `${Math.abs(calculateAge(invoice.dueDate))} days overdue`
                                }
                              </p>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(invoice.total || 0, invoice.currency)}
                            </p>
                            {invoice.paidAmount > 0 && (
                              <p className="text-xs text-green-600">
                                Paid: {formatCurrency(invoice.paidAmount, invoice.currency)}
                              </p>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                            INVOICE_STATUSES[invoice.status]?.color || 'bg-gray-100 text-gray-700'
                          }`}>
                            {INVOICE_STATUSES[invoice.status]?.label || invoice.status}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setViewing(invoice)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            
                            <button
                              onClick={() => duplicateMutation.mutate(invoice._id)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Duplicate"
                            >
                              <Copy size={18} />
                            </button>
                            
                            <button
                              onClick={() => sendEmailMutation.mutate(invoice._id)}
                              className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Send Email"
                            >
                              <Send size={18} />
                            </button>
                            
                            <button
                              onClick={() => downloadPDF(invoice)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download size={18} />
                            </button>
                            
                            <button
                              onClick={() => setEditing(invoice)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete invoice ${invoice.invoiceNumber || invoice._id?.slice(-8).toUpperCase()}?`)) {
                                  deleteMutation.mutate(invoice._id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</span> of{' '}
                <span className="font-semibold">{filteredInvoices.length}</span> invoices
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-slate-400">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.isArray(paginatedInvoices) && paginatedInvoices.map((invoice) => (
              <div
                key={invoice._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                      INVOICE_STATUSES[invoice.status]?.color || 'bg-gray-100 text-gray-700'
                    }`}>
                      {INVOICE_STATUSES[invoice.status]?.label || invoice.status}
                    </span>
                    {invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID' && (
                      <span className="text-xs text-red-600 mt-1">Overdue</span>
                    )}
                  </div>
                </div>
                
                <h3 className="font-semibold text-slate-900 mb-1 truncate">
                  {invoice.invoiceNumber || `INV-${invoice._id?.slice(-8).toUpperCase()}`}
                </h3>
                
                <p className="text-sm text-slate-600 mb-3 truncate">
                  {invoice.client?.name || "Unknown Client"}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-medium">{invoice.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Due:</span>
                    <span className="font-medium">{invoice.dueDate || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(invoice.total || 0, invoice.currency)}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setViewing(invoice)}
                      className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => downloadPDF(invoice)}
                      className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => setEditing(invoice)}
                      className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                  
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice._id)}
                    onChange={() => handleSelectInvoice(invoice._id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {viewing && (
        <InvoiceViewModal
          invoice={viewing}
          ref={printRef}
          onClose={() => setViewing(null)}
          onPrint={handlePrintTrigger}
          onDownload={() => downloadPDF(viewing)}
          onEmail={() => sendEmailMutation.mutate(viewing._id)}
          onDuplicate={() => duplicateMutation.mutate(viewing._id)}
          onEdit={() => {
            setViewing(null);
            setEditing(viewing);
          }}
        />
      )}
      
      {(editing || adding) && (
        <AddEditModal
          invoice={editing}
          clients={clients}
          products={products}
          onSave={(data) => saveMutation.mutate(data)}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
};

// Enhanced Invoice View Modal
const InvoiceViewModal = React.forwardRef(({ 
  invoice, 
  onClose, 
  onPrint, 
  onDownload, 
  onEmail, 
  onDuplicate, 
  onEdit 
}, ref) => {
  const subtotal = invoice.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0;
  const tax = invoice.tax || 0;
  const discount = invoice.discount || 0;
  const grandTotal = invoice.total || (subtotal + (subtotal * (tax / 100)) - discount);
  const paidAmount = invoice.paidAmount || 0;
  const balance = grandTotal - paidAmount;
  
  const StatusIcon = INVOICE_STATUSES[invoice.status]?.icon || FileText;
  const PaymentMethod = PAYMENT_METHODS.find(m => m.id === invoice.paymentMethod)?.icon || CreditCard;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Invoice Details</h2>
              <p className="text-sm text-slate-500">
                {invoice.invoiceNumber || `INV-${invoice._id?.slice(-8).toUpperCase()}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onDuplicate}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Duplicate"
            >
              <Copy size={20} />
            </button>
            <button
              onClick={onEmail}
              className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Send Email"
            >
              <Send size={20} />
            </button>
            <button
              onClick={onDownload}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Download PDF"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onPrint}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Print"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto" ref={ref}>
          {/* Invoice Content */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white p-2 rounded-lg">
                    <ShieldCheck className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">SMA TECHNOLOGIES</h1>
                    <p className="text-slate-300 text-sm">Professional Billing Solutions</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4" />
                    <span>+254 719 832 719</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" />
                    <span>billing@smacore.co.ke</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4" />
                    <span>www.smacore.co.ke</span>
                  </div>
                </div>
              </div>
              
              <div className="text-left md:text-right">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-300 mb-1">INVOICE NUMBER</p>
                  <p className="text-2xl font-bold font-mono">
                    {invoice.invoiceNumber || `INV-${invoice._id?.slice(-8).toUpperCase()}`}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-slate-300">Issue Date</p>
                    <p className="font-semibold">{invoice.date}</p>
                  </div>
                  {invoice.dueDate && (
                    <div>
                      <p className="text-sm text-slate-300">Due Date</p>
                      <p className="font-semibold">{invoice.dueDate}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">BILLED TO</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-lg font-bold text-slate-900 mb-1">{invoice.client?.name || "Client Name"}</p>
                  <p className="text-sm text-slate-600 mb-1">{invoice.client?.email || "client@example.com"}</p>
                  <p className="text-sm text-slate-600">{invoice.client?.phone || "Phone: N/A"}</p>
                  {invoice.client?.address && (
                    <p className="text-sm text-slate-600 mt-2">
                      {invoice.client.address.street || ""} {invoice.client.address.city || ""}, {invoice.client.address.country || ""}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">INVOICE STATUS</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className={`p-2 rounded-lg ${INVOICE_STATUSES[invoice.status]?.color.split(' ')[0]}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {INVOICE_STATUSES[invoice.status]?.label || invoice.status}
                      </p>
                      <p className="text-sm text-slate-500">Current Status</p>
                    </div>
                  </div>
                  
                  {invoice.paymentMethod && (
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <PaymentMethod className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {PAYMENT_METHODS.find(m => m.id === invoice.paymentMethod)?.name || invoice.paymentMethod}
                        </p>
                        <p className="text-sm text-slate-500">Payment Method</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Items Table */}
            <div className="mb-10">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-4 font-semibold text-slate-700">Description</th>
                      <th className="text-center p-4 font-semibold text-slate-700">Quantity</th>
                      <th className="text-right p-4 font-semibold text-slate-700">Unit Price</th>
                      <th className="text-right p-4 font-semibold text-slate-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="p-4">
                          <p className="font-medium text-slate-900">{item.description || 'Item'}</p>
                          <p className="text-sm text-slate-500">SKU: {item.product?.sku || 'N/A'}</p>
                        </td>
                        <td className="p-4 text-center text-slate-700">{item.quantity}</td>
                        <td className="p-4 text-right text-slate-700">
                          {formatCurrency(item.price || 0, invoice.currency)}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-900">
                          {formatCurrency(item.total || 0, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full md:w-96 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal, invoice.currency)}</span>
                  </div>
                  
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax ({tax}%)</span>
                      <span className="font-medium">
                        {formatCurrency((subtotal * tax) / 100, invoice.currency)}
                      </span>
                    </div>
                  )}
                  
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Discount</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(discount, invoice.currency)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-slate-200 pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="font-bold text-lg text-slate-900">
                        {formatCurrency(grandTotal, invoice.currency)}
                      </span>
                    </div>
                  </div>
                  
                  {paidAmount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Paid Amount</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(paidAmount, invoice.currency)}
                        </span>
                      </div>
                      
                      <div className="border-t border-slate-200 pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-900">Balance Due</span>
                          <span className="font-bold text-lg text-slate-900">
                            {formatCurrency(balance, invoice.currency)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {invoice.notes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-2">Notes</h4>
                    <p className="text-sm text-slate-600">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-slate-50 p-8 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Payment Information</h4>
                <p className="text-sm text-slate-600">Account: 1234567890</p>
                <p className="text-sm text-slate-600">Bank: SMA Bank Ltd</p>
                <p className="text-sm text-slate-600">Branch: Nairobi CBD</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Terms & Conditions</h4>
                <p className="text-sm text-slate-600">Payment due within {invoice.paymentTerms || 30} days</p>
                <p className="text-sm text-slate-600">Late fees may apply</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Contact Us</h4>
                <p className="text-sm text-slate-600">support@smacore.co.ke</p>
                <p className="text-sm text-slate-600">+254 719 832 719</p>
                <p className="text-sm text-slate-600">www.smacore.co.ke</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-200 p-6">
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={onDuplicate}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Duplicate
            </button>
            <button
              onClick={onEmail}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Send Email
            </button>
            <button
              onClick={onDownload}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Enhanced Add/Edit Modal with FIXED Client Selection
const AddEditModal = ({ invoice, clients, products, onSave, onClose }) => {
  const [form, setForm] = useState(invoice || {
    invoiceNumber: generateInvoiceNumber(),
    client: null,
    date: new Date().toISOString().split('T')[0],
    dueDate: calculateDueDate(new Date().toISOString().split('T')[0], 30),
    currency: "USD",
    status: "DRAFT",
    paymentMethod: "bank_transfer",
    paymentTerms: 30,
    tax: 0,
    discount: 0,
    notes: "",
    items: [{ 
      product: null, 
      description: "", 
      quantity: 1, 
      price: 0, 
      total: 0 
    }]
  });

  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [showProductDropdowns, setShowProductDropdowns] = useState({});
  const [productSearches, setProductSearches] = useState({});

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];
    
    return clients.filter(client =>
      client.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.phone?.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clients, clientSearch]);

  // Filter products for each item
  const getFilteredProducts = useCallback((index) => {
    if (!Array.isArray(products)) return [];
    
    const searchTerm = productSearches[index] || "";
    return products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, productSearches]);

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { 
        product: null, 
        description: "", 
        quantity: 1, 
        price: 0, 
        total: 0 
      }]
    }));
    toast.success("Item added");
  };

  const removeItem = (index) => {
    if (form.items.length > 1) {
      const newItems = form.items.filter((_, i) => i !== index);
      setForm(prev => ({ ...prev, items: newItems }));
      toast.success("Item removed");
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    
    if (field === "product" && value) {
      const product = Array.isArray(products) ? products.find(p => p._id === value) : null;
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product: product,
          description: product.name || newItems[index].description,
          price: product.price || newItems[index].price,
          total: (product.price || 0) * newItems[index].quantity
        };
      }
    } else {
      newItems[index][field] = value;
      
      if (field === "quantity" || field === "price") {
        const quantity = field === "quantity" ? parseFloat(value) : newItems[index].quantity;
        const price = field === "price" ? parseFloat(value) : newItems[index].price;
        newItems[index].total = quantity * price;
      }
    }
    
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((acc, item) => acc + (item.total || 0), 0);
    const taxAmount = (subtotal * (form.tax || 0)) / 100;
    const total = subtotal + taxAmount - (form.discount || 0);
    
    return { subtotal, taxAmount, total };
  }, [form.items, form.tax, form.discount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.client) {
      toast.error("Please select a client");
      return;
    }
    
    if (form.items.some(item => !item.description || item.quantity <= 0 || item.price <= 0)) {
      toast.error("Please fill all item fields with valid values");
      return;
    }
    
    const payload = {
      ...form,
      total: totals.total,
      dueDate: form.dueDate || calculateDueDate(form.date, form.paymentTerms || 30)
    };
    
    onSave(payload);
  };

  // Handle click outside client dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.client-dropdown-container')) {
        setShowClientDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            {invoice ? "Edit Invoice" : "Create New Invoice"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Currency *
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Client Selection - FIXED */}
            <div className="client-dropdown-container">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client *
              </label>
              <div className="relative">
                <div 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer bg-white flex items-center justify-between"
                  onClick={() => setShowClientDropdown(!showClientDropdown)}
                >
                  {form.client ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-indigo-600" />
                      </div>
                      <span className="text-slate-900">{form.client.name}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Select a client...</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                
                {showClientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-slate-200">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search clients..."
                          className="w-full pl-8 pr-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map(client => (
                          <div
                            key={client._id}
                            onClick={() => {
                              setForm(prev => ({ ...prev, client }));
                              setShowClientDropdown(false);
                              setClientSearch("");
                              toast.success(`Selected: ${client.name}`);
                            }}
                            className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-semibold text-indigo-600">
                                  {client.name?.charAt(0) || 'C'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{client.name}</p>
                                <p className="text-xs text-slate-500">{client.email}</p>
                              </div>
                            </div>
                            <span className="text-xs text-slate-400 group-hover:text-indigo-600">
                              Select
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-500">
                          No clients found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {form.client && (
                <div className="mt-2 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg border border-indigo-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{form.client.name}</p>
                        <p className="text-sm text-slate-600">{form.client.email}</p>
                        <p className="text-xs text-slate-500">{form.client.phone || "No phone"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, client: null }));
                        toast.success("Client removed");
                      }}
                      className="text-sm text-red-600 hover:text-red-700 p-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Dates & Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Issue Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => {
                    setForm(prev => ({ 
                      ...prev, 
                      date: e.target.value,
                      dueDate: calculateDueDate(e.target.value, form.paymentTerms || 30)
                    }));
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status *
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {Object.entries(INVOICE_STATUSES).map(([key, status]) => (
                    <option key={key} value={key}>{status.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Terms (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.paymentTerms}
                  onChange={(e) => {
                    const terms = parseInt(e.target.value) || 30;
                    setForm(prev => ({ 
                      ...prev, 
                      paymentTerms: terms,
                      dueDate: calculateDueDate(prev.date, terms)
                    }));
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
            
            {/* Items Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-slate-700">
                  Items *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <PlusCircle size={16} />
                  Add Item
                </button>
              </div>
              
              <div className="space-y-4">
                {form.items.map((item, index) => (
                  <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Description *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            required
                          />
                          {Array.isArray(products) && products.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowProductDropdowns(prev => ({ ...prev, [index]: !prev[index] }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                            >
                              <Package size={16} />
                            </button>
                          )}
                          
                          {showProductDropdowns[index] && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                              <div className="p-2 border-b border-slate-200">
                                <input
                                  type="text"
                                  placeholder="Search products..."
                                  value={productSearches[index] || ""}
                                  onChange={(e) => setProductSearches(prev => ({ ...prev, [index]: e.target.value }))}
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                />
                              </div>
                              {getFilteredProducts(index).map(product => (
                                <div
                                  key={product._id}
                                  onClick={() => {
                                    updateItem(index, "product", product._id);
                                    setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
                                    setProductSearches(prev => ({ ...prev, [index]: "" }));
                                  }}
                                  className="p-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                                      <p className="text-xs text-slate-500">SKU: {product.sku || "N/A"}</p>
                                    </div>
                                    <span className="text-xs font-medium text-slate-900">
                                      {formatCurrency(product.price || 0, form.currency)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Unit Price *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(index, "price", parseFloat(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Total
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={formatCurrency(item.total || 0, form.currency)}
                            readOnly
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 font-medium text-slate-900"
                          />
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-2 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tax & Discount */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tax Rate (%)
                </label>
                <select
                  value={form.tax}
                  onChange={(e) => setForm(prev => ({ ...prev, tax: parseFloat(e.target.value) }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {TAX_RATES.map(tax => (
                    <option key={tax.id} value={tax.rate}>
                      {tax.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Discount ({form.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) => setForm(prev => ({ ...prev, discount: parseFloat(e.target.value) }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                placeholder="Additional notes or terms..."
              />
            </div>
            
            {/* Summary */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white">
              <h4 className="font-bold text-lg mb-4">Invoice Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal, form.currency)}</span>
                </div>
                
                {form.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Tax ({form.tax}%):</span>
                    <span className="font-medium">{formatCurrency(totals.taxAmount, form.currency)}</span>
                  </div>
                )}
                
                {form.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Discount:</span>
                    <span className="font-medium text-red-300">-{formatCurrency(form.discount, form.currency)}</span>
                  </div>
                )}
                
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">Grand Total:</span>
                    <span className="font-bold text-xl">{formatCurrency(totals.total, form.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
        
        <div className="border-t border-slate-200 p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {invoice ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoices;