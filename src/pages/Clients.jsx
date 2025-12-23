import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
// 1. IMPORT YOUR AUTH HOOK (Assumed path)
import { useAuth } from "../context/AuthContext"; 
import { 
  RefreshCw, UserPlus, Save, X, Search, 
  Trash2, Edit3, Building2, LayoutGrid, List, 
  ChevronLeft, ChevronRight, Download, Mail, 
  Phone, Activity, Zap, ShieldCheck, Target,
  Filter, MoreHorizontal, ArrowUpRight, MapPin, Hash
} from "lucide-react";

const API_URL = "http://localhost:5000/api/clients";

const Clients = () => {
  // 2. EXTRACT TOKEN & LOGOUT FROM AUTH CONTEXT
  const { token, logout } = useAuth(); 

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClient, setEditingClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  // 3. SECURE AXIOS INSTANCE (Attaches Token to every request)
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    // Handle session expiration (401)
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          toast.error("SESSION EXPIRED - RE-AUTHENTICATING");
          logout?.(); 
        }
        return Promise.reject(error);
      }
    );
    return instance;
  }, [token, logout]);

  const initialForm = {
    name: "", email: "", phone: "", kraPin: "", 
    currency: "KES", paymentTerms: "Net 30",
    address: {
      street: "",
      building: "",
      city: "",
      postalCode: ""
    },
    status: "Active"
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchClients = async (isRefresh = false) => {
    // Prevent fetching if no token exists
    if (!token) return; 

    setLoading(true);
    try {
      // 4. USE SECURE API INSTANCE
      const res = await api.get("/");
      setClients(res.data);
      if (isRefresh) toast.success("LOCAL CACHE SYNCHRONIZED");
    } catch (err) {
      toast.error(err.response?.data?.message || "GATEWAY TIMEOUT");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchClients(); 
  }, [token]); // Re-fetch if token changes

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`PERMANENTLY DE-REGISTER ${name.toUpperCase()}?`)) return;
    const tid = toast.loading("PURGING DATA...");
    try {
      // 5. USE SECURE API INSTANCE
      await api.delete(`/${id}`);
      setClients(prev => prev.filter(c => c._id !== id));
      toast.success("ENTRY REMOVED", { id: tid });
    } catch (err) {
      toast.error("PERMISSION DENIED", { id: tid });
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    const tid = toast.loading("VALIDATING...");
    
    const payload = { ...formData }; 

    try {
      if (editingClient) {
        // 6. USE SECURE API INSTANCE
        const res = await api.put(`/${editingClient._id}`, payload);
        setClients(clients.map(c => (c._id === editingClient._id ? res.data : c)));
        toast.success("RECORDS PATCHED", { id: tid });
      } else {
        // 7. USE SECURE API INSTANCE
        const res = await api.post("/", payload);
        setClients([res.data, ...clients]);
        toast.success("ENTITY INDEXED", { id: tid });
      }
      closeForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "WRITE ERROR", { id: tid });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormData(initialForm);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
  const currentRows = filteredClients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] font-sans text-[10px] antialiased selection:bg-indigo-500 selection:text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1E293B', color: '#fff', fontSize: '9px', fontWeight: '800', borderRadius: '8px' }}} />

      {/* COMPACT NAV */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/60 shadow-sm px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-200">
                <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-[11px] font-black uppercase tracking-[0.15em]">Core_Registry</h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Global Instance 2025</p>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden md:block" />
          <div className="hidden lg:flex gap-6">
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase">Live_Nodes</span>
                <span className="font-bold text-indigo-600">{clients.length} Units</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase">Health_Score</span>
                <span className="font-bold text-emerald-600">98.2%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="QUICK_FIND..." 
                className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent rounded-lg text-[9px] w-56 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-indigo-100">
              <UserPlus size={12} /> Register_New
           </button>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between bg-white/50 p-1.5 rounded-xl border border-white shadow-sm backdrop-blur-sm">
           <div className="flex gap-1">
              <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><List size={14}/></button>
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}><LayoutGrid size={14}/></button>
           </div>
           <div className="flex items-center gap-1.5 px-2">
              <button onClick={() => fetchClients(true)} className="p-2 text-slate-400 hover:text-indigo-600"><RefreshCw size={13} className={loading ? "animate-spin" : ""}/></button>
              <button className="p-2 text-slate-400 hover:text-indigo-600"><Filter size={13}/></button>
              <button className="p-2 text-slate-400 hover:text-indigo-600"><Download size={13}/></button>
           </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          {viewMode === "table" ? (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Entity_Identity</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Geospatial_Node</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Financial_Node</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol_Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentRows.map((client) => (
                    <tr key={client._id} className="hover:bg-indigo-50/20 transition-all group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px] border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-[10px] uppercase">{client.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-slate-400 font-bold text-[8px]">
                               <Mail size={10} className="text-slate-300"/> {client.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                         <div className="flex flex-col text-slate-500">
                            <span className="font-bold uppercase tracking-tighter">{client.address?.building || "N/A Building"}</span>
                            <span className="text-[8px] font-medium italic">{client.address?.street}, {client.address?.city}</span>
                         </div>
                      </td>
                      <td className="px-6 py-3">
                         <div className="flex flex-col">
                            <span className="font-mono text-[9px] font-black text-slate-600 uppercase">{client.kraPin || "N/A"}</span>
                            <span className="text-[8px] font-bold text-slate-300 uppercase">{client.currency} / {client.paymentTerms}</span>
                         </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[8px] font-black uppercase ${client.status === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-50' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                            <div className={`w-1 h-1 rounded-full ${client.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                            {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                         <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => {setEditingClient(client); setFormData({...client}); setShowForm(true);}} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-100 shadow-sm"><Edit3 size={12}/></button>
                            <button onClick={() => handleDelete(client._id, client.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded border border-transparent hover:border-slate-100 shadow-sm"><Trash2 size={12}/></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
                {currentRows.map((client) => (
                  <div key={client._id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 hover:bg-white hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group">
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-9 h-9 bg-white text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs border border-slate-100">
                           {client.name.charAt(0)}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => {setEditingClient(client); setFormData({...client}); setShowForm(true);}} className="p-1.5 bg-slate-900 text-white rounded-md shadow-lg"><Edit3 size={11}/></button>
                        </div>
                     </div>
                     <h4 className="font-black text-[10px] text-slate-900 uppercase mb-0.5 truncate">{client.name}</h4>
                     <p className="text-[8px] text-slate-400 font-bold mb-4">{client.email}</p>
                     <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{client.currency}</span>
                          <span className="text-[7px] font-black text-slate-300 uppercase leading-none">Global_Node</span>
                        </div>
                        <ArrowUpRight size={14} className="text-slate-200 group-hover:text-indigo-400 transition-colors"/>
                     </div>
                  </div>
                ))}
              </div>
          )}

          {/* COMPACT PAGINATION */}
          <div className="mt-auto px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[8px] font-black text-slate-400 uppercase">Registry_Entry: {filteredClients.length} Objects</span>
              <div className="flex items-center gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-20 transition-all"><ChevronLeft size={14}/></button>
                  <div className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-900 uppercase">Node {currentPage} / {totalPages}</div>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-20 transition-all"><ChevronRight size={14}/></button>
              </div>
          </div>
        </div>
      </main>

      {/* FORM UI */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm flex items-center justify-end z-[100] p-3">
          <div className="bg-white h-full w-full max-w-[380px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-900">{editingClient ? 'Patch_Sequence' : 'Object_Initialization'}</h2>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Hash: {editingClient?._id.slice(-12) || 'TEMP_MEM'}</p>
              </div>
              <button onClick={closeForm} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-100"><X size={16}/></button>
            </div>

            <form className="flex-1 overflow-y-auto p-6 space-y-6" onSubmit={handleSaveClient}>
              {/* PRIMARY IDENTITY */}
              <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity_Name</label>
                     <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-100 border-none p-3 rounded-lg text-[10px] font-black outline-none focus:bg-white transition-all" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Comms_Mail</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-100 border-none p-3 rounded-lg text-[10px] font-bold outline-none focus:bg-white" required />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact_Node</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-100 border-none p-3 rounded-lg text-[10px] font-bold outline-none focus:bg-white" required />
                     </div>
                  </div>
              </div>

              {/* GEOSPATIAL_NODE */}
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <MapPin size={10} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Geospatial_Node</span>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Building_Tower</label>
                  <input type="text" value={formData.address.building} onChange={e => handleAddressChange('building', e.target.value)} className="w-full bg-white border-slate-200 p-2.5 rounded-lg text-[9px] font-bold outline-none border" placeholder="e.g. SMA Plaza, 4th Floor" />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Street_Entry</label>
                  <input type="text" value={formData.address.street} onChange={e => handleAddressChange('street', e.target.value)} className="w-full bg-white border-slate-200 p-2.5 rounded-lg text-[9px] font-bold outline-none border" placeholder="e.g. Loita Street" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">City_Hub</label>
                    <input type="text" value={formData.address.city} onChange={e => handleAddressChange('city', e.target.value)} className="w-full bg-white border-slate-200 p-2.5 rounded-lg text-[9px] font-bold outline-none border" placeholder="Nairobi" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Postal_Code</label>
                    <input type="text" value={formData.address.postalCode} onChange={e => handleAddressChange('postalCode', e.target.value)} className="w-full bg-white border-slate-200 p-2.5 rounded-lg text-[9px] font-bold outline-none border" placeholder="00100" />
                  </div>
                </div>
              </div>

              {/* FISCAL_NODE */}
              <div className="p-5 bg-slate-900 rounded-2xl space-y-6 shadow-xl">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Fiscal_Identifier_KRA</label>
                  <input type="text" value={formData.kraPin} onChange={e => setFormData({...formData, kraPin: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/5 p-3 rounded-lg text-[10px] font-black outline-none text-white focus:bg-white/10 uppercase" placeholder="REQUIRED_FIELD" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Base_Currency</label>
                      <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-white/5 border-none p-2.5 rounded-lg text-[9px] font-black text-white outline-none">
                        <option value="KES" className="text-black">KES (Sh)</option>
                        <option value="USD" className="text-black">USD ($)</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-white/5 border-none p-2.5 rounded-lg text-[9px] font-black text-white outline-none">
                        <option value="Active" className="text-black">Active</option>
                        <option value="Archived" className="text-black">Archived</option>
                      </select>
                   </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-2 active:scale-95">
                    <Save size={16} strokeWidth={3}/> Execute_Sync
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