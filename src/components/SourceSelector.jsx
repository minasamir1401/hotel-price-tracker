import React from 'react';
import { Check, Globe2, Plane, Building2 } from 'lucide-react';
const sources = [
  { key: 'almosafer', name: 'المسافر', english: 'Almosafer', icon: Globe2, description: 'أسعار الفنادق من المسافر' },
  { key: 'almatar', name: 'المطار', english: 'Almatar', icon: Plane, description: 'أسعار الفنادق من المطار' },
  { key: 'booking', name: 'بوكينج', english: 'Booking', icon: Building2, description: 'أسعار تطبيق Booking للأندرويد' },
];
export default function SourceSelector({ selectedSources, onChange }) {
  const toggle = key => {
    if (selectedSources.includes(key)) {
      if (selectedSources.length > 1) onChange(selectedSources.filter(s => s !== key));
    } else onChange([...selectedSources, key]);
  };
  return <div className="space-y-3">
    <div className="flex items-center justify-between">
      <label className="block text-sm font-semibold text-slate-800">اختر مصادر البحث <span className="text-red-500">*</span></label>
      <button type="button" onClick={() => onChange(sources.map(s => s.key))} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700">تحديد الكل</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {sources.map(({ key, name, english, description, icon: Icon }) => {
        const selected = selectedSources.includes(key);
        return <button key={key} type="button" aria-pressed={selected} onClick={() => toggle(key)} className={`flex items-center gap-3 text-right p-4 border rounded-2xl transition-all ${selected ? 'bg-blue-50/85 border-blue-500/80 shadow-sm' : 'bg-white/60 border-white/60 hover:bg-white/80'}`}>
          <Icon className={`w-5 h-5 shrink-0 ${selected ? 'text-blue-600' : 'text-slate-500'}`} />
          <div className="flex-1"><div className="font-bold text-slate-900 text-sm">{name} <span className="text-xs text-slate-500 font-mono">{english}</span></div><p className="text-xs text-slate-500 mt-0.5">{description}</p></div>
          {selected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
        </button>;
      })}
    </div>
    {selectedSources.includes('booking') && <p className="text-xs text-slate-600">Booking: أدخل رابط الفندق الذي يحتوي hotel_id أو dest_id وdest_type=hotel، أو الرقم بصيغة booking:184752. متاح حاليًا لغرفة واحدة بدون أطفال.</p>}
  </div>;
}
