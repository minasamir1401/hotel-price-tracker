import React from 'react';
import { Building2, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Header({ systemReady, onRefreshStatus }) {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-white/50 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/90 backdrop-blur-md flex items-center justify-center text-white shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              لوحة مقارنة أسعار الفنادق
            </h1>
            <p className="text-xs text-slate-600 font-medium hidden sm:block">
              Hotel Price Comparison Dashboard | Almosafer & Almatar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/60 text-slate-700 text-xs font-semibold shadow-2xs">
            <span>العملة الافتراضية:</span>
            <span className="text-blue-600 font-bold">ريال سعودي (SAR)</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 text-emerald-800 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{systemReady ? 'محركات البحث جاهزة' : 'فحص الاتصال'}</span>
          </div>

          <button
            type="button"
            onClick={onRefreshStatus}
            title="تحديث حالة النظام"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white/80 backdrop-blur-md rounded-xl transition-all border border-transparent hover:border-white/60"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
