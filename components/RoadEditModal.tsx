'use client';
import React from 'react';
import { Road, X } from 'lucide-react';

interface RoadEditModalProps {
  roadEditData: any;
  setRoadEditData: (data: any) => void;
  onSave: () => void;
}

export default function RoadEditModal({
  roadEditData,
  setRoadEditData,
  onSave
}: RoadEditModalProps) {
  if (!roadEditData) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5 sm:p-6 transform transition-all border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-indigo-900 text-base sm:text-lg flex items-center">
            <Road className="mr-2 text-indigo-600" size={20} />
            {roadEditData.isNew ? 'បន្ថែមផ្លូវថ្មី' : 'ព័ត៌មានផ្លូវ & កែប្រែ'}
          </h3>
          <button 
            onClick={() => setRoadEditData(null)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <label className="block text-[11px] font-bold text-slate-500 mb-1">ឈ្មោះផ្លូវ (Road Name):</label>
        <input 
          type="text" 
          placeholder="ឧ. ផ្លូវលេខ ០៧"
          value={roadEditData.name || ''} 
          onChange={e => setRoadEditData({ ...roadEditData, name: e.target.value })} 
          className="w-full border border-slate-200 p-2.5 mb-3 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm bg-slate-50" 
        />

        <label className="block text-[11px] font-bold text-slate-500 mb-1">ទំហំផ្លូវ (Width e.g. 8m):</label>
        <input 
          type="text" 
          placeholder="ឧ. 8m"
          value={roadEditData.width || ''} 
          onChange={e => setRoadEditData({ ...roadEditData, width: e.target.value })} 
          className="w-full border border-slate-200 p-2.5 mb-3 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm bg-slate-50" 
        />

        <label className="block text-[11px] font-bold text-slate-500 mb-1">អាសយដ្ឋាន (Address):</label>
        <input 
          type="text" 
          placeholder="ឧ. ភូមិទី ៣"
          value={roadEditData.address || ''} 
          onChange={e => setRoadEditData({ ...roadEditData, address: e.target.value })} 
          className="w-full border border-slate-200 p-2.5 mb-3 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm bg-slate-50" 
        />

        <label className="block text-[11px] font-bold text-slate-500 mb-1">ប្រភេទផ្លូវ (Road Type):</label>
        <select 
          value={roadEditData.road_type || 'Land road'} 
          onChange={e => setRoadEditData({ ...roadEditData, road_type: e.target.value })} 
          className="w-full border border-slate-200 p-2.5 mb-5 rounded-xl outline-none focus:border-indigo-500 font-bold bg-slate-50 text-indigo-700 text-sm"
        >
          <option value="Land road">Land road (ផ្លូវដី - ក្រហម)</option>
          <option value="Concrete road">Concrete road (ផ្លូវបេតុង - លឿង)</option>
          <option value="Hight Ways road">Hight Ways road (ផ្លូវហាយវេ - ខៀវ)</option>
          <option value="Asphalt road">Asphalt road (ផ្លូវកៅស៊ូរ - ស្វាយ)</option>
          <option value="Nation road">Nation road (ផ្លូវជាតិ - បៃតង)</option>
        </select>

        <div className="flex gap-2">
          <button 
            onClick={onSave} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 py-3 rounded-xl font-bold shadow-md transition-colors cursor-pointer text-sm"
          >
            រក្សាទុក
          </button>
          <button 
            onClick={() => setRoadEditData(null)} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 flex-1 py-3 rounded-xl font-bold transition-colors cursor-pointer text-sm"
          >
            បោះបង់
          </button>
        </div>
      </div>
    </div>
  );
}