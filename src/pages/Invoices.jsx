import React, { useState, useRef } from "react";
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
  PlusCircle, Minus
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

const Invoices = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const printRef = useRef();

  const handlePrintTrigger = useReactToPrint({
    content: () => printRef.current,
  });

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });

  // --- OPTIMIZED DOWNLOAD FUNCTION (Smaller File Size) ---
  const downloadPDF = async (invoice) => {
    if (!invoice) return;
    const toastId = toast.loading("Compressing PDF...");
    
    if (!viewing || viewing._id !== invoice._id) {
        setViewing(invoice);
    }

    setTimeout(async () => {
      try {
        const element = printRef.current;
        if (!element) throw new Error("Template not found");

        const canvas = await html2canvas(element, {
          scale: 2, // Reduced from 3 to 2 for significantly smaller size
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 794,
          height: element.scrollHeight,
        });

        // Use JPEG with 0.7 compression instead of heavy PNG
        const imgData = canvas.toDataURL("image/jpeg", 0.7); 
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`SMA_INV_${invoice._id.slice(-6).toUpperCase()}.pdf`);
        
        toast.success("Download Ready", { id: toastId });
      } catch (err) {
        toast.error("Failed to generate PDF", { id: toastId });
      }
    }, 500);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, client: data.client?._id || data.client };
      return data._id ? api.put(`${API_URL}/${data._id}`, payload) : api.post(API_URL, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["invoices"]);
      toast.success("Database Synchronized");
      setEditing(null); setAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_URL}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["invoices"]);
      toast.success("Entry Deleted");
    },
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
    onSuccess: () => queryClient.invalidateQueries(["invoices"]),
  });

  const filteredInvoices = invoices.filter(inv => 
    (inv.client?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-[12px] text-slate-700 font-sans overflow-hidden">
      <Toaster position="top-right" />
      
      <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg"><ShieldCheck className="w-5 h-5 text-white"/></div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase italic">SMA_CORE</h1>
              <p className="text-[9px] text-indigo-500 font-black uppercase tracking-[0.2em]">Management System v3.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="Search Invoices..." className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 w-72 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setAdding(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 uppercase tracking-widest hover:bg-black transition-all">
              <Plus className="w-4 h-4"/> New Invoice
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest animate-pulse italic">Loading Ledger Data...</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-5">Client_Name</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5 text-right">Total</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-6 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 uppercase italic">{inv.client?.name}</p>
                        <p className="text-[8px] text-slate-400 font-mono">#{inv._id.slice(-6).toUpperCase()}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{inv.date}</td>
                      <td className="px-6 py-4 text-right font-black">
                        {inv.currency} {inv.items.reduce((a, b) => a + b.total, 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => statusMutation.mutate(inv)} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${inv.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
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
  const total = invoice.items.reduce((acc, i) => acc + i.total, 0);
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl shadow-2xl rounded-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex-1 overflow-y-auto" id="invoice-capture-area" ref={ref}>
          <div className="bg-slate-900 p-10 text-white flex justify-between items-start border-b-4 border-indigo-600">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600 p-2 rounded-lg"><ShieldCheck className="w-6 h-6 text-white"/></div>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">SMA TECHNOLOGIES</h2>
              </div>
              <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest"><Phone className="w-3 h-3 text-indigo-400"/> +254 719 832 719</p>
              <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 tracking-wider"><Mail className="w-3 h-3 text-indigo-400"/> dickjuma292@gmail.com</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-2"><MapPin className="w-3 h-3"/> Location</p>
                <p className="text-[11px] font-bold text-white">Ruiru, Kenya</p>
            </div>
          </div>
          <div className="p-12 bg-white">
            <div className="flex justify-between items-start mb-16">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Invoice_To</p>
                <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{invoice.client?.name}</p>
                <p className="text-[11px] text-slate-500 mt-1 uppercase">{invoice.client?.email || "verified_account"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold text-slate-900 uppercase">SMA_INV_{invoice._id.slice(-8).toUpperCase()}</p>
                <p className="text-xs font-mono text-slate-500 mt-1">DATE: {invoice.date}</p>
              </div>
            </div>
            <table className="w-full text-[12px] mb-12 border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-900 text-left">
                  <th className="py-4">Item_Description</th>
                  <th className="py-4 text-center w-24">Quantity</th>
                  <th className="py-4 text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 border-b-2 border-slate-900">
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-6 font-black text-slate-800 uppercase text-[11px]">{item.description}</td>
                    <td className="py-6 text-center text-slate-500 font-mono font-bold italic">x{item.quantity}</td>
                    <td className="py-6 text-right font-black text-slate-900 tracking-tighter">{invoice.currency} {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" className="pt-10 text-[10px] font-black uppercase text-slate-400 text-right pr-10">Grand_Total</td>
                  <td className="pt-10 text-right text-3xl font-black text-slate-900 tracking-tighter">{invoice.currency} {total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="bg-slate-50 px-8 py-5 flex justify-end gap-3 border-t shrink-0">
          <button onClick={onPrint} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">Print</button>
          <button onClick={onDownload} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg shadow-indigo-600/20">Download_PDF</button>
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase">Close</button>
        </div>
      </div>
    </div>
  );
});

// --- MODAL: ADD/EDIT (Optimized with Add Item Button) ---
const AddEditModal = ({ invoice, onSave, onClose }) => {
  const [inv, setInv] = useState(invoice || {
    client: null, 
    date: new Date().toISOString().slice(0, 10),
    currency: "USD", 
    status: "Not Paid",
    items: [{ description: "", quantity: 1, price: 0, total: 0 }]
  });

  const [clientSearch, setClientSearch] = useState(invoice?.client?.name || "");
  const [showLookup, setShowLookup] = useState(false);
  const { data: clientList = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const addItem = () => {
    setInv({
      ...inv,
      items: [...inv.items, { description: "", quantity: 1, price: 0, total: 0 }]
    });
  };

  const removeItem = (index) => {
    if (inv.items.length > 1) {
      const newItems = inv.items.filter((_, i) => i !== index);
      setInv({ ...inv, items: newItems });
    }
  };

  const updateItem = (idx, field, val) => {
    const items = [...inv.items];
    const value = field === "description" ? val : Number(val);
    items[idx][field] = value;
    items[idx].total = items[idx].quantity * (items[idx].price || 0);
    setInv({ ...inv, items });
  };

  const grandTotal = inv.items.reduce((acc, i) => acc + (i.total || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-7 border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-[10px] uppercase tracking-widest text-indigo-600 italic">Invoice_Config</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-300"/></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({...inv, total: grandTotal}); }} className="space-y-5 overflow-y-auto pr-2">
          {/* Client Selection */}
          <div className="relative">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Client_Assignee</label>
            <input type="text" placeholder="Select Client..." value={clientSearch} onFocus={() => setShowLookup(true)} onChange={(e) => setClientSearch(e.target.value)} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/10" required />
            {showLookup && (
              <div className="absolute z-30 w-full bg-white border mt-1 rounded-xl shadow-xl max-h-40 overflow-auto border-slate-100">
                {clientList.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map((c) => (
                  <div key={c._id} onClick={() => {setInv({...inv, client: c}); setClientSearch(c.name); setShowLookup(false);}} className="p-3 hover:bg-slate-50 cursor-pointer font-bold uppercase text-[10px] border-b border-slate-50 last:border-0">
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Date</label>
              <input type="date" value={inv.date} onChange={(e) => setInv({...inv, date: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Status</label>
              <select value={inv.status} onChange={(e) => setInv({...inv, status: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 font-black">
                <option value="Not Paid">Not Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black text-slate-400 uppercase">Billing_Items</label>
              <button type="button" onClick={addItem} className="text-indigo-600 flex items-center gap-1 font-black text-[9px] uppercase hover:underline">
                <PlusCircle size={14}/> Add Item
              </button>
            </div>
            {inv.items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <input type="text" placeholder="Item" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="flex-1 bg-transparent text-[11px] outline-none font-bold uppercase" required />
                <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} className="w-12 bg-white p-2 rounded-lg text-center font-mono border border-slate-200" required />
                <input type="number" placeholder="Price" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} className="w-20 bg-white p-2 rounded-lg text-right font-mono border border-slate-200" required />
                {inv.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14}/>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
             <span className="text-[10px] font-black text-slate-400 uppercase">Total_Due:</span>
             <span className="text-lg font-black text-slate-900">{inv.currency} {grandTotal.toLocaleString()}</span>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg active:scale-95 transition-transform">Save_Invoice</button>
        </form>
      </div>
    </div>
  );
};

export default Invoices;