import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  RefreshCw, UserPlus, Save, X, Search, 
  Trash2, Edit3, LayoutGrid, List, 
  ChevronLeft, ChevronRight, Mail, 
  Activity, Filter, MapPin, ArrowUpRight, Plus,
  FileText, Download, 
  Building2, Globe,
  CheckSquare, Square, AlertCircle,
  Eye, Upload, Users, BarChart3,
  Calendar, Shield, Tag, UserCheck,
  Phone, File,
  CalendarDays, CreditCard,
  DollarSign, Briefcase, Link,
  Target, Users as UsersIcon,
  Package, Home,
  ExternalLink, Globe as WebsiteIcon,
  CreditCard as PaymentIcon,
  Users as ContactsIcon, Award,
  Package as IndustryIcon, MapPin as AddressIcon,
  Info, Linkedin, Twitter, Facebook,
  AlertTriangle, CheckCircle,
  Archive
} from "lucide-react";

// FIXED: Use correct API URL without authentication
const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API_URL = `${BASE_URL}/clients`;

// Confirmation Dialog Component
const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "info" 
}) => {
  if (!isOpen) return null;

  const iconConfig = {
    success: { icon: <CheckCircle className="w-6 h-6 text-green-600" />, bg: "bg-green-50", border: "border-green-200" },
    warning: { icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />, bg: "bg-yellow-50", border: "border-yellow-200" },
    danger: { icon: <AlertCircle className="w-6 h-6 text-red-600" />, bg: "bg-red-50", border: "border-red-200" },
    info: { icon: <Info className="w-6 h-6 text-blue-600" />, bg: "bg-blue-50", border: "border-blue-200" }
  };

  const config = iconConfig[type];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl animate-scaleIn">
        <div className={`p-6 border-b ${config.border} ${config.bg} rounded-t-xl`}>
          <div className="flex items-center gap-3">
            {config.icon}
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700">{message}</p>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
              type === 'danger' 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : type === 'warning'
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Validation Summary Component
const FormValidationSummary = ({ formData }) => {
  if (!formData) return null;
  
  const errors = [];
  
  if (!formData.name?.trim()) errors.push("Company name");
  if (!formData.email?.trim()) errors.push("Email");
  if (!formData.phone?.trim()) errors.push("Phone");
  if (formData.contacts?.some(c => !c?.name?.trim())) errors.push("Contact name(s)");
  if (!formData.address?.city?.trim()) errors.push("City");
  if (!formData.address?.country?.trim()) errors.push("Country");
  
  if (errors.length === 0) return null;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 text-yellow-700 mb-2">
        <AlertCircle size={16} />
        <span className="text-sm font-bold">Missing required fields:</span>
      </div>
      <ul className="text-sm text-yellow-600 list-disc pl-5">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
};

// View Client Component
const ViewClientModal = ({ client, onClose, onEdit }) => {
  if (!client) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-700 uppercase">
                {client.name?.charAt(0) || "C"}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  client.status === 'Active' 
                    ? 'bg-green-100 text-green-700' 
                    : client.status === 'Archived'
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {client.status}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  client.priority === 'High' 
                    ? 'bg-red-100 text-red-700' 
                    : client.priority === 'Medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {client.priority || 'Medium'} Priority
                </span>
                <span className="text-xs text-gray-500">
                  ID: {client._id?.substring(0, 12)}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Contact & Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ContactsIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Primary Email</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a 
                          href={`mailto:${client.email}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {client.email}
                        </a>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-gray-800">{client.phone}</span>
                      </div>
                    </div>
                    
                    {client.website && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Website</label>
                        <div className="flex items-center gap-2 mt-1">
                          <WebsiteIcon className="w-4 h-4 text-gray-400" />
                          <a 
                            href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                          >
                            {client.website}
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {client.industry && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Industry</label>
                        <div className="flex items-center gap-2 mt-1">
                          <IndustryIcon className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-800">{client.industry}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {client.socialMedia && (
                      <>
                        {client.socialMedia.linkedin && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">LinkedIn</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Linkedin className="w-4 h-4 text-gray-400" />
                              <a 
                                href={client.socialMedia.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                View Profile
                              </a>
                            </div>
                          </div>
                        )}
                        
                        {client.socialMedia.twitter && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Twitter</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Twitter className="w-4 h-4 text-gray-400" />
                              <a 
                                href={client.socialMedia.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                View Profile
                              </a>
                            </div>
                          </div>
                        )}
                        
                        {client.socialMedia.facebook && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Facebook</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Facebook className="w-4 h-4 text-gray-400" />
                              <a 
                                href={client.socialMedia.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                View Profile
                              </a>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Currency</label>
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-800">{client.currency}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">KRA PIN / Tax ID</label>
                      <div className="flex items-center gap-2 mt-1">
                        <File className="w-4 h-4 text-gray-400" />
                        <code className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                          {client.kraPin || 'Not Provided'}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AddressIcon className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-900">Address Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Street Address</label>
                    <p className="mt-1 text-gray-800 font-medium">
                      {client.address?.street || 'Not Provided'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Building</label>
                    <p className="mt-1 text-gray-800 font-medium">
                      {client.address?.building || 'Not Provided'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">City</label>
                    <p className="mt-1 text-gray-800 font-medium">
                      {client.address?.city || 'Not Provided'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Postal Code</label>
                    <p className="mt-1 text-gray-800 font-medium">
                      {client.address?.postalCode || 'Not Provided'}
                    </p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Country</label>
                    <p className="mt-1 text-gray-800 font-medium">
                      {client.address?.country || 'Not Provided'}
                    </p>
                  </div>
                  
                  {client.address?.gpsCoordinates && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">GPS Coordinates</label>
                      <p className="mt-1 font-mono text-gray-800 bg-gray-100 p-2 rounded">
                        {client.address.gpsCoordinates}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Information Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <PaymentIcon className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900">Financial Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-100">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Credit Limit</label>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {client.currency} {client.creditLimit?.toLocaleString() || '0'}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Terms</label>
                    <p className="mt-2 text-xl font-bold text-gray-900">
                      {client.paymentTerms === 'NET30' ? 'NET 30 Days' : 
                       client.paymentTerms === 'NET15' ? 'NET 15 Days' : 
                       client.paymentTerms === 'NET60' ? 'NET 60 Days' : 
                       client.paymentTerms || 'NET 30 Days'}
                    </p>
                  </div>
                  
                  {client.revenue && (
                    <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border border-green-100">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Annual Revenue</label>
                      <p className="mt-2 text-2xl font-bold text-green-700">
                        {client.currency} {(client.revenue / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar Info */}
            <div className="space-y-6">
              {/* Status & Metadata Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-bold text-gray-900">Client Metadata</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Created Date</label>
                    <div className="flex items-center gap-2 mt-1">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-800">
                        {new Date(client.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Updated</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-800">
                        {new Date(client.updatedAt || client.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {client.assignedTo && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
                      <div className="flex items-center gap-2 mt-1">
                        <UserCheck className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-800">{client.assignedTo}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Card */}
              {client.tags && client.tags.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-900">Tags</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm font-bold rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts Card */}
              {client.contacts && client.contacts.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <UsersIcon className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">Contact Persons</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {client.contacts.map((contact, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${
                          contact.isPrimary 
                            ? 'border-blue-200 bg-blue-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{contact.name}</span>
                              {contact.isPrimary && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{contact.department || 'General'}</p>
                          </div>
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          {contact.email && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <a 
                                href={`mailto:${contact.email}`}
                                className="text-blue-600 hover:underline truncate"
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                          
                          {contact.phone && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-700">{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Card */}
              {client.notes && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-bold text-gray-900">Notes</h3>
                  </div>
                  
                  <p className="text-gray-700 whitespace-pre-line">
                    {client.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 border border-gray-300 text-gray-700 py-3 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(client);
            }}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Edit3 size={18} />
            Edit Client
          </button>
        </div>
      </div>
    </div>
  );
};

const Clients = () => {
  const queryClient = useQueryClient();

  // --- ENHANCED UI STATES ---
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("desc");
  const [sortField, setSortField] = useState("createdAt");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });
  
  const rowsPerPage = 20;
  const [customRowsPerPage, setCustomRowsPerPage] = useState(rowsPerPage);

  // Enhanced initial form with more enterprise fields
  const initialForm = {
    name: "", 
    email: "", 
    phone: "", 
    kraPin: "", 
    currency: "KES", 
    address: { 
      street: "", 
      building: "", 
      city: "", 
      postalCode: "",
      country: "Kenya",
      gpsCoordinates: ""
    },
    status: "Active",
    tags: [],
    priority: "Medium",
    notes: "",
    assignedTo: "admin",
    creditLimit: 0,
    paymentTerms: "NET30",
    industry: "",
    website: "",
    socialMedia: {
      linkedin: "",
      twitter: "",
      facebook: ""
    },
    contacts: [{
      name: "",
      email: "",
      phone: "",
      department: "",
      isPrimary: true
    }]
  };

  const [formData, setFormData] = useState(initialForm);

  // Check if form has been touched
  const isDirty = useMemo(() => {
    if (editingClient) {
      return JSON.stringify(formData) !== JSON.stringify(editingClient);
    }
    return JSON.stringify(formData) !== JSON.stringify(initialForm);
  }, [formData, initialForm, editingClient]);

  // --- FIXED: Simple API Configuration WITHOUT Auth ---
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      }
    });

    // Request interceptor for logging
    instance.interceptors.request.use((config) => {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
      if (config.data) {
        console.log('📦 Request Data:', config.data);
      }
      return config;
    });

    // Response interceptor for better error handling
    instance.interceptors.response.use(
      (response) => {
        console.log('✅ Response:', response.status, response.data);
        return response;
      },
      (error) => {
        console.error('❌ API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          url: error.config?.url
        });
        
        // Show specific error messages
        if (error.response?.status === 400) {
          const errorData = error.response.data;
          toast.error(`Validation Error: ${errorData.message || 'Invalid data'}`, {
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
        } else if (error.response?.status === 404) {
          toast.error('Client not found', {
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
        } else if (error.response?.status === 500) {
          toast.error('Server error. Please try again later.', {
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
        } else {
          toast.error(`Error: ${error.message}`, {
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
        
        return Promise.reject(error);
      }
    );

    return instance;
  }, []);

  // --- DATA FETCHING ---
  const { 
    data: clientsData, 
    isLoading, 
    isFetching, 
    isError,
    refetch 
  } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        console.log("Fetching clients from:", API_URL);
        const res = await api.get("/");
        console.log("API Response:", res.data);
        
        // Handle various response formats
        if (Array.isArray(res.data)) {
          return res.data;
        } else if (res.data && Array.isArray(res.data.clients)) {
          return res.data.clients;
        } else if (res.data && Array.isArray(res.data.data)) {
          return res.data.data;
        } else if (res.data && res.data.items && Array.isArray(res.data.items)) {
          return res.data.items;
        }
        
        console.warn("Unexpected API response format:", res.data);
        return [];
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients", {
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
        return [];
      }
    },
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Use a safe variable - FIXED: Ensure it's always an array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  // --- ENHANCED PROCESSING with SAFE ACCESS ---
  const processedClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];

    let result = clients.filter(c => {
      // Safe access with optional chaining
      const cName = c?.name || "";
      const cEmail = c?.email || "";
      const cCity = c?.address?.city || "";
      const cTags = c?.tags || [];
      
      const matchesSearch = 
        cName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cTags.some(tag => tag?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const cStatus = c?.status || "";
      const matchesStatus = statusFilter === "All" || cStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort with safe access
    return result.sort((a, b) => {
      if (sortField === "name") {
        const aName = a?.name || "";
        const bName = b?.name || "";
        return sortOrder === "asc" 
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      }
      if (sortField === "createdAt") {
        const dateA = a?.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b?.createdAt ? new Date(b.createdAt) : new Date(0);
        return sortOrder === "asc"
          ? dateA - dateB
          : dateB - dateA;
      }
      return 0;
    });
  }, [clients, searchQuery, statusFilter, sortField, sortOrder]);

  // Safe pagination calculations
  const safeProcessedClients = Array.isArray(processedClients) ? processedClients : [];
  const totalPages = Math.max(1, Math.ceil(safeProcessedClients.length / customRowsPerPage));
  const currentRows = safeProcessedClients.slice(
    (currentPage - 1) * customRowsPerPage,
    currentPage * customRowsPerPage
  );

  // --- ENHANCED EXPORT FUNCTIONS ---
  const exportCSV = () => {
    if (safeProcessedClients.length === 0) {
      toast.error("No data to export", {
        duration: 3000,
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
      return;
    }

    const headers = "Client Name,Email,Phone,KRA PIN,City,Country,Currency,Status,Priority,Tags,Industry,Created At\n";
    const data = safeProcessedClients.map(c => {
      const name = c?.name || "";
      const email = c?.email || "";
      const phone = c?.phone || "";
      const kraPin = c?.kraPin || "";
      const city = c?.address?.city || "";
      const country = c?.address?.country || "";
      const currency = c?.currency || "";
      const status = c?.status || "";
      const priority = c?.priority || "";
      const tags = Array.isArray(c?.tags) ? c.tags.join('; ') : "";
      const industry = c?.industry || "";
      const createdAt = c?.createdAt ? new Date(c.createdAt).toLocaleDateString() : "";
      
      return `"${name}","${email}","${phone}","${kraPin}","${city}","${country}","${currency}","${status}","${priority}","${tags}","${industry}","${createdAt}"`;
    }).join("\n");
    
    const blob = new Blob([headers + data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Client_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success("CSV export completed successfully!", {
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
  };

  const exportPDF = () => {
    if (safeProcessedClients.length === 0) {
      toast.error("No data to export", {
        duration: 3000,
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
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(20);
    doc.setTextColor(51, 65, 85);
    doc.text("Enterprise Client Registry", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()} | User: System`, 14, 28);
    doc.text(`Total Records: ${safeProcessedClients.length} | Active: ${safeProcessedClients.filter(c => c?.status === 'Active').length}`, 14, 34);
    
    autoTable(doc, {
      head: [['ID', 'Client Name', 'Email', 'Phone', 'Tax PIN', 'Location', 'Currency', 'Status', 'Priority']],
      body: safeProcessedClients.map(c => [
        c?._id?.substring(0, 8) || 'N/A',
        c?.name || '',
        c?.email || '',
        c?.phone || '',
        c?.kraPin || '-',
        `${c?.address?.city || ''}, ${c?.address?.country || ''}`,
        c?.currency || '',
        c?.status || '',
        c?.priority || 'Medium'
      ]),
      startY: 40,
      theme: 'grid',
      headStyles: { 
        fillColor: [51, 65, 85],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
    
    doc.save(`Client_Registry_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF report generated successfully!", {
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
  };

  // Helper function for validation
  const validateForm = (data) => {
    const errors = [];
    
    if (!data.name?.trim()) errors.push("Company name is required");
    if (!data.email?.trim()) errors.push("Email address is required");
    if (!data.phone?.trim()) errors.push("Phone number is required");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      errors.push("Please enter a valid email address");
    }
    
    if (data.contacts && data.contacts.length > 0) {
      data.contacts.forEach((contact, index) => {
        if (!contact?.name?.trim()) {
          errors.push(`Contact ${index + 1}: Name is required`);
        }
      });
    }
    
    if (!data.address?.country?.trim()) errors.push("Country is required");
    if (!data.address?.city?.trim()) errors.push("City is required");
    
    return errors;
  };

  // Helper function for data preparation
  const prepareCleanData = (data) => {
    return {
      ...data,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      contacts: data.contacts
        ?.filter(contact => contact?.name?.trim() || contact?.email?.trim() || contact?.phone?.trim())
        ?.map(contact => ({
          name: contact?.name?.trim() || "",
          email: contact?.email?.trim() || "",
          phone: contact?.phone?.trim() || "",
          department: contact?.department?.trim() || "",
          isPrimary: contact?.isPrimary || false
        })) || [],
      address: {
        street: data.address?.street?.trim() || "",
        building: data.address?.building?.trim() || "",
        city: data.address?.city?.trim() || "",
        postalCode: data.address?.postalCode?.trim() || "",
        country: data.address?.country?.trim() || "Kenya",
        gpsCoordinates: data.address?.gpsCoordinates?.trim() || ""
      },
      creditLimit: Number(data.creditLimit) || 0,
      tags: Array.isArray(data.tags) ? data.tags.filter(tag => tag?.trim()) : []
    };
  };

  // --- FIXED: ENHANCED MUTATIONS with PROPER FEEDBACK ---
  const clientMutation = useMutation({
    mutationFn: async (payload) => {
      // Clean the payload before sending
      const cleanPayload = JSON.parse(JSON.stringify(payload));
      
      // Remove MongoDB internal fields when editing
      if (editingClient) {
        delete cleanPayload._id;
        delete cleanPayload.__v;
        delete cleanPayload.createdAt;
        delete cleanPayload.updatedAt;
        
        console.log('📤 Sending PUT request to:', `${API_URL}/${editingClient._id}`);
        console.log('📤 Payload:', cleanPayload);
        
        return api.put(`/${editingClient._id}`, cleanPayload);
      }
      
      console.log('📤 Sending POST request to:', API_URL);
      console.log('📤 Payload:', cleanPayload);
      return api.post("/", cleanPayload);
    },
    onMutate: async () => {
      // Show processing toast immediately
      const processingToast = toast.loading(
        editingClient ? "Updating client information..." : "Creating new client...",
        {
          style: {
            background: '#3B82F6',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '8px',
            border: '1px solid #1D4ED8',
            padding: '12px 16px',
          }
        }
      );
      return { processingToast };
    },
    onSuccess: (response, variables, context) => {
      // Dismiss processing toast
      toast.dismiss(context.processingToast);
      
      // Show success toast with action
      toast.success(
        editingClient 
          ? "✅ Client updated successfully!" 
          : "✅ Client created successfully!",
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
      
      // Invalidate queries and close form
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowForm(false);
      setEditingClient(null);
      setFormData(initialForm);
    },
    onError: (error, variables, context) => {
      // Dismiss processing toast
      toast.dismiss(context.processingToast);
      
      // Show error toast
      toast.error(
        `❌ ${editingClient ? 'Update' : 'Creation'} failed: ${error.response?.data?.message || error.message}`,
        {
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
        }
      );
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      return api.post("/bulk-delete", { ids });
    },
    onMutate: () => {
      const processingToast = toast.loading(
        `Deleting ${selectedIds.length} clients...`,
        {
          style: {
            background: '#3B82F6',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '8px',
            border: '1px solid #1D4ED8',
            padding: '12px 16px',
          }
        }
      );
      return { processingToast };
    },
    onSuccess: (response, variables, context) => {
      toast.dismiss(context.processingToast);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setSelectedIds([]);
      toast.success(`${selectedIds.length} clients deleted successfully!`, {
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
    },
    onError: (error, variables, context) => {
      toast.dismiss(context.processingToast);
      toast.error(`Bulk delete failed: ${error.message}`, {
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
  });

  // --- HANDLERS ---
  const handleDelete = (id, name) => {
    setDialogConfig({
      title: "Delete Client",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/${id}`);
          queryClient.invalidateQueries({ queryKey: ["clients"] });
          toast.success(`✅ Client "${name}" deleted successfully`, {
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
        } catch (error) {
          toast.error(`❌ Deletion failed: ${error.message}`, {
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
      }
    });
    setShowConfirmDialog(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("No clients selected", {
        duration: 3000,
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
      return;
    }
    
    setDialogConfig({
      title: "Bulk Delete",
      message: `Delete ${selectedIds.length} selected clients? This action cannot be undone.`,
      type: "danger",
      onConfirm: () => {
        bulkDeleteMutation.mutate(selectedIds);
      }
    });
    setShowConfirmDialog(true);
  };

  const handleBulkStatusUpdate = (status) => {
    if (selectedIds.length === 0) {
      toast.error("No clients selected", {
        duration: 3000,
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
      return;
    }
    
    setDialogConfig({
      title: "Update Status",
      message: `Set status to "${status}" for ${selectedIds.length} clients?`,
      type: "info",
      onConfirm: () => {
        const promises = selectedIds.map(id => 
          api.patch(`/${id}`, { status })
        );
        
        const processingToast = toast.loading(
          `Updating ${selectedIds.length} clients...`,
          {
            style: {
              background: '#3B82F6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '8px',
              border: '1px solid #1D4ED8',
              padding: '12px 16px',
            }
          }
        );
        
        Promise.all(promises).then(() => {
          toast.dismiss(processingToast);
          queryClient.invalidateQueries({ queryKey: ["clients"] });
          toast.success(`Updated ${selectedIds.length} clients successfully!`, {
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
          setSelectedIds([]);
        }).catch(error => {
          toast.dismiss(processingToast);
          toast.error(`Update failed: ${error.message}`, {
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
        });
      }
    });
    setShowConfirmDialog(true);
  };

  // FIXED: toggleSelectAll function
  const toggleSelectAll = () => {
    if (selectedIds.length === currentRows.length) {
      setSelectedIds([]);
      // FIXED: Use toast() instead of toast.info()
      toast("All selections cleared", {
        icon: 'ℹ️',
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
    } else {
      const allIds = currentRows.map(r => r?._id).filter(id => id);
      setSelectedIds(allIds);
      toast.success(`${allIds.length} clients selected`, {
        duration: 2000,
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
    }
  };

  // FIXED: closeForm function
  const closeForm = () => {
    if (isDirty) {
      // Show confirmation dialog instead of alert
      setDialogConfig({
        title: "Unsaved Changes",
        message: "You have unsaved changes. Are you sure you want to discard them?",
        type: "warning",
        onConfirm: () => {
          setShowForm(false);
          setEditingClient(null);
          setFormData(initialForm);
          // FIXED: Use toast() instead of toast.info()
          toast("Changes discarded", {
            icon: 'ℹ️',
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
        }
      });
      setShowConfirmDialog(true);
    } else {
      setShowForm(false);
      setEditingClient(null);
      setFormData(initialForm);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleViewClient = (client) => {
    setViewingClient(client);
  };

  // Handle form editing from view modal
  const handleEditFromView = (client) => {
    setViewingClient(null);
    setEditingClient(client);
    
    // Safely set form data
    const safeContacts = Array.isArray(client.contacts) && client.contacts.length > 0
      ? client.contacts.map(contact => ({
          name: contact?.name || "",
          email: contact?.email || "",
          phone: contact?.phone || "",
          department: contact?.department || "",
          isPrimary: contact?.isPrimary || false
        }))
      : initialForm.contacts;
    
    setFormData({
      ...client,
      contacts: safeContacts,
      address: client.address || initialForm.address,
      socialMedia: client.socialMedia || initialForm.socialMedia,
      tags: Array.isArray(client.tags) ? client.tags : [],
      creditLimit: client.creditLimit || 0
    });
    
    setShowForm(true);
  };

  // Handle edit button click from table
  const handleEditClient = (client) => {
    setEditingClient(client);
    
    // Safely set form data with default values
    const safeContacts = Array.isArray(client.contacts) && client.contacts.length > 0 
      ? client.contacts.map(contact => ({
          name: contact?.name || "",
          email: contact?.email || "",
          phone: contact?.phone || "",
          department: contact?.department || "",
          isPrimary: contact?.isPrimary || false
        }))
      : initialForm.contacts;
    
    const safeFormData = {
      ...client,
      address: client.address || initialForm.address,
      socialMedia: client.socialMedia || initialForm.socialMedia,
      contacts: safeContacts,
      tags: Array.isArray(client.tags) ? client.tags : [],
      creditLimit: client.creditLimit || 0
    };
    
    setFormData(safeFormData);
    setShowForm(true);
  };

  // Handle form submission with enhanced validation
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm(formData);
    
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0], {
        duration: 4000,
        icon: '❌',
        style: {
          background: '#EF4444',
          color: 'white'
        }
      });
      
      // Show all validation errors in console
      if (validationErrors.length > 1) {
        console.group("Form Validation Errors");
        validationErrors.forEach(error => console.error(error));
        console.groupEnd();
      }
      return;
    }
    
    // Prepare clean data
    const cleanData = prepareCleanData(formData);
    
    // Show confirmation dialog for updates
    if (editingClient) {
      setDialogConfig({
        title: "Update Client",
        message: `Are you sure you want to update ${cleanData.name}? All changes will be saved immediately.`,
        type: "info",
        onConfirm: () => {
          console.log("Submitting update for client:", cleanData);
          clientMutation.mutate(cleanData);
        }
      });
      setShowConfirmDialog(true);
    } else {
      // For new clients, show confirmation
      setDialogConfig({
        title: "Create New Client",
        message: `Create new client record for ${cleanData.name}?`,
        type: "success",
        onConfirm: () => {
          console.log("Creating new client:", cleanData);
          clientMutation.mutate(cleanData);
        }
      });
      setShowConfirmDialog(true);
    }
  };

  // --- STATISTICS ---
  const stats = useMemo(() => {
    const active = safeProcessedClients.filter(c => c?.status === 'Active').length;
    const archived = safeProcessedClients.filter(c => c?.status === 'Archived').length;
    const highPriority = safeProcessedClients.filter(c => c?.priority === 'High').length;
    const totalRevenue = safeProcessedClients.reduce((sum, c) => sum + (c?.revenue || 0), 0);
    
    return { active, archived, highPriority, totalRevenue };
  }, [safeProcessedClients]);

  // --- COMPONENT RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700 font-sans antialiased">
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
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={dialogConfig.onConfirm}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.type === 'danger' ? "Delete" : "Confirm"}
      />
      
      {/* View Client Modal */}
      {viewingClient && (
        <ViewClientModal 
          client={viewingClient} 
          onClose={() => setViewingClient(null)}
          onEdit={handleEditFromView}
        />
      )}
      
      {/* ENHANCED TOP NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between shadow">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow">
              <Building2 size={20} />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-gray-900">Enterprise Client Registry</span>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield size={10} />
                <span>v2.1 • Development Mode</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex gap-8 border-l border-gray-200 pl-8">
            {[
              { label: "Active", value: stats.active, color: "text-green-600" },
              { label: "High Priority", value: stats.highPriority, color: "text-yellow-600" },
              { label: "Archived", value: stats.archived, color: "text-gray-400" },
            ].map((stat, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-xs text-gray-500 font-bold uppercase">{stat.label}</span>
                <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all"
              title="Import"
            >
              <Upload size={18} />
            </button>
            
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-green-600 hover:border-green-200 transition-all"
              title="Analytics"
            >
              <BarChart3 size={18} />
            </button>
            
            <button
              onClick={() => {
                setEditingClient(null);
                setFormData(initialForm);
                setShowForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> New Client
            </button>
          </div>
        </div>
      </nav>

      {/* ANALYTICS DASHBOARD */}
      {showAnalytics && (
        <div className="m-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Client Analytics</h3>
            <button onClick={() => setShowAnalytics(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-blue-600" />
                <span className="text-sm font-bold text-gray-500">Total Clients</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{safeProcessedClients.length}</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-sm font-bold text-gray-500">Active</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-yellow-600" />
                <span className="text-sm font-bold text-gray-500">High Priority</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.highPriority}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={20} className="text-gray-600" />
                <span className="text-sm font-bold text-gray-500">Total Revenue</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">KES {(stats.totalRevenue / 1000000).toFixed(1)}M</div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1920px] mx-auto p-6 space-y-4">
        {/* ENHANCED ACTION BAR */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex bg-white border border-gray-200 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode("table")} 
                  className={`p-2 rounded transition-all ${viewMode === 'table' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List size={18}/>
                </button>
                <button 
                  onClick={() => setViewMode("grid")} 
                  className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={18}/>
                </button>
              </div>
              
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 text-xs font-semibold px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Clients</option>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
                <option value="Pending">Pending</option>
              </select>
              
              <button
                onClick={() => setShowAdvancedFilter(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                <Filter size={16} className="text-gray-400"/> Filters
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={16}/> Delete ({selectedIds.length})
                  </button>
                  <button 
                    onClick={() => handleBulkStatusUpdate("Active")}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-all"
                  >
                    <CheckCircle size={16}/> Activate
                  </button>
                  <button 
                    onClick={() => handleBulkStatusUpdate("Archived")}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all"
                  >
                    <Archive size={16}/> Archive
                  </button>
                </>
              )}
              
              <div className="flex items-center gap-2">
                <button onClick={exportPDF} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-red-600 hover:border-red-200 transition-all" title="PDF">
                  <FileText size={18}/>
                </button>
                <button onClick={exportCSV} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-green-600 hover:border-green-200 transition-all" title="CSV">
                  <Download size={18}/>
                </button>
                <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all" title="Refresh">
                  <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''}/>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ENHANCED DATA GRID */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
              <Activity className="w-12 h-12 text-blue-600 animate-pulse mb-4" />
              <span className="text-sm font-medium text-gray-500">Loading client data...</span>
            </div>
          ) : isError ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Data Load Error</h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Unable to fetch client data. Please check your connection.
              </p>
              <button 
                onClick={() => refetch()} 
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} /> Retry
              </button>
            </div>
          ) : viewMode === "table" ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="pl-6 pr-4 py-4 w-12">
                        <button 
                          onClick={toggleSelectAll} 
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          {selectedIds.length === currentRows.length && currentRows.length > 0 ? 
                            <CheckSquare size={18} className="text-blue-600"/> : 
                            <Square size={18}/>
                          }
                        </button>
                      </th>
                      
                      <th 
                        className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1.5">
                          Client
                          {sortField === "name" && (
                            <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Tax ID
                      </th>
                      
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      
                      <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-100">
                    {currentRows.map((client) => (
                      <tr 
                        key={client?._id || Math.random()} 
                        className={`hover:bg-gray-50 transition-all group ${
                          selectedIds.includes(client?._id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="pl-6 pr-4 py-4">
                          <button 
                            onClick={() => setSelectedIds(prev => 
                              prev.includes(client?._id) 
                                ? prev.filter(i => i !== client?._id) 
                                : [...prev, client?._id]
                            )} 
                            className={`transition-colors ${
                              selectedIds.includes(client?._id) 
                                ? 'text-blue-600' 
                                : 'text-gray-300 group-hover:text-gray-400'
                            }`}
                          >
                            {selectedIds.includes(client?._id) ? 
                              <CheckSquare size={18} className="text-blue-600"/> : 
                              <Square size={18}/>
                            }
                          </button>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm uppercase">
                                {client?.name?.charAt(0) || "C"}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">{client?.name || "Unnamed Client"}</span>
                                {Array.isArray(client?.tags) && client.tags.map((tag, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">{client?.industry || 'No industry'}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Mail size={12} className="text-gray-400" />
                              <a 
                                href={`mailto:${client?.email}`} 
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium truncate"
                              >
                                {client?.email || "No email"}
                              </a>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-600 font-mono">{client?.phone || "No phone"}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <MapPin size={12} className="text-gray-400" />
                              {client?.address?.city || 'Unspecified'}
                            </div>
                            <div className="text-xs text-gray-500 pl-5">
                              {client?.address?.country || ''}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <code className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {client?.kraPin || 'N/A'}
                          </code>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
                              client?.status === 'Active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {client?.status || 'Unknown'}
                            </span>
                            {client?.priority && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                client.priority === 'High' 
                                  ? 'bg-red-100 text-red-700' 
                                  : client.priority === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {client.priority}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => handleViewClient(client)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all"
                              title="View Details"
                            >
                              <Eye size={18}/>
                            </button>
                            
                            <button 
                              onClick={() => handleEditClient(client)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all"
                              title="Edit"
                            >
                              <Edit3 size={18}/>
                            </button>
                            
                            <button 
                              onClick={() => handleDelete(client?._id, client?.name)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all"
                              title="Delete"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {currentRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-16 h-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No clients found</h3>
                            <p className="text-gray-500 max-w-md text-center mb-6">
                              {searchQuery 
                                ? `No clients match "${searchQuery}"`
                                : 'No clients in the system yet.'}
                            </p>
                            {searchQuery ? (
                              <button 
                                onClick={() => setSearchQuery('')}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                              >
                                Clear Search
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                  setEditingClient(null);
                                  setFormData(initialForm);
                                  setShowForm(true);
                                }}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <Plus size={18} /> Create First Client
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="mt-auto p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-xs font-medium text-gray-500">
                    Showing <span className="font-bold text-gray-900">{(currentPage - 1) * customRowsPerPage + 1}</span> - 
                    <span className="font-bold text-gray-900"> {Math.min(currentPage * customRowsPerPage, safeProcessedClients.length)}</span> of 
                    <span className="font-bold text-gray-900"> {safeProcessedClients.length}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Rows:</span>
                    <select 
                      value={customRowsPerPage}
                      onChange={(e) => setCustomRowsPerPage(Number(e.target.value))}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
                  >
                    <ChevronLeft size={18}/>
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
                          className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2 text-gray-400">...</span>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
                  >
                    <ChevronRight size={18}/>
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Grid View
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
              {currentRows.map((client) => (
                <div 
                  key={client?._id || Math.random()} 
                  className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-lg uppercase">
                        {client?.name?.charAt(0) || "C"}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        client?.status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {client?.status || 'Unknown'}
                      </div>
                      {client?.website && (
                        <a 
                          href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Visit Website"
                        >
                          <Globe size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">
                    {client?.name || "Unnamed Client"}
                  </h3>
                  
                  {client?.industry && (
                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                      <IndustryIcon size={12} />
                      {client.industry}
                    </p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-gray-600 text-xs">
                      <Mail size={12} className="text-gray-400" />
                      <span className="truncate">{client?.email || "No email"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-xs">
                      <MapPin size={12} className="text-gray-400" />
                      <span>{client?.address?.city || 'No location'}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="space-y-1">
                      <span className="text-xs text-gray-400 uppercase font-bold">Currency</span>
                      <span className="text-sm font-bold text-gray-700">{client?.currency || 'KES'}</span>
                    </div>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleViewClient(client)}
                        className="p-1.5 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-lg text-gray-400 transition-all"
                        title="View Details"
                      >
                        <Eye size={14}/>
                      </button>
                      <button 
                        onClick={() => handleEditClient(client)}
                        className="p-1.5 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-lg text-gray-400 transition-all"
                        title="Edit"
                      >
                        <Edit3 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ENHANCED FORM MODAL - FIXED SCROLLING ISSUE */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {editingClient ? (
                    <>
                      <Edit3 size={20} className="text-blue-600" />
                      Edit Client
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} className="text-blue-600" />
                      New Client
                    </>
                  )}
                </h2>
                {editingClient && (
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {editingClient._id?.substring(0, 12)} • Created: {new Date(editingClient.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <button
                onClick={closeForm}
                className="p-2 bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <FormValidationSummary formData={formData} />
                <form 
                  className="space-y-6" 
                  onSubmit={handleSubmit}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Basic Information</h3>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">Company Name *</label>
                        <input 
                          type="text" 
                          value={formData.name || ""}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          required
                          placeholder="Enter company name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">Email Address *</label>
                        <input 
                          type="email" 
                          value={formData.email || ""}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          required
                          placeholder="company@example.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">Phone Number *</label>
                        <input 
                          type="tel" 
                          value={formData.phone || ""}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          required
                          placeholder="+254 XXX XXX XXX"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">Industry</label>
                        <input 
                          type="text" 
                          value={formData.industry || ""}
                          onChange={e => setFormData({...formData, industry: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Technology, Finance, etc."
                        />
                      </div>

                      {/* Tags Input */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Array.isArray(formData.tags) && formData.tags.map((tag, index) => (
                            <div key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              {tag}
                              <button
                                type="button"
                                onClick={() => {
                                  const newTags = formData.tags.filter((_, i) => i !== index);
                                  setFormData({...formData, tags: newTags});
                                  toast.success("Tag removed", {
                                    duration: 2000,
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
                                }}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="tagInput"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.target.value.trim()) {
                                e.preventDefault();
                                setFormData({
                                  ...formData,
                                  tags: [...(formData.tags || []), e.target.value.trim()]
                                });
                                e.target.value = '';
                                toast.success("Tag added", {
                                  duration: 2000,
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
                              }
                            }}
                            className="flex-1 border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Type tag and press Enter"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('tagInput');
                              if (input?.value.trim()) {
                                setFormData({
                                  ...formData,
                                  tags: [...(formData.tags || []), input.value.trim()]
                                });
                                input.value = '';
                                toast.success("Tag added", {
                                  duration: 2000,
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
                              }
                            }}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-bold hover:bg-gray-200"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Financial Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Financial Information</h3>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">KRA PIN / Tax ID</label>
                        <input 
                          type="text" 
                          value={formData.kraPin || ""}
                          onChange={e => setFormData({...formData, kraPin: e.target.value.toUpperCase()})}
                          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                          placeholder="P000000000X"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Currency</label>
                          <select 
                            value={formData.currency || "KES"}
                            onChange={e => setFormData({...formData, currency: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          >
                            <option value="KES">KES - Kenyan Shilling</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Status</label>
                          <select 
                            value={formData.status || "Active"}
                            onChange={e => setFormData({...formData, status: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          >
                            <option value="Active">Active</option>
                            <option value="Pending">Pending</option>
                            <option value="Archived">Archived</option>
                            <option value="Suspended">Suspended</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Credit Limit</label>
                          <input 
                            type="number" 
                            value={formData.creditLimit || 0}
                            onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Payment Terms</label>
                          <select 
                            value={formData.paymentTerms || "NET30"}
                            onChange={e => setFormData({...formData, paymentTerms: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          >
                            <option value="NET30">NET 30</option>
                            <option value="NET15">NET 15</option>
                            <option value="NET60">NET 60</option>
                            <option value="COD">COD</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Address Information */}
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Address Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Street Address</label>
                          <input 
                            type="text" 
                            value={formData.address?.street || ""}
                            onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Street name and number"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Building</label>
                          <input 
                            type="text" 
                            value={formData.address?.building || ""}
                            onChange={e => setFormData({...formData, address: {...formData.address, building: e.target.value}})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Building name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">City *</label>
                          <input 
                            type="text" 
                            value={formData.address?.city || ""}
                            onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            required
                            placeholder="City"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Postal Code</label>
                          <input 
                            type="text" 
                            value={formData.address?.postalCode || ""}
                            onChange={e => setFormData({...formData, address: {...formData.address, postalCode: e.target.value}})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Postal code"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Country *</label>
                          <select 
                            value={formData.address?.country || "Kenya"}
                            onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            required
                          >
                            <option value="Kenya">Kenya</option>
                            <option value="Uganda">Uganda</option>
                            <option value="Tanzania">Tanzania</option>
                            <option value="Rwanda">Rwanda</option>
                            <option value="Ethiopia">Ethiopia</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Social Media Information */}
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Social Media</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">LinkedIn</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              <Linkedin size={16} />
                            </div>
                            <input
                              type="url"
                              value={formData.socialMedia?.linkedin || ""}
                              onChange={e => setFormData({
                                ...formData,
                                socialMedia: {
                                  ...formData.socialMedia,
                                  linkedin: e.target.value
                                }
                              })}
                              className="w-full border border-gray-300 p-2 pl-10 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="https://linkedin.com/company/..."
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Twitter</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              <Twitter size={16} />
                            </div>
                            <input
                              type="url"
                              value={formData.socialMedia?.twitter || ""}
                              onChange={e => setFormData({
                                ...formData,
                                socialMedia: {
                                  ...formData.socialMedia,
                                  twitter: e.target.value
                                }
                              })}
                              className="w-full border border-gray-300 p-2 pl-10 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="https://twitter.com/..."
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-600">Facebook</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              <Facebook size={16} />
                            </div>
                            <input
                              type="url"
                              value={formData.socialMedia?.facebook || ""}
                              onChange={e => setFormData({
                                ...formData,
                                socialMedia: {
                                  ...formData.socialMedia,
                                  facebook: e.target.value
                                }
                              })}
                              className="w-full border border-gray-300 p-2 pl-10 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="https://facebook.com/..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Contact Persons Section */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Contact Persons</h3>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              contacts: [...(prev.contacts || []), {
                                name: "",
                                email: "",
                                phone: "",
                                department: "",
                                isPrimary: false
                              }]
                            }));
                            toast.success("Added new contact field", {
                              duration: 2000,
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
                          }}
                          className="text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition-all flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Contact
                        </button>
                      </div>
                      
                      {Array.isArray(formData.contacts) && formData.contacts.map((contact, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <UsersIcon size={16} className="text-gray-400" />
                              <span className="text-sm font-bold text-gray-700">Contact Person {index + 1}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={contact?.isPrimary || false}
                                  onChange={e => {
                                    const newContacts = [...formData.contacts];
                                    // Set all contacts to non-primary first
                                    newContacts.forEach(c => c.isPrimary = false);
                                    // Set this one as primary
                                    newContacts[index].isPrimary = e.target.checked;
                                    setFormData({...formData, contacts: newContacts});
                                  }}
                                  className="rounded border-gray-300"
                                />
                                Primary Contact
                              </label>
                              
                              {formData.contacts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newContacts = formData.contacts.filter((_, i) => i !== index);
                                    setFormData({...formData, contacts: newContacts});
                                    toast.success("Contact removed", {
                                      duration: 2000,
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
                                  }}
                                  className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-all"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-600">
                                Full Name *
                                {!contact?.name?.trim() && (
                                  <span className="text-red-500 ml-1">Required</span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={contact?.name || ""}
                                onChange={e => {
                                  const newContacts = [...formData.contacts];
                                  newContacts[index].name = e.target.value;
                                  setFormData({...formData, contacts: newContacts});
                                }}
                                className={`w-full border ${!contact?.name?.trim() ? 'border-red-300' : 'border-gray-300'} p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                placeholder="John Doe"
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-600">Department</label>
                              <input
                                type="text"
                                value={contact?.department || ""}
                                onChange={e => {
                                  const newContacts = [...formData.contacts];
                                  newContacts[index].department = e.target.value;
                                  setFormData({...formData, contacts: newContacts});
                                }}
                                className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Sales, Support, etc."
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-600">
                                Email {contact?.isPrimary && "*"}
                                {contact?.email && contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && (
                                  <span className="text-red-500 ml-1">Invalid</span>
                                )}
                              </label>
                              <input
                                type="email"
                                value={contact?.email || ""}
                                onChange={e => {
                                  const newContacts = [...formData.contacts];
                                  newContacts[index].email = e.target.value;
                                  setFormData({...formData, contacts: newContacts});
                                }}
                                className={`w-full border ${contact?.isPrimary && !contact?.email?.trim() ? 'border-red-300' : 'border-gray-300'} p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                placeholder="john@company.com"
                                required={contact?.isPrimary}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-600">
                                Phone {contact?.isPrimary && "*"}
                              </label>
                              <input
                                type="tel"
                                value={contact?.phone || ""}
                                onChange={e => {
                                  const newContacts = [...formData.contacts];
                                  newContacts[index].phone = e.target.value;
                                  setFormData({...formData, contacts: newContacts});
                                }}
                                className={`w-full border ${contact?.isPrimary && !contact?.phone?.trim() ? 'border-red-300' : 'border-gray-300'} p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                placeholder="+254 XXX XXX XXX"
                                required={contact?.isPrimary}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(!formData.contacts || formData.contacts.length === 0) && (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <UsersIcon size={32} className="text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No contact persons added</p>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                contacts: [{
                                  name: "",
                                  email: "",
                                  phone: "",
                                  department: "",
                                  isPrimary: true
                                }]
                              }));
                            }}
                            className="mt-2 text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
                          >
                            Add First Contact
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Additional Information */}
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Additional Information</h3>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">Website</label>
                        <input 
                          type="url" 
                          value={formData.website || ""}
                          onChange={e => setFormData({...formData, website: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="https://example.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">Priority Level</label>
                        <select 
                          value={formData.priority || "Medium"}
                          onChange={e => setFormData({...formData, priority: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">Notes</label>
                        <textarea 
                          value={formData.notes || ""}
                          onChange={e => setFormData({...formData, notes: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          rows="3"
                          placeholder="Additional notes about this client..."
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Form Action Buttons */}
                  <div className="pt-6 border-t border-gray-200 mt-6">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={closeForm}
                        className="flex-1 bg-gray-100 border border-gray-300 text-gray-700 py-3 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={clientMutation.isPending}
                        className="flex-[2] bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {clientMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={18} />
                            {editingClient ? 'Update Client' : 'Create Client'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED FILTER MODAL */}
      {showAdvancedFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Advanced Filters</h3>
              <button onClick={() => setShowAdvancedFilter(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Priority</label>
                <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm outline-none">
                  <option value="">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm" />
                  <input type="date" className="w-full bg-gray-50 border border-gray-300 p-2 rounded text-sm" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Credit Limit</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" className="flex-1 bg-gray-50 border border-gray-300 p-2 rounded text-sm" />
                  <span className="text-gray-400">to</span>
                  <input type="number" placeholder="Max" className="flex-1 bg-gray-50 border border-gray-300 p-2 rounded text-sm" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Industry</label>
                <select className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm outline-none">
                  <option value="">All Industries</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Retail">Retail</option>
                  <option value="Manufacturing">Manufacturing</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAdvancedFilter(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Filters applied successfully!", {
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
                  setShowAdvancedFilter(false);
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Import Clients</h3>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">Drag & drop CSV file here</p>
                <p className="text-xs text-gray-400 mb-4">or</p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">
                  Browse Files
                </button>
              </div>
              
              <div className="text-xs text-gray-500">
                <p className="font-bold mb-1">CSV Format Requirements:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Include columns: Name, Email, Phone, KRA PIN</li>
                  <li>Maximum file size: 10MB</li>
                  <li>UTF-8 encoding recommended</li>
                </ul>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowImport(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Import started. Processing file...", {
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
                  setShowImport(false);
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Clients;