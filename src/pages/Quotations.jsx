import React, { useState, useRef, useMemo, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Eye, Edit, Trash2, Plus, Search, Save, Hash, X, 
  ChevronRight, Activity, FileText, Globe, ShieldCheck, Phone, Mail , MapPin
} from "lucide-react";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BASE_URL}/quotations`;
const CLIENTS_API_URL = `${BASE_URL}/clients`;

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const Quotations = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const printRef = useRef();

  // Esc Key Listener
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") { setEditing(null); setAdding(false); setViewing(null); }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handlePrintTrigger = useReactToPrint({ content: () => printRef.current });

  // --- DATA FETCHING ---
  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => (await api.get(API_URL)).data,
  });

  const { data: availableClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get(CLIENTS_API_URL)).data
  });

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_URL}/${id}`),
    onSuccess: () => { 
      queryClient.invalidateQueries(["quotations"]); 
      toast.success("REGISTRY_PURGED_SUCCESSFULLY"); 
    },
    onError: () => toast.error("PURGE_FAILED: ACCESS_DENIED")
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`${API_URL}/${payload._id}`, payload),
    onSuccess: () => { 
      queryClient.invalidateQueries(["quotations"]); 
      setEditing(null); 
      toast.success("ENTRY_SYNCHRONIZED_WITH_LEDGER"); 
    },
    onError: () => toast.error("SYNCHRONIZATION_ERROR")
  });

  const addMutation = useMutation({
    mutationFn: (newQ) => api.post(API_URL, newQ),
    onSuccess: () => { 
      queryClient.invalidateQueries(["quotations"]); 
      setAdding(false); 
      toast.success("NEW_LEDGER_POST_CONFIRMED"); 
    },
    onError: () => toast.error("POSTING_FAILURE")
  });

  // --- LOGIC ---
  const filtered = useMemo(() => quotations.filter(q => 
    (q.client?.name || "").toLowerCase().includes(search.toLowerCase()) || 
    q._id.toLowerCase().includes(search.toLowerCase())
  ), [quotations, search]);

  const totalVal = useMemo(() => quotations.reduce((acc, q) => 
    acc + (q.items?.reduce((a, b) => a + Number(b.total), 0) || 0), 0
  ), [quotations]);

  const handleDownloadPDF = async (quote) => {
    const toastId = toast.loading("ENCODING_ENCRYPTED_PDF...");
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/jpeg", 0.8); 
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`DOC_${quote._id.slice(-6).toUpperCase()}.pdf`);
      toast.success("EXPORT_COMPLETE", { id: toastId });
    } catch (e) { toast.error("EXPORT_INTERRUPTED", { id: toastId }); }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F1F5F9] text-[10px] font-sans antialiased overflow-hidden">
      <Toaster position="top-right" />
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-20 bg-slate-900 flex-col items-center py-8 gap-10 border-r border-slate-800 shrink-0 z-40">
        <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
          <Activity className="w-6 h-6 text-white"/>
        </div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setAdding(true)} className="p-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
            <Plus className="w-5 h-5"/>
          </button>
          <div className="w-8 h-[1px] bg-slate-800 self-center" />
          <div className="p-3 rounded-xl text-indigo-400 bg-indigo-500/10">
            <FileText className="w-5 h-5"/>
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* HEADER */}
        <nav className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 z-30">
          <div>
            <h1 className="font-black tracking-tighter text-slate-900 text-lg uppercase">Registry_Alpha</h1>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Global Exposure: ${totalVal.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="QUERY SYSTEM..." 
                className="pl-12 pr-6 py-3 bg-slate-100 border-transparent rounded-xl text-[9px] w-64 text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold uppercase transition-all" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            <button onClick={() => setAdding(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-3 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all">
              <Plus className="w-4 h-4"/> Initialize_Entry
            </button>
          </div>
        </nav>

        {/* LIST */}
        <main className="flex-1 overflow-auto p-8">
          {isLoading ? (
            <div className="h-full flex items-center justify-center font-black text-slate-300 tracking-[0.5em] animate-pulse uppercase">Fetching_Data_Stream...</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Linked_Client_Entity</th>
                    <th className="px-8 py-5 text-center">Timestamp</th>
                    <th className="px-8 py-5 text-right">Credit_Value</th>
                    <th className="px-8 py-5 text-right pr-12">System_Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((q) => (
                    <tr key={q._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <ShieldCheck className="w-5 h-5"/>
                          </div>
                          <div>
                            <span className="font-black text-slate-900 uppercase text-[11px] block tracking-tight">
                                {q.client?.name || "ORPHAN_ENTRY"}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono">HASH://{q._id.slice(-8).toUpperCase()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center font-bold text-slate-500">{q.date}</td>
                      <td className="px-8 py-5 text-right font-black text-slate-900 font-mono text-xs">
                        {q.currency || 'USD'} {(q.items?.reduce((a, b) => a + Number(b.total), 0) || 0).toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-right pr-8">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setViewing(q)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Eye className="w-4 h-4"/></button>
                          <button onClick={() => setEditing(JSON.parse(JSON.stringify(q)))} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"><Edit className="w-4 h-4"/></button>
                          <button onClick={() => window.confirm("PURGE_RECORD?") && deleteMutation.mutate(q._id)} className="p-2.5 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* MODALS SLIDE-OVER */}
      {(editing || adding) && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => { setEditing(null); setAdding(false); }} />
          <div className="relative w-full md:max-w-[520px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            {editing ? (
              <UpsertQuotationContent 
                mode="EDIT"
                data={editing} 
                setData={setEditing} 
                onSubmit={(p) => updateMutation.mutate(p)} 
                isPending={updateMutation.isPending}
                clients={availableClients}
                onClose={() => setEditing(null)}
              />
            ) : (
              <UpsertQuotationContent 
                mode="ADD"
                data={null} 
                onSubmit={(p) => addMutation.mutate(p)} 
                isPending={addMutation.isPending}
                clients={availableClients}
                onClose={() => setAdding(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* PREVIEW OVERLAY */}
      {viewing && (
        <div className="fixed inset-0 z-[250] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-0 md:p-12">
          <div className="bg-white w-full md:w-[210mm] h-full md:h-auto md:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col rounded-sm">
             <div className="flex-1 p-12 md:p-20" ref={printRef}>
                <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-12">
                <div>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="bg-indigo-600 p-2 rounded-lg"><ShieldCheck className="w-6 h-6 text-white"/></div>
                                <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">SMA TECHNOLOGIES</h2>
                              </div>
                              <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest"><Phone className="w-3 h-3 text-indigo-400"/> +254 719 832 719</p>
                              <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 tracking-wider"><Mail className="w-3 h-3 text-indigo-400"/> info@smacore.co.ke</p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center md:justify-end gap-2"><MapPin className="w-3 h-3"/> Global Office</p>
                                <p className="text-[11px] font-bold text-white">Nairobi, KE </p>
                            </div>
                  <div className="text-right">
                    <p className="text-xs font-black">REF_ID: {viewing._id.slice(-8).toUpperCase()}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-bold mt-1">{viewing.date}</p>
                  </div>
                </div>
                
                <div className="mb-12">
                  <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-2">Assignee_Entity</p>
                  <p className="text-2xl font-black text-slate-900 uppercase italic border-l-8 border-indigo-600 pl-6">{viewing.client?.name}</p>
                </div>

                <table className="w-full text-[11px] mb-12">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                      <th className="p-5 text-left">Line_Description</th>
                      <th className="p-5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="border-x border-slate-100">
                    {viewing.items?.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="p-5 font-bold text-slate-700 uppercase">
                            {item.description} 
                            <span className="text-indigo-500 font-mono ml-3 text-[9px]">QTY__{item.quantity}</span>
                        </td>
                        <td className="p-5 text-right font-black text-slate-900">{viewing.currency} {item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="bg-slate-900 text-white p-8 min-w-[240px] text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Grand_Total_Valuation</p>
                    <p className="text-4xl font-black tracking-tighter">{viewing.currency} {(viewing.items?.reduce((a,b)=> a+Number(b.total),0)||0).toLocaleString()}</p>
                  </div>
                </div>
             </div>

             <div className="sticky bottom-0 bg-slate-100 p-6 flex justify-end gap-4 border-t border-slate-200">
               <button onClick={() => handleDownloadPDF(viewing)} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all">Download_System_Doc</button>
               <button onClick={handlePrintTrigger} className="bg-white border border-slate-300 text-slate-900 px-8 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest">Execute_Print</button>
               <button onClick={() => setViewing(null)} className="bg-red-50 text-red-600 px-8 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Exit_Preview</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * REUSABLE UPSERT COMPONENT
 * Handles both Adding and Editing to ensure features are never out of sync.
 */
const UpsertQuotationContent = ({ mode, data, setData, onSubmit, isPending, clients, onClose }) => {
  const [localData, setLocalData] = useState(data || {
    client: "", date: new Date().toISOString().slice(0, 10),
    items: [{ description: "", quantity: 1, price: 0, total: 0 }],
    currency: "USD",
  });
  const [customerSearch, setCustomerSearch] = useState(data?.client?.name || "");
  const [showLookup, setShowLookup] = useState(false);

  const updateItem = (i, field, value) => {
    const items = [...localData.items];
    items[i][field] = value;
    items[i].total = items[i].quantity * items[i].price;
    setLocalData({ ...localData, items });
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    if (!localData.client) return toast.error("CLIENT_LINKAGE_REQUIRED");
    if (localData.items.length === 0) return toast.error("MINIMUM_ONE_COMPONENT_REQUIRED");
    
    // Ensure client is just the ID for the API
    const payload = {
        ...localData,
        client: localData.client?._id || localData.client
    };
    onSubmit(payload);
  };

  return (
    <>
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
        <div>
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-600 block">
            {mode === 'ADD' ? 'Initialize_Proposal' : 'System_Update_Protocol'}
          </span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            {mode === 'ADD' ? 'Entry_Buffer_Alpha' : `Record_Hash: ${localData._id}`}
          </span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X className="w-6 h-6 text-slate-400"/></button>
      </div>

      <form className="flex-1 overflow-y-auto p-8 space-y-8" onSubmit={handleFinalSubmit}>
        {/* CLIENT LOOKUP */}
        <div className="relative space-y-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assign_to_Entity</label>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500"/>
            <input 
              type="text" 
              placeholder="SEARCH CLIENT REGISTRY..." 
              value={customerSearch} 
              onFocus={() => setShowLookup(true)} 
              onChange={(e) => setCustomerSearch(e.target.value)} 
              className="w-full bg-slate-50 border-2 border-slate-100 p-5 pl-14 rounded-2xl text-[11px] outline-none font-black uppercase focus:border-indigo-500 focus:bg-white transition-all shadow-sm" 
            />
          </div>
          {showLookup && (
            <div className="absolute z-50 w-full bg-white border border-slate-200 mt-2 rounded-2xl shadow-2xl max-h-60 overflow-auto border-t-4 border-t-indigo-500">
              {clients.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                <div key={c._id} onClick={() => { 
                    setLocalData({...localData, client: c._id}); 
                    setCustomerSearch(c.name); 
                    setShowLookup(false);
                    toast.success(`LINKED: ${c.name}`, { icon: '🔗', duration: 1000 });
                }} className="p-5 hover:bg-indigo-50 cursor-pointer text-[11px] font-black border-b border-slate-50 uppercase flex justify-between items-center">
                  <div className="flex flex-col">
                      <span>{c.name}</span>
                      <span className="text-[7px] text-slate-400">UID: {c._id.slice(-6)}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-300"/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* METADATA */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Issue_Timestamp</label>
            <input type="date" value={localData.date} onChange={e => setLocalData({...localData, date: e.target.value})} className="w-full border-2 border-slate-100 p-5 rounded-2xl text-[11px] font-bold" required />
          </div>
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Denomination</label>
            <select value={localData.currency} onChange={e => setLocalData({...localData, currency: e.target.value})} className="w-full border-2 border-slate-100 p-5 rounded-2xl text-[11px] font-bold uppercase appearance-none">
              <option value="USD">USD ($)</option>
              <option value="KES">KES (Sh)</option>
            </select>
          </div>
        </div>

        {/* LINE ITEMS */}
        <div className="space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Line_Components</label>
            <button type="button" onClick={() => setLocalData({...localData, items: [...localData.items, {description: "", quantity: 1, price: 0, total: 0}]})} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors hover:bg-indigo-100">
              <Plus className="w-4 h-4"/> Add_Component
            </button>
          </div>
          <div className="space-y-5">
            {localData.items.map((item, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 relative group shadow-sm">
                <button type="button" onClick={() => setLocalData({...localData, items: localData.items.filter((_, idx) => idx !== i)})} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                <input type="text" placeholder="DESCRIPTION" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} className="bg-transparent text-[11px] outline-none font-black uppercase w-full text-slate-700 border-b border-transparent focus:border-indigo-200 pb-1" required />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[7px] font-black text-slate-400 uppercase">Qty</span>
                    <input type="number" value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-[11px] font-mono" required />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[7px] font-black text-slate-400 uppercase text-right block">Unit_Price</span>
                    <input type="number" value={item.price} onChange={e => updateItem(i, "price", Number(e.target.value))} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-right text-[11px] font-mono" required />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-24" />
      </form>

      <div className="p-8 border-t border-slate-100 bg-white sticky bottom-0 flex gap-4 shadow-2xl">
        <button onClick={onClose} type="button" className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Abort</button>
        <button onClick={handleFinalSubmit} disabled={isPending} className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-600 transition-all">
          <Save className="w-5 h-5"/> {isPending ? 'SYNCHRONIZING...' : 'Commit_Protocol'}
        </button>
      </div>
    </>
  );
};

export default Quotations;