import React from 'react';
import { Activity, FileSpreadsheet, Globe2, Plane } from 'lucide-react';

export default function SystemStatusPanel({ status }) {
  const getStatusBadge = (state) => {
    switch (state) {
      case 'unchecked':
        return <span className="text-xs font-semibold text-slate-600">لم يُفحص الاتصال بعد</span>;
      case 'blocked':
        return <span className="text-xs font-semibold text-red-700">المصدر رفض الاتصال</span>;
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            جاهز (Ready)
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            تحذير (Warning)
          </span>
        );
      case 'offline':
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            غير متصل
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            غير معروف
          </span>
        );
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl shadow-slate-950/5 p-5 sm:p-6">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 backdrop-blur-md text-blue-700 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            فحص حالة النظام ومحركات الاستخراج (System Checks)
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          آخر فحص: {status.lastSearch || 'الآن'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Almosafer Engine */}
        <div className="flex items-center justify-between p-3 rounded-2xl border border-white/60 bg-white/50 backdrop-blur-md hover:bg-white/70 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/90 border border-slate-200/50 flex items-center justify-center text-slate-700 shadow-2xs">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">محرك المسافر</div>
              <div className="text-[11px] text-slate-500 font-mono">Almosafer API / Scraper</div>
            </div>
          </div>
          <div>{getStatusBadge(status.almosafer)}</div>
        </div>

        {/* Almatar Engine */}
        <div className="flex items-center justify-between p-3 rounded-2xl border border-white/60 bg-white/50 backdrop-blur-md hover:bg-white/70 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/90 border border-slate-200/50 flex items-center justify-center text-slate-700 shadow-2xs">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">محرك المطار</div>
              <div className="text-[11px] text-slate-500 font-mono">Almatar API / Scraper</div>
            </div>
          </div>
          <div>{getStatusBadge(status.almatar)}</div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl border border-white/60 bg-white/50">
          <div><div className="text-xs font-bold text-slate-900">محرك بوكينج</div><div className="text-[11px] text-slate-500 font-mono">Booking Android app</div></div>
          <div>{getStatusBadge(status.booking)}</div>
        </div>
        {/* Excel Export Engine */}
        <div className="flex items-center justify-between p-3 rounded-2xl border border-white/60 bg-white/50 backdrop-blur-md hover:bg-white/70 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/90 border border-slate-200/50 flex items-center justify-center text-slate-700 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">تصدير Excel</div>
              <div className="text-[11px] text-slate-500 font-mono">SheetJS XLSX Engine</div>
            </div>
          </div>
          <div>{getStatusBadge(status.excelExport)}</div>
        </div>
      </div>

      {status.errors && status.errors.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {status.errors.map((err, idx) => (
            <div key={idx}>{err}</div>
          ))}
        </div>
      )}
    </div>
  );
}
