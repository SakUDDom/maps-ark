'use client';
import React, { useState, useEffect } from 'react';
import { Users, X, UserPlus, Shield, Check, Trash2, Loader2 } from 'lucide-react';
import { supabaseClient } from '../utils/supabase';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function UserManagementModal({ isOpen, onClose, currentUser }: UserManagementModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Form បង្កើតភ្នាក់ងារថ្មី
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [zone, setZone] = useState('');
  const [role, setRole] = useState('user');
  const [canEditRoof, setCanEditRoof] = useState(false);
  const [canEditRoad, setCanEditRoad] = useState(false);
  const [canEditBorder, setCanEditBorder] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabaseClient.from('profiles_access').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !zone) {
      alert('សូមបំពេញ Email, Password និង Zone ឱ្យបានគ្រប់គ្រាន់!');
      return;
    }

    try {
      setCreating(true);
      // ១. បង្កើតគណនី Auth ថ្មី
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // ២. បញ្ចូលសិទ្ធិទៅកាន់ profiles_access
        const { error: profileError } = await supabaseClient.from('profiles_access').insert({
          id: authData.user.id,
          email,
          zone: zone.trim(),
          role,
          can_edit_roof: canEditRoof,
          can_edit_road: canEditRoad,
          can_edit_border: canEditBorder,
        });

        if (profileError) throw profileError;

        alert('✅ បង្កើតគណនីភ្នាក់ងារថ្មីបានជោគជ័យ!');
        setEmail('');
        setPassword('');
        setZone('');
        fetchUsers();
      }
    } catch (err: any) {
      alert('❌ បរាជ័យក្នុងការបង្កើតគណនី៖ ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePermission = async (user: any, field: string, value: any) => {
    setSavingId(user.id);
    const updatedUser = { ...user, [field]: value };
    await supabaseClient.from('profiles_access').update({ [field]: value }).eq('id', user.id);
    setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    setSavingId(null);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់ដកសិទ្ធិអ្នកប្រើប្រាស់ ${name} មែនទេ?`)) return;
    await supabaseClient.from('profiles_access').delete().eq('id', id);
    setUsers(users.filter(u => u.id !== id));
    alert('✅ បានដកសិទ្ធិជោគជ័យ!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <Shield className="text-indigo-600" size={22} />
            <h2 className="font-black text-slate-800 text-lg">គ្រប់គ្រងភ្នាក់ងារ & កំណត់សិទ្ធិ (User Access)</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer shadow-sm">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Form បង្កើតភ្នាក់ងារថ្មី */}
          <form onSubmit={handleCreateUser} className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
            <h3 className="font-black text-indigo-950 text-sm flex items-center gap-1.5">
              <UserPlus size={16} /> បន្ថែមភ្នាក់ងារថ្មី
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="email"
                placeholder="Email ភ្នាក់ងារ..."
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                required
              />
              <input
                type="password"
                placeholder="Password (យ៉ាងហោច 6 ខ្ទង់)..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                required
              />
              <input
                type="text"
                placeholder="ឈ្មោះតំបន់ (Zone ឧ. Deth)..."
                value={zone}
                onChange={e => setZone(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={canEditRoof} onChange={e => setCanEditRoof(e.target.checked)} className="rounded text-indigo-600" />
                  កែដំបូល (Roof)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={canEditRoad} onChange={e => setCanEditRoad(e.target.checked)} className="rounded text-indigo-600" />
                  កែផ្លូវ (Road)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={canEditBorder} onChange={e => setCanEditBorder(e.target.checked)} className="rounded text-indigo-600" />
                  កែព្រំដែន (Border)
                </label>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} បង្កើតគណនី
              </button>
            </div>
          </form>

          {/* តារាងបញ្ជីភ្នាក់ងារ */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-700">
              បញ្ជីភ្នាក់ងារទាំងអស់ ({users.length})
            </div>

            {loading ? (
              <div className="py-10 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
                កំពុងទាញយកទិន្នន័យភ្នាក់ងារ...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-black">
                      <th className="p-3">Email / Zone</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-center">កែដំបូល</th>
                      <th className="p-3 text-center">កែផ្លូវ</th>
                      <th className="p-3 text-center">កែព្រំដែន</th>
                      <th className="p-3 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="font-black text-slate-900">{u.email || u.id.slice(0, 8)}</div>
                          <div className="text-[11px] text-indigo-600">តំបន់៖ {u.zone || '---'}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!u.can_edit_roof}
                            onChange={e => handleUpdatePermission(u, 'can_edit_roof', e.target.checked)}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!u.can_edit_road}
                            onChange={e => handleUpdatePermission(u, 'can_edit_road', e.target.checked)}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!u.can_edit_border}
                            onChange={e => handleUpdatePermission(u, 'can_edit_border', e.target.checked)}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-right">
                          {u.role !== 'super_admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email || u.zone)}
                              className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors ml-auto cursor-pointer"
                              title="ដកសិទ្ធិ"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
