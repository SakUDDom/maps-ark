'use client';
import { Camera, CheckCircle, Clock, DollarSign, History, Printer, Save, Sliders, User, X, Loader2 } from 'lucide-react';

export default function CustomerDetail({
  selectedHome, setSelectedHome, editForm, setEditForm,
  isUploading, handlePhotoUpload, payMonth, setPayMonth,
  payNumMonths, setPayNumMonths, handleQuickPay,
  isManualEditOpen, setIsManualEditOpen, handleOpenHistory,
  handleUpdate, currentUser
}: any) {
  if (!selectedHome) return null;
  const monthsList = ['ខែមករា', 'ខែកកុម្ភៈ', 'ខែមីនា', 'ខែមេសា', 'ខែឧសភា', 'ខែមិថុនា', 'ខែកក្កដា', 'ខែសីហា', 'ខែកញ្ញា', 'ខែតុលា', 'ខែវិច្ឆិកា', 'ខែធ្នូ'];

  return (
    <div className="absolute top-[80px] right-0 sm:right-4 left-0 sm:left-auto mx-auto sm:mx-0 z-[9999] w-[calc(100vw-32px)] sm:w-[380px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[calc(100vh-100px)] border border-slate-200">
      <div className="bg-white p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-black text-indigo-900 text-sm flex items-center gap-2"><User className="text-indigo-600" size={18} /> ព័ត៌មានអតិថិជន</h3>
        <button onClick={() => setSelectedHome(null)} className="text-slate-400 hover:text-rose-500 cursor-pointer"><X size={20} /></button>
      </div>
      <div className="p-5 flex flex-col gap-4 overflow-y-auto hide-scrollbar bg-white pb-10">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
            <Camera size={14} /> រូបថត (ចុចដើម្បីបញ្ចូល)៖
          </span>
          <label className="w-full h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex flex-col items-center justify-center relative cursor-pointer hover:bg-slate-200 transition-colors">
            {isUploading ? (
              <div className="flex flex-col items-center text-indigo-500">
                <Loader2 className="animate-spin mb-2" size={24} />
                <span className="text-xs font-bold">កំពុងបញ្ជូនរូបភាព...</span>
              </div>
            ) : editForm.photo_url ? (
              <>
                <img src={editForm.photo_url} className="w-full h-full object-cover" alt="Customer" />
                <div className="absolute bottom-2 right-2 bg-black/60 text-white p-1.5 rounded-lg backdrop-blur-md shadow-md"><Camera size={16} /></div>
              </>
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <Camera size={24} className="mb-1" />
                <span className="text-xs font-bold text-slate-500">ចុចទីនេះដើម្បីបញ្ចូលរូបថត</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
          </label>
        </div>

        <div className="flex flex-col gap-1.5"><span className="text-[11px] text-slate-700 font-bold">លេខកូដផ្ទះ៖</span><input type="text" value={editForm.custom_id} onChange={(e) => setEditForm({...editForm, custom_id: e.target.value})} className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors" /></div>
        <div className="flex flex-col gap-1.5"><span className="text-[11px] text-slate-700 font-bold">ឈ្មោះអតិថិជន (ម្ចាស់ហាង/សំអាង)៖</span><input type="text" value={editForm.customer_name} onChange={(e) => setEditForm({...editForm, customer_name: e.target.value})} className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors" /></div>
        
        <div className="flex flex-col gap-1.5"><span className="text-[11px] text-slate-700 font-bold">តម្លៃសេវា (៛)៖</span>
          <input type="text" value={editForm.monthly_fee === '' ? '' : Number(editForm.monthly_fee).toLocaleString()} onChange={(e) => { const rawValue = e.target.value.replace(/,/g, '').replace(/\D/g, ''); setEditForm({...editForm, monthly_fee: rawValue === '' ? '' : Number(rawValue)}); }} className="w-full px-3 py-2.5 text-sm font-black text-emerald-600 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5"><span className="text-[11px] text-slate-700 font-bold">តំបន់ (Zone)៖</span><input type="text" value={editForm.zone} onChange={(e) => setEditForm({...editForm, zone: e.target.value})} className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none" disabled={currentUser?.role !== 'super_admin'} /></div>
        {editForm.status_color === 'blue' ? ( <div className="w-full mt-2 p-3 rounded-xl font-bold bg-emerald-50 text-emerald-700 text-[13px] border border-emerald-100 flex items-center justify-center gap-2 shadow-sm"><CheckCircle size={16} /> បានបង់រួចរាល់ (ខែបន្ទាប់៖ {editForm.payment_month})</div> ) : ( <div className="w-full mt-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100 shadow-sm flex flex-col items-center"><div className="font-bold flex items-center gap-2 mb-1 text-[12px]"><Clock size={14} /> ស្ថានភាពបច្ចុប្បន្ន</div><div className="font-black text-amber-700 text-[13px]">{editForm.payment_month} (មិនទាន់បានបង់)</div></div> )}
        
        {editForm.status_color !== 'blue' && ( <div className="mt-2 p-4 rounded-xl border border-indigo-100 bg-indigo-50 shadow-sm"><label className="block text-[11px] font-black text-indigo-900 mb-2">បង់ប្រាក់ (រើសខែ និងចំនួនខែ)៖</label><select value={payMonth} onChange={(e) => setPayMonth(e.target.value)} className="w-full mb-3 border border-indigo-200 px-3 py-2 rounded-lg font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer">{monthsList.map((m: any) => <option key={m} value={m}>បង់ចាប់ពី៖ {m}</option>)}</select><div className="flex items-center gap-3"><input type="number" value={payNumMonths} onChange={(e) => setPayNumMonths(e.target.value === '' ? '' : parseInt(e.target.value))} min="1" max="12" className="w-20 border border-indigo-200 px-3 py-2.5 rounded-lg font-bold text-lg text-center outline-none focus:ring-2 focus:ring-amber-400 bg-white shadow-inner" /><button onClick={handleQuickPay} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-lg hover:bg-amber-600 transition-colors shadow-md flex justify-center items-center gap-2 text-[13px] cursor-pointer"><DollarSign size={16} /> បង់ប្រាក់</button></div></div> )}
        
        <div className="mt-2 border border-slate-200 rounded-xl bg-slate-50 shadow-sm">
          <div onClick={() => setIsManualEditOpen(!isManualEditOpen)} className="p-3 font-bold text-slate-700 text-[12px] cursor-pointer hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors rounded-xl"><Sliders className="text-indigo-500" size={16} /> ជម្រើសកែប្រែដោយដៃ (Manual Edit)</div>
          {isManualEditOpen && (
            <div className="p-4 border-t border-slate-200 space-y-3 bg-white rounded-b-xl">
              <div><label className="block text-xs font-bold mb-1 text-slate-500">ខែត្រូវបង់បន្ទាប់៖</label><select value={editForm.payment_month} onChange={(e: any) => setEditForm({...editForm, payment_month: e.target.value})} className="w-full border px-3 py-2 rounded-lg font-bold text-indigo-700 bg-slate-50 outline-none cursor-pointer">{monthsList.map((m: any) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="block text-xs font-bold mb-1 text-slate-500">ស្ថានភាពបង់ប្រាក់៖</label><select value={editForm.status_color} onChange={(e: any) => setEditForm({...editForm, status_color: e.target.value})} className="w-full border px-3 py-2 rounded-lg bg-slate-50 font-bold outline-none cursor-pointer"><option value="blue">🔵 បានបង់</option><option value="yellow">🟡 មិនទាន់បានបង់</option><option value="red">🔴 ទីតាំងបិទ</option><option value="black">⚫ បានបង់តែទុកសិន</option></select></div>
            </div>
          )}
        </div>
        <button onClick={handleOpenHistory} className="w-full mt-1 py-3 rounded-xl font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm flex justify-center items-center gap-2 text-[12px] cursor-pointer"><History size={16} /> មើលប្រវត្តិបង់ប្រាក់</button>
      </div>
      <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <button onClick={handleUpdate} className="flex-1 bg-[#5252d6] text-white font-bold py-3 rounded-xl hover:bg-indigo-700 flex justify-center items-center gap-2 cursor-pointer shadow-md text-[13px] transition-colors"><Save size={16} /> រក្សាទុក</button>
        <button onClick={() => window.print()} className="flex-1 bg-[#0ea5e9] text-white font-bold py-3 rounded-xl hover:bg-sky-500 flex justify-center items-center gap-2 cursor-pointer shadow-md text-[13px] transition-colors"><Printer size={16} /> បោះពុម្ព</button>
      </div>
    </div>
  );
}