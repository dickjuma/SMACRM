import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import toast, { Toaster } from 'react-hot-toast';
import { 
  Send, Mail, Check, Paperclip, Briefcase, Loader2, 
  AlertCircle, Menu, LayoutGrid, X, RefreshCw, Wand2, Shield, Zap,
  CheckSquare, Square, Users, Search, ChevronLeft, Type
} from "lucide-react";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

const TEMPLATES = {
  formal: {
    label: "Formal",
    icon: <Shield size={12} />,
    subject: (type, id, name) => `OFFICIAL: ${type} #${id} - ${name}`,
    body: (type, name) => `Dear ${name},\n\nPlease find the attached ${type.toLowerCase()} for your records.\n\nBest Regards,\nFinance Team`
  },
  modern: {
    label: "Modern",
    icon: <Zap size={12} />,
    subject: (type, id, name) => `Your ${type} (#${id}) is ready, ${name}`,
    body: (type, name) => `Hi ${name},\n\nWe've processed your latest ${type.toLowerCase()}! Check the attachment for details.\n\nCheers,\nSMA Systems`
  },
  urgent: {
    label: "Priority",
    icon: <AlertCircle size={12} />,
    subject: (type, id, name) => `ACTION REQUIRED: Review ${type} #${id} | ${name}`,
    body: (type, name) => `Hello ${name},\n\nPlease review the attached ${type.toLowerCase()} at your earliest convenience to ensure timely processing.\n\nThank you,\nOperations`
  }
};

const EmailComposerContent = () => {
  const [mode, setMode] = useState("single");
  const [activeTab, setActiveTab] = useState("Invoices");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [subject, setSubject] = useState(localStorage.getItem('draft_subject') || "");
  const [message, setMessage] = useState(localStorage.getItem('draft_message') || "");
  const [progress, setProgress] = useState(0);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [activeTemplate, setActiveTemplate] = useState("formal");
  const fileInputRef = useRef(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('draft_subject', subject);
    localStorage.setItem('draft_message', message);
  }, [subject, message]);

  const handleSystemError = useCallback((error, fallbackMessage) => {
    const status = error.response?.status || error.status;
    const msg = error.response?.data?.message || error.message;
    if (status === 401) toast.error("SESSION_EXPIRED");
    else toast.error(msg || fallbackMessage);
  }, []);

  const { data: registry = { Invoices: [], Quotations: [], Receipts: [], Services: [], Clients: [] }, isLoading } = useQuery({
    queryKey: ['financeRegistry'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/finance/registry?limit=1000`, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("REGISTRY_LINK_FAILED");
      return res.json();
    }
  });

  const mutation = useMutation({
    mutationFn: async (formData) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/finance/dispatch`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData 
      });
      if (!res.ok) throw new Error("GATEWAY_REJECTION");
      return res.json();
    },
    onMutate: () => {
      setProgress(0);
      const loadingToast = toast.loading("ENCRYPTING_PAYLOAD...");
      const interval = setInterval(() => {
        setProgress(prev => (prev < 95 ? prev + Math.floor(Math.random() * 15) : prev));
      }, 400);
      return { loadingToast, interval };
    },
    onSuccess: (data, variables, context) => {
      clearInterval(context.interval);
      setProgress(100);
      toast.success("DISPATCH_SUCCESS", { id: context.loadingToast });
      setSelectedClients([]);
      localStorage.removeItem('draft_subject');
      localStorage.removeItem('draft_message');
    },
    onError: (err, variables, context) => {
      if (context?.interval) clearInterval(context.interval);
      toast.dismiss(context?.loadingToast);
      handleSystemError(err, "DISPATCH_FAILED");
    }
  });

  const applyTemplate = (tempKey, doc = selectedDoc) => {
    if (!doc && mode === "single") return;
    const type = activeTab.endsWith('s') ? activeTab.slice(0, -1) : activeTab;
    const clientName = doc?.client?.name || doc?.name || "Valued Client";
    const id = doc?._id?.slice(-6).toUpperCase() || "NEW";
    const template = TEMPLATES[tempKey];

    setSubject(template.subject(type, id, clientName));
    setMessage(template.body(type, clientName));
    setActiveTemplate(tempKey);
  };

  const handleDocSelect = (doc) => {
    setSelectedDoc(doc);
    setAttachedFile(null);
    applyTemplate(activeTemplate, doc);
    if(window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const filteredClients = useMemo(() => (registry.Clients || []).filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())), [registry.Clients, clientSearch]);
  const filteredDocuments = useMemo(() => (registry[activeTab] || []).filter(doc => (doc.client?.name || "").toLowerCase().includes(clientSearch.toLowerCase())), [registry, activeTab, clientSearch]);

  const handleSelectAll = () => {
    const allEmails = filteredClients.map(c => c.email).filter(e => e);
    selectedClients.length === allEmails.length ? setSelectedClients([]) : setSelectedClients(allEmails);
  };

  const toggleClient = (email) => {
    if (!email) return toast.error("Client has no valid email node");
    setSelectedClients(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const handleDispatch = () => {
    if (mode === 'bulk' && selectedClients.length === 0) return toast.error("SELECT_RECIPIENTS_FIRST");
    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("subject", subject);
    formData.append("message", message);
    formData.append("type", activeTab.endsWith('s') ? activeTab.slice(0, -1) : activeTab);

    if (mode === "single") {
      formData.append("docId", selectedDoc._id);
      formData.append("recipient", selectedDoc.client?.email || selectedDoc.email);
    } else {
      formData.append("recipients", JSON.stringify(selectedClients));
    }
    if (attachedFile) formData.append("file", attachedFile);
    mutation.mutate(formData);
  };

  // FEATURE: AI Refinement Simulation
  const handleAIRefine = () => {
    if (!message) return toast.error("WRITE_SOMETHING_FIRST");
    toast.promise(new Promise(res => setTimeout(res, 1200)), {
      loading: 'AI_OPTIMIZING...',
      success: () => {
        setMessage(prev => prev.replace("find the attached", "kindly review the enclosed") + "\n\nNote: This document is encrypted for security.");
        return "CONTENT_POLISHED";
      }
    });
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0F172A] gap-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <span className="text-[10px] font-black text-slate-500 tracking-[0.5em]">SYSTEM_BOOT_V5.2</span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-[#0F172A] flex flex-col overflow-hidden text-slate-300 font-sans text-[10px] antialiased">
      <Toaster position="top-right" />
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setAttachedFile(e.target.files[0])} />
      
      {/* HEADER SECTION */}
      <header className="h-16 border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg lg:hidden text-emerald-500"><Menu size={18} /></button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-emerald-500/20"><Briefcase size={16} strokeWidth={3} /></div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white hidden sm:block">Relay_Console</span>
          </div>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 ml-2">
            {["single", "bulk"].map(m => (
              <button key={m} onClick={() => { setMode(m); setSelectedDoc(null); mutation.reset(); }} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${mode === m ? "bg-slate-800 text-emerald-400" : "text-slate-600"}`}>{m}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
            <button onClick={() => { setSubject(""); setMessage(""); }} className="p-2.5 text-slate-500 hover:text-rose-400 transition-colors" title="Clear Draft"><RefreshCw size={14} /></button>
            {!mutation.isSuccess && (
            <button onClick={handleDispatch} disabled={mutation.isPending || (!selectedDoc && mode === 'single')} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 md:px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-20">
                {mutation.isPending ? <Loader2 size={12} className="animate-spin"/> : <Send size={12} strokeWidth={3}/>}
                <span className="hidden xs:inline">{mode === 'bulk' ? `Dispatch (${selectedClients.length})` : 'Authorize'}</span>
            </button>
            )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[#0F172A] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="p-4 space-y-4">
            <div className="relative">
              <input type="text" placeholder="FILTER_RECORDS..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-10 text-[9px] font-bold text-white outline-none focus:border-emerald-500/30" />
              <Search className="absolute left-4 top-3 text-slate-600" size={14} />
            </div>

            {mode === "bulk" && (
              <div className="flex items-center justify-between px-2">
                <button onClick={handleSelectAll} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors uppercase font-black text-[9px]">
                  {selectedClients.length === filteredClients.length ? <CheckSquare size={14}/> : <Square size={14}/>}
                  Select All
                </button>
                <span className="text-[8px] font-mono text-slate-500">{selectedClients.length}/{filteredClients.length}</span>
              </div>
            )}

            {mode === "single" && (
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {["Invoices", "Quotations", "Receipts", "Services"].map(t => (
                  <button key={t} onClick={() => { setActiveTab(t); setSelectedDoc(null); mutation.reset(); }} className={`py-2 rounded-lg text-[8px] font-black uppercase transition-all ${activeTab === t ? "bg-slate-800 text-white" : "text-slate-600"}`}>{t}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
            {mode === "single" ? filteredDocuments.map(doc => (
              <button key={doc._id} onClick={() => handleDocSelect(doc)} className={`w-full text-left p-4 rounded-2xl border transition-all group ${selectedDoc?._id === doc._id ? "bg-emerald-500/10 border-emerald-500/30" : "border-transparent hover:bg-slate-900"}`}>
                <p className={`text-[10px] font-black uppercase truncate ${selectedDoc?._id === doc._id ? "text-emerald-400" : "text-slate-300"}`}>{doc.client?.name || "Entity"}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[8px] font-mono text-slate-600">#{doc._id?.slice(-8).toUpperCase()}</p>
                  <p className="text-[8px] font-black text-slate-700 group-hover:text-emerald-500 transition-colors">{doc.amount ? `$${doc.amount}` : ''}</p>
                </div>
              </button>
            )) : filteredClients.map(client => (
              <div key={client._id} onClick={() => toggleClient(client.email)} className={`p-4 rounded-2xl cursor-pointer flex items-center gap-4 border transition-all ${selectedClients.includes(client.email) ? "bg-emerald-500/5 border-emerald-500/20" : "border-transparent hover:bg-slate-900"}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedClients.includes(client.email) ? "bg-emerald-500 border-emerald-500 text-slate-900" : "border-slate-700"}`}>{selectedClients.includes(client.email) && <Check size={12} strokeWidth={4}/>}</div>
                <div className="truncate">
                    <p className="text-[10px] font-bold text-slate-300 uppercase truncate">{client.name}</p>
                    <p className="text-[8px] font-mono text-slate-600">{client.email || 'NO_MAIL'}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN COMPOSER */}
        <main className="flex-1 bg-[#F8FAFC] overflow-y-auto relative custom-scrollbar-light">
          {/* Mobile Back Button */}
          {(selectedDoc || mode === "bulk") && (
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden fixed top-20 left-4 z-30 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 shadow-sm font-bold text-[9px] uppercase">
                <ChevronLeft size={14}/> Back to Records
            </button>
          )}

          {(selectedDoc || mode === "bulk") ? (
            <div className="max-w-4xl mx-auto p-4 md:p-12 relative mt-8 lg:mt-0">
              {mutation.isSuccess ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[2.5rem] p-10 md:p-16 text-center shadow-2xl animate-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-200 animate-bounce">
                    <Check size={40} strokeWidth={3} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">Relay Success</h2>
                  <p className="text-slate-500 text-[10px] mt-2 uppercase font-bold tracking-widest">Document has been dispatched</p>
                  <button onClick={() => { mutation.reset(); setSelectedDoc(null); }} className="mt-10 flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase mx-auto hover:bg-emerald-600 transition-all">
                    <RefreshCw size={14} /> New Session
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Template Controls */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(TEMPLATES).map(([key, t]) => (
                      <button key={key} onClick={() => applyTemplate(key)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${activeTemplate === key ? "bg-white border-indigo-500 text-indigo-600 shadow-lg shadow-indigo-100" : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200"}`}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <button onClick={handleAIRefine} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[9px] font-black uppercase hover:scale-105 transition-all shadow-lg shadow-indigo-200">
                        <Wand2 size={12} /> Refine with AI
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 shadow-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden relative">
                    {mutation.isPending && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 z-50 overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500 animate-pulse" style={{ width: `${progress}%` }} />
                      </div>
                    )}

                    <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                      {/* Recipient Display */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Recipient_Node</label>
                            {selectedDoc?.client?.name && <span className="text-[8px] font-black text-indigo-500 uppercase">{selectedDoc.client.name}</span>}
                        </div>
                        <div className="flex items-center gap-3 bg-slate-900 px-6 py-4 rounded-2xl border border-slate-800 shadow-inner group overflow-hidden">
                          <Mail size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider truncate">
                            {mode === "single" 
                              ? (selectedDoc?.client?.email || selectedDoc?.email || "LINK_MISSING")
                              : selectedClients.length > 0 ? `${selectedClients.length} Target(s) Selected` : "NO_TARGETS_SELECTED"
                            }
                          </span>
                        </div>
                      </div>

                      {/* Subject Line */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Subject_Line</label>
                        <div className="relative group">
                            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all pr-12" />
                            <Type size={14} className="absolute right-5 top-4.5 text-slate-300 group-focus-within:text-indigo-500 transition-colors"/>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="space-y-2 relative">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Content</label>
                            <span className="text-[8px] font-mono text-slate-400">{message.length} CHARS | {message.split(/\s+/).filter(Boolean).length} WORDS</span>
                        </div>
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-[12px] font-medium text-slate-600 outline-none h-64 resize-none focus:border-indigo-500 focus:bg-white transition-all leading-relaxed shadow-inner" />
                      </div>

                      {/* Attachment Handler */}
                      <div onClick={() => fileInputRef.current.click()} className={`p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed flex items-center justify-between cursor-pointer transition-all ${attachedFile ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 hover:border-indigo-300"}`}>
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${attachedFile ? "bg-emerald-500 text-white rotate-12" : "bg-white text-slate-400 shadow-sm"}`}><Paperclip size={18}/></div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px] md:max-w-[200px]">{attachedFile ? attachedFile.name : 'Generated_Payload.pdf'}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Attachment_Status</p>
                          </div>
                        </div>
                        {attachedFile && <X size={16} className="text-red-500 hover:scale-125 transition-transform" onClick={(e) => {e.stopPropagation(); setAttachedFile(null);}}/>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 p-8 text-center">
              <div className="w-24 h-24 border border-slate-300 rounded-full flex items-center justify-center mb-6">
                <LayoutGrid size={48} strokeWidth={1} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Waiting_For_Input</p>
              <p className="text-slate-500 text-[8px] font-bold uppercase mt-2">Select a document from the registry to begin relay</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const queryClient = new QueryClient();
const EmailComposer = () => (
  <QueryClientProvider client={queryClient}>
    <EmailComposerContent />
  </QueryClientProvider>
);

export default EmailComposer;