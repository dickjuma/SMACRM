import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { 
  UserPlus, Trash2, ShieldCheck, Database, 
  Edit2, Save, X, Power, PowerOff, 
  RefreshCw, Mail, AlertCircle, Check
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BASE_URL}/auth`;

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const UserAdmin = () => {
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  
  // State for inline deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // --- QUERIES ---
  const { data: users = [], isLoading: loading, refetch: fetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get(`${API_URL}/users`);
      return response.data.data || response.data;
    },
    onError: () => toast.error("Critical: Could not sync with user registry")
  });

  // --- MUTATIONS ---
  const addUserMutation = useMutation({
    mutationFn: (user) => api.post(`${API_URL}/register`, user),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setNewUser({ name: "", email: "", password: "", role: "user" });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (user) => api.patch(`${API_URL}/status/${user._id}`),
    onSuccess: () => queryClient.invalidateQueries(["users"])
  });

  const saveRoleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`${API_URL}/role/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setEditingId(null);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.delete(`${API_URL}/purge/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      setDeleteConfirmId(null); // Reset after successful deletion
    }
  });

  // --- HANDLERS ---

  const handleAddUser = (e) => {
    e.preventDefault();
    toast.promise(
      addUserMutation.mutateAsync(newUser),
      {
        loading: `Provisioning account for ${newUser.name}...`,
        success: <b>Account created successfully</b>,
        error: (err) => `Provisioning failed: ${err.response?.data?.message || 'Server error'}`,
      }
    );
  };

  const handleStatusToggle = (user) => {
    const action = user.active ? "Suspending" : "Activating";
    toast.promise(
      toggleStatusMutation.mutateAsync(user),
      {
        loading: `${action} access for ${user.name}...`,
        success: `User status updated`,
        error: `Failed to update status`,
      }
    );
  };

  const handleRoleUpdate = (id, name) => {
    toast.promise(
      saveRoleMutation.mutateAsync({ id, role: editRole }),
      {
        loading: `Updating permissions...`,
        success: `Role updated to ${editRole.toUpperCase()}`,
        error: `Could not update permissions`,
      }
    );
  };

  const executeDeletion = (id) => {
    toast.promise(deleteUserMutation.mutateAsync(id), {
      loading: 'Purging record...',
      success: 'User purged from system',
      error: 'Purge failed',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'border border-slate-200 shadow-xl p-4 text-sm font-medium rounded-2xl',
          duration: 4000,
        }} 
      />
      
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest">
              <ShieldCheck size={14} /> Security Admin
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Access Control</h1>
          </div>
          
          <button 
            onClick={() => {
              toast.promise(fetchUsers(), {
                loading: 'Refreshing registry...',
                success: 'Data up to date',
                error: 'Refresh failed'
              });
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 rounded-xl transition-all shadow-sm font-semibold text-sm"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Sync Registry
          </button>
        </header>

        {/* ADD USER SECTION */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <UserPlus size={18} className="text-indigo-600" /> Provision New Account
            </h2>
          </div>
          <form onSubmit={handleAddUser} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
              <input 
                placeholder="John Wekesa" value={newUser.name} 
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Address</label>
              <input 
                type="email" placeholder="john@sma.com" value={newUser.email} 
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Security Code</label>
              <input 
                type="password" placeholder="••••••••" value={newUser.password} 
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" required
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-all shadow-md shadow-indigo-100 text-sm">
                Confirm Onboarding
              </button>
            </div>
          </form>
        </section>

        {/* DATA TABLE */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-5">Identity Profile</th>
                <th className="px-6 py-5">System Privileges</th>
                <th className="px-6 py-5">Network Status</th>
                <th className="px-6 py-5 text-right">Registry Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u._id} className={`group hover:bg-slate-50/50 transition-colors ${!u.active ? 'opacity-60 bg-slate-50/20' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all uppercase">
                        {u.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5"><Mail size={12}/> {u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u._id ? (
                      <div className="flex items-center gap-2">
                        <select 
                          value={editRole} 
                          onChange={(e) => setEditRole(e.target.value)}
                          className="px-3 py-1.5 border rounded-lg bg-white text-xs font-bold border-indigo-500 outline-none ring-4 ring-indigo-50"
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                          <option value="superadmin">SUPERADMIN</option>
                        </select>
                        <button onClick={() => handleRoleUpdate(u._id, u.name)} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"><Save size={16}/></button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 bg-slate-50 rounded-lg hover:bg-slate-100"><X size={16}/></button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                        u.role === 'superadmin' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {u.role?.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{u.active ? 'Operational' : 'Restricted'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      
                      {/* INLINE DELETE CONFIRMATION */}
                      {deleteConfirmId === u._id ? (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 p-1 rounded-xl animate-in fade-in slide-in-from-right-2 duration-200">
                           <span className="text-[10px] font-black text-rose-600 px-2 uppercase tracking-tight">Delete?</span>
                           <button 
                             onClick={() => executeDeletion(u._id)} 
                             className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm"
                           >
                             <Check size={14}/>
                           </button>
                           <button 
                             onClick={() => setDeleteConfirmId(null)} 
                             className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                           >
                             <X size={14}/>
                           </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(u._id); setEditRole(u.role); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                          <button onClick={() => handleStatusToggle(u)} className={`p-2 rounded-xl transition-all ${u.active ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>{u.active ? <PowerOff size={18} /> : <Power size={18} />}</button>
                          <button onClick={() => setDeleteConfirmId(u._id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                        </>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !loading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-3 border-t">
              <Database size={48} strokeWidth={1} />
              <p className="font-medium text-sm">No accounts in system registry</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserAdmin;