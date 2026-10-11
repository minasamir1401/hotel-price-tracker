import React from 'react';
import { Building, ArrowUp } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border-2 border-dashed border-white/80 p-12 text-center shadow-xl shadow-slate-950/5">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/15 backdrop-blur-md text-blue-700 flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-xs">
        <Building className="w-8 h-8 text-blue-600" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">
        ابدأ بإدخال بيانات الفندق واختيار مصدر البحث
      </h3>
      <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6">
        قم بملء حقول البحث وتحديد المصادر (المسافر أو المطار أو Booking) للاطلاع على مقارنة الأسعار المباشرة واكتشاف العرض الأوفر.
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-white/80 text-xs font-semibold text-slate-700 shadow-2xs">
        <ArrowUp className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
        <span>استخدم بطاقة البحث في الأعلى لبدء الاستعلام</span>
      </div>
    </div>
  );
}
