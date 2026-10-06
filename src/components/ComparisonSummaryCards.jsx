import { money, mealPlans } from '../services/rates';
export default function LiveSummaryCards({summary,resultsCount}) {
  if(!summary) return null;
  return <div className="space-y-4 mb-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[["الفندق",summary.hotelName],["فترة الإقامة",`${summary.checkIn} إلى ${summary.checkOut}`],["الأفراد والغرف",`${summary.adults} بالغين لكل غرفة • ${summary.rooms} غرفة • إجمالي ${summary.adults*summary.rooms} بالغين • ${summary.nights} ليلة`],["خيارات الغرف",`${resultsCount} • ${summary.searchedAt}`]].map(([title,value])=><div key={title} className="bg-white/90 rounded-3xl border border-white p-5 shadow-sm"><p className="text-xs text-slate-500 mb-2">{title}</p><p className="font-bold text-sm text-slate-900">{value}</p></div>)}
    </div>
    <div className="bg-white/90 rounded-3xl border border-slate-200 p-5">
      <h3 className="font-bold mb-3">{summary.sourceArabic || 'المسافر'} — {summary.almosaferRoom}</h3>
      <p className="text-sm mb-3">السراير: {summary.beddingLabel || 'لم يحدد المصدر'}{summary.bedFilterStatus==='matched'?' • مطابقة لاختيار البحث':summary.bedFilterStatus==='unknown'?' • مطابقة غير مؤكدة':''}</p>
      <p className="text-xs text-slate-500 mb-4">أسعار حجوزات ليلة واحدة مستقلة. مجموعها قد يختلف عن سعر حجز إقامة متصلة.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {mealPlans.filter(([plan])=>plan==='roomOnly'||summary[`almosafer${plan[0].toUpperCase()+plan.slice(1)}AvailableNights`]>0).map(([plan,label])=>{
          const key=`almosafer${plan[0].toUpperCase()+plan.slice(1)}`;
          const available=summary[`${key}AvailableNights`] || 0;
          return <div key={plan} className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-sm font-bold">{summary.mealPlanLabels?.[plan] || label}</p><p className="font-mono font-bold text-lg mt-2">{money(summary[`${key}PerNight`])} {summary[`${key}PerNight`]!=null?'ر.س / متوسط الليلة':''}</p><p className="text-xs text-slate-600 mt-2">متاح {available} من {summary.nights} ليلة</p><p className="text-xs mt-2">مجموع الليالي لكل الغرف: {money(summary[key])} {summary[key]!=null?'ر.س':''}</p></div>;
        })}
      </div>
      {summary.warnings?.length>0&&<div role="alert" className="text-amber-900 bg-amber-50 rounded-xl p-3 mt-4 text-sm">{summary.warnings.join(' • ')}</div>}
    </div>
  </div>;
}
