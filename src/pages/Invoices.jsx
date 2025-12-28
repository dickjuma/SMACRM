import React, { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import { 
  Eye, Edit, Trash2, Download, Printer, 
  Plus, RefreshCw, X, Search, FileText,
  Globe, Mail, MapPin, CheckCircle2, AlertCircle, Phone, ShieldCheck,
  PlusCircle, Minus, Coins, Percent, Tags
} from "lucide-react";

// API Config
const BASE_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BASE_URL}/invoices`;
const CLIENTS_API_URL = `${BASE_URL}/clients`;

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

const fetchInvoices = async () => (await api.get(API_URL)).data;
const fetchClients = async () => (await api.get(CLIENTS_API_URL)).data;

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "KES", symbol: "KSh", label: "Kenya Shilling" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "UGX", symbol: "USh", label: "Uganda Shilling" },
];

const Invoices = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const printRef = useRef();

  const handlePrintTrigger = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => toast.success("Print command sent"),
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
    onError: () => toast.error("Failed to sync with ledger"),
  });

  const downloadPDF = async (invoice) => {
    if (!invoice) return;
    const toastId = toast.loading("Compressing Ledger PDF...");
    if (!viewing || viewing._id !== invoice._id) setViewing(invoice);

    setTimeout(async () => {
      try {
        const element = printRef.current;
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/jpeg", 0.7); 
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`SMA_INV_${invoice._id.slice(-6).toUpperCase()}.pdf`);
        toast.success("PDF Download Complete", { id: toastId });
      } catch (err) {
        toast.error("PDF Engine Error", { id: toastId });
      }
    }, 500);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, client: data.client?._id || data.client };
      return data._id ? api.put(`${API_URL}/${data._id}`, payload) : api.post(API_URL, payload);
    },
    onMutate: () => {
        toast.loading("Synchronizing Database...", { id: "save-task" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["invoices"]);
      toast.success("Ledger Updated Successfully", { id: "save-task" });
      setEditing(null); setAdding(false);
    },
    onError: () => toast.error("Authorization or Network Error", { id: "save-task" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_URL}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["invoices"]);
      toast.success("Record Purged Successfully");
    },
    onError: () => toast.error("Failed to delete record"),
  });

  const statusMutation = useMutation({
    mutationFn: (invoice) => {
      const newStatus = invoice.status === "Paid" ? "Not Paid" : "Paid";
      return api.put(`${API_URL}/${invoice._id}`, { 
        ...invoice, 
        status: newStatus,
        client: invoice.client?._id || invoice.client 
      });
    },
    onSuccess: (res) => {
        queryClient.invalidateQueries(["invoices"]);
        toast.success(`Status: ${res.data.status.toUpperCase()}`);
    },
  });

  const filteredInvoices = invoices.filter(inv => 
    (inv.client?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-[12px] text-slate-700 font-sans overflow-hidden">
      <Toaster 
        position="top-right" 
        toastOptions={{
            className: 'font-black text-[10px] uppercase tracking-widest border border-slate-200 shadow-xl',
            duration: 3000,
            style: { borderRadius: '12px', background: '#fff', color: '#0f172a' }
        }} 
      />
      
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-5 shrink-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg"><ShieldCheck className="w-5 h-5 text-white"/></div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase italic">SMA_CORE</h1>
              <p className="text-[9px] text-indigo-500 font-black uppercase tracking-[0.2em]">Management System v3.0</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="Search Invoices..." className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setAdding(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-black transition-all">
              <Plus className="w-4 h-4"/> <span className="hidden xs:inline">New Invoice</span><span className="xs:hidden">New</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest animate-pulse italic">Loading Ledger Data...</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-5">Client_Name</th>
                      <th className="px-6 py-5">Date</th>
                      <th className="px-6 py-5 text-right">Total_Value</th>
                      <th className="px-6 py-5 text-center">Status</th>
                      <th className="px-6 py-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-900 uppercase italic">{inv.client?.name}</p>
                          <p className="text-[8px] text-slate-400 font-mono">#{inv._id.slice(-6).toUpperCase()}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono">{inv.date}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">
                          {inv.currency} {inv.total?.toLocaleString() || inv.items.reduce((a, b) => a + b.total, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => statusMutation.mutate(inv)} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${inv.status === "Paid" ? "bg-emerald-100 text-emerald-700 shadow-sm" : "bg-amber-100 text-amber-700"}`}>
                              {inv.status}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setViewing(inv)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg"><Eye className="w-4 h-4"/></button>
                            <button onClick={() => downloadPDF(inv)} className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg"><Download className="w-4 h-4"/></button>
                            <button onClick={() => setEditing(inv)} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-lg"><Edit className="w-4 h-4"/></button>
                            <button onClick={() => {if(window.confirm("Purge?")) deleteMutation.mutate(inv._id)}} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {viewing && <InvoiceViewModal invoice={viewing} ref={printRef} onClose={() => setViewing(null)} onPrint={handlePrintTrigger} onDownload={() => downloadPDF(viewing)} />}
      {(editing || adding) && <AddEditModal invoice={editing} onSave={(data) => saveMutation.mutate(data)} onClose={() => {setEditing(null); setAdding(false);}} />}
    </div>
  );
};

// --- MODAL: VIEW INVOICE ---
const InvoiceViewModal = React.forwardRef(({ invoice, onClose, onPrint, onDownload }, ref) => {
  const subtotal = invoice.items.reduce((acc, i) => acc + i.total, 0);
  const tax = invoice.tax || 0;
  const discount = invoice.discount || 0;
  const grandTotal = invoice.total || (subtotal + (subtotal * (tax / 100)) - discount);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white w-full max-w-3xl shadow-2xl rounded-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex-1 overflow-y-auto" ref={ref}>
          <div className="bg-slate-900 p-6 md:p-10 text-white flex flex-col md:flex-row justify-between items-start border-b-4 border-indigo-600 gap-4">
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
          </div>

          <div className="p-6 md:p-12 bg-white">
            <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Billed_To</p>
                <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{invoice.client?.name}</p>
                <p className="text-[11px] text-slate-500 mt-1 uppercase">{invoice.client?.email || "official_records"}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm font-mono font-bold text-slate-900 uppercase bg-slate-100 px-3 py-1 rounded">SMA_INV_{invoice._id?.slice(-8).toUpperCase()}</p>
                <p className="text-xs font-mono text-slate-500 mt-2 uppercase tracking-tighter">Issue_Date: {invoice.date}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-[12px] mb-8 border-collapse min-w-[500px]">
                <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-900 text-left">
                    <th className="py-4">Item_Details</th>
                    <th className="py-4 text-center w-24">Qty</th>
                    <th className="py-4 text-right w-32">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 border-b-2 border-slate-900">
                    {invoice.items.map((item, i) => (
                    <tr key={i}>
                        <td className="py-5 font-black text-slate-800 uppercase text-[11px]">{item.description}</td>
                        <td className="py-5 text-center text-slate-500 font-mono font-bold italic">x{item.quantity}</td>
                        <td className="py-5 text-right font-black text-slate-900 tracking-tighter">{invoice.currency} {item.total?.toLocaleString()}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-slate-900">{invoice.currency} {subtotal.toLocaleString()}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-[10px] font-black uppercase text-emerald-500">
                    <span>Tax ({tax}%)</span>
                    <span>+{invoice.currency} {((subtotal * tax) / 100).toLocaleString()}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-[10px] font-black uppercase text-rose-500">
                    <span>Discount</span>
                    <span>-{invoice.currency} {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-4 border-t-2 border-slate-900">
                  <span className="text-[11px] font-black uppercase text-slate-900">Total_Due</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tighter">{invoice.currency} {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-4 md:px-8 py-5 flex flex-wrap justify-end gap-3 border-t shrink-0">
          <button onClick={onPrint} className="flex-1 md:flex-none px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-50">Print</button>
          <button onClick={onDownload} className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">Download</button>
          <button onClick={onClose} className="w-full md:w-auto px-5 py-2.5 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase">Close</button>
        </div>
      </div>
    </div>
  );
});

// --- MODAL: ADD/EDIT ---
const AddEditModal = ({ invoice, onSave, onClose }) => {
  const [inv, setInv] = useState(invoice || {
    client: null, 
    date: new Date().toISOString().slice(0, 10),
    currency: "USD", 
    status: "Not Paid",
    tax: 0,
    discount: 0,
    items: [{ description: "", quantity: 1, price: 0, total: 0 }]
  });

  const [clientSearch, setClientSearch] = useState(invoice?.client?.name || "");
  const [showLookup, setShowLookup] = useState(false);
  const { data: clientList = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const addItem = () => {
    setInv({ ...inv, items: [...inv.items, { description: "", quantity: 1, price: 0, total: 0 }] });
    toast.success("Row Added", { duration: 1000 });
  };

  const removeItem = (index) => {
    if (inv.items.length > 1) {
      const newItems = inv.items.filter((_, i) => i !== index);
      setInv({ ...inv, items: newItems });
      toast.error("Row Removed", { duration: 1000 });
    }
  };

  const updateItem = (idx, field, val) => {
    const items = [...inv.items];
    const value = field === "description" ? val : Number(val);
    items[idx][field] = value;
    items[idx].total = items[idx].quantity * (items[idx].price || 0);
    setInv({ ...inv, items });
  };

  const totals = useMemo(() => {
    const subtotal = inv.items.reduce((acc, i) => acc + (i.total || 0), 0);
    const taxAmount = (subtotal * (inv.tax || 0)) / 100;
    const finalTotal = subtotal + taxAmount - (inv.discount || 0);
    return { subtotal, finalTotal };
  }, [inv.items, inv.tax, inv.discount]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-4 md:p-8 border border-slate-200 flex flex-col max-h-[90vh]">
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        `}</style>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-[11px] uppercase tracking-widest text-indigo-600 flex items-center gap-2 italic">
            <Edit className="w-4 h-4"/> Invoice_Configuration
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-300"/></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({...inv, total: totals.finalTotal}); }} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-2"><MapPin size={10}/> Client_Entity</label>
              <input type="text" placeholder="Lookup client..." value={clientSearch} onFocus={() => setShowLookup(true)} onChange={(e) => setClientSearch(e.target.value)} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold uppercase" required />
              {showLookup && (
                <div className="absolute z-30 w-full bg-white border mt-1 rounded-xl shadow-2xl max-h-48 overflow-auto border-slate-100">
                  {clientList.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map((c) => (
                    <div key={c._id} onClick={() => {
                        setInv({...inv, client: c}); 
                        setClientSearch(c.name); 
                        setShowLookup(false);
                        toast.success(`Attached: ${c.name}`, { duration: 1500 });
                    }} className="p-3 hover:bg-indigo-50 cursor-pointer font-bold uppercase text-[10px] border-b border-slate-50 last:border-0 flex justify-between">
                      {c.name} <span className="text-slate-300">SELECT</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-2"><Coins size={10}/> Billing_Currency</label>
              <select value={inv.currency} onChange={(e) => {
                  setInv({...inv, currency: e.target.value});
                  toast(`Switched to ${e.target.value}`, { icon: '💱' });
                }} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 font-black outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all">
                {CURRENCIES.map(curr => <option key={curr.code} value={curr.code}>{curr.code} - {curr.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Date</label>
              <input type="date" value={inv.date} onChange={(e) => setInv({...inv, date: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Status</label>
              <select value={inv.status} onChange={(e) => setInv({...inv, status: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 font-black">
                <option value="Not Paid">Pending</option>
                <option value="Paid">Cleared</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Tax (%)</label>
              <input type="number" value={inv.tax} onChange={(e) => setInv({...inv, tax: Number(e.target.value)})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 outline-none font-mono" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service_Ledger</label>
              <button type="button" onClick={addItem} className="text-indigo-600 flex items-center gap-1 font-black text-[9px] uppercase hover:scale-105 transition-transform">
                <PlusCircle size={14}/> Add_Entry
              </button>
            </div>
            {inv.items.map((item, i) => (
              <div key={i} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200">
                <input type="text" placeholder="Description..." value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="w-full md:flex-1 bg-transparent text-[11px] outline-none font-bold uppercase placeholder:text-slate-300" required />
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} className="w-16 bg-white p-2.5 rounded-lg text-center font-mono border border-slate-200 text-[11px]" required />
                    <input type="number" placeholder="Price" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} className="flex-1 md:w-28 bg-white p-2.5 rounded-lg text-right font-mono border border-slate-200 text-[11px]" required />
                    {inv.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 size={16}/>
                    </button>
                    )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-3 shadow-xl">
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Total_Breakdown</span>
                <span>Values ({inv.currency})</span>
             </div>
             <div className="h-px bg-slate-800 w-full" />
             <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-slate-500">Net Subtotal</span>
                <span>{totals.subtotal.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-2"><Tags size={12}/> Applied Discount</span>
                <input type="number" value={inv.discount} onChange={(e) => setInv({...inv, discount: Number(e.target.value)})} className="w-24 bg-slate-800 border-none rounded-lg p-1.5 text-right font-mono text-white text-[11px] outline-none focus:ring-1 focus:ring-rose-500" />
             </div>
             <div className="flex justify-between items-center pt-2">
                <span className="text-[12px] font-black uppercase text-indigo-400">Grand Total</span>
                <span className="text-xl font-black tracking-tighter text-white">{inv.currency} {totals.finalTotal.toLocaleString()}</span>
             </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all">Authorize_And_Save</button>
        </form>
      </div>
    </div>
  );
};

export default Invoices;