import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  UserPlus, Trash2, ShieldCheck, Database, 
  Edit2, Save, X, Power, PowerOff, Activity,
  Lock, AlertTriangle, RefreshCw
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_URL = "http://localhost:5000/api/auth";

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const UserAdmin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");

  const handleSystemError = (error, fallbackMessage) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      toast.error(
        (t) => (
          <span className="flex flex-col gap-1">
            <b className="text-red-400">SESSION_EXPIRED</b>
            <span className="text-[9px]">Please re-authenticate to gain access.</span>
            <button 
              onClick={() => window.location.href = '/login'}
              className="mt-2 bg-red-500/20 border border-red-500/40 text-red-400 py-1 rounded text-[8px] font-black uppercase"
            >
              Re-Login
            </button>
          </span>
        ), { duration: 6000 }
      );
    } else if (status === 403) {
      toast.error("INSUFFICIENT_PRIVILEGES: SuperAdmin clearance required.", {
        icon: <Lock size={14} className="text-red-500" />
      });
    } else {
      toast.error(message || fallbackMessage);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`${API_URL}/users`);
      setUsers(response.data.data || response.data);
    } catch (error) {
      handleSystemError(error, "REGISTRY_FETCH_FAILED");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) 
      return toast.warn("VALIDATION_ERROR: Incomplete identity data.");

    const provisionToast = toast.loading("PROVISIONING_NODE...");
    try {
      const response = await api.post(`${API_URL}/register`, newUser);
      setUsers(prev => [response.data.data, ...prev]);
      setNewUser({ name: "", email: "", password: "", role: "user" });
      toast.success(`NODE_ACTIVE: ${newUser.name.toUpperCase()}`, { id: provisionToast });
    } catch (error) {
      toast.dismiss(provisionToast);
      handleSystemError(error, "PROVISIONING_FAILED");
    }
  };

  const toggleStatus = async (user) => {
    const statusToast = toast.loading("COMMUNICATING_WITH_CORE...");
    try {
      const response = await api.patch(`${API_URL}/status/${user._id}`);
      setUsers(users.map(u => u._id === user._id ? { ...u, active: response.data.active } : u));
      toast.success(
        response.data.active ? "ACCESS_RESTORED" : "ACCESS_REVOKED", 
        { id: statusToast, icon: response.data.active ? <Power size={14}/> : <PowerOff size={14}/> }
      );
    } catch (error) {
      toast.dismiss(statusToast);
      handleSystemError(error, "STATUS_SYNC_FAILED");
    }
  };

  const saveRole = async (id) => {
    const roleToast = toast.loading("UPDATING_PRIVILEGES...");
    try {
      const response = await api.patch(`${API_URL}/role/${id}`, { role: editRole });
      setUsers(users.map(u => u._id === id ? { ...u, role: response.data.data.role } : u));
      setEditingId(null);
      toast.success("PRIVILEGE_LEVEL_SYNCED", { id: roleToast });
    } catch (error) {
      toast.dismiss(roleToast);
      handleSystemError(error, "ROLE_UPDATE_FAILED");
    }
  };

  const deleteUser = async (id, name) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold text-white">CONFIRM_PURGE: {name}?</p>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const pToast = toast.loading("PURGING...");
              try {
                await api.delete(`${API_URL}/purge/${id}`);
                setUsers(users.filter(u => u._id !== id));
                toast.success("NODE_DELETED", { id: pToast });
              } catch (e) {
                toast.dismiss(pToast);
                handleSystemError(e, "PURGE_FAILED");
              }
            }}
            className="bg-red-500 px-2 py-1 rounded text-[8px] font-black uppercase text-white"
          >
            Confirm
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-700 px-2 py-1 rounded text-[8px] font-black uppercase text-white">Cancel</button>
        </div>
      </div>
    ), { duration: 5000, icon: <AlertTriangle className="text-amber-500" /> });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-8 text-slate-300 font-sans antialiased">
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            background: '#1e293b', 
            color: '#fff', 
            fontSize: '10px', 
            border: '1px solid #334155',
            borderRadius: '4px',
            padding: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
          }
        }} 
      />
      
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER WITH REFRESH BUTTON */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <ShieldCheck className="text-emerald-500" /> Identity_Management
                </h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Secure_Node_Administration_v2.0</p>
            </div>
            
            <div className="flex items-center gap-2">
                {/* --- ADDED REFRESH BUTTON --- */}
                <button 
                  onClick={fetchUsers}
                  disabled={loading}
                  className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-all active:scale-95 disabled:opacity-50"
                  title="Re-Sync Registry"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>

                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg flex items-center gap-3">
                    <Activity size={14} className={loading ? "animate-spin text-emerald-500" : "text-emerald-500"}/>
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                      {loading ? "SYNCING_DATA" : "System_Live"}
                    </span>
                </div>
            </div>
        </div>

        {/* ADD USER FORM */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input 
              placeholder="FULL NAME" value={newUser.name} 
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              className="bg-slate-950 border border-slate-800 p-3 rounded text-[10px] font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input 
              placeholder="EMAIL ADDRESS" value={newUser.email} 
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              className="bg-slate-950 border border-slate-800 p-3 rounded text-[10px] font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input 
              type="password" placeholder="ACCESS CIPHER" value={newUser.password} 
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              className="bg-slate-950 border border-slate-800 p-3 rounded text-[10px] font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button type="submit" className="bg-white text-slate-900 font-black text-[10px] py-3 rounded uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg">
              <UserPlus size={14}/> Provision_Node
            </button>
          </form>
        </div>

        {/* USER TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                <th className="p-5">Identity_Node</th>
                <th className="p-5">Privilege_Level</th>
                <th className="p-5">Access_Status</th>
                <th className="p-5 text-right">System_Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map(u => (
                <tr key={u._id} className={`transition-all ${!u.active ? 'opacity-40 grayscale bg-slate-950/30' : 'hover:bg-slate-800/30'}`}>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                        {u.name?.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-tight">{u.name}</p>
                        <p className="text-[8px] text-slate-500 font-mono italic">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    {editingId === u._id ? (
                      <select 
                        value={editRole} 
                        onChange={(e) => setEditRole(e.target.value)}
                        className="bg-slate-950 border border-emerald-500/50 p-1.5 rounded text-[9px] font-black text-emerald-400 outline-none"
                      >
                        <option value="user">USER</option>
                        <option value="admin">ADMIN</option>
                        <option value="superadmin">SUPER_ADMIN</option>
                      </select>
                    ) : (
                      <span className={`text-[8px] font-black px-2 py-1 rounded border ${
                        u.role === 'superadmin' ? 'border-red-500/30 text-red-500 bg-red-500/10' : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                      }`}>
                        {u.role?.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-tighter">{u.active ? 'Authorized' : 'Suspended'}</span>
                    </div>
                  </td>
                  <td className="p-5 text-right space-x-2">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === u._id ? (
                        <>
                          <button onClick={() => saveRole(u._id)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded border border-emerald-500/20"><Save size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-slate-500 hover:bg-slate-500/10 rounded"><X size={14}/></button>
                        </>
                      ) : (
                        <button onClick={() => { setEditingId(u._id); setEditRole(u.role); }} className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded"><Edit2 size={13}/></button>
                      )}
                      
                      <button 
                        onClick={() => toggleStatus(u)}
                        className={`p-2 transition-all rounded ${u.active ? 'text-slate-500 hover:bg-amber-500/10 hover:text-amber-500' : 'text-amber-500 hover:bg-emerald-500/10 hover:text-emerald-500'}`}
                      >
                        {u.active ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>

                      <button onClick={() => deleteUser(u._id, u.name)} className="p-2 text-slate-700 hover:text-red-500 hover:bg-red-500/10 transition-all rounded"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && users.length === 0 && (
            <div className="p-10 text-center flex flex-col items-center gap-3">
              <Database size={24} className="text-slate-700" />
              <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">No Identity Nodes Found In Registry</p>
              <button onClick={fetchUsers} className="text-[8px] font-black text-emerald-500 uppercase border border-emerald-500/20 px-3 py-1 rounded hover:bg-emerald-500/10 transition-all">Re-Sync Database</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAdmin;