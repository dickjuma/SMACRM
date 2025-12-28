import { useState, useMemo } from "react";
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
  Settings, MoreHorizontal, Building2, Globe
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
  const [editingClient, setEditingClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("desc"); // desc = newest first
  const rowsPerPage = 10;

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
    let result = clients.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address?.city?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return result.sort((a, b) => {
      return sortOrder === "asc" 
        ? a.name.localeCompare(b.name) 
        : b._id.localeCompare(a._id);
    });
  }, [clients, searchQuery, sortOrder]);

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
      toast.success("Database Updated");
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

  const initialForm = {
    name: "", email: "", phone: "", kraPin: "", 
    currency: "KES", address: { street: "", building: "", city: "", postalCode: "" },
    status: "Active"
  };

  const [formData, setFormData] = useState(initialForm);

  const closeForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormData(initialForm);
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
            <span className="text-sm font-bold tracking-tight text-slate-900">SMA Registry</span>
          </div>
          
          <div className="hidden md:flex gap-6 border-l border-slate-200 pl-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Clients</span>
              <span className="text-sm font-bold text-slate-900">{clients.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Freshness</span>
              <span className="text-sm font-bold text-emerald-600">Synced</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email or city..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setShowForm(true)} className="bg-indigo-700 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-800 transition-all flex items-center gap-2 shadow-sm">
            <Plus size={16} /> New Client
          </button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 space-y-4">
        
        {/* ACTION BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-white border border-slate-200 p-1 rounded shadow-sm">
            <button onClick={() => setViewMode("table")} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Table</button>
            <button onClick={() => setViewMode("grid")} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Grid</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <FileText size={14} className="text-slate-400"/> PDF Export
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <Download size={14} className="text-slate-400"/> CSV Data
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
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Loading Master Data...</span>
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                      Client Entity Name {sortOrder === 'asc' ? '↑' : '↓'}
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Contact Node</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Location</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase">Tax ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-center">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRows.map((client) => (
                    <tr key={client._id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs uppercase">
                            {client.name?.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 text-xs">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-600">{client.email}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{client.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Globe size={12} className="text-slate-300"/> {client.address?.city || 'Not Set'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{client.kraPin || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${client.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                           <button onClick={() => { setEditingClient(client); setFormData({...client}); setShowForm(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"><Edit3 size={16}/></button>
                           <button onClick={() => handleDelete(client._id, client.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              {currentRows.map((client) => (
                <div key={client._id} className="bg-white p-5 rounded border border-slate-200 hover:shadow-md transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-slate-50 rounded border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-lg uppercase">{client.name?.charAt(0)}</div>
                      <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${client.status === 'Active' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>{client.status}</div>
                   </div>
                   <h3 className="font-bold text-slate-900 text-sm mb-1 truncate">{client.name}</h3>
                   <p className="text-slate-500 text-xs mb-4 truncate">{client.email}</p>
                   <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">{client.currency}</span>
                      <button onClick={() => { setEditingClient(client); setFormData({...client}); setShowForm(true); }} className="text-indigo-600 hover:underline text-[11px] font-bold uppercase">View Profile</button>
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* ERP FOOTER */}
          <div className="mt-auto p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="text-xs font-semibold text-slate-500 uppercase tracking-tight">
               Showing {currentRows.length} of {processedClients.length} entries
             </div>
             <div className="flex items-center gap-1">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all">Previous</button>
                <div className="px-4 py-1.5 text-xs font-bold text-slate-700">Page {currentPage} of {totalPages}</div>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-all">Next</button>
             </div>
          </div>
        </div>
      </main>

      {/* ENTERPRISE FORM SIDEBAR */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:justify-end bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-full md:max-w-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{editingClient ? 'Edit Client Record' : 'Register New Client'}</h2>
                  <p className="text-xs text-slate-500 mt-1">Client ID: {editingClient?._id || 'New'}</p>
                </div>
                <button onClick={closeForm} className="p-2 bg-white border border-slate-200 rounded text-slate-400 hover:text-red-500 transition-all shadow-sm"><X size={20}/></button>
             </div>

             <form className="flex-1 overflow-y-auto p-8 space-y-8" onSubmit={(e) => { e.preventDefault(); clientMutation.mutate(formData); }}>
                {/* Basic Section */}
                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Primary Information</h3>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-700">Client Legal Name</label>
                         <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" required placeholder="e.g. Acme Corp" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-slate-700">Billing Email</label>
                           <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm outline-none" required placeholder="finance@company.com" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-slate-700">Primary Phone</label>
                           <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm outline-none" required placeholder="+254..." />
                        </div>
                      </div>
                   </div>
                </div>

                {/* Address Section */}
                <div className="p-6 bg-slate-50 rounded border border-slate-200 space-y-4">
                   <h3 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2"><MapPin size={14}/> Office Address</h3>
                   <input type="text" placeholder="Building / Suite" value={formData.address.building} onChange={e => setFormData({...formData, address: {...formData.address, building: e.target.value}})} className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs outline-none" />
                   <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="City" value={formData.address.city} onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})} className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs outline-none" />
                      <input type="text" placeholder="Zip/Postal" value={formData.address.postalCode} onChange={e => setFormData({...formData, address: {...formData.address, postalCode: e.target.value}})} className="w-full bg-white border border-slate-300 p-2.5 rounded text-xs outline-none" />
                   </div>
                </div>

                {/* Fiscal Section */}
                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Financial Settings</h3>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-700">KRA PIN (Tax ID)</label>
                         <input type="text" value={formData.kraPin} onChange={e => setFormData({...formData, kraPin: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm font-mono focus:border-indigo-500 outline-none uppercase" placeholder="P051234567A" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Currency</label>
                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm font-bold outline-none cursor-pointer">
                               <option value="KES">KES (Kenya Shilling)</option>
                               <option value="USD">USD (US Dollar)</option>
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Lifecycle Status</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded text-sm font-bold outline-none cursor-pointer">
                               <option value="Active">Active</option>
                               <option value="Archived">Archived</option>
                            </select>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-4">
                  <button type="submit" disabled={clientMutation.isPending} className="flex-1 bg-indigo-700 text-white py-4 rounded font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                     <Save size={18}/> {clientMutation.isPending ? 'Saving...' : 'Commit Record'}
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