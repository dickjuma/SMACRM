import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useReactToPrint } from "react-to-print";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  Search, Printer, Trash2, Receipt, FileCheck, 
  RefreshCw, Download, ArrowLeft, ShieldCheck, 
  Globe, Mail, MapPin, CheckCircle2
} from "lucide-react";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BASE_URL}/invoices`;

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const fetchPaidInvoices = async () => {
  const response = await api.get(API_URL);
  return response.data.filter(inv => inv.status === "Paid");
};

const Receipts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isMobileList, setIsMobileList] = useState(true);
  const printRef = useRef();

  const { data: receipts = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["receipts"],
    queryFn: fetchPaidInvoices,
    onSuccess: (data) => {
      if (data.length > 0 && !selectedReceipt && window.innerWidth > 768) {
        setSelectedReceipt(data[0]);
      }
    },
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setIsMobileList(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setIsMobileList(false);
  };

  // --- OPTIMIZED PDF GENERATION ---
  const downloadPDF = async () => {
    if (!selectedReceipt) return;
    const toastId = toast.loading("Compressing & Exporting...");
    
    try {
      const element = printRef.current;
      
      // 1. Capture at scale 2 (Balance between quality and size)
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      // 2. Convert to JPEG with 0.7 compression (70% quality)
      const imgData = canvas.toDataURL("image/jpeg", 0.7); 
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // 3. Add image with compression flag
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      pdf.save(`RECEIPT_${selectedReceipt._id?.slice(-6).toUpperCase()}.pdf`);
      toast.success("Optimized PDF Downloaded", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Compression Engine Error", { id: toastId });
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `SMA_RECEIPT_${selectedReceipt?._id?.slice(-6).toUpperCase()}`,
  });

  const filteredReceipts = receipts.filter((inv) =>
    (inv.client?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    inv._id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#0F172A] overflow-hidden text-[11px] font-sans">
      <Toaster position="top-center" />
      
      {/* LEFT COLUMN: REGISTRY */}
      <aside className={`${isMobileList ? 'flex' : 'hidden'} md:flex w-full md:w-[380px] flex-col h-full border-r border-slate-800 shrink-0 bg-[#0F172A]`}>
        <header className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-[#0F172A] shadow-lg shadow-emerald-500/20">
                <Receipt size={18} />
              </div>
              <div>
                <h1 className="font-black uppercase tracking-widest text-white text-[10px] leading-none">Settlement</h1>
                <span className="text-[8px] text-slate-500 font-bold tracking-tighter uppercase">Global Ledger</span>
              </div>
            </div>
            <button onClick={() => refetch()} className="p-2 text-slate-500 hover:text-white bg-slate-800/40 rounded-full transition-all">
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
            <input 
              type="text" 
              placeholder="Search by client or ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-300 focus:border-emerald-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredReceipts.map((inv) => (
            <div 
              key={inv._id} 
              onClick={() => selectReceipt(inv)}
              className={`p-5 cursor-pointer border-b border-slate-800/40 transition-all flex items-center justify-between group
                ${selectedReceipt?._id === inv._id ? 'bg-indigo-600/10 border-r-4 border-r-emerald-500' : 'hover:bg-slate-800/40'}`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500 font-bold">#{inv._id?.slice(-6).toUpperCase()}</span>
                  <span className="text-[7px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-black uppercase tracking-wider border border-emerald-500/20">Paid</span>
                </div>
                <p className="font-black text-slate-200 uppercase tracking-tight text-xs">{inv.client?.name || "Private Client"}</p>
                <p className="text-[9px] text-slate-500 flex items-center gap-1.5 font-medium">{inv.date}</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-black text-white text-sm">
                  {inv.items?.reduce((s,i)=>s+i.total,0).toLocaleString()}
                </p>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{inv.currency}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT COLUMN: PREVIEW */}
      <main className={`${!isMobileList ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full bg-[#F8FAFC] min-w-0 relative`}>
        {selectedReceipt ? (
          <>
            <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileList(true)} className="md:hidden p-2 text-slate-600 bg-slate-100 rounded-lg">
                  <ArrowLeft size={18} />
                </button>
                <div className="hidden sm:block">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Transaction_Receipt</span>
                  <p className="text-[10px] font-mono text-slate-600 font-bold">Voucher: {selectedReceipt._id?.toUpperCase()}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button onClick={downloadPDF} className="flex items-center gap-2 px-3 md:px-5 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] hover:bg-emerald-600 transition-all uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-95">
                  <Download size={14}/> <span className="hidden sm:inline">Export PDF</span>
                </button>
                <button onClick={handlePrint} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-all shadow-sm active:scale-95"><Printer size={16}/></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar-light bg-slate-100/50">
              <div ref={printRef} className="bg-white w-full max-w-[750px] mx-auto shadow-2xl shadow-slate-300/50 rounded-2xl overflow-hidden border border-white">
                
                <div className="p-8 md:p-12 bg-slate-950 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500 rounded-lg"><ShieldCheck className="text-slate-950" size={20}/></div>
                        <h2 className="text-xl font-black tracking-tighter">SMA.CORE SYSTEMS</h2>
                      </div>
                      <div className="flex flex-col gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Globe size={10}/> www.smacore-enterprise.com</span>
                        <span className="flex items-center gap-2"><Mail size={10}/> billing@smacore.systems</span>
                        <span className="flex items-center gap-2"><MapPin size={10}/> HQ // Tech District, Nairobi 2025</span>
                      </div>
                    </div>
                    <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-emerald-500/30 pl-6 md:pr-6">
                      <h1 className="text-3xl font-black uppercase tracking-tighter text-emerald-500 leading-none mb-2">Receipt</h1>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Settlement Date: {selectedReceipt.date}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Ref: #RCT-{selectedReceipt._id?.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Issued To:</p>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-sm font-black uppercase text-slate-900">{selectedReceipt.client?.name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">{selectedReceipt.client?.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-end items-start md:items-end">
                      <div className="transform -rotate-12 border-4 border-emerald-500/50 text-emerald-500/50 px-4 py-1 rounded-lg font-black text-2xl uppercase tracking-tighter opacity-80 pointer-events-none mb-4 inline-block">
                        Processed
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">
                        <CheckCircle2 size={14} /> Total Settled
                      </div>
                    </div>
                  </div>

                  <table className="w-full mb-12">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-900 uppercase border-b-2 border-slate-900">
                        <th className="py-4 text-left">Description</th>
                        <th className="py-4 text-center w-24">Qty</th>
                        <th className="py-4 text-right w-32">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReceipt.items?.map((item, i) => (
                        <tr key={i} className="text-slate-700">
                          <td className="py-5">
                            <p className="font-black text-[11px] uppercase text-slate-900 leading-none">{item.description}</p>
                          </td>
                          <td className="py-5 text-center font-mono font-bold text-slate-500">{item.quantity}</td>
                          <td className="py-5 text-right font-black text-slate-900 text-[11px]">
                            {selectedReceipt.currency} {item.total?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 bg-slate-50">
                        <td colSpan="2" className="py-6 px-6 text-xs font-black uppercase tracking-[0.2em] text-slate-600">Final Transaction Total</td>
                        <td className="py-6 px-6 text-right text-lg font-black text-slate-950">
                          {selectedReceipt.currency} {selectedReceipt.items?.reduce((s,i)=>s+i.total,0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                   <span>SMA_SYSTEMS // SECURE_LEDGER // 2025</span>
                   <span className="flex items-center gap-1"><ShieldCheck size={10}/> Encrypted Node</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-6 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6">
               <Receipt size={40} className="text-slate-200" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Select registry entry to preview</p>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar-light::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default Receipts;