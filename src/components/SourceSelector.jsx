import React from 'react';
import { Check, Globe2, Plane } from 'lucide-react';

export default function SourceSelector({ selectedSources, onChange }) {
  const toggleSource = (sourceKey) => {
    let next;
    if (selectedSources.includes(sourceKey)) {
      if (selectedSources.length === 1) return;
      next = selectedSources.filter((s) => s !== sourceKey);
    } else {
      next = [...selectedSources, sourceKey];
    }
    onChange(next);
  };

  const selectBoth = () => {
    onChange(['almosafer', 'almatar']);
  };

  const isAlmosafer = selectedSources.includes('almosafer');
  const isAlmatar = selectedSources.includes('almatar');
  const isBoth = isAlmosafer && isAlmatar;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-800">
          اختر مصادر البحث
          <span className="text-red-500 font-normal mr-1">*</span>
        </label>
        <button
          type="button"
          onClick={selectBoth}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md transition-all ${
            isBoth
              ? 'bg-blue-100/90 text-blue-700 border border-blue-200'
              : 'bg-white/60 text-slate-700 hover:text-blue-600 hover:bg-white/90 border border-white/60'
          }`}
        >
          تحديد الاثنين معاً (Both)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Almosafer Card */}
        <div
          onClick={() => toggleSource('almosafer')}
          className={`relative flex items-center p-4 border rounded-2xl cursor-pointer backdrop-blur-md transition-all select-none ${
            isAlmosafer
              ? 'bg-blue-50/85 border-blue-500/80 shadow-sm'
              : 'bg-white/60 border-white/60 hover:bg-white/80 hover:border-slate-300/80'
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isAlmosafer ? 'bg-blue-600 text-white shadow-xs' : 'bg-white/80 text-slate-600 border border-slate-200/50'
              }`}
            >
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">المسافر</span>
                <span className="text-xs text-slate-500 font-mono">Almosafer</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تغطية الفنادق وحجوزات الخليج والدولية
              </p>
            </div>
          </div>
          <div
            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
              isAlmosafer
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-300 bg-white/80'
            }`}
          >
            {isAlmosafer && <Check className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Almatar Card */}
        <div
          onClick={() => toggleSource('almatar')}
          className={`relative flex items-center p-4 border rounded-2xl cursor-pointer backdrop-blur-md transition-all select-none ${
            isAlmatar
              ? 'bg-blue-50/85 border-blue-500/80 shadow-sm'
              : 'bg-white/60 border-white/60 hover:bg-white/80 hover:border-slate-300/80'
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isAlmatar ? 'bg-blue-600 text-white shadow-xs' : 'bg-white/80 text-slate-600 border border-slate-200/50'
              }`}
            >
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">المطار</span>
                <span className="text-xs text-slate-500 font-mono">Almatar</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                عروض وأسعار فنادق الشرق الأوسط والعالم
              </p>
            </div>
          </div>
          <div
            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
              isAlmatar
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-300 bg-white/80'
            }`}
          >
            {isAlmatar && <Check className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {selectedSources.length === 0 && (
        <p className="text-xs text-red-600 font-medium">
          يجب تحديد مصدر بحث واحد على الأقل للمتابعة.
        </p>
      )}
    </div>
  );
}
