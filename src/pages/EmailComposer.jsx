import React, { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast, { Toaster } from 'react-hot-toast';
import { 
  Send, Users, Mail, FileText, Check, Paperclip, 
  Briefcase, Loader2, Receipt, ShieldCheck, 
  ChevronRight, Hash, X, Search, Filter, AlertCircle, Lock, Power, PowerOff
} from "lucide-react";

const EmailComposer = () => {
  const queryClient = useQueryClient();

  // --- UI STATE (STRICTLY PRESERVED) ---
  const [mode, setMode] = useState("single");
  const [activeTab, setActiveTab] = useState("Invoices");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  // --- TANSTACK: ERROR HANDLER ---
  const handleSystemError = useCallback((error) => {
    const status = error.status || 500;
    const message = error.message || "SYSTEM_ERROR";

    if (status === 401 || message === "SESSION_EXPIRED") {
      toast.error((t) => (
        <span className="flex flex-col gap-1">
          <b className="text-red-400">SESSION_EXPIRED</b>
          <span className="text-[9px]">Re-authenticate to access the finance registry.</span>
          <button onClick={() => window.location.href = '/login'} className="mt-2 bg-red-500/20 border border-red-500/40 text-red-400 py-1 rounded text-[8px] font-black uppercase">
            Authorize Login
          </button>
        </span>
      ), { duration: 6000 });
    } else if (status === 403) {
      toast.error("ACCESS_FORBIDDEN: Administrative clearance required.", { icon: <Lock size={14} className="text-red-500" /> });
    } else {
      toast.error(message, { icon: <AlertCircle size={14} className="text-amber-500" /> });
    }
  }, []);

  // --- TANSTACK: DATA FETCHING ---
  const { data: registry = { Invoices: [], Quotations: [], Receipts: [], Services: [], Clients: [] }, isLoading } = useQuery({
    queryKey: ['financeRegistry'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch("http://localhost:5000/api/finance/registry?limit=1000", {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      });
      if (response.status === 401) throw { status: 401, message: "SESSION_EXPIRED" };
      if (!response.ok) throw { status: response.status, message: "REGISTRY_LINK_FAILED" };
      return response.json();
    },
    onError: (err) => handleSystemError(err)
  });

  // --- TANSTACK: DISPATCH MUTATION ---
  const dispatchMutation = useMutation({
    mutationFn: async (formData) => {
      const token = localStorage.getItem('token');
      const response = await fetch("http://localhost:5000/api/finance/dispatch", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData 
      });
      if (!response.ok) {
        const result = await response.json();
        throw { status: response.status, message: result.error || result.message || "GATEWAY_REJECTION" };
      }
      return response.json();
    },
    onMutate: () => {
      setStatus('sending');
      return toast.loading("INITIALIZING_SECURE_SMTP_RELAY...");
    },
    onSuccess: (data, variables, context) => {
      toast.success("DISPATCH_SEQUENCE_COMPLETE", { id: context });
      setStatus('success');
      setAttachedFile(null);
    },
    onError: (err, variables, context) => {
      toast.dismiss(context);
      handleSystemError(err);
      setStatus('idle');
    }
  });

  // --- LOGIC (PRESERVED) ---
  const filteredClients = useMemo(() => {
    return (registry.Clients || []).filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [registry.Clients, clientSearch]);

  const filteredDocuments = useMemo(() => {
    const docs = registry[activeTab] || [];
    if (!clientSearch) return docs;
    return docs.filter(doc => 
      (doc.client?.name || doc.name || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
      (doc._id || "").toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [registry, activeTab, clientSearch]);

  const toggleAllVisible = () => {
    const visibleEmails = filteredClients.map(c => c.email);
    const areAllVisibleSelected = visibleEmails.every(email => selectedClients.includes(email));
    if (areAllVisibleSelected) {
      setSelectedClients(prev => prev.filter(email => !visibleEmails.includes(email)));
      toast.success("VISIBLE_NODES_REMOVED");
    } else {
      setSelectedClients(prev => [...new Set([...prev, ...visibleEmails])]);
      toast.success(`INDEXED_${visibleEmails.length}_RECIPIENTS`, { icon: <Users size={12}/> });
    }
  };

  const toggleClient = (email) => {
    setSelectedClients(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const handleDocSelect = (doc) => {
    setSelectedDoc(doc);
    setAttachedFile(null); 
    const type = activeTab.endsWith('s') ? activeTab.slice(0, -1) : activeTab;
    const clientName = doc.client?.name || doc.name || "Valued Client";
    setSubject(`${type.toUpperCase()} #${doc._id.slice(-6).toUpperCase()} | ${clientName}`);
    let body = `Dear ${clientName},\n\nPlease find the ${type.toLowerCase()} documentation attached for your records.`;
    if (type === 'Receipt') body = `Dear ${clientName},\n\nThank you for your payment. Attached is your official receipt.`;
    setMessage(`${body}\n\nOur team is available should you require further clarification.\n\nRegards,\nFinance Operations\nSMA Systems`);
    toast.success("SOURCE_OBJECT_LOADED", { duration: 1000 });
  };

  // --- DISPATCH ENGINE ---
  const handleSend = async () => {
    if (mode === "single" && !selectedDoc) return toast.error("VALIDATION_ERROR: SELECT_SOURCE_OBJECT");
    if (mode === "bulk" && selectedClients.length === 0) return toast.error("VALIDATION_ERROR: NO_TARGET_NODES");

    if (mode === "bulk") {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-white uppercase">Confirm_Batch_Dispatch: {selectedClients.length} Recipients?</p>
          <div className="flex gap-2">
            <button onClick={() => { toast.dismiss(t.id); executeDispatch(); }} className="bg-emerald-500 px-3 py-1 rounded text-[8px] font-black uppercase text-slate-900">Execute</button>
            <button onClick={() => toast.dismiss(t.id)} className="bg-slate-700 px-3 py-1 rounded text-[8px] font-black uppercase text-white">Cancel</button>
          </div>
        </div>
      ), { duration: 5000, icon: <AlertCircle className="text-amber-500" /> });
      return;
    }
    executeDispatch();
  };

  const executeDispatch = () => {
    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("subject", subject);
    formData.append("message", message);
    const singularType = activeTab.endsWith('s') ? activeTab.slice(0, -1) : activeTab;
    formData.append("type", singularType);

    if (mode === "single") {
      formData.append("docId", selectedDoc._id);
      formData.append("recipient", selectedDoc.client?.email || selectedDoc.email);
    } else {
      formData.append("recipients", JSON.stringify(selectedClients));
    }
    if (attachedFile) formData.append("file", attachedFile);

    dispatchMutation.mutate(formData);
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0F172A] gap-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <span className="text-[10px] font-black text-slate-500 tracking-[0.5em]">SECURE_HANDSHAKE_INITIALIZING</span>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#0F172A] flex flex-col overflow-hidden text-slate-300 font-sans text-[10px] antialiased">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', fontSize: '10px', border: '1px solid #334155', borderRadius: '4px', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' } }} />
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setAttachedFile(e.target.files[0])} />
      
      <header className="h-14 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 pr-6 border-r border-slate-800">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-slate-900 shadow-lg"><Briefcase size={12} strokeWidth={3} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Relay_Console</span>
          </div>
          <nav className="flex items-center gap-1 bg-slate-900/50 p-1 rounded border border-slate-800">
            <button onClick={() => { setMode("single"); setSelectedDoc(null); }} className={`flex items-center gap-2 px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-tighter transition-all ${mode === "single" ? "bg-slate-800 text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}><FileText size={12}/> Unit_Relay</button>
            <button onClick={() => { setMode("bulk"); setSelectedDoc(null); }} className={`flex items-center gap-2 px-4 py-1.5 rounded text-[9px] font-black uppercase tracking-tighter transition-all ${mode === "bulk" ? "bg-slate-800 text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}><Users size={12}/> Bulk_Dispatch</button>
          </nav>
        </div>
        <button onClick={handleSend} disabled={status === 'sending'} className="flex items-center gap-3 bg-white hover:bg-emerald-500 text-slate-900 px-6 py-2 rounded font-black text-[9px] uppercase tracking-[0.2em] transition-all disabled:opacity-20 shadow-xl active:scale-95">
          {status === 'sending' ? <Loader2 size={12} className="animate-spin"/> : <Send size={12} strokeWidth={3}/>}
          {mode === 'bulk' ? `Execute_Batch (${selectedClients.length})` : 'Authorize_Send'}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[300px] border-r border-slate-800 bg-[#0F172A] flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800/50 space-y-3">
            <div className="relative">
              <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input type="text" placeholder="FILTER_RECORDS..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-md py-2 pl-9 pr-3 text-[9px] font-bold text-white outline-none focus:border-emerald-500/30 transition-all" />
            </div>
            {mode === "single" ? (
              <div className="flex bg-slate-950 p-1 rounded border border-slate-800">
                {["Invoices", "Quotations", "Receipts", "Services"].map(t => (
                  <button key={t} onClick={() => { setActiveTab(t); setSelectedDoc(null); }} className={`flex-1 py-1.5 rounded text-[8px] font-black uppercase tracking-tighter transition-all ${activeTab === t ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-300"}`}>{t}</button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">Target_Nodes</span>
                <button onClick={toggleAllVisible} className="text-[8px] font-black uppercase text-emerald-500 hover:text-white transition-colors">
                  {filteredClients.every(c => selectedClients.includes(c.email)) ? "[ Deselect_All ]" : "[ Mark_Visible ]"}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {mode === "single" ? (
              filteredDocuments.map(doc => (
                <button key={doc._id} onClick={() => handleDocSelect(doc)} className={`w-full text-left p-3 rounded-lg transition-all group border ${selectedDoc?._id === doc._id ? "bg-slate-800/80 border-emerald-500/50" : "hover:bg-slate-900 border-transparent"}`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 overflow-hidden">
                      <p className={`text-[10px] font-black uppercase truncate ${selectedDoc?._id === doc._id ? "text-emerald-400" : "text-slate-300"}`}>{doc.client?.name || doc.name || "Unknown_Entity"}</p>
                      <div className="flex items-center gap-2 font-mono text-[8px] text-slate-600 tracking-tighter"><Hash size={9} /> {doc._id.slice(-8).toUpperCase()}</div>
                    </div>
                    <ChevronRight size={12} className={selectedDoc?._id === doc._id ? "text-emerald-500" : "text-slate-800"} />
                  </div>
                </button>
              ))
            ) : (
              filteredClients.map(client => (
                <div key={client._id} onClick={() => toggleClient(client.email)} className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-all border ${selectedClients.includes(client.email) ? "bg-slate-800 border-emerald-500/30 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]" : "hover:bg-slate-900 border-transparent"}`}>
                  <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${selectedClients.includes(client.email) ? "bg-emerald-500 border-emerald-500 text-slate-900" : "bg-slate-950 border-slate-700"}`}>{selectedClients.includes(client.email) && <Check size={10} strokeWidth={4}/>}</div>
                  <div className="truncate">
                    <p className="text-[10px] font-bold text-slate-300 uppercase truncate leading-none mb-1">{client.name}</p>
                    <p className="text-[8px] text-slate-600 font-mono truncate tracking-tight">{client.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="flex-1 bg-[#F8FAFC] overflow-y-auto custom-scrollbar-light">
          {(selectedDoc || mode === "bulk") ? (
            <div className="max-w-3xl mx-auto p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 rounded-xl overflow-hidden">
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Mail size={14}/></div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{mode === "bulk" ? "Batch_Sequence_Initialization" : "Relay_Object_Ready"}</h3>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{mode === "bulk" ? `${selectedClients.length} Targets Verified` : `Endpoint: ${selectedDoc.client?.email || selectedDoc.email}`}</p>
                    </div>
                  </div>
                  {mode === "single" && (
                    <div className="text-right">
                      <span className="text-[8px] font-black text-slate-400 uppercase block leading-none mb-1">Valuation</span>
                      <span className="text-sm font-black text-slate-900 tracking-tighter">
                        {selectedDoc.currency || "USD"} { (selectedDoc.items ? selectedDoc.items.reduce((a,b)=>a+(b.total || (b.price * b.quantity)), 0) : (selectedDoc.basePrice || 0)).toLocaleString() }
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em]">Transmission_Subject</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg text-[10px] font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1 tracking-[0.2em]">Data_Context_Payload</label>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-6 rounded-lg text-[10px] font-medium text-slate-600 outline-none h-56 resize-none focus:border-indigo-500 focus:bg-white transition-all leading-relaxed shadow-inner" />
                  </div>
                  <div onClick={() => fileInputRef.current.click()} className={`p-4 rounded-xl flex items-center justify-between group cursor-pointer transition-all border-2 border-dashed ${attachedFile ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 hover:border-indigo-300"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${attachedFile ? "bg-emerald-500 text-white" : "bg-white text-slate-400"}`}><Paperclip size={16}/></div>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${attachedFile ? "text-emerald-700" : "text-slate-900"}`}>{attachedFile ? attachedFile.name : (mode === "single" ? `${activeTab.slice(0,-1).toUpperCase()}_${selectedDoc._id.slice(-6).toUpperCase()}.pdf` : "CONSOLIDATED_BATCH_ARCHIVE.ZIP")}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{attachedFile ? "User Override Active" : "System Generated Attachment"}</p>
                      </div>
                    </div>
                    {attachedFile ? <X size={14} className="text-red-500 hover:scale-125 transition-transform" onClick={(e) => { e.stopPropagation(); setAttachedFile(null); }} /> : <ShieldCheck size={16} className="text-slate-300" />}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40">
              <Mail size={48} strokeWidth={1} className="mb-4" />
              <p className="text-[9px] font-black uppercase tracking-[0.6em]">Awaiting_Selection</p>
            </div>
          )}
        </main>
      </div>

      {/* SUCCESS OVERLAY */}
      {status === 'success' && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-bounce"><Check size={48} strokeWidth={4} /></div>
          <h2 className="text-2xl font-black text-white uppercase tracking-[0.3em]">Dispatch_Cleared</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">SMTP Relay Successful • Session Terminated</p>
          <button onClick={() => { setStatus('idle'); setSelectedDoc(null); }} className="mt-12 bg-white text-slate-950 px-12 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-500 transition-all shadow-2xl active:scale-95">Reset_Console</button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; } .custom-scrollbar-light::-webkit-scrollbar { width: 6px; } .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}} />
    </div>
  );
};

export default EmailComposer;