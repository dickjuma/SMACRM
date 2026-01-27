import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { 
  UserPlus, Trash2, ShieldCheck, Database, 
  Edit2, Save, X, Power, PowerOff, 
  RefreshCw, Mail, AlertCircle, Check,
  Activity, Eye, Clock, Users,
  TrendingUp, Globe, Briefcase,
  Filter, Download, Upload, Search,
  BarChart3, Target, Calendar,
  ChevronDown, ChevronUp,
  Phone, MapPin, Star,
  Award, Shield,
  Settings, Key,
  Building2
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API_URL = `${BASE_URL}`;

const api = axios.create({
  baseURL: API_URL,
});

const UserAdmin = () => {
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "user", 
    department: "Unassigned",
    phone: "",
    position: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    department: "",
    status: "",
    online: ""
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: "",
    sortBy: "name",
    sortOrder: "asc"
  });
  
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    active: 0,
    departments: [],
    roles: [],
    productivity: 0,
    engagement: 0
  });

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- REAL API CALLS ---
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.online) params.append('online', filters.online);
      if (advancedFilters.dateRange) params.append('dateRange', advancedFilters.dateRange);
      if (advancedFilters.sortBy) params.append('sortBy', advancedFilters.sortBy);
      if (advancedFilters.sortOrder) params.append('sortOrder', advancedFilters.sortOrder);
      
      const response = await api.get(`/users?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Could not load user data");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivity = async (userId) => {
    try {
      const response = await api.get(`/activity/user/${userId}`);
      setActivityLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error fetching activity:", error);
      toast.error("Failed to load activity logs");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // --- QUERIES ---
  const { data: usersData = {}, refetch: refetchUsers } = useQuery({
    queryKey: ["users", filters, advancedFilters],
    queryFn: fetchUsers,
    onError: (error) => {
      console.error("Query error:", error);
    }
  });

  const users = usersData.data || [];
  const pagination = usersData.pagination || { page: 1, total: 0, pages: 1 };

  useEffect(() => {
    if (usersData.stats) {
      setStats(usersData.stats);
    } else {
      fetchStats();
    }
  }, [usersData]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserActivity(selectedUser._id);
    }
  }, [selectedUser]);

  // --- MUTATIONS ---
  const addUserMutation = useMutation({
    mutationFn: async (user) => {
      const response = await api.post('/users', user);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setNewUser({ name: "", email: "", password: "", role: "user", department: "Unassigned", phone: "", position: "" });
      toast.success("User created successfully");
      fetchStats();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create user");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await api.patch(`/users/${userId}/toggle-status`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User status updated");
      fetchStats();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await api.put(`/users/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setEditingId(null);
      toast.success("User updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setDeleteConfirmId(null);
      toast.success("User deleted successfully");
      fetchStats();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ userIds, updates }) => {
      const response = await api.post('/users/bulk/update', { userIds, updates });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setSelectedUsers([]);
      toast.success("Users updated successfully");
      fetchStats();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update users");
    }
  });

  // --- HANDLERS ---
  const handleAddUser = (e) => {
    e.preventDefault();
    addUserMutation.mutate(newUser);
  };

  const handleStatusToggle = (userId) => {
    toggleStatusMutation.mutate(userId);
  };

  const handleUpdateUser = (id) => {
    updateUserMutation.mutate({ 
      id, 
      updates: { 
        role: editRole, 
        department: editDepartment 
      } 
    });
  };

  const executeDeletion = (id) => {
    deleteUserMutation.mutate(id);
  };

  const handleViewActivity = (user) => {
    setSelectedUser(user);
    setShowActivityModal(true);
  };

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAdvancedFilterChange = (key, value) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (field) => {
    const newOrder = advancedFilters.sortBy === field && advancedFilters.sortOrder === "asc" ? "desc" : "asc";
    handleAdvancedFilterChange("sortBy", field);
    handleAdvancedFilterChange("sortOrder", newOrder);
  };

  const handleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user._id));
    }
  };

  const handleBulkAction = (action) => {
    if (selectedUsers.length === 0) {
      toast.error("Please select users first");
      return;
    }

    switch(action) {
      case "activate":
        bulkUpdateMutation.mutate({
          userIds: selectedUsers,
          updates: { isActive: true }
        });
        break;
      case "deactivate":
        bulkUpdateMutation.mutate({
          userIds: selectedUsers,
          updates: { isActive: false }
        });
        break;
      case "export":
        handleExportData();
        break;
      default:
        break;
    }
  };

  const handleExportData = async () => {
    try {
      const response = await api.get('/users/export/data', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${new Date().getTime()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Exported ${users.length} users`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export users");
    }
  };

  const handleImportUsers = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/users/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success(`Imported ${response.data.importedCount} users successfully`);
      queryClient.invalidateQueries(["users"]);
      fetchStats();
      setShowImportModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to import users");
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'superadmin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'team_lead': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLastSeen = (date) => {
    if (!date) return 'Never';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const generateAvatar = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'border border-gray-200 shadow-lg p-4 text-sm font-medium rounded-lg',
          duration: 4000,
        }} 
      />

      {/* Activity Modal */}
      {showActivityModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                  <Activity size={20} className="text-blue-600" />
                  Activity Logs: {selectedUser.name}
                </h3>
                <p className="text-sm text-gray-600">{selectedUser.email} • {selectedUser.department}</p>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {activityLogs.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-gray-500 pb-2 border-b">
                    <div>Action</div>
                    <div>Module</div>
                    <div>Time</div>
                    <div>Status</div>
                  </div>
                  {activityLogs.map((log) => (
                    <div key={log._id} className="grid grid-cols-4 gap-4 p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                      <div className="font-medium text-sm">{log.action}</div>
                      <div><span className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-700">{log.module}</span></div>
                      <div className="text-sm text-gray-600">{format(new Date(log.timestamp), 'PPp')}</div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Activity size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500">No activity logs found for this user</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                  {generateAvatar(selectedUser.name)}
                </div>
                <div>
                  <h3 className="font-semibold text-xl text-gray-900">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600">{selectedUser.position} • {selectedUser.department}</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" /> Contact Information
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        <span className="text-sm">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span className="text-sm">{selectedUser.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-sm">{selectedUser.location || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Briefcase size={16} className="text-gray-400" /> Work Details
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Role:</span>
                        <span className="text-sm font-medium">{selectedUser.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Reports To:</span>
                        <span className="text-sm font-medium">{selectedUser.reportsTo || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Projects:</span>
                        <span className="text-sm font-medium">{selectedUser.projects || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <TrendingUp size={16} className="text-gray-400" /> Performance Metrics
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-500">Performance Score</span>
                          <span className={`text-sm font-bold ${getPerformanceColor(selectedUser.performance)} px-2 py-1 rounded`}>
                            {selectedUser.performance || 0}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${(selectedUser.performance || 0) >= 90 ? 'bg-green-500' : (selectedUser.performance || 0) >= 80 ? 'bg-blue-500' : (selectedUser.performance || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${selectedUser.performance || 0}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Today's Activity</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {selectedUser.todayActivity?.activeTime || 0} min
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Total Logins</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {selectedUser.loginCount || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Award size={16} className="text-gray-400" /> Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedUser.skills?.length > 0 ? selectedUser.skills : ['No skills listed']).map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <h3 className="font-semibold text-lg text-gray-900">Import Users</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto mb-4 text-gray-400" size={32} />
                <p className="text-sm text-gray-600 mb-2">Drop your CSV or Excel file here</p>
                <p className="text-xs text-gray-500 mb-4">or click to browse</p>
                <input 
                  type="file" 
                  className="hidden" 
                  id="file-upload" 
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleImportUsers(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="file-upload" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                  Select File
                </label>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                <p>Supported formats: CSV, Excel (.xlsx, .xls)</p>
                <p>Maximum file size: 10MB</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <ShieldCheck size={14} /> User Management System
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Employee Management
            </h1>
            <p className="text-gray-600 text-sm">Manage employees, track activity, and monitor performance</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-lg transition-all shadow-sm text-sm font-medium"
            >
              <Upload size={16} />
              Import
            </button>
            <button 
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-green-300 text-gray-700 hover:text-green-600 rounded-lg transition-all shadow-sm text-sm font-medium"
            >
              <Download size={16} />
              Export
            </button>
            <button 
              onClick={() => {
                refetchUsers();
                toast.success("Data refreshed");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-blue-300 text-gray-700 hover:text-blue-600 rounded-lg transition-all shadow-sm text-sm font-medium"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </header>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Active Now</p>
                <p className="text-2xl font-bold text-green-600">{stats.online || 0}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <Globe className="text-green-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Productivity</p>
                <p className="text-2xl font-bold text-blue-600">{stats.productivity || 0}%</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Engagement</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.engagement || 0}%</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Target className="text-yellow-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats and Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-gray-500">Departments</div>
                <div className="text-base font-semibold text-gray-900">{stats.departments?.length || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Active Today</div>
                <div className="text-base font-semibold text-gray-900">{stats.active || 0}</div>
              </div>
              <div className="flex items-center gap-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="team_lead">Team Lead</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Departments</option>
                {stats.departments?.map(dept => (
                  <option key={dept.department} value={dept.department}>
                    {dept.department}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Filter size={14} />
                {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    value={advancedFilters.dateRange}
                    onChange={(e) => handleAdvancedFilterChange('dateRange', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={advancedFilters.sortBy}
                    onChange={(e) => handleAdvancedFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="name">Name</option>
                    <option value="role">Role</option>
                    <option value="department">Department</option>
                    <option value="createdAt">Date Created</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <select
                    value={advancedFilters.sortOrder}
                    onChange={(e) => handleAdvancedFilterChange('sortOrder', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {selectedUsers.length}
                  </div>
                  <span className="font-medium text-gray-800">{selectedUsers.length} users selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction("activate")}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkAction("deactivate")}
                    className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => handleBulkAction("export")}
                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Export Selected
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedUsers([])}
                className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* ADD USER SECTION */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <UserPlus size={18} className="text-blue-600" /> Create New User
            </h2>
          </div>
          <form onSubmit={handleAddUser} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input 
                  placeholder="John Wekesa" 
                  value={newUser.name} 
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input 
                  type="email"
                  placeholder="john@company.com" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="user">User</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input 
                  placeholder="Engineering" 
                  value={newUser.department} 
                  onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input 
                  type="tel"
                  placeholder="+254 712 345 678" 
                  value={newUser.phone} 
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <input 
                  placeholder="Software Developer" 
                  value={newUser.position} 
                  onChange={(e) => setNewUser({...newUser, position: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Password *</label>
                <input 
                  type="password"
                  placeholder="••••••••" 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  required
                />
              </div>
              
              <div className="flex items-end">
                <button 
                  type="submit" 
                  disabled={addUserMutation.isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {addUserMutation.isLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  {addUserMutation.isLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* DATA TABLE */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
                  <th className="px-6 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      Employee
                      {advancedFilters.sortBy === "name" && (
                        advancedFilters.sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("role")}>
                    <div className="flex items-center gap-1">
                      Role & Department
                      {advancedFilters.sortBy === "role" && (
                        advancedFilters.sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("lastSeen")}>
                    <div className="flex items-center gap-1">
                      Status
                      {advancedFilters.sortBy === "lastSeen" && (
                        advancedFilters.sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3">Performance</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u._id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-60' : ''}`}>
                    {/* Checkbox Column */}
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u._id)}
                        onChange={() => handleSelectUser(u._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Identity Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm uppercase">
                            {generateAvatar(u.name)}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(u.onlineStatus)}`}></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                            {u.performance >= 90 && (
                              <Star size={10} className="text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail size={10}/> {u.email}
                          </p>
                          <p className="text-xs text-gray-400">
                            {u.position || 'No position'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role & Department Column */}
                    <td className="px-6 py-4">
                      {editingId === u._id ? (
                        <div className="space-y-2">
                          <select 
                            value={editRole} 
                            onChange={(e) => setEditRole(e.target.value)}
                            className="w-full px-2 py-1.5 border border-blue-500 rounded text-sm outline-none"
                          >
                            <option value="user">User</option>
                            <option value="team_lead">Team Lead</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                          <input
                            type="text"
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            placeholder="Department"
                            className="w-full px-2 py-1.5 border border-blue-500 rounded text-sm outline-none"
                          />
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleUpdateUser(u._id)} 
                              className="flex-1 px-2 py-1 text-green-600 bg-green-50 hover:bg-green-100 rounded text-xs font-medium transition-colors"
                            >
                              <Save size={12} className="inline mr-1" />
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingId(null)} 
                              className="px-2 py-1 text-gray-400 bg-gray-50 hover:bg-gray-100 rounded text-xs font-medium transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className={`inline-block text-xs font-medium px-2 py-1 rounded border ${getRoleColor(u.role)}`}>
                              {u.role?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 size={10} className="text-gray-400" />
                            <p className="text-sm text-gray-700">{u.department || 'Unassigned'}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(u.onlineStatus)}`} />
                            <span className="text-sm text-gray-800 capitalize">{u.onlineStatus || 'offline'}</span>
                          </div>
                          <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Last seen: {formatLastSeen(u.lastSeen)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Logins: {u.loginCount || 0}
                        </div>
                      </div>
                    </td>

                    {/* Performance Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Score</span>
                          <span className={`text-xs font-medium ${getPerformanceColor(u.performance)} px-1.5 py-0.5 rounded`}>
                            {u.performance || 0}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${(u.performance || 0) >= 90 ? 'bg-green-500' : (u.performance || 0) >= 80 ? 'bg-blue-500' : (u.performance || 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${u.performance || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleViewProfile(u)} 
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Profile"
                        >
                          <Eye size={14} />
                        </button>
                        
                        <button 
                          onClick={() => handleViewActivity(u)} 
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Activity"
                        >
                          <Activity size={14} />
                        </button>
                        
                        <button 
                          onClick={() => { 
                            setEditingId(u._id); 
                            setEditRole(u.role); 
                            setEditDepartment(u.department); 
                          }} 
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit User"
                        >
                          <Edit2 size={14} />
                        </button>
                        
                        <button 
                          onClick={() => handleStatusToggle(u._id)} 
                          className={`p-1.5 rounded transition-colors ${
                            u.isActive 
                              ? 'text-green-600 hover:bg-green-50 hover:text-green-700' 
                              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                          }`}
                          title={u.isActive ? "Deactivate" : "Activate"}
                        >
                          {u.isActive ? <Power size={14} /> : <PowerOff size={14} />}
                        </button>

                        {deleteConfirmId === u._id ? (
                          <div className="flex items-center gap-1 bg-red-50 border border-red-100 p-1 rounded animate-in fade-in slide-in-from-right-2">
                            <span className="text-xs font-medium text-red-600 px-1">Delete?</span>
                            <button 
                              onClick={() => executeDeletion(u._id)} 
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm transition-colors"
                            >
                              <Check size={12} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(null)} 
                              className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirmId(u._id)} 
                            className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {users.length === 0 && !loading && (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Database size={48} />
              <p className="font-medium text-gray-500">No users found</p>
              <button 
                onClick={() => {
                  setFilters({});
                  setAdvancedFilters({
                    dateRange: "",
                    sortBy: "name",
                    sortOrder: "asc"
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-blue-600 mb-3" />
              <p className="text-gray-600 font-medium">Loading user data...</p>
            </div>
          )}

          {/* Pagination Footer */}
          {users.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{users.length}</span> of <span className="font-medium">{pagination.total}</span> users
              </div>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1.5 text-sm text-gray-600 hover:bg-white border border-gray-300 rounded disabled:opacity-50 transition-colors">
                  Previous
                </button>
                <button className="px-2.5 py-1.5 text-sm bg-blue-600 text-white rounded font-medium">
                  1
                </button>
                {pagination.pages > 1 && (
                  <>
                    <button className="px-2.5 py-1.5 text-sm text-gray-600 hover:bg-white border border-gray-300 rounded transition-colors">
                      2
                    </button>
                    {pagination.pages > 2 && (
                      <button className="px-2.5 py-1.5 text-sm text-gray-600 hover:bg-white border border-gray-300 rounded transition-colors">
                        3
                      </button>
                    )}
                  </>
                )}
                <button className="px-2.5 py-1.5 text-sm text-gray-600 hover:bg-white border border-gray-300 rounded transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserAdmin;