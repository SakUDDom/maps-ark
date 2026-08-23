'use client';
import React, { useState } from 'react';
import { 
  Users, CheckCircle2, Clock, XCircle, DollarSign, 
  Calendar, Download, ChevronLeft, ChevronRight, X, 
  Receipt, ArrowUpRight
} from 'lucide-react';

interface ReportDashboardProps {
  currentUser: any;
  reportZone: string;
  setReportZone: (zone: string) => void;
  uniqueZones: string[];
  handleGlobalMonthChange: (e: any) => void;
  handleGlobalStatusChange: (e: any) => void;
  handleExportCSV: () => void;
  totalHouses: number;
  paidHouses: number;
  pendingHouses: number;
  closedHouses: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  paginatedHouseholds: any[];
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  totalPages: number;
  payments?: any[];
}

export default function ReportDashboard({
  currentUser,
  reportZone,
  setReportZone,
  uniqueZones,
  handleGlobalMonthChange,
  handleGlobalStatusChange,
  handleExportCSV,
  totalHouses,
  paidHouses,
  pendingHouses,
  closedHouses,
  monthlyRevenue,
  dailyRevenue,
  paginatedHouseholds,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
  payments = []
}: ReportDashboardProps) {
  const [revenueModalType, setRevenueModalType] = useState<'monthly' | 'daily' | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const filteredTransactions = payments.filter((p: any) => {
    if (revenueModalType === 'daily') {
      return p.paid_at && p.paid_at.startsWith(todayStr);
    }
    if (revenueModalType === 'monthly') {
      return p.month === currentMonthNum && p.year === currentYearNum;
    }
    return false;
  });

  const modalTotal = filteredTransactions.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-8 overflow-y-auto mt-[64px]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ប៊ូតុង និង Filter ផ្នែកខាងលើ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">📊 ផ្ទាំងគ្រប់គ្រង & របាយការណ៍</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">ស្ថិតិ និងទិន្នន័យប្រមូលប្រាក់ទូទាំងប្រព័ន្ធ</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {currentUser?.role === 'super_admin' && (
              <select 
                value={reportZone} 
                onChange={(e) => { setReportZone(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
              >
                <option value="">គ្រប់តំបន់ទាំងអស់ (All Zones)</option>
                {uniqueZones.map((z: string) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            )}

            {['admin', 'super_admin'].includes(currentUser?.role) && (
              <>
                <select 
                  onChange={handleGlobalMonthChange} 
                  defaultValue=""
                  className="bg-slate-50 border border-slate-300 text-indigo-700 text-xs sm:text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>🗓️ ដូរខែត្រូវបង់ទាំងអស់</option>
                  {['ខែមករា', 'ខែកុម្ភៈ', 'ខែមីនា', 'ខែមេសា', 'ខែឧសភា', 'ខែមិថុនា', 'ខែកក្កដា', 'ខែសីហា', 'ខែកញ្ញា', 'ខែតុលា', 'ខែវិច្ឆិកា', 'ខែធ្នូ'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select 
                  onChange={handleGlobalStatusChange} 
                  defaultValue=""
                  className="bg-slate-50 border border-slate-300 text-amber-700 text-xs sm:text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>🎨 ដូរពណ៌ស្ថានភាពទាំងអស់</option>
                  <option value="yellow">🟡 រង់ចាំបង់ (លឿង)</option>
                  <option value="blue">🔵 បានបង់ (ខៀវ)</option>
                  <option value="red">🔴 បិទផ្អាក (ក្រហម)</option>
                  <option value="black">⚫ មិនទាន់ចុះឈ្មោះ (ខ្មៅ)</option>
                </select>
              </>
            )}

            <button 
              onClick={handleExportCSV} 
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* កាតស្ថិតិចំនួនផ្ទះ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">ផ្ទះសរុប</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalHouses.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600">បានបង់</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{paidHouses.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-500">រង់ចាំបង់</p>
              <h3 className="text-2xl font-black text-amber-500 mt-1">{pendingHouses.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-500">បិទ</p>
              <h3 className="text-2xl font-black text-rose-500 mt-1">{closedHouses.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
              <XCircle size={24} />
            </div>
          </div>
        </div>

        {/* 🚀 កាតចំណូលដែលអាចចុចបើកផ្ទាំងប្រតិបត្តិការបាន (Clickable Revenue Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => setRevenueModalType('monthly')}
            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-emerald-100 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm font-bold text-slate-500">ចំណូលប្រចាំខែនេះ</p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  ចុចមើលប្រតិបត្តិការ <ArrowUpRight size={12} />
                </span>
              </div>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">{monthlyRevenue.toLocaleString()} ៛</h3>
            </div>
            <div className="w-14 h-14 bg-emerald-50 group-hover:bg-emerald-500 text-emerald-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-colors">
              <DollarSign size={28} />
            </div>
          </div>

          <div 
            onClick={() => setRevenueModalType('daily')}
            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-blue-100 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm font-bold text-slate-500">ចំណូលប្រចាំថ្ងៃនេះ (Today)</p>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  ចុចមើលប្រតិបត្តិការ <ArrowUpRight size={12} />
                </span>
              </div>
              <h3 className="text-3xl font-black text-blue-600 mt-2">{dailyRevenue.toLocaleString()} ៛</h3>
            </div>
            <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-500 text-blue-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-colors">
              <Calendar size={28} />
            </div>
          </div>
        </div>

        {/* តារាងបញ្ជីផ្ទះ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base">បញ្ជីព័ត៌មានផ្ទះ</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">បង្ហាញ៖</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">លេខកូដ (ID)</th>
                  <th className="px-5 py-3.5">ឈ្មោះអតិថិជន</th>
                  <th className="px-5 py-3.5">តម្លៃសេវា</th>
                  <th className="px-5 py-3.5">ខែត្រូវបង់</th>
                  <th className="px-5 py-3.5">តំបន់ (Zone)</th>
                  <th className="px-5 py-3.5 text-center">ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedHouseholds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">មិនមានទិន្នន័យទេ</td>
                  </tr>
                ) : (
                  paginatedHouseholds.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-indigo-700">{h.custom_id}</td>
                      <td className="px-5 py-3.5 font-bold">{h.customer_name || 'មិនមានឈ្មោះ'}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600">៛ {Number(h.monthly_fee || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">{h.payment_month || '---'}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500">{h.zone || '---'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          h.status_color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          h.status_color === 'red' ? 'bg-rose-100 text-rose-700' :
                          h.status_color === 'black' ? 'bg-slate-800 text-white' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {h.status_color === 'blue' ? 'បានបង់' : h.status_color === 'red' ? 'បិទ' : h.status_color === 'black' ? 'មិនចុះឈ្មោះ' : 'រង់ចាំបង់'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">
              ទំព័រទី {currentPage} នៃ {totalPages || 1}
            </span>
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 🚀 ផ្ទាំង Pop-up បង្ហាញបញ្ជីប្រតិបត្តិការចំណូល (Transaction Detail Modal) */}
      {revenueModalType && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${revenueModalType === 'daily' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base sm:text-lg">
                    {revenueModalType === 'daily' ? '📅 ប្រតិបត្តិការចំណូលប្រចាំថ្ងៃនេះ (Today)' : '🗓️ ប្រតិបត្តិការចំណូលប្រចាំខែនេះ'}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    សរុបទឹកប្រាក់៖ <span className="text-emerald-600 font-black">៛ {modalTotal.toLocaleString()}</span> ({filteredTransactions.length} ប្រតិបត្តិការ)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setRevenueModalType(null)} 
                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 flex items-center justify-center shadow-sm cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 bg-slate-50/50 space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <Receipt className="mx-auto text-slate-300 mb-2" size={40} />
                  <p className="font-bold text-slate-500 text-sm">មិនទាន់មានប្រតិបត្តិការបង់ប្រាក់នៅឡើយទេ</p>
                </div>
              ) : (
                filteredTransactions.map((tx: any) => {
                  const d = new Date(tx.paid_at || tx.created_at || Date.now());
                  const formattedTime = isNaN(d.getTime()) ? '---' : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                  return (
                    <div key={tx.id} className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-700 text-sm">{tx.custom_id || 'ID#---'}</span>
                          <span className="text-xs font-bold text-slate-800">({tx.customer_name || 'មិនមានឈ្មោះ'})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-3">
                          <span>🕒 {formattedTime}</span>
                          <span>📍 តំបន់៖ <b>{tx.zone || '---'}</b></span>
                          {tx.collected_by && <span>👤 អ្នកប្រមូល៖ <b>{tx.collected_by}</b></span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-600 text-sm sm:text-base">
                          +៛ {Number(tx.amount || 0).toLocaleString()}
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                          ជោគជ័យ
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setRevenueModalType(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                បិទផ្ទាំង
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}