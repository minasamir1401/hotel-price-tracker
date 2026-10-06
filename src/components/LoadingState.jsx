import React, { useState, useEffect } from 'react';
import { Loader2, Search, CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';

export default function LoadingState({ selectedSources = [], progress = null }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { title: 'تحليل الرابط وتحديد معرّف الفندق والموقع', icon: Search, minSec: 0 },
    { title: 'الاتصال بمحرك الحجز المباشر واستدعاء باقات الأسعار الحية', icon: Database, minSec: 2 },
    { title: 'استخراج تفاصيل الغرف وخيارات الوجبات (إقامة، إفطار، نصف إقامة)', icon: Layers, minSec: 5 },
    { title: 'استعلام الأسعار اليومية ومطابقة التواريخ بالريال السعودي', icon: ShieldCheck, minSec: 8 },
  ];

  const currentStepIndex = steps.reduce((curr, step, idx) => {
    return elapsedSeconds >= step.minSec ? idx : curr;
  }, 0);

  const sourcesText = selectedSources.map((s) => (s === 'almosafer' ? 'المسافر' : 'المطار')).join(' و ') || 'المسافر والمطار';

  return (
    <div className="bg-white/85 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl shadow-slate-950/5 p-8 sm:p-10 text-center max-w-2xl mx-auto">
      <div className="relative inline-flex items-center justify-center mb-5">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/15 backdrop-blur-md border border-blue-500/20 flex items-center justify-center text-blue-700 shadow-xs">
          <Search className="w-8 h-8 animate-pulse text-blue-600" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
        جاري استخراج الأسعار الحية (Scraping)...
      </h3>
      <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mb-5">
        يتم الآن إجراء استعلام مباشر ومطابقة تفاصيل الغرف والأسعار اليومية عبر {sourcesText}.
      </p>

      {/* Real-time Streaming Progress Bar */}
      {progress && progress.total > 0 && (
        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-br from-blue-50/90 to-indigo-50/80 rounded-2xl border border-blue-200/90 text-right shadow-sm">
          <div className="flex items-center justify-between gap-3 text-sm font-bold text-blue-950 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono text-xs">
                {progress.completed} / {progress.total}
              </span>
              <span>تم استخراج {progress.completed} من {progress.total} يوم (ليلة)</span>
            </div>
            <span className="font-mono text-base font-extrabold text-blue-700">
              {progress.percent || Math.round((progress.completed / progress.total) * 100)}%
            </span>
          </div>

          <div className="w-full h-3.5 bg-blue-100/90 rounded-full overflow-hidden p-0.5 border border-blue-200 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700 rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${Math.max(4, Math.min(100, progress.percent || Math.round((progress.completed / progress.total) * 100)))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 mt-2.5 font-medium">
            {progress.currentDay ? (
              <span>جاري استخراج ليلة: <strong className="font-mono text-slate-900">{progress.currentDay}</strong></span>
            ) : <span>جاري استخراج البيانات...</span>}
            <span>المتبقي: {Math.max(0, progress.total - progress.completed)} يوم</span>
          </div>
        </div>
      )}

      {/* Live elapsed timer badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 font-semibold mb-6">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
        <span>الوقت المنقضي: {elapsedSeconds} ثانية</span>
      </div>

      {/* Progress steps */}
      <div className="space-y-3 text-right max-w-md mx-auto mb-6">
        {steps.map((step, idx) => {
          const isDone = elapsedSeconds > step.minSec + 2;
          const isCurrent = idx === currentStepIndex && !isDone;
          const Icon = step.icon;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm transition-all ${
                isDone
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : isCurrent
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold shadow-xs'
                  : 'bg-slate-50/50 border-slate-100 text-slate-400'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <span className="flex-1">{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* Animated dots */}
      <div className="flex justify-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
      </div>
    </div>
  );
}
