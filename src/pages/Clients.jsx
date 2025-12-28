import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext"; 
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  RefreshCw, UserPlus, Save, X, Search, 
  Trash2, Edit3, LayoutGrid, List, 
  ChevronLeft, ChevronRight, Mail, 
  Activity, Filter, MapPin, ArrowUpRight, Plus,
  FileText, Table as TableIcon, Download, 
  Settings, MoreHorizontal, Building2, Globe,
  CheckSquare, Square, AlertCircle
} from "lucide-react";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BASE_URL}/clients`;

const Clients = () => {
  const { token, logout } = useAuth(); 
  const queryClient = useQueryClient();

  // --- UI STATES ---
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingClient, setEditingClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedIds, setSelectedIds] = useState([]);
  const rowsPerPage = 10;

  const initialForm = {
    name: "", email: "", phone: "", kraPin: "", 
    currency: "KES", address: { street: "", building: "", city: "", postalCode: "" },
    status: "Active"
  };
  const [formData, setFormData] = useState(initialForm);

  // Check if form has been touched to prevent navigation loss
  const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialForm) && !editingClient || 
                  (editingClient && JSON.stringify(formData) !== JSON.stringify(editingClient)), 
                  [formData, initialForm, editingClient]);

  // --- SECURE AXIOS ---
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    instance.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error.response?.status === 401) {
          toast.error("SESSION_EXPIRED");
          logout?.(); 
        }
        return Promise.reject(error);
      }
    );
    return instance;
  }, [token, logout]);

  // --- DATA FETCHING ---
  const { data: clients = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await api.get("/");
      return res.data;
    },
    enabled: !!token,
  });

  // --- LOGIC: FILTERING & SORTING ---
  const processedClients = useMemo(() => {
    let result = clients.filter(c => {
      const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.address?.city?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return result.sort((a, b) => {
      return sortOrder === "asc" 
        ? a.name.localeCompare(b.name) 
        : b._id.localeCompare(a._id);
    });
  }, [clients, searchQuery, sortOrder, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(processedClients.length / rowsPerPage));
  const currentRows = processedClients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // --- EXPORTS ---
  const exportCSV = () => {
    const headers = "Client Name,Email,Phone,KRA_PIN,City,Currency,Status\n";
    const data = processedClients.map(c => 
      `"${c.name}","${c.email}","${c.phone}","${c.kraPin}","${c.address?.city}","${c.currency}","${c.status}"`
    ).join("\n");
    const blob = new Blob([headers + data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ERP_Client_Export_${new Date().toLocaleDateString()}.csv`;
    a.click();
    toast.success("CSV Export Successful");
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text("Master Client Registry", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total Records: ${processedClients.length}`, 14, 28);
    
    autoTable(doc, {
      head: [['Entity Name', 'Email Address', 'Tax PIN', 'Location', 'Currency', 'Status']],
      body: processedClients.map(c => [
        c.name, c.email, c.kraPin || '-', c.address?.city || '-', c.currency, c.status
      ]),
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], fontSize: 10 },
      styles: { fontSize: 9 }
    });
    doc.save("Client_Registry_Report.pdf");
  };

  // --- MUTATIONS ---
  const clientMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingClient) return api.put(`/${editingClient._id}`, payload);
      return api.post("/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Database Updated Successfully");
      closeForm();
    },
    onError: () => toast.error("Update Failed")
  });

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action is permanent.`)) {
      api.delete(`/${id}`).then(() => {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success("Client Deleted");
      });
    }
  };

  const closeForm = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Discard them?")) return;
    }
    setShowForm(false);
    setEditingClient(null);
    setFormData(initialForm);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentRows.length) setSelectedIds([]);
    else setSelectedIds(currentRows.map(r => r._id));
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-700 font-sans antialiased pb-12">
      <Toaster position="top-center" />

      {/* TOP ERP NAVIGATION */}
      <nav className="sticky top-0 z-[60] bg-white border-b border-slate-200 shadow-sm px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-700 rounded flex items-center justify-center text-white shadow-md">
              <Building2 size={18} />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900 uppercase">SMA Registry</span>
          </div>
          
          <div className="hidden lg:flex gap-6 border-l border-slate-200 pl-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Active</span>
              <span className="text-sm font-bold text-slate-900">{clients.filter(c => c.status === 'Active').length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Archived</span>
              <span className="text-sm font-bold text-slate-400">{clients.filter(c => c.status === 'Archived').length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end max-w-3xl">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Quick search entity, email or city..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setShowForm(true)} className="bg-indigo-700 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-800 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap">
            <Plus size={16} /> New Client
          </button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 space-y-4">
        
        {/* ACTION BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-slate-200 p-1 rounded shadow-sm">
              <button onClick={() => setViewMode("table")} className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><List size={16}/></button>
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16}/></button>
            </div>
            
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-[11px] font-bold px-3 py-2 rounded shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded text-xs font-bold hover:bg-red-100 transition-all mr-2">
                <Trash2 size={14}/> Delete ({selectedIds.length})
              </button>
            )}
            <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <FileText size={14} className="text-slate-400"/> PDF
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Download size={14} className="text-slate-400"/> CSV
            </button>
            <div className="w-[1px] h-8 bg-slate-200 mx-2" />
            <button onClick={() => refetch()} className="p-2 bg-white border border-slate-200 rounded hover:text-indigo-600 transition-all shadow-sm">
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''}/>
            </button>
          </div>
        </div>

        {/* DATA GRID */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
              <Activity className="w-10 h-10 text-indigo-600 animate-pulse mb-2" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Hydrating Registry...</span>
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 w-10">
                       <button onClick={toggleSelectAll} className="text-slate-400">
                         {selectedIds.length === currentRows.length ? <CheckSquare size={16} className="text-indigo-600"/> : <Square size={16}/>}
                       </button>
                    </th>
                    <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                      Client Entity Name {sortOrder === 'asc' ? '↑' : '↓'}
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Contact Infrastructure</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Geo Location</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Tax Identifier</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-center">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRows.map((client) => (
                    <tr key={client._id} className={`hover:bg-slate-50/80 transition-all group ${selectedIds.includes(client._id) ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <button onClick={() => setSelectedIds(prev => prev.includes(client._id) ? prev.filter(i => i !== client._id) : [...prev, client._id])} className="text-slate-300 group-hover:text-slate-400">
                          {selectedIds.includes(client._id) ? <CheckSquare size={16} className="text-indigo-600"/> : <Square size={16}/>}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs uppercase shadow-sm">
                            {client.name?.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 text-xs">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-600 font-medium">{client.email}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{client.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Globe size={12} className="text-slate-300"/> {client.address?.city || 'Unspecified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{client.kraPin || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${client.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => { setEditingClient(client); setFormData({...client}); setShowForm(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all"><Edit3 size={16}/></button>
                           <button onClick={() => handleDelete(client._id, client.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {currentRows.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-20 text-center text-slate-400 text-sm">No clients found matching your parameters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              {currentRows.map((client) => (
                <div key={client._id} className="bg-white p-5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group relative">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded border border-indigo-100 flex items-center justify-center font-bold text-indigo-400 text-lg uppercase">{client.name?.charAt(0)}</div>
                      <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${client.status === 'Active' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>{client.status}</div>
                   </div>
                   <h3 className="font-bold text-slate-900 text-sm mb-1 truncate">{client.name}</h3>
                   <p className="text-slate-500 text-xs mb-4 truncate">{client.email}</p>
                   <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Currency</span>
                        <span className="text-xs font-bold text-slate-700">{client.currency}</span>
                      </div>
                      <button onClick={() => { setEditingClient(client); setFormData({...client}); setShowForm(true); }} className="bg-slate-50 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all">Profile</button>
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* ERP FOOTER */}
          <div className="mt-auto p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
               System Log: {currentRows.length} rows processed in current view
             </div>
             <div className="flex items-center gap-1">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all"><ChevronLeft size={16}/></button>
                <div className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded mx-1">Page {currentPage} of {totalPages}</div>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all"><ChevronRight size={16}/></button>
             </div>
          </div>
        </div>
      </main>

      {/* ENTERPRISE FORM SIDEBAR */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-full md:max-w-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                    {editingClient ? <Edit3 size={16} className="text-indigo-600"/> : <UserPlus size={16} className="text-indigo-600"/>}
                    {editingClient ? 'Modify Client Instance' : 'Provision New Client'}
                  </h2>
                  <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">Object UID: {editingClient?._id || 'Pending_Creation'}</p>
                </div>
                <button onClick={closeForm} className="p-2 bg-white border border-slate-200 rounded text-slate-400 hover:text-red-500 transition-all shadow-sm"><X size={20}/></button>
             </div>

             <form className="flex-1 overflow-y-auto p-8 space-y-8" onSubmit={(e) => { e.preventDefault(); clientMutation.mutate(formData); }}>
                {isDirty && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded flex items-center gap-3 text-amber-700 text-[11px] font-bold uppercase">
                    <AlertCircle size={14}/> Warning: Unsaved data detected
                  </div>
                )}

                {/* Basic Section */}
                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex justify-between">
                     <span>Primary Identity</span>
                     {formData.name.length > 0 && <span className="text-indigo-500">{formData.name.length} chars</span>}
                   </h3>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-700">Client Legal Entity Name</label>
                         <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none" required placeholder="e.g. Acme Global Ltd" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-slate-700">Master Email Node</label>
                           <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm outline-none focus:border-indigo-500" required placeholder="hq@company.com" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-slate-700">Global Tel Prefix</label>
                           <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm outline-none focus:border-indigo-500" required placeholder="+254..." />
                        </div>
                      </div>
                   </div>
                </div>

                {/* Address Section */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                   <h3 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2"><MapPin size={14}/> Geographic Headquarters</h3>
                   <input type="text" placeholder="Building / Street Address" value={formData.address.building} onChange={e => setFormData({...formData, address: {...formData.address, building: e.target.value}})} className="w-full bg-white border border-slate-300 p-3 rounded text-xs outline-none focus:border-indigo-500 shadow-sm" />
                   <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="City / State" value={formData.address.city} onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})} className="w-full bg-white border border-slate-300 p-3 rounded text-xs outline-none focus:border-indigo-500 shadow-sm" />
                      <input type="text" placeholder="Zip / Postal Code" value={formData.address.postalCode} onChange={e => setFormData({...formData, address: {...formData.address, postalCode: e.target.value}})} className="w-full bg-white border border-slate-300 p-3 rounded text-xs outline-none focus:border-indigo-500 shadow-sm" />
                   </div>
                </div>

                {/* Fiscal Section */}
                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Fiscal & Governance Settings</h3>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-700">KRA PIN / Tax Compliance ID</label>
                         <input type="text" value={formData.kraPin} onChange={e => setFormData({...formData, kraPin: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm font-mono focus:border-indigo-500 outline-none uppercase tracking-widest" placeholder="P000000000X" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Base Currency</label>
                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm font-bold outline-none cursor-pointer hover:border-indigo-500">
                               <option value="KES">KES - Kenyan Shilling</option>
                               <option value="USD">USD - United States Dollar</option>
                               <option value="EUR">EUR - Euro</option>
                               <option value="GBP">GBP - British Pound</option>
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Workflow Status</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm font-bold outline-none cursor-pointer hover:border-indigo-500">
                               <option value="Active">Operational (Active)</option>
                               <option value="Archived">Cold Storage (Archived)</option>
                            </select>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 pt-10 sticky bottom-0 bg-white pb-6">
                  <button 
                    type="button" 
                    onClick={closeForm}
                    className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 rounded font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={clientMutation.isPending} 
                    className="flex-[2] bg-indigo-700 text-white py-4 rounded font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-800 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     {clientMutation.isPending ? <RefreshCw size={18} className="animate-spin"/> : <Save size={18}/>} 
                     {clientMutation.isPending ? 'Syncing...' : 'Commit to Database'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;