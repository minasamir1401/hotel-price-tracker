import React from 'react';
import { AlertCircle, SearchX, RefreshCcw } from 'lucide-react';

export default function ErrorState({ type = 'error', message, onRetry }) {
  const isNoResults = type === 'no-results';

  return (
    <div className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl shadow-slate-950/5 p-10 text-center">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border shadow-2xs ${
          isNoResults
            ? 'bg-amber-500/15 text-amber-700 border-amber-500/20'
            : 'bg-red-500/15 text-red-700 border-red-500/20'
        }`}
      >
        {isNoResults ? (
          <SearchX className="w-7 h-7" />
        ) : (
          <AlertCircle className="w-7 h-7" />
        )}
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">
        {isNoResults ? 'لا توجد نتائج مطابقة' : 'حدث خطأ أثناء جلب الأسعار'}
      </h3>

      <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6">
        {message ||
          (isNoResults
            ? 'لم يتم العثور على أسعار مطابقة، حاول تعديل بيانات البحث أو اختيار تواريخ بديلة.'
            : 'حدث خطأ أثناء جلب الأسعار من الخادم، يرجى المحاولة مرة أخرى لاحقاً.')}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md transition-all shadow-md active:scale-95"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>إعادة المحاولة</span>
        </button>
      )}
    </div>
  );
}
