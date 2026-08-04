'use client';
import { CheckCircle, Clock, Download, Home, List, Wallet, CalendarDays, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ReportDashboard({
  currentUser, reportZone, setReportZone, uniqueZones,
  handleGlobalMonthChange, handleGlobalStatusChange, handleExportCSV,
  totalHouses, paidHouses, pendingHouses, closedHouses,
  monthlyRevenue, dailyRevenue, paginatedHouseholds,
  itemsPerPage, setItemsPerPage, currentPage, setCurrentPage, totalPages
}: any) {
  const monthsList = ['ខែមករា', 'ខែកកុម្ភៈ', 'ខែមីនា', 'ខែមេសា', 'ខែឧសភា', 'ខែមិថុនា', 'ខែកក្កដា', 'ខែសីហា', 'ខែកញ្ញា', 'ខែតុលា', 'ខែវិច្ឆិកា', 'ខែធ្នូ'];

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-50 pt-[80px] sm:pt-[100px] p-4 sm:p-6 lg:p-10 relative z-10">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div><h2 className="text-xl sm:text-2xl font-bold text-slate-800">របាយការណ៍ទូទៅ</h2><p className="text-xs sm:text-sm text-slate-500 mt-1">ទិន្នន័យស្ថិតិ និងការគ្រប់គ្រង</p></div>
          <div className="flex gap-2 flex-wrap items-center w-full md:w-auto">
            {currentUser?.role === 'super_admin' && (
              <select value={reportZone} onChange={e => setReportZone(e.target.value)} className="px-3 py-2 border rounded-lg text-xs sm:text-sm bg-indigo-50 font-bold text-indigo-700 outline-none shadow-sm border-indigo-200 cursor-pointer flex-1 md:flex-none">
                <option value="">🗺️ គ្រប់តំបន់ទាំងអស់</option>
                {uniqueZones.map((z: any) => <option key={z} value={z}>{z}</option>)}
              </select>
            )}
            {['admin', 'super_admin'].includes(currentUser?.role || '') && (
              <>
                <select onChange={handleGlobalMonthChange} defaultValue="" className="px-3 py-2 border rounded-lg text-xs sm:text-sm bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer flex-1 md:flex-none">
                  <option value="" disabled>⚙️ ប្តូរខែរួម</option>
                  {monthsList.map((m: any) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select onChange={handleGlobalStatusChange} defaultValue="" className="px-3 py-2 border rounded-lg text-xs sm:text-sm bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer flex-1 md:flex-none">
                  <option value="" disabled>⚙️ ប្តូរស្ថានភាពរួម</option>
                  <option value="blue">🔵 បានបង់</option>
                  <option value="yellow">🟡 មិនទាន់បង់</option>
                  <option value="red">🔴 បិទ</option>
                  <option value="black">⚫ បង់តែទុកសិន</option>
                </select>
              </>
            )}
            <button onClick={handleExportCSV} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-emerald-100 shadow-sm flex items-center justify-center cursor-pointer flex-1 md:flex-none w-full md:w-auto"><Download className="mr-1" size={16} /> ទាញយក CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"><div className="flex justify-between items-start mb-2"><span className="text-xs sm:text-sm font-bold text-slate-500">ផ្ទះសរុប</span><div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg text-indigo-500"><Home className="sm:w-5 sm:h-5" size={18} /></div></div><div className="text-2xl sm:text-3xl font-black text-slate-800">{totalHouses}</div></div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"><div className="flex justify-between items-start mb-2"><span className="text-xs sm:text-sm font-bold text-slate-500">បានបង់</span><div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg text-emerald-500"><CheckCircle className="sm:w-5 sm:h-5" size={18} /></div></div><div className="text-2xl sm:text-3xl font-black text-emerald-600">{paidHouses}</div></div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"><div className="flex justify-between items-start mb-2"><span className="text-xs sm:text-sm font-bold text-slate-500">រង់ចាំបង់</span><div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg text-amber-500"><Clock className="sm:w-5 sm:h-5" size={18} /></div></div><div className="text-2xl sm:text-3xl font-black text-amber-500">{pendingHouses}</div></div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"><div className="flex justify-between items-start mb-2"><span className="text-xs sm:text-sm font-bold text-slate-500">បិទ</span><div className="p-1.5 sm:p-2 bg-rose-50 rounded-lg text-rose-500"><XCircle className="sm:w-5 sm:h-5" size={18} /></div></div><div className="text-2xl sm:text-3xl font-black text-rose-600">{closedHouses}</div></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100"><div className="flex justify-between items-center mb-3 sm:mb-4"><h3 className="font-bold text-slate-800 text-sm sm:text-base">ចំណូលប្រចាំខែនេះ</h3><div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg text-emerald-500"><Wallet className="sm:w-6 sm:h-6" size={20} /></div></div><div className="text-2xl sm:text-4xl font-black text-emerald-600">{monthlyRevenue.toLocaleString()} ៛</div></div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-indigo-500"><div className="flex justify-between items-center mb-3 sm:mb-4"><h3 className="font-bold text-slate-800 text-sm sm:text-base">ចំណូលប្រចាំថ្ងៃនេះ (Today)</h3><div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg text-indigo-500"><CalendarDays className="sm:w-6 sm:h-6" size={20} /></div></div><div className="text-2xl sm:text-4xl font-black text-indigo-600">{dailyRevenue.toLocaleString()} ៛</div></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center text-sm sm:text-base"><List className="mr-2 text-indigo-500" size={18} />បញ្ជីឈ្មោះអតិថិជន</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-slate-500 font-bold hidden sm:inline">បង្ហាញ៖</span>
              <select value={itemsPerPage} onChange={e => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className="border px-2 py-1 rounded text-xs sm:text-sm outline-none font-bold text-indigo-700 bg-white shadow-sm cursor-pointer">
                <option value="10">10 ជួរ</option><option value="50">50 ជួរ</option><option value="100">100 ជួរ</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left text-slate-600">
              <thead className="bg-slate-100/50 text-slate-500 font-bold border-b">
                <tr><th className="px-4 sm:px-6 py-3 sm:py-4">លេខកូដ</th><th className="px-4 sm:px-6 py-3 sm:py-4">ឈ្មោះ</th><th className="px-4 sm:px-6 py-3 sm:py-4">តំបន់</th><th className="px-4 sm:px-6 py-3 sm:py-4">ខែត្រូវបង់</th><th className="px-4 sm:px-6 py-3 sm:py-4">ស្ថានភាព</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedHouseholds.length === 0 && <tr><td colSpan={5} className="text-center py-6 font-bold text-slate-400">គ្មានទិន្នន័យទេ</td></tr>}
                {paginatedHouseholds.map((h: any) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                    <td className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-800">{h.custom_id}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{h.customer_name || '---'}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">{h.zone || '---'}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">{h.payment_month}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      {h.status_color === 'blue' ? <span className="px-2 sm:px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] sm:text-xs font-bold border border-emerald-200">🔵 បានបង់</span> :
                      h.status_color === 'yellow' ? <span className="px-2 sm:px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] sm:text-xs font-bold border border-amber-200">🟡 មិនទាន់បង់</span> :
                      h.status_color === 'red' ? <span className="px-2 sm:px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] sm:text-xs font-bold border border-rose-200">🔴 បិទ</span> :
                      <span className="px-2 sm:px-3 py-1 bg-slate-200 text-slate-800 rounded-lg text-[10px] sm:text-xs font-bold border border-slate-300">⚫ ទុកសិន</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 bg-slate-50">
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold">បង្ហាញ {(currentPage-1)*itemsPerPage + 1} - {Math.min(currentPage*itemsPerPage, totalHouses)} នៃ {totalHouses}</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-white border rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 text-xs sm:text-sm font-bold flex items-center cursor-pointer"><ChevronLeft className="mr-1" size={16} /> ថយក្រោយ</button>
              <button onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 bg-white border rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 text-xs sm:text-sm font-bold flex items-center cursor-pointer">ទៅមុខ <ChevronRight className="ml-1" size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}