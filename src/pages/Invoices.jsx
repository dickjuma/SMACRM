import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import { 
  Eye, Edit, Trash2, Download, Printer, 
  Plus, RefreshCw, X, Search, FileText,
  Globe, Mail, MapPin, CheckCircle2, AlertCircle
} from "lucide-react";

const API_URL = "http://localhost:5000/api/invoices";
const CLIENTS_API_URL = "http://localhost:5000/api/clients";

// --- AUTHENTICATION LOGIC ---
const api = axios.create();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      toast.error("Session expired. Please login again.");
      // Optional: window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const printRef = useRef();

  const handlePrintTrigger = useReactToPrint({
    content: () => printRef.current,
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(API_URL);
      setInvoices(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Network sync failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const toggleStatus = async (invoice) => {
    const newStatus = invoice.status === "Paid" ? "Not Paid" : "Paid";
    const toastId = toast.loading(`Updating status to ${newStatus}...`);
    
    try {
      const payload = { 
        ...invoice, 
        status: newStatus,
        client: invoice.client?._id || invoice.client 
      };
      
      await api.put(`${API_URL}/${invoice._id}`, payload);
      setInvoices(prev => prev.map(inv => inv._id === invoice._id ? { ...inv, status: newStatus } : inv));
      toast.success(`Marked as ${newStatus}`, { id: toastId });
    } catch (error) {
      toast.error("Status update failed", { id: toastId });
    }
  };

  const downloadPDF = async (invoice) => {
    const toastId = toast.loading("Generating High-Res PDF...");
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SMA_INV_${invoice._id.slice(-6).toUpperCase()}.pdf`);
      toast.success("PDF Downloaded", { id: toastId });
    } catch (error) {
      toast.error("PDF Export failed", { id: toastId });
    }
  };

  const handleSave = async (invoiceData) => {
    const isEdit = invoiceData._id;
    const toastId = toast.loading("Processing...");
    try {
      const payload = { ...invoiceData, client: invoiceData.client?._id || invoiceData.client };
      const response = await (isEdit 
        ? api.put(`${API_URL}/${isEdit}`, payload)
        : api.post(API_URL, payload));
      
      if (isEdit) {
        setInvoices(invoices.map(inv => (inv._id === response.data._id ? response.data : inv)));
        toast.success("Updated", { id: toastId });
      } else {
        setInvoices([response.data, ...invoices]);
        toast.success("Created", { id: toastId });
      }
      setEditing(null); setAdding(false);
    } catch (error) {
      toast.error("Save failed", { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Confirm delete?")) {
      try {
        await api.delete(`${API_URL}/${id}`);
        setInvoices(invoices.filter(inv => inv._id !== id));
        toast.success("Deleted");
      } catch (error) { toast.error("Delete failed"); }
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    (inv.client?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] text-[12px] text-slate-700 font-sans overflow-hidden">
      <Toaster position="top-right" />
      
      <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase">SMA_LEDGER</h1>
              <p className="text-[9px] text-indigo-500 font-black uppercase tracking-[0.2em]">Enterprise Core v3.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Account..." 
                className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 w-72 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button onClick={fetchInvoices} className="p-2.5 border bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setAdding(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/20">
              <Plus className="w-4 h-4"/> New Entry
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 backdrop-blur sticky top-0 z-10 border-b border-slate-200">
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  <th className="px-6 py-5">Recipient_Account</th>
                  <th className="px-6 py-5">Date_Logged</th>
                  <th className="px-6 py-5 text-right">Settlement_Amount</th>
                  <th className="px-6 py-5 text-center">Status</th>
                  <th className="px-6 py-5 text-right">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900 uppercase italic tracking-tighter text-[11px]">{inv.client?.name}</p>
                      <p className="text-[8px] text-slate-400 font-mono">REF_{inv._id.slice(-6).toUpperCase()}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{inv.date}</td>
                    <td className="px-6 py-4 text-right font-black">
                      <span className="text-[9px] text-slate-300 mr-1 font-normal">{inv.currency}</span>
                      {inv.items.reduce((a, b) => a + b.total, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleStatus(inv)} className="group/btn relative outline-none">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5 transition-all active:scale-95 ${
                          inv.status === "Paid" 
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200" 
                            : "bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200"
                        }`}>
                          {inv.status === "Paid" ? <CheckCircle2 className="w-2.5 h-2.5"/> : <AlertCircle className="w-2.5 h-2.5"/>}
                          {inv.status}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewing(inv)} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"><Eye className="w-4 h-4"/></button>
                        <button onClick={() => downloadPDF(inv)} className="p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"><Download className="w-4 h-4"/></button>
                        <button onClick={() => setEditing(inv)} className="p-2 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(inv._id)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {viewing && <InvoiceViewModal invoice={viewing} ref={printRef} onClose={() => setViewing(null)} onPrint={handlePrintTrigger} onDownload={() => downloadPDF(viewing)} />}
      {(editing || adding) && <AddEditModal invoice={editing} onSave={handleSave} onClose={() => {setEditing(null); setAdding(false);}} />}
    </div>
  );
};

// --- VIEW MODAL ---
const InvoiceViewModal = React.forwardRef(({ invoice, onClose, onPrint, onDownload }, ref) => {
  const total = invoice.items.reduce((acc, i) => acc + i.total, 0);
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl shadow-2xl rounded-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex-1 overflow-y-auto p-0" ref={ref}>
          <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <h2 className="text-3xl font-black tracking-tighter mb-1">SMA_SYSTEMS</h2>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Official Transaction Record</p>
            </div>
            <div className="text-right z-10 text-[9px] font-bold text-slate-300">
                <span className="flex items-center justify-end gap-2"><MapPin className="w-3 h-3"/> 123 Business Way, Nairobi, KE</span>
                <span className="flex items-center justify-end gap-2"><Globe className="w-3 h-3"/> www.smasystems.com</span>
                <span className="flex items-center justify-end gap-2"><Mail className="w-3 h-3"/> finance@smasystems.com</span>
            </div>
          </div>

          <div className="p-12 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] pointer-events-none opacity-[0.03]">
              <h1 className="text-[120px] font-black uppercase">{invoice.status}</h1>
            </div>

            <div className="flex justify-between items-start mb-16">
              <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Billed_To</p>
                <p className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{invoice.client?.name}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{invoice.client?.email || "Account Holder"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Invoice_Details</p>
                <p className="text-xs font-mono font-bold text-slate-900">ID: #{invoice._id.slice(-8).toUpperCase()}</p>
                <p className="text-xs font-mono font-bold text-slate-900">DATE: {invoice.date}</p>
                <div className={`mt-3 inline-block px-3 py-1 rounded-md text-[9px] font-black uppercase border ${
                  invoice.status === 'Paid' ? 'border-emerald-200 text-emerald-600' : 'border-amber-200 text-amber-600'
                }`}>
                  Status: {invoice.status}
                </div>
              </div>
            </div>

            <table className="w-full text-[12px] mb-12">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-900">
                  <th className="py-4 text-left">Service_Description</th>
                  <th className="py-4 text-center w-24">Qty</th>
                  <th className="py-4 text-right w-32">Line_Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 border-b-2 border-slate-900">
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-5 font-bold text-slate-800 uppercase tracking-tight">{item.description}</td>
                    <td className="py-5 text-center text-slate-500 font-mono italic">x{item.quantity}</td>
                    <td className="py-5 text-right font-black text-slate-900 tracking-tighter">
                      <span className="text-[10px] text-slate-300 mr-2">{invoice.currency}</span>
                      {item.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" className="pt-10 pb-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 text-right pr-10">Grand_Total_Due</td>
                  <td className="pt-10 pb-2 text-right text-3xl font-black text-slate-900 tracking-tighter">
                    <span className="text-xs font-normal mr-2">{invoice.currency}</span>
                    {total.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        <div className="bg-white px-8 py-5 flex justify-end gap-3 border-t border-slate-100 shrink-0">
          <button onClick={onPrint} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Printer className="w-4 h-4"/> Hardcopy
          </button>
          <button onClick={onDownload} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">
            <Download className="w-4 h-4"/> Download PDF
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">Dismiss</button>
        </div>
      </div>
    </div>
  );
});

// --- ADD/EDIT MODAL ---
const AddEditModal = ({ invoice, onSave, onClose }) => {
  const [inv, setInv] = useState(invoice || {
    client: null, 
    date: new Date().toISOString().slice(0, 10),
    currency: "USD", 
    status: "Not Paid",
    taxRate: 0, 
    items: [{ description: "", quantity: 1, price: 0, total: 0 }]
  });

  const [clientSearch, setClientSearch] = useState(invoice?.client?.name || "");
  const [clientList, setClientList] = useState([]);
  const [showLookup, setShowLookup] = useState(false);

  const currencies = [
    { code: "USD", symbol: "$" },
    { code: "KES", symbol: "KSh" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "UGX", symbol: "USh" },
    { code: "TZS", symbol: "TSh" }
  ];

  useEffect(() => {
    // Using authenticated api instance
    api.get(CLIENTS_API_URL).then(res => setClientList(res.data)).catch(() => toast.error("Client fetch error"));
  }, []);

  const updateItem = (idx, field, val) => {
    const items = [...inv.items];
    const value = field === "description" ? val : Number(val);
    items[idx][field] = value;
    items[idx].total = items[idx].quantity * (items[idx].price || 0);
    setInv({ ...inv, items });
  };

  const subtotal = inv.items.reduce((acc, i) => acc + (i.total || 0), 0);
  const taxAmount = subtotal * (inv.taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-7 border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-8 shrink-0">
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-indigo-600">
            {invoice ? 'Edit Ledger Entry' : 'New Ledger Entry'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-300"/>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({...inv, total: grandTotal}); }} className="space-y-6 overflow-y-auto pr-1 custom-scrollbar">
          <div className="relative">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Target_Account</label>
            <input 
              type="text" 
              placeholder="Search existing client..."
              value={clientSearch}
              onFocus={() => setShowLookup(true)}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-xl text-[11px] outline-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
              required
            />
            {showLookup && (
              <div className="absolute z-30 w-full bg-white border border-slate-200 mt-2 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                {clientList.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map((c) => (
                  <div 
                    key={c._id} 
                    onClick={() => {setInv({...inv, client: c}); setClientSearch(c.name); setShowLookup(false);}}
                    className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 text-[11px] font-bold text-slate-700 uppercase"
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Entry_Date</label>
              <input type="date" value={inv.date} onChange={(e) => setInv({...inv, date: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 focus:bg-white outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Payment_Status</label>
              <select value={inv.status} onChange={(e) => setInv({...inv, status: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 font-black outline-none">
                <option value="Not Paid">Not Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Currency_Asset</label>
              <select value={inv.currency} onChange={(e) => setInv({...inv, currency: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 font-black outline-none">
                {currencies.map(curr => <option key={curr.code} value={curr.code}>{curr.code} ({curr.symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Tax_Rate (%)</label>
              <input type="number" value={inv.taxRate} onChange={(e) => setInv({...inv, taxRate: Number(e.target.value)})} className="w-full border border-slate-200 p-3 rounded-xl text-[11px] bg-slate-50 focus:bg-white outline-none font-bold" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase block tracking-widest">Line_Items</label>
            <div className="max-h-44 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {inv.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 group">
                  <input type="text" placeholder="Item" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="flex-1 bg-transparent text-[11px] outline-none font-bold placeholder:text-slate-300" required />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} className="w-12 bg-white border border-slate-200 p-2 rounded-lg text-center text-[10px]" required />
                  <input type="number" placeholder="Price" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-right text-[10px]" required />
                  <button type="button" onClick={() => setInv({...inv, items: inv.items.filter((_, idx) => idx !== i)})} className="p-1 hover:text-red-600 opacity-30 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setInv({...inv, items: [...inv.items, {description: "", quantity: 1, price: 0, total: 0}]})} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1 hover:text-indigo-800 transition-all">
              <Plus className="w-3 h-3"/> Add Line Item
            </button>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 text-white">
            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-2">
              <span>Subtotal</span>
              <span>{inv.currency} {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-4">
              <span>Tax ({inv.taxRate}%)</span>
              <span>{inv.currency} {taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-slate-800 pt-4">
              <span className="text-[10px] font-black uppercase tracking-widest">Total_Due</span>
              <span className="text-xl font-black">{inv.currency} {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-black transition-all shrink-0">
            Commit Entry
          </button>
        </form>
      </div>
    </div>
  );
};

export default Invoices;