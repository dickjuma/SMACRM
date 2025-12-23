import React, { useState, useRef, useMemo } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Eye, Edit, Trash2, Plus, RefreshCcw, X, Search, 
  MapPin, Globe, ShieldCheck, Activity, Clock, Save, Hash
} from "lucide-react";
const BASE_URL= process.env.REACT_APP_BACKEND_URL
const API_URL = `${BASE_URL}/quotations`;
const CLIENTS_API_URL = `${BASE_URL}/clients`;

// --- AUTHENTICATED AXIOS INSTANCE ---
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

  const handlePrintTrigger = useReactToPrint({ content: () => printRef.current });

  // --- TANSTACK QUERIES ---
  const { data: quotations = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const res = await api.get(API_URL);
      return res.data;
    },
  });

  // --- TANSTACK MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_URL}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["quotations"]);
      toast.success("REMOVED_FROM_REGISTRY");
    },
    onError: () => toast.error("DELETE_FAILED"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`${API_URL}/${payload._id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["quotations"]);
      setEditing(null);
      toast.success("REGISTRY_UPDATED");
    },
    onError: () => toast.error("UPDATE_PROTOCOL_ERROR"),
  });

  const addMutation = useMutation({
    mutationFn: (newQ) => api.post(API_URL, newQ),
    onSuccess: () => {
      queryClient.invalidateQueries(["quotations"]);
      setAdding(false);
      toast.success("LEDGER_POSTED");
    },
    onError: () => toast.error("INITIALIZATION_FAILED"),
  });

  // --- LOGIC: FILTER & STATS ---
  const filtered = useMemo(() => quotations.filter(q => 
    (q.client?.name || "").toLowerCase().includes(search.toLowerCase()) || 
    q._id.toLowerCase().includes(search.toLowerCase())
  ), [quotations, search]);

  const totalVal = useMemo(() => quotations.reduce((acc, q) => 
    acc + (q.items?.reduce((a, b) => a + Number(b.total), 0) || 0), 0
  ), [quotations]);

  // --- HANDLERS ---
  const handleDownloadPDF = async (quote) => {
    const toastId = toast.loading("BUFFERING_DOCUMENT...");
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`QUOTE_${quote._id.slice(-6).toUpperCase()}.pdf`);
      toast.success("EXPORT_COMPLETE", { id: toastId });
    } catch (e) { 
      toast.error("EXPORT_FAILED", { id: toastId }); 
    }
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    const payload = { ...editing, client: editing.client?._id || editing.client };
    updateMutation.mutate(payload);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[10px] font-sans antialiased overflow-hidden selection:bg-indigo-100">
      <Toaster position="top-right" />
      
      <aside className="w-16 bg-[#0F172A] flex flex-col items-center py-6 gap-8 border-r border-slate-800 shrink-0">
          <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20"><Activity className="w-5 h-5 text-white"/></div>
          <div className="flex flex-col gap-6 mt-10">
             <div className="rotate-180 [writing-mode:vertical-lr] text-slate-500 font-black tracking-[0.3em] uppercase opacity-50">SMA SYSTEMS</div>
             <div className="h-20 w-px bg-slate-800 mx-auto"></div>
             <button onClick={() => setAdding(true)} className="bg-slate-800 p-2 rounded-lg text-indigo-400 hover:text-white transition-colors"><Plus className="w-4 h-4"/></button>
          </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <nav className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-10">
            <div>
              <h1 className="font-black tracking-[0.2em] text-slate-900 text-[12px] uppercase">Quotation_Manager</h1>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">powered by SMA systems</p>
            </div>
            <div className="hidden md:flex items-center gap-6 border-l border-slate-100 pl-10">
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-400 uppercase">Exposure</span>
                <span className="text-[11px] font-mono font-black text-slate-900">${totalVal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input type="text" placeholder="SEARCH REGISTRY..." className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-[9px] w-56 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold tracking-tight uppercase" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button onClick={() => refetch()} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"><RefreshCcw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setAdding(true)} className="bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2 rounded-lg flex items-center gap-3 font-black text-[9px] uppercase tracking-widest transition-all shadow-md"><Plus className="w-3.5 h-3.5"/> NEW_ENTRY</button>
          </div>
        </nav>

        <main className="flex-1 overflow-auto p-8 bg-[#F8FAFC]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-black tracking-widest animate-pulse">SYNCHRONIZING_LEDGER...</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Reference_Entity</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4 text-right">Valuation</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((q) => {
                    const total = q.items?.reduce((acc, item) => acc + Number(item.total), 0) || 0;
                    return (
                      <tr key={q._id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors"><Hash className="w-3 h-3"/></div>
                            <div>
                              <span className="font-black text-slate-900 uppercase block tracking-tight text-[10px]">{q.client?.name || "Unassigned"}</span>
                              <span className="text-[7px] text-slate-400 font-mono">ID: {q._id.slice(-8).toUpperCase()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><div className="flex items-center gap-2 text-slate-500 font-bold"><Clock className="w-3 h-3 text-slate-300"/> {q.date}</div></td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 text-[11px]"><span className="text-[7px] text-slate-300 mr-1 uppercase">{q.currency || 'USD'}</span>{total.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center"><span className="px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-tighter border bg-emerald-50 text-emerald-600 border-emerald-100">PROPOSAL</span></td>
                        <td className="px-6 py-4 text-right pr-6">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setViewing(q)} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><Eye className="w-3.5 h-3.5"/></button>
                            <button onClick={() => setEditing(q)} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><Edit className="w-3.5 h-3.5"/></button>
                            <button onClick={() => { if(window.confirm("CONFIRM_DELETION?")) deleteMutation.mutate(q._id) }} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* --- PREVIEW MODAL --- */}
      {viewing && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-[210mm] h-[280mm] max-h-[90vh] overflow-y-auto shadow-2xl rounded-sm">
            <div className="p-16 relative" ref={printRef}>
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">SMA_TECH_QUOTATION</h2>
                  <div className="text-[7px] font-bold text-slate-400 flex gap-3 mt-2 uppercase">
                    <span className="flex items-center gap-1"><MapPin className="w-2 h-2"/> NAIROBI_SECTOR_4</span>
                    <span className="flex items-center gap-1"><Globe className="w-2 h-2"/> SMA.TECH.CO</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">PROPOSAL_ID</p>
                  <p className="text-xs font-mono font-black text-slate-900">#QT_{viewing._id.slice(-10).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 mb-12">
                <div>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">PROSPECT_ENTITY</p>
                  <p className="text-lg font-black text-slate-900 uppercase italic tracking-tighter border-l-2 border-slate-900 pl-4">{viewing.client?.name}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">QUOTATION_DATA</p>
                  <div className="bg-slate-50 px-4 py-2 rounded-sm border border-slate-100 text-[9px] font-mono text-slate-600">VALID_FROM: {viewing.date}<br/>CURRENCY: {viewing.currency || "USD"}</div>
                </div>
              </div>

              <table className="w-full text-[10px] mb-12 border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[7px] font-black uppercase tracking-[0.2em]">
                    <th className="p-2 text-left">DESCRIPTION</th>
                    <th className="p-2 text-center w-20">UNITS</th>
                    <th className="p-2 text-right w-40">VALUATION</th>
                  </tr>
                </thead>
                <tbody className="border-x border-slate-200">
                  {viewing.items?.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-700 uppercase tracking-tight">{item.description}</td>
                      <td className="p-3 text-center text-slate-500 font-mono">x{item.quantity}</td>
                      <td className="p-3 text-right font-black text-slate-900">{viewing.currency} {item.total?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-4 mb-20 text-right">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-[0.5em] text-slate-400 mb-1">TOTAL_ESTIMATED_VALUATION</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter"><span className="text-xs font-normal mr-2 uppercase">{viewing.currency || 'USD'}</span>{viewing.items?.reduce((acc, item) => acc + Number(item.total), 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex justify-end gap-3">
              <button onClick={() => handleDownloadPDF(viewing)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest">DOWNLOAD_PDF</button>
              <button onClick={handlePrintTrigger} className="bg-slate-100 text-slate-900 px-6 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest border border-slate-200">PRINTER_OUT</button>
              <button onClick={() => setViewing(null)} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest">DISMISS</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-end z-[100]">
          <div className="bg-white h-full w-full max-w-[400px] shadow-2xl p-10 flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 block">Edit_Quotation</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Buffer_ID: {editing._id.slice(-6)}</span>
              </div>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            
            <form onSubmit={handleUpdateSubmit} className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Recipient</label>
                <input type="text" value={editing.client?.name || ""} disabled className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold text-slate-500 cursor-not-allowed uppercase" />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Document_Date</label>
                <input type="date" value={editing.date} onChange={(e) => setEditing({...editing, date: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg text-[10px] outline-none font-bold uppercase" />
              </div>
              
              <div className="space-y-4">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Line_Items</label>
                {editing.items.map((item, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <input type="text" value={item.description} onChange={(e) => {
                      const items = [...editing.items]; items[i].description = e.target.value; setEditing({...editing, items});
                    }} className="w-full bg-transparent text-[10px] outline-none font-black uppercase tracking-tight" />
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-[7px] font-black text-slate-400 mb-1">QTY</p>
                        <input type="number" value={item.quantity} onChange={(e) => {
                          const items = [...editing.items]; items[i].quantity = Number(e.target.value); items[i].total = items[i].quantity * items[i].price; setEditing({...editing, items});
                        }} className="w-full bg-white border border-slate-200 p-2 rounded text-[9px] font-mono" />
                      </div>
                      <div className="flex-[2]">
                        <p className="text-[7px] font-black text-slate-400 mb-1">PRICE</p>
                        <input type="number" value={item.price} onChange={(e) => {
                          const items = [...editing.items]; items[i].price = Number(e.target.value); items[i].total = items[i].quantity * items[i].price; setEditing({...editing, items});
                        }} className="w-full bg-white border border-slate-200 p-2 rounded text-right text-[9px] font-mono" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="submit" disabled={updateMutation.isPending} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                <Save className="w-4 h-4"/> {updateMutation.isPending ? 'COMMITTING...' : 'Commit_Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD MODAL --- */}
      {adding && <AddQuotationModal onAdd={(newQ) => addMutation.mutate(newQ)} onClose={() => setAdding(false)} isSubmitting={addMutation.isPending} />}
    </div>
  );
};

const AddQuotationModal = ({ onAdd, onClose, isSubmitting }) => {
  const [quotation, setQuotation] = useState({
    client: "", date: new Date().toISOString().slice(0, 10),
    items: [{ description: "", quantity: 1, price: 0, total: 0 }],
    currency: "USD",
  });
  
  const { data: availableClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get(CLIENTS_API_URL)).data
  });

  const [customerSearch, setCustomerSearch] = useState("");
  const [showLookup, setShowLookup] = useState(false);

  const updateItem = (i, field, value) => {
    const items = [...quotation.items];
    items[i][field] = value;
    items[i].total = items[i].quantity * items[i].price;
    setQuotation({ ...quotation, items });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-[100]">
      <div className="bg-white h-full w-full max-w-[400px] shadow-2xl p-10 flex flex-col">
        <div className="flex justify-between items-center mb-10">
           <div>
             <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 block">Initialize_Proposal</span>
             <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">New Entry Buffer</span>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X className="w-5 h-5 text-slate-400"/></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if(!quotation.client) return toast.error("SELECT_CLIENT"); onAdd(quotation); }} className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="relative space-y-2">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Client_Registry_Link</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400"/><input type="text" placeholder="ENTITY NAME..." value={customerSearch} onFocus={() => setShowLookup(true)} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 pl-9 rounded-lg text-[10px] outline-none font-bold uppercase" />
            </div>
            {showLookup && (
              <div className="absolute z-30 w-full bg-white border border-slate-200 mt-2 rounded-lg shadow-2xl max-h-48 overflow-auto">
                {availableClients.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                  <div key={c._id} onClick={() => {setQuotation({...quotation, client: c._id}); setCustomerSearch(c.name); setShowLookup(false);}} className="p-4 hover:bg-indigo-50 cursor-pointer text-[9px] font-black border-b border-slate-50 uppercase text-slate-700">{c.name}</div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</label>
              <input type="date" value={quotation.date} onChange={e => setQuotation({...quotation, date: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg text-[9px] font-bold" required />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Currency</label>
              <select value={quotation.currency} onChange={e => setQuotation({...quotation, currency: e.target.value})} className="w-full border border-slate-200 p-3 rounded-lg text-[9px] font-bold">
                <option value="USD">USD ($)</option><option value="KES">KES (Sh)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Line_Items</label>
                <button type="button" onClick={() => setQuotation({...quotation, items: [...quotation.items, {description: "", quantity: 1, price: 0, total: 0}]})} className="text-[8px] font-black text-indigo-600 uppercase">+ New_Line</button>
            </div>
            {quotation.items.map((item, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <input type="text" placeholder="DESCRIPTION" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} className="bg-transparent text-[9px] outline-none font-bold uppercase w-full" required />
                <div className="flex gap-2">
                   <input type="number" placeholder="QTY" value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} className="w-16 bg-white border border-slate-200 p-2 rounded text-[9px] font-mono" required />
                   <input type="number" placeholder="UNIT PRICE" value={item.price} onChange={e => updateItem(i, "price", Number(e.target.value))} className="flex-1 bg-white border border-slate-200 p-2 rounded text-right text-[9px] font-mono" required />
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2">
            <Save className="w-4 h-4"/> {isSubmitting ? 'POSTING...' : 'Commit_To_Registry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Quotations;