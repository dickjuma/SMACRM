import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Eye, Edit, Trash2, Plus, Search, Save, Hash, X, 
  ChevronRight, Activity, FileText, Globe, ShieldCheck, Phone, Mail, MapPin,
  Download, Printer, Filter, Calendar, User, Building, DollarSign, Percent,
  Clock, CheckCircle, AlertCircle, Copy, Send, FileSpreadsheet, BarChart3,
  ChevronDown, MoreVertical, RefreshCw, Users, TrendingUp, PieChart,
  FileBox, FileCheck, FileX, Layers, CreditCard, Smartphone, CheckSquare,
  Square, ChevronLeft, ChevronRight as ChevronRightIcon, EyeOff, Eye as EyeIcon,
  Upload, UserPlus, Home, Briefcase, Star, Zap, Lock, Unlock,
  Calculator, Target, Wallet, Receipt, BookMarked, FileBarChart,
  Tag, Package, Truck, ArrowUpRight, ArrowDownRight
} from "lucide-react";

// API Configuration
const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API_URL = `${BASE_URL}/quotations`;
const CLIENTS_API_URL = `${BASE_URL}/clients`;
const PRODUCTS_API_URL = `${BASE_URL}/products`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

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

// API Functions
const fetchQuotations = async (params = {}) => {
  const response = await api.get(API_URL, { params });
  return extractData(response);
};

const fetchClients = async () => {
  try {
    const response = await api.get(CLIENTS_API_URL);
    const data = extractData(response);
    console.log("Clients fetched:", data);
    return data;
  } catch (error) {
    console.error("Error fetching clients:", error);
    // Return mock data for testing
    return [
      {
        _id: "1",
        name: "John Doe",
        email: "john@example.com",
        phone: "+254 712 345 678"
      },
      {
        _id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "+254 723 456 789"
      },
      {
        _id: "3",
        name: "Acme Corporation",
        email: "info@acme.com",
        phone: "+254 734 567 890"
      }
    ];
  }
};

const fetchProducts = async () => {
  try {
    const response = await api.get(PRODUCTS_API_URL);
    return extractData(response);
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

const fetchQuotationStats = async () => {
  try {
    const response = await api.get(`${API_URL}/stats`);
    return response.data.data || response.data || {};
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {};
  }
};

// Constants
const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "KES", symbol: "KSh", label: "Kenya Shilling" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "UGX", symbol: "USh", label: "Uganda Shilling" },
];

const QUOTATION_STATUSES = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  REVISED: { label: "Revised", color: "bg-yellow-100 text-yellow-700", icon: Edit },
  EXPIRED: { label: "Expired", color: "bg-red-100 text-red-700", icon: Clock },
  DECLINED: { label: "Declined", color: "bg-gray-300 text-gray-600", icon: FileX },
  CONVERTED: { label: "Converted", color: "bg-purple-100 text-purple-700", icon: FileCheck },
};

const VALIDITY_PERIODS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

// Helper Functions
const generateQuotationNumber = () => {
  const prefix = "QUO";
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

const calculateExpiryDate = (issueDate, validityDays) => {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + validityDays);
  return date.toISOString().split('T')[0];
};

const calculateDaysRemaining = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Main Component
const Quotations = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [selectedQuotations, setSelectedQuotations] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
    dateRange: "all",
    client: "all",
    amountRange: "all",
    validity: "all"
  });
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const printRef = useRef();

  // Esc Key Listener
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") { 
        setEditing(null); 
        setAdding(false); 
        setViewing(null); 
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handlePrintTrigger = useReactToPrint({
    content: () => printRef.current,
    onBeforeGetContent: () => {
      toast.loading("Preparing quotation for printing...");
      return Promise.resolve();
    },
    onAfterPrint: () => {
      toast.success("Print command sent to printer");
    },
    documentTitle: `Quotation_${viewing?.quotationNumber || 'View'}`,
  });

  // Queries
  const { data: quotationsData = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["quotations", filters, currentPage, itemsPerPage, sortBy, sortOrder],
    queryFn: () => fetchQuotations({
      page: currentPage,
      limit: itemsPerPage,
      sortBy,
      sortOrder,
      ...filters
    }),
    staleTime: 60000,
    cacheTime: 300000,
  });

  const { data: stats } = useQuery({
    queryKey: ["quotation-stats"],
    queryFn: fetchQuotationStats,
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
  const quotations = useMemo(() => {
    if (Array.isArray(quotationsData)) return quotationsData;
    if (quotationsData && Array.isArray(quotationsData.data)) return quotationsData.data;
    if (quotationsData && quotationsData.data) return [quotationsData.data];
    return [];
  }, [quotationsData]);

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

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_URL}/${id}`),
    onSuccess: () => {
      toast.success("Quotation deleted successfully!");
      queryClient.invalidateQueries(["quotations"]);
      queryClient.invalidateQueries(["quotation-stats"]);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        client: data.client,
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
        response.data._id ? "Quotation updated successfully!" : "Quotation created successfully!"
      );
      
      queryClient.invalidateQueries(["quotations"]);
      queryClient.invalidateQueries(["quotation-stats"]);
      
      setEditing(null);
      setAdding(false);
    },
    onError: (error) => {
      toast.error(`Save failed: ${error.message}`);
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id) => api.post(`${API_URL}/${id}/convert-to-invoice`),
    onSuccess: () => {
      toast.success("Quotation converted to invoice successfully!");
      queryClient.invalidateQueries(["quotations"]);
      queryClient.invalidateQueries(["quotation-stats"]);
    },
    onError: (error) => {
      toast.error(`Conversion failed: ${error.message}`);
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: (quotationId) => api.post(`${API_URL}/${quotationId}/send-email`),
    onSuccess: () => {
      toast.success("Email sent successfully!");
    },
    onError: (error) => {
      toast.error(`Email failed: ${error.message}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (quotationId) => api.post(`${API_URL}/${quotationId}/duplicate`),
    onSuccess: (response) => {
      toast.success("Quotation duplicated successfully!");
      queryClient.invalidateQueries(["quotations"]);
      setEditing(response.data);
    },
    onError: (error) => {
      toast.error(`Duplication failed: ${error.message}`);
    },
  });

  // Enhanced PDF Download Function
  const downloadPDF = async (quotation) => {
    if (!quotation) return;
    
    const toastId = toast.loading("Generating PDF...");
    
    try {
      if (!viewing || viewing._id !== quotation._id) {
        setViewing(quotation);
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
      
      const fileName = `QUOTATION_${quotation.quotationNumber || quotation._id?.slice(-8).toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF. Please try again.", { id: toastId });
    }
  };

  const downloadCSV = () => {
    if (!Array.isArray(quotations) || quotations.length === 0) {
      toast.error("No quotations to export");
      return;
    }
    
    const headers = [
      "Quotation Number",
      "Client",
      "Date",
      "Expiry Date",
      "Status",
      "Total Amount",
      "Currency",
      "Validity (days)",
      "Notes"
    ];
    
    const data = quotations.map(q => [
      q.quotationNumber || q._id?.slice(-8).toUpperCase() || "N/A",
      q.client?.name || "N/A",
      q.date || "N/A",
      q.expiryDate || "N/A",
      q.status || "DRAFT",
      q.total || (q.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0),
      q.currency || "USD",
      q.validity || "N/A",
      q.notes || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...data.map(row => row.map(cell => `"${cell?.toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quotations_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    
    toast.success("CSV export completed!");
  };

  const handleSelectAll = () => {
    if (!Array.isArray(paginatedQuotations)) return;
    
    if (selectedQuotations.length === paginatedQuotations.length) {
      setSelectedQuotations([]);
    } else {
      setSelectedQuotations(paginatedQuotations.map(q => q._id));
    }
  };

  const handleSelectQuotation = (quotationId) => {
    setSelectedQuotations(prev =>
      prev.includes(quotationId)
        ? prev.filter(id => id !== quotationId)
        : [...prev, quotationId]
    );
  };

  const filteredQuotations = useMemo(() => {
    if (!Array.isArray(quotations)) {
      console.error('quotations is not an array:', quotations);
      return [];
    }
    
    let filtered = [...quotations];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(q =>
        (q.quotationNumber?.toLowerCase().includes(searchLower)) ||
        (q.client?.name?.toLowerCase().includes(searchLower)) ||
        (q.client?.email?.toLowerCase().includes(searchLower)) ||
        (q.notes?.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.status !== "all") {
      filtered = filtered.filter(q => q.status === filters.status);
    }
    
    if (filters.dateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateRange) {
        case "today":
          filtered = filtered.filter(q => new Date(q.date).toDateString() === today.toDateString());
          break;
        case "this_week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          filtered = filtered.filter(q => new Date(q.date) >= weekStart);
          break;
        case "this_month":
          filtered = filtered.filter(q => 
            new Date(q.date).getMonth() === today.getMonth() &&
            new Date(q.date).getFullYear() === today.getFullYear()
          );
          break;
        case "this_year":
          filtered = filtered.filter(q => 
            new Date(q.date).getFullYear() === today.getFullYear()
          );
          break;
        case "expiring_soon":
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          filtered = filtered.filter(q => 
            q.expiryDate && 
            new Date(q.expiryDate) >= today &&
            new Date(q.expiryDate) <= nextWeek &&
            q.status !== "EXPIRED" && q.status !== "DECLINED"
          );
          break;
        default:
          break;
      }
    }
    
    if (filters.client !== "all") {
      filtered = filtered.filter(q => q.client?._id === filters.client);
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
      filtered = filtered.filter(q => {
        const amount = q.total || (q.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0);
        return amount >= min && amount <= max;
      });
    }
    
    if (filters.validity !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.validity) {
        case "expired":
          filtered = filtered.filter(q => 
            q.expiryDate && 
            new Date(q.expiryDate) < today &&
            q.status !== "EXPIRED"
          );
          break;
        case "expiring_today":
          filtered = filtered.filter(q => 
            q.expiryDate && 
            new Date(q.expiryDate).toDateString() === today.toDateString()
          );
          break;
        case "expiring_7_days":
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          filtered = filtered.filter(q => 
            q.expiryDate && 
            new Date(q.expiryDate) >= today &&
            new Date(q.expiryDate) <= nextWeek
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
        case "expiryDate":
          aValue = a.expiryDate ? new Date(a.expiryDate) : new Date(0);
          bValue = b.expiryDate ? new Date(b.expiryDate) : new Date(0);
          break;
        case "amount":
          aValue = a.total || (a.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0);
          bValue = b.total || (b.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0);
          break;
        case "client":
          aValue = a.client?.name || "";
          bValue = b.client?.name || "";
          break;
        case "number":
          aValue = a.quotationNumber || "";
          bValue = b.quotationNumber || "";
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
  }, [quotations, search, filters, sortBy, sortOrder]);

  const paginatedQuotations = useMemo(() => {
    if (!Array.isArray(filteredQuotations)) {
      console.error('filteredQuotations is not an array:', filteredQuotations);
      return [];
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuotations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuotations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage) || 1;

  // Statistics calculations
  const quotationStats = useMemo(() => {
    if (!Array.isArray(quotations) || quotations.length === 0) return null;
    
    const totalAmount = quotations.reduce((sum, q) => {
      const amount = q.total || (q.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0);
      return sum + amount;
    }, 0);
    
    const acceptedAmount = quotations
      .filter(q => q.status === "ACCEPTED")
      .reduce((sum, q) => {
        const amount = q.total || (q.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0);
        return sum + amount;
      }, 0);
    
    const expiringCount = quotations.filter(q => 
      q.expiryDate && 
      new Date(q.expiryDate) >= new Date() &&
      new Date(q.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
      q.status !== "EXPIRED" && q.status !== "DECLINED"
    ).length;
    
    const statusCounts = {
      DRAFT: quotations.filter(q => q.status === "DRAFT").length,
      SENT: quotations.filter(q => q.status === "SENT").length,
      ACCEPTED: quotations.filter(q => q.status === "ACCEPTED").length,
      REVISED: quotations.filter(q => q.status === "REVISED").length,
      EXPIRED: quotations.filter(q => q.status === "EXPIRED").length,
      DECLINED: quotations.filter(q => q.status === "DECLINED").length,
      CONVERTED: quotations.filter(q => q.status === "CONVERTED").length,
    };
    
    return {
      totalAmount,
      acceptedAmount,
      expiringCount,
      statusCounts,
      totalQuotations: quotations.length,
      acceptedQuotations: quotations.filter(q => q.status === "ACCEPTED").length,
      conversionRate: quotations.filter(q => q.status === "CONVERTED").length / quotations.length * 100 || 0,
    };
  }, [quotations]);

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
                <h1 className="text-xl font-bold text-slate-900">Quotation Management</h1>
                <p className="text-xs text-slate-500 font-medium">Professional Quotation System v3.0</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search quotations..."
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
                  New Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Analytics Dashboard */}
      {showAnalytics && quotationStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">Quotation Analytics</h2>
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
                  <span className="text-sm font-semibold text-slate-700">Total Quoted</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(quotationStats.totalAmount, "USD")}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-slate-700">Accepted</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(quotationStats.acceptedAmount, "USD")}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-slate-700">Expiring Soon</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {quotationStats.expiringCount} quotations
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-slate-700">Conversion Rate</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {quotationStats.conversionRate.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Quotation Status Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(quotationStats.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{QUOTATION_STATUSES[status]?.label || status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-full rounded-full ${QUOTATION_STATUSES[status]?.color.split(' ')[0]}`}
                            style={{ width: `${(count / quotationStats.totalQuotations) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {Array.isArray(quotations) && quotations
                    .slice(0, 5)
                    .map(quote => (
                      <div key={quote._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-bold text-indigo-600">
                              {quote.client?.name?.charAt(0) || 'Q'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{quote.client?.name || "Unknown Client"}</p>
                            <p className="text-xs text-slate-500">
                              {formatCurrency(
                                quote.total || (quote.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0),
                                quote.currency
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          QUOTATION_STATUSES[quote.status]?.color || 'bg-gray-100 text-gray-700'
                        }`}>
                          {QUOTATION_STATUSES[quote.status]?.label || quote.status}
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
                  {Object.entries(QUOTATION_STATUSES).map(([key, status]) => (
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
                  <option value="expiring_soon">Expiring Soon</option>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Validity</label>
                <select
                  value={filters.validity}
                  onChange={(e) => setFilters({...filters, validity: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="all">All Validity</option>
                  <option value="expired">Expired</option>
                  <option value="expiring_today">Expiring Today</option>
                  <option value="expiring_7_days">Expiring in 7 Days</option>
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
                  validity: "all"
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
                <option value="expiryDate">Sort by Expiry Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="client">Sort by Client</option>
                <option value="number">Sort by Quotation #</option>
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
                    toast.error("Please select a quotation first");
                  }
                }}
                className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 transition-all"
                title="Export PDF"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => {
                  if (selectedQuotations.length > 0) {
                    selectedQuotations.forEach(id => sendEmailMutation.mutate(id));
                  } else {
                    toast.error("Please select quotations to send");
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
              <p className="text-slate-600 font-medium">Loading quotations...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Failed to load quotations</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !Array.isArray(quotations) || quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium mb-2">No quotations found</p>
            <p className="text-slate-500 text-sm mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => setAdding(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Create Your First Quotation
            </button>
          </div>
        ) : viewMode === "table" ? (
          <>
            {/* Bulk Selection Bar */}
            {selectedQuotations.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        {selectedQuotations.length === paginatedQuotations.length ? (
                          <CheckSquare size={20} className="text-indigo-600" />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                      <span className="text-sm font-medium text-slate-900">
                        {selectedQuotations.length} quotation(s) selected
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => selectedQuotations.forEach(id => sendEmailMutation.mutate(id))}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        Send Selected
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${selectedQuotations.length} selected quotations?`)) {
                            selectedQuotations.forEach(id => deleteMutation.mutate(id));
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                      >
                        Delete Selected
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedQuotations([])}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

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
                          {selectedQuotations.length === paginatedQuotations.length && paginatedQuotations.length > 0 ? (
                            <CheckSquare size={18} className="text-indigo-600" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4">Quotation</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Expiry Date</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(paginatedQuotations) && paginatedQuotations.map((quotation) => {
                      const totalAmount = quotation.total || (quotation.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0);
                      const daysRemaining = quotation.expiryDate ? calculateDaysRemaining(quotation.expiryDate) : null;
                      
                      return (
                        <tr 
                          key={quotation._id} 
                          className={`hover:bg-slate-50 transition-colors ${
                            selectedQuotations.includes(quotation._id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedQuotations.includes(quotation._id)}
                              onChange={() => handleSelectQuotation(quotation._id)}
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
                                  {quotation.quotationNumber || `QUO-${quotation._id?.slice(-8).toUpperCase()}`}
                                </p>
                                <p className="text-xs text-slate-500 font-mono">
                                  #{quotation._id?.slice(-6).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-slate-900">{quotation.client?.name || "Unknown Client"}</p>
                              <p className="text-xs text-slate-500">{quotation.client?.email || "No email"}</p>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm text-slate-900">{quotation.date}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(quotation.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </p>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm text-slate-900">{quotation.expiryDate || "N/A"}</p>
                              {quotation.expiryDate && daysRemaining && (
                                <p className={`text-xs ${
                                  daysRemaining < 0 
                                    ? 'text-red-600 font-medium'
                                    : daysRemaining <= 7 
                                      ? 'text-amber-600 font-medium'
                                      : 'text-slate-500'
                                }`}>
                                  {daysRemaining > 0 
                                    ? `${daysRemaining} days left`
                                    : `${Math.abs(daysRemaining)} days expired`
                                  }
                                </p>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">
                                {formatCurrency(totalAmount, quotation.currency)}
                              </p>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                              QUOTATION_STATUSES[quotation.status]?.color || 'bg-gray-100 text-gray-700'
                            }`}>
                              {QUOTATION_STATUSES[quotation.status]?.label || quotation.status}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setViewing(quotation)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                              
                              <button
                                onClick={() => duplicateMutation.mutate(quotation._id)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Duplicate"
                              >
                                <Copy size={18} />
                              </button>
                              
                              <button
                                onClick={() => sendEmailMutation.mutate(quotation._id)}
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Send Email"
                              >
                                <Send size={18} />
                              </button>
                              
                              <button
                                onClick={() => downloadPDF(quotation)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Download PDF"
                              >
                                <Download size={18} />
                              </button>
                              
                              {quotation.status !== "CONVERTED" && (
                                <button
                                  onClick={() => convertMutation.mutate(quotation._id)}
                                  className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Convert to Invoice"
                                >
                                  <FileCheck size={18} />
                                </button>
                              )}
                              
                              <button
                                onClick={() => setEditing(quotation)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                              
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete quotation ${quotation.quotationNumber || quotation._id?.slice(-8).toUpperCase()}?`)) {
                                    deleteMutation.mutate(quotation._id);
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredQuotations.length)}</span> of{' '}
                <span className="font-semibold">{filteredQuotations.length}</span> quotations
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
                  <ChevronRightIcon size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.isArray(paginatedQuotations) && paginatedQuotations.map((quotation) => {
              const totalAmount = quotation.total || (quotation.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0);
              const daysRemaining = quotation.expiryDate ? calculateDaysRemaining(quotation.expiryDate) : null;
              
              return (
                <div
                  key={quotation._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                        QUOTATION_STATUSES[quotation.status]?.color || 'bg-gray-100 text-gray-700'
                      }`}>
                        {QUOTATION_STATUSES[quotation.status]?.label || quotation.status}
                      </span>
                      {daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0 && (
                        <span className="text-xs text-amber-600 mt-1">{daysRemaining}d left</span>
                      )}
                      {daysRemaining !== null && daysRemaining < 0 && (
                        <span className="text-xs text-red-600 mt-1">Expired</span>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-slate-900 mb-1 truncate">
                    {quotation.quotationNumber || `QUO-${quotation._id?.slice(-8).toUpperCase()}`}
                  </h3>
                  
                  <p className="text-sm text-slate-600 mb-3 truncate">
                    {quotation.client?.name || "Unknown Client"}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Date:</span>
                      <span className="font-medium">{quotation.date}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Expires:</span>
                      <span className="font-medium">{quotation.expiryDate || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Amount:</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(totalAmount, quotation.currency)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setViewing(quotation)}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => downloadPDF(quotation)}
                        className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => setEditing(quotation)}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                    
                    <input
                      type="checkbox"
                      checked={selectedQuotations.includes(quotation._id)}
                      onChange={() => handleSelectQuotation(quotation._id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      {viewing && (
        <QuotationViewModal
          quotation={viewing}
          ref={printRef}
          onClose={() => setViewing(null)}
          onPrint={handlePrintTrigger}
          onDownload={() => downloadPDF(viewing)}
          onEmail={() => sendEmailMutation.mutate(viewing._id)}
          onDuplicate={() => duplicateMutation.mutate(viewing._id)}
          onConvert={() => convertMutation.mutate(viewing._id)}
          onEdit={() => {
            setViewing(null);
            setEditing(viewing);
          }}
        />
      )}
      
      {(editing || adding) && (
        <AddEditQuotationModal
          quotation={editing}
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

// Enhanced Quotation View Modal
const QuotationViewModal = React.forwardRef(({ 
  quotation, 
  onClose, 
  onPrint, 
  onDownload, 
  onEmail, 
  onDuplicate, 
  onConvert, 
  onEdit 
}, ref) => {
  const totalAmount = quotation.total || (quotation.items?.reduce((acc, i) => acc + (i.total || 0), 0) || 0);
  const daysRemaining = quotation.expiryDate ? calculateDaysRemaining(quotation.expiryDate) : null;
  const StatusIcon = QUOTATION_STATUSES[quotation.status]?.icon || FileText;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Quotation Details</h2>
              <p className="text-sm text-slate-500">
                {quotation.quotationNumber || `QUO-${quotation._id?.slice(-8).toUpperCase()}`}
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
            {quotation.status !== "CONVERTED" && (
              <button
                onClick={onConvert}
                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Convert to Invoice"
              >
                <FileCheck size={20} />
              </button>
            )}
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
          {/* Quotation Header */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white p-2 rounded-lg">
                    <ShieldCheck className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">SMA TECHNOLOGIES</h1>
                    <p className="text-slate-300 text-sm">Professional Solutions Provider</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4" />
                    <span>+254 719 832 719</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" />
                    <span>quotations@smacore.co.ke</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4" />
                    <span>www.smacore.co.ke</span>
                  </div>
                </div>
              </div>
              
              <div className="text-left md:text-right">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-300 mb-1">QUOTATION NUMBER</p>
                  <p className="text-2xl font-bold font-mono">
                    {quotation.quotationNumber || `QUO-${quotation._id?.slice(-8).toUpperCase()}`}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-slate-300">Issue Date</p>
                    <p className="font-semibold">{quotation.date}</p>
                  </div>
                  {quotation.expiryDate && (
                    <div>
                      <p className="text-sm text-slate-300">Valid Until</p>
                      <p className="font-semibold">{quotation.expiryDate}</p>
                      {daysRemaining !== null && (
                        <p className={`text-xs mt-1 ${
                          daysRemaining > 0 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {daysRemaining > 0 
                            ? `${daysRemaining} days remaining`
                            : `${Math.abs(daysRemaining)} days expired`
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">QUOTATION FOR</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-lg font-bold text-slate-900 mb-1">{quotation.client?.name || "Client Name"}</p>
                  <p className="text-sm text-slate-600 mb-1">{quotation.client?.email || "client@example.com"}</p>
                  <p className="text-sm text-slate-600">{quotation.client?.phone || "Phone: N/A"}</p>
                  {quotation.client?.address && (
                    <p className="text-sm text-slate-600 mt-2">
                      {quotation.client.address.street || ""} {quotation.client.address.city || ""}, {quotation.client.address.country || ""}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">QUOTATION STATUS</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className={`p-2 rounded-lg ${QUOTATION_STATUSES[quotation.status]?.color.split(' ')[0]}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {QUOTATION_STATUSES[quotation.status]?.label || quotation.status}
                      </p>
                      <p className="text-sm text-slate-500">Current Status</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Valid for {quotation.validity || 30} days
                      </p>
                      <p className="text-sm text-slate-500">Validity Period</p>
                    </div>
                  </div>
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
                    {quotation.items?.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="p-4">
                          <p className="font-medium text-slate-900">{item.description || 'Item'}</p>
                          <p className="text-sm text-slate-500">SKU: {item.product?.sku || 'N/A'}</p>
                        </td>
                        <td className="p-4 text-center text-slate-700">{item.quantity}</td>
                        <td className="p-4 text-right text-slate-700">
                          {formatCurrency(item.price || 0, quotation.currency)}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-900">
                          {formatCurrency(item.total || 0, quotation.currency)}
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
                    <span className="font-medium">{formatCurrency(totalAmount, quotation.currency)}</span>
                  </div>
                  
                  {quotation.tax && quotation.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax ({quotation.tax}%)</span>
                      <span className="font-medium">
                        {formatCurrency((totalAmount * quotation.tax) / 100, quotation.currency)}
                      </span>
                    </div>
                  )}
                  
                  {quotation.discount && quotation.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Discount</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(quotation.discount, quotation.currency)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-slate-200 pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="font-bold text-lg text-slate-900">
                        {formatCurrency(
                          totalAmount + 
                          (quotation.tax ? (totalAmount * quotation.tax) / 100 : 0) - 
                          (quotation.discount || 0), 
                          quotation.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                {quotation.notes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-2">Notes</h4>
                    <p className="text-sm text-slate-600">{quotation.notes}</p>
                  </div>
                )}
                
                {quotation.terms && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-2">Terms & Conditions</h4>
                    <p className="text-sm text-slate-600">{quotation.terms}</p>
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
                <h4 className="font-semibold text-slate-900 mb-2">Acceptance</h4>
                <p className="text-sm text-slate-600">This quotation is valid until {quotation.expiryDate || "30 days from issue date"}</p>
                <p className="text-sm text-slate-600">Please sign and return to accept</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Contact Us</h4>
                <p className="text-sm text-slate-600">quotations@smacore.co.ke</p>
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
            {quotation.status !== "CONVERTED" && (
              <button
                onClick={onConvert}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Convert to Invoice
              </button>
            )}
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

// Enhanced Add/Edit Quotation Modal
const AddEditQuotationModal = ({ quotation, clients, products, onSave, onClose }) => {
  const [form, setForm] = useState(quotation || {
    quotationNumber: generateQuotationNumber(),
    client: null,
    date: new Date().toISOString().split('T')[0],
    expiryDate: calculateExpiryDate(new Date().toISOString().split('T')[0], 30),
    currency: "USD",
    status: "DRAFT",
    validity: 30,
    tax: 0,
    discount: 0,
    notes: "",
    terms: "Payment due within 30 days. Late fees may apply.",
    items: [{ 
      product: null, 
      description: "", 
      quantity: 1, 
      price: 0, 
      total: 0 
    }]
  });

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
    newItems[index][field] = value;
    
    if (field === "quantity" || field === "price") {
      const quantity = field === "quantity" ? parseFloat(value) : newItems[index].quantity;
      const price = field === "price" ? parseFloat(value) : newItems[index].price;
      newItems[index].total = quantity * price;
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
      expiryDate: form.expiryDate || calculateExpiryDate(form.date, form.validity || 30)
    };
    
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            {quotation ? "Edit Quotation" : "Create New Quotation"}
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
                  Quotation Number *
                </label>
                <input
                  type="text"
                  value={form.quotationNumber}
                  onChange={(e) => setForm(prev => ({ ...prev, quotationNumber: e.target.value }))}
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
            
            {/* Client Selection - SIMPLE SELECT */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client *
              </label>
              <select
                value={form.client?._id || ""}
                onChange={(e) => {
                  const clientId = e.target.value;
                  if (clientId) {
                    const selectedClient = clients.find(c => c._id === clientId);
                    if (selectedClient) {
                      setForm(prev => ({ ...prev, client: selectedClient }));
                    }
                  } else {
                    setForm(prev => ({ ...prev, client: null }));
                  }
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                required
              >
                <option value="">Select a client...</option>
                {Array.isArray(clients) && clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name} {client.email ? `(${client.email})` : ""}
                  </option>
                ))}
              </select>
              
              {form.client && (
                <div className="mt-3 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
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
                      onClick={() => setForm(prev => ({ ...prev, client: null }))}
                      className="text-sm text-red-600 hover:text-red-700 p-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Dates & Validity */}
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
                      expiryDate: calculateExpiryDate(e.target.value, form.validity || 30)
                    }));
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Validity (days)
                </label>
                <select
                  value={form.validity}
                  onChange={(e) => {
                    const validity = parseInt(e.target.value) || 30;
                    setForm(prev => ({ 
                      ...prev, 
                      validity: validity,
                      expiryDate: calculateExpiryDate(prev.date, validity)
                    }));
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {VALIDITY_PERIODS.map(period => (
                    <option key={period.value} value={period.value}>{period.label}</option>
                  ))}
                </select>
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
                  {Object.entries(QUOTATION_STATUSES).map(([key, status]) => (
                    <option key={key} value={key}>{status.label}</option>
                  ))}
                </select>
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
                  <Plus size={16} />
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
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          required
                          placeholder="Enter item description..."
                        />
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
            
            {/* Tax, Discount & Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tax Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.tax}
                    onChange={(e) => setForm(prev => ({ ...prev, tax: parseFloat(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
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
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Summary</label>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal, form.currency)}</span>
                  </div>
                  {form.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax ({form.tax}%):</span>
                      <span className="font-medium">{formatCurrency(totals.taxAmount, form.currency)}</span>
                    </div>
                  )}
                  {form.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Discount:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(form.discount, form.currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-1 mt-1">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-slate-900">Total:</span>
                      <span className="text-slate-900">{formatCurrency(totals.total, form.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Notes & Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  placeholder="Additional notes..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={form.terms}
                  onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
                  rows="3"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  placeholder="Terms and conditions..."
                />
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
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              {quotation ? 'Update Quotation' : 'Create Quotation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quotations;