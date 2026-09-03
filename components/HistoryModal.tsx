'use client';
import React from 'react';
import { History, X, Clock, CheckCircle, RotateCcw } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  historyData: any[];
  onUndoPayment: (paymentId: string, monthStr: string) => void;
  monthsList: string[];
}

export default function HistoryModal({
  isOpen,
  onClose,
  isLoading,
  historyData,
  onUndoPayment,
  monthsList
}: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md h-[80%] max-h-[600px] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-indigo-50/80 flex justify-between items-center">
          <h3 className="font-black text-indigo-900 text-base sm:text-lg flex items-center gap-2">
            <History className="text-indigo-600" size={20} />
            ប្រវត្តិបង់ប្រាក់
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-rose-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-slate-200 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
              <Clock className="animate-spin text-indigo-500 mb-3" size={32} />
              <p className="font-bold text-sm">កំពុងទាញយកទិន្នន័យ...</p>
            </div>
          ) : historyData.length === 0 ? (
            <div className="text-center text-slate-500 font-bold py-10 bg-white rounded-2xl border border-slate-200 shadow-sm">
              មិនមានប្រវត្តិបង់ប្រាក់ទេ
            </div>
          ) : (
            <>
              <div className="text-center mb-2 text-xs font-bold text-slate-500 bg-white py-2 rounded-xl border border-slate-200 shadow-sm">
                ប្រវត្តិបង់ប្រាក់កន្លងមក (សរុប៖ {historyData.length})
              </div>

              {historyData.map((record) => {
                const dateObj = new Date(record.paid_at || record.created_at || Date.now());
                const formattedDate = isNaN(dateObj.getTime())
                  ? '---'
                  : `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()} - ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                
                const khmerMonthDisplay = monthsList[record.month - 1] || `ខែទី ${record.month}`;

                return (
                  <div key={record.id} className="flex justify-between items-center p-3.5 bg-white border-l-4 border-emerald-500 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <div className="font-bold text-slate-800 text-sm sm:text-base">
                        {khmerMonthDisplay} ឆ្នាំ {record.year}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                        <Clock size={12} /> {formattedDate}
                      </div>
                      <div className="text-xs sm:text-sm font-black text-emerald-600 mt-1">
                        ៛ {Number(record.amount || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] border border-emerald-200 flex items-center gap-1">
                        <CheckCircle size={13} /> បានបង់
                      </div>
                      <button 
                        onClick={() => onUndoPayment(record.id, khmerMonthDisplay)} 
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-200 transition-colors shadow-sm cursor-pointer" 
                        title="លុបការបង់ប្រាក់ខែនេះ"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

      </div>
    </div>
  );
}