'use client';
import { supabaseClient } from '../utils/supabase';

export default function LoginModal({ setCurrentUser, setShowLoginModal }: any) {
  const handleRealLogin = async (e: any) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { alert('❌ មិនអាចចូលបានទេ៖ ' + error.message); } 
    else if (data.session) {
      const { data: profile } = await supabaseClient.from('Profiles_Access').select('role, zone, can_edit_roof, can_edit_road, can_edit_border').eq('id', data.user.id).maybeSingle();
      const roleStr = profile?.role ? profile.role.toLowerCase().trim().replace(/\s+/g, '_') : 'user';
      const userObj = { name: profile?.zone || email, zone: profile?.zone || '', role: roleStr, id: data.user.id, can_edit_roof: profile?.can_edit_roof || false, can_edit_road: profile?.can_edit_road || false, can_edit_border: profile?.can_edit_border || false };
      setCurrentUser(userObj); 
      setShowLoginModal(false); 
    }
  };

  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-indigo-900 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <img src="/logo/Map Ark.png" alt="Maps Ark Logo" onError={(e: any) => e.currentTarget.style.display='none'} className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 object-contain rounded-full shadow-md border-2 border-indigo-100" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">ចូលប្រើប្រព័ន្ធ</h1>
        </div>
        <form onSubmit={handleRealLogin} className="space-y-4">
          <input type="email" placeholder="Email" required className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm" />
          <input type="password" placeholder="Password" required className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm" />
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-md cursor-pointer text-sm">ចូល</button>
        </form>
      </div>
    </div>
  );
}