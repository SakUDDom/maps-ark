'use client';
import React, { useRef } from 'react';
import { 
  User, X, Camera, Printer, Save, History, 
  SlidersHorizontal, CheckCircle2, Loader2, DollarSign 
} from 'lucide-react';
import { KHMER_MONTHS } from '../constants/months';

interface CustomerDetailProps {
  selectedHome: any;
  setSelectedHome: (home: any) => void;
  editForm: any;
  setEditForm: (form: any) => void;
  isUploading: boolean;
  handlePhotoUpload: (e: any) => void;
  payMonth: string;
  setPayMonth: (m: string) => void;
  payNumMonths: any;
  setPayNumMonths: (n: any) => void;
  handleQuickPay: () => void;
  isManualEditOpen: boolean;
  setIsManualEditOpen: (open: boolean) => void;
  handleOpenHistory: () => void;
  handleUpdate: () => void;
  currentUser: any;
}

export default function CustomerDetail({
  selectedHome,
  setSelectedHome,
  editForm,
  setEditForm,
  isUploading,
  handlePhotoUpload,
  payMonth,
  setPayMonth,
  payNumMonths,
  setPayNumMonths,
  handleQuickPay,
  isManualEditOpen,
  setIsManualEditOpen,
  handleOpenHistory,
  handleUpdate,
  currentUser
}: CustomerDetailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selectedHome) return null;

  return (
    <div className="absolute top-[80px] right-4 z-[1050] w-[calc(100vw-32px)] sm:w-[380px] max-h-[calc(100vh-100px)] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-5 hide-scrollbar animate-in slide-in-from-right-4 duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <User size={18} />
          </div>
          <h3 className="font-black text-slate-800 text-base">ព័ត៌មានអតិថិជន</h3>
        </div>
        <button 
          onClick={() => setSelectedHome(null)} 
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* រូបភាពផ្ទះ */}
      <div className="mt-4">
        <div className="relative w-full h-40 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center group">
          {editForm.photo_url ? (
            <img 
              src={editForm.photo_url} 
              alt="House" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <Camera size={32} />
              <span className="text-xs font-bold mt-1">មិនទាន់មានរូបភាព</span>
            </div>
          )}

          {/* ប៊ូតុងថត/ប្តូររូបភាព (iOS Friendly) */}
          <button 
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-2.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            <span>{editForm.photo_url ? 'ប្តូររូប' : 'ថតរូប'}</span>
          </button>

          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/jpeg,image/png,image/webp" 
            onChange={handlePhotoUpload} 
            className="hidden" 
          />
        </div>
      </div>

      {/* ព័ត៌មានស្នូល */}
      <div className="mt-4 space-y-3 text-xs font-bold text-slate-600">
        <div>
          <label className="text-slate-400 block mb-1">លេខកូដផ្ទះ៖</label>
          <input 
            type="text" 
            value={editForm.custom_id} 
            onChange={e => setEditForm({ ...editForm, custom_id: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-black outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-slate-400 block mb-1">ឈ្មោះអតិថិជន (ម្ចាស់ផ្ទះ/សំអាង)៖</label>
          <input 
            type="text" 
            value={editForm.customer_name} 
            onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 block mb-1">តម្លៃសេវា (៛)៖</label>
            <input 
              type="number" 
              value={editForm.monthly_fee} 
              onChange={e => setEditForm({ ...editForm, monthly_fee: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-emerald-600 font-black outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">តំបន់ (Zone)៖</label>
            <input 
              type="text" 
              value={editForm.zone} 
              onChange={e => setEditForm({ ...editForm, zone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ផ្នែកបង់ប្រាក់រហ័ស (Quick Pay) */}
      <div className="mt-4 p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-black text-indigo-900 flex items-center gap-1">
            <DollarSign size={14} className="text-indigo-600" /> បង់ប្រាក់
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            selectedHome.status_color === 'blue' ? 'bg-blue-100 text-blue-700' :
            selectedHome.status_color === 'red' ? 'bg-rose-100 text-rose-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {selectedHome.status_color === 'blue' ? 'បានបង់រួច' : 'រង់ចាំបង់'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <select 
            value={payMonth} 
            onChange={e => setPayMonth(e.target.value)}
            className="bg-white border border-indigo-200 text-indigo-900 text-xs font-bold rounded-xl px-2 py-2 outline-none"
          >
            {KHMER_MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select 
            value={payNumMonths} 
            onChange={e => setPayNumMonths(e.target.value)}
            className="bg-white border border-indigo-200 text-indigo-900 text-xs font-bold rounded-xl px-2 py-2 outline-none"
          >
            <option value={1}>១ ខែ</option>
            <option value={2}>២ ខែ</option>
            <option value={3}>៣ ខែ</option>
            <option value={6}>៦ ខែ</option>
            <option value={12}>១ ឆ្នាំ (១២ ខែ)</option>
          </select>
        </div>

        <button 
          onClick={handleQuickPay}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 size={16} />
          <span>កត់ត្រាការបង់ប្រាក់</span>
        </button>
      </div>

      {/* ជម្រើសកែប្រែដោយដៃ & មើលប្រវត្តិ */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button 
          onClick={() => setIsManualEditOpen(!isManualEditOpen)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <SlidersHorizontal size={14} /> Manual Edit
        </button>
        <button 
          onClick={handleOpenHistory}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <History size={14} /> ប្រវត្តិបង់ប្រាក់
        </button>
      </div>

      {/* ផ្ទាំង Manual Edit បើកលាត */}
      {isManualEditOpen && (
        <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs font-bold">
          <div>
            <label className="text-slate-400 block mb-1">ខែត្រូវបង់៖</label>
            <select 
              value={editForm.payment_month}
              onChange={e => setEditForm({ ...editForm, payment_month: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none"
            >
              {KHMER_MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">ស្ថានភាពពណ៌៖</label>
            <select 
              value={editForm.status_color}
              onChange={e => setEditForm({ ...editForm, status_color: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold"
            >
              <option value="yellow">🟡 រង់ចាំបង់ (លឿង)</option>
              <option value="blue">🔵 បានបង់ (ខៀវ)</option>
              <option value="red">🔴 បិទផ្អាក (ក្រហម)</option>
              <option value="black">⚫ មិនទាន់ចុះឈ្មោះ (ខ្មៅ)</option>
            </select>
          </div>
        </div>
      )}

      {/* ប៊ូតុង រក្សាទុក & បោះពុម្ព */}
      <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <button 
          onClick={handleUpdate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
        >
          <Save size={15} /> រក្សាទុក
        </button>
        <button 
          onClick={() => window.print()}
          className="bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
        >
          <Printer size={15} /> បោះពុម្ព
        </button>
      </div>

    </div>
  );
}