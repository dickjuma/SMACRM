import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  Search, Printer, Trash2, Receipt, FileCheck, 
  RefreshCw, Download, ArrowDownLeft, ShieldCheck
} from "lucide-react";
const BASE_URL= process.env.REACT_APP_BACKEND_URL

const API_URL = `${BASE_URL}/invoices`;

// --- AUTHENTICATED AXIOS INSTANCE ---
const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- API FUNCTIONS ---
const fetchPaidInvoices = async () => {
  const response = await api.get(API_URL);
  // Filter for "Paid" status to represent Receipts
  return response.data.filter(inv => inv.status === "Paid");
};

const Receipts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const printRef = useRef();

  // --- QUERY: FETCH RECEIPTS ---
  const { 
    data: receipts = [], 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ["receipts"],
    queryFn: fetchPaidInvoices,
    onSuccess: (data) => {
      // Auto-select first receipt if none selected and data exists
      if (data.length > 0 && !selectedReceipt) {
        setSelectedReceipt(data[0]);
      }
    },
    onError: () => toast.error("Registry Sync Failed"),
  });

  // --- MUTATION: DELETE RECEIPT ---
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_URL}/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries(["receipts"]);
      if (selectedReceipt?._id === deletedId) setSelectedReceipt(null);
      toast.success("Record Archived");
    },
    onError: () => toast.error("Delete Protocol Failed"),
  });

  // --- PRINT HANDLER ---
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `SMA_RECEIPT_${selectedReceipt?._id?.slice(-6).toUpperCase()}`,
  });

  // --- PDF GENERATION ---
  const downloadPDF = async () => {
    if (!selectedReceipt) return;
    const toastId = toast.loading("Synthesizing PDF Document...");
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true,
        backgroundColor: "#ffffff"
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SMA_Receipt_${selectedReceipt._id?.slice(-6).toUpperCase()}.pdf`);
      toast.success("Certificate Downloaded", { id: toastId });
    } catch (error) {
      toast.error("PDF Engine Error", { id: toastId });
    }
  };

  const filteredReceipts = receipts.filter((inv) =>
    (inv.client?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    inv._id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#0F172A] overflow-hidden text-[11px] font-sans">
      <Toaster position="top-center" />
      
      {/* LEFT COLUMN: REGISTRY */}
      <div className="w-[360px] flex flex-col h-full border-r border-slate-800 shrink-0">
        <header className="p-4 shrink-0 border-b border-slate-800 bg-[#0F172A] z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-emerald-500 rounded text-[#0F172A]">
                <Receipt className="w-4 h-4" />
              </div>
              <h1 className="font-black uppercase tracking-widest text-white text-[10px]">Settlement_Registry</h1>
            </div>
            <button onClick={() => refetch()} className="p-1.5 text-slate-500 hover:text-white transition-colors">
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3" />
            <input 
              type="text" 
              placeholder="Search Ledger..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900/80 border border-slate-700 rounded text-[10px] text-slate-300 outline-none focus:border-emerald-500/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0F172A]">
          {isLoading ? (
            <div className="p-10 text-center animate-pulse text-slate-600 uppercase tracking-widest">Loading Registry...</div>
          ) : filteredReceipts.length === 0 ? (
            <p className="p-10 text-center text-slate-600 italic">No settled entries found.</p>
          ) : (
            filteredReceipts.map((inv) => (
              <div 
                key={inv._id} 
                onClick={() => setSelectedReceipt(inv)}
                className={`p-4 cursor-pointer border-b border-slate-800/40 transition-all flex items-center justify-between group ${selectedReceipt?._id === inv._id ? 'bg-slate-800/60 border-r-2 border-r-emerald-50' : 'hover:bg-slate-800/30'}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-500">#{inv._id?.slice(-6).toUpperCase()}</span>
                    <span className="text-[8px] px-1 bg-emerald-500/10 text-emerald-500 rounded font-black uppercase tracking-tighter">Settled</span>
                  </div>
                  <p className="font-black text-slate-200 uppercase tracking-tight truncate w-32">{inv.client?.name || "Unassigned"}</p>
                  <p className="text-[9px] text-slate-600 flex items-center gap-1"><ArrowDownLeft className="w-2 h-2" /> {inv.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-black text-emerald-400 text-xs">
                    {inv.items?.reduce((s,i)=>s+i.total,0).toLocaleString()}
                  </p>
                  <p className="text-[8px] text-slate-600 font-bold uppercase">{inv.currency}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: PREVIEW */}
      <main className="flex-1 flex flex-col h-full bg-[#F1F5F9] min-w-0">
        {selectedReceipt ? (
          <>
            <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-200 bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Document_Viewer</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-mono text-slate-500 border border-slate-200">ID: {selectedReceipt._id}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded font-bold text-[9px] hover:bg-emerald-600 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/10">
                  <Download className="w-3 h-3"/> PDF Export
                </button>
                <button onClick={handlePrint} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded text-slate-600 shadow-sm transition-all"><Printer className="w-3.5 h-3.5"/></button>
                <button 
                  onClick={() => { if(window.confirm("Archive record?")) deleteMutation.mutate(selectedReceipt._id) }} 
                  className="p-2 bg-white border border-slate-200 hover:text-red-500 rounded text-slate-400 shadow-sm transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar-light flex justify-center bg-[#F1F5F9]">
              <div ref={printRef} className="bg-white w-full max-w-[650px] shadow-xl shadow-slate-200/50 p-12 text-slate-900 border border-slate-200 rounded-sm mb-10 h-fit">
                
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                  <div className="space-y-2">
                    <h2 className="text-sm font-black tracking-tighter bg-slate-900 text-white px-2 py-1 inline-block">SMA_SYSTEMS</h2>
                    <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">Transaction Certificate</p>
                  </div>
                  <div className="text-right">
                    <h1 className="text-xl font-black uppercase tracking-tighter mb-1">Official Receipt</h1>
                    <p className="text-[9px] font-bold text-slate-400 italic">Verify_Key: {selectedReceipt._id?.toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="p-4 bg-slate-50 rounded border border-slate-100">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Account Holder:</p>
                        <p className="text-xs font-black uppercase text-slate-900">{selectedReceipt.client?.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">{selectedReceipt.client?.email}</p>
                    </div>
                    <div className="text-right flex flex-col justify-center items-end">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Security Hash:</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-black text-[9px] uppercase italic">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified: {selectedReceipt.date}
                        </div>
                    </div>
                </div>

                <table className="w-full mb-8">
                  <thead>
                    <tr className="text-[9px] font-black text-slate-900 uppercase border-b border-slate-200">
                      <th className="py-3 text-left">Item Description</th>
                      <th className="py-3 text-center w-16">Qty</th>
                      <th className="py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReceipt.items?.map((item, i) => (
                      <tr key={i} className="text-slate-700">
                        <td className="py-4 font-bold text-[10px] uppercase">{item.description}</td>
                        <td className="py-4 text-center font-mono">{item.quantity}</td>
                        <td className="py-4 text-right font-black text-slate-900">
                          {selectedReceipt.currency} {item.total?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 bg-slate-50">
                      <td colSpan="2" className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Grand Total Settlement</td>
                      <td className="py-4 px-4 text-right text-base font-black italic text-slate-900">
                        {selectedReceipt.currency} {selectedReceipt.items?.reduce((s,i)=>s+i.total,0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-20 pt-6 border-t border-slate-100 flex justify-between items-center opacity-40 grayscale">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-3 h-3 text-emerald-600" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Authorized Ledger Entry // 2025</span>
                  </div>
                  <span className="text-[8px] font-mono uppercase">Node_Clock: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <Receipt className="w-10 h-10 opacity-10 mb-2" />
            <p className="text-[9px] font-black uppercase tracking-[0.3em]">Select a record to view certificate</p>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
        
        .custom-scrollbar-light::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: #F1F5F9; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}} />
    </div>
  );
};

export default Receipts;