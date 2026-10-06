import { money, rateFields } from '../services/rates';
export default function LiveDailyRateBreakdown({dailyBreakdown,summary,rateTier='both',onRetryDay,retryingDate}) {
  if(!dailyBreakdown?.length) return null;
  const fields=rateFields(summary,rateTier).map(([field,label])=>[`almosafer${field[0].toUpperCase()+field.slice(1)}`,label]);
  const hasAvailable = dailyBreakdown.some(d => fields.some(([key]) => d[key] !== null && d[key] !== undefined && d.almosaferAvailability !== 'unavailable' && d.almosaferAvailability !== 'error'));
  if (!hasAvailable) return null;
  const hasAlternatives = dailyBreakdown.some(d=>d.isAlternative);
  return <div className="bg-white/90 rounded-3xl border border-slate-200 overflow-hidden mb-6">
    <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
      <div>
        <h3 className="font-bold text-slate-900">الأسعار اليومية المباشرة — {summary?.almosaferRoom || summary?.roomName || 'تفاصيل الغرفة'}</h3>
        <p className="text-xs text-slate-500 mt-1">السعر لكل غرفة ولليلة واحدة مستخرج مباشرة عبر API. غير متاح = لا يوجد عرض بهذه الخطة.</p>
      </div>
      {hasAlternatives && (
        <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-3 py-1 font-medium">
          تم توفير أسعار حقيقية مباشرة من بدائل مطابقة لليالي التي نفدت فيها الفئة المحددة
        </span>
      )}
    </div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{['اليوم','التاريخ',...fields.map(f=>f[1]),'فرق الفطور للغرفة','حالة اليوم'].map(title=><th key={title} className="p-3 text-center whitespace-nowrap">{title}</th>)}</tr></thead>
      <tbody>{dailyBreakdown.map(d=><tr key={d.date} className={`border-t border-slate-100 ${d.isAlternative ? 'bg-amber-50/30' : ''}`}>
        <td className="p-3 text-center font-medium">{d.dayOfWeek}</td>
        <td className="p-3 text-center font-mono">{d.date}</td>
        {fields.map(([key])=><td key={key} className="p-3 text-center font-mono whitespace-nowrap" title={d.almosaferError || ''}>
          {d.almosaferAvailability==='error'?'تعذر التحقق':money(d[key])}
          {d[`${key}IsAlternative`] && d[key] !== null && (
            <span className="block text-[10px] text-amber-800 bg-amber-100/80 rounded px-1.5 py-0.5 mt-0.5 font-sans" title={`سعر حقيقي مستخرج من الغرفة البديلة: ${d.alternativeRoomName}`}>
              بديل متاح: {d.alternativeRoomName}
            </span>
          )}
        </td>)}
        <td className="p-3 text-center font-mono text-xs">
          {d.almosaferBreakfastMealDiff === 0 ? (
            <span className="inline-block text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-sans font-semibold">مشمول في السعر</span>
          ) : d.almosaferBreakfastMealDiff !== null ? (
            <span>+{money(d.almosaferBreakfastMealDiff)}</span>
          ) : (
            'غير متاح'
          )}
        </td>
        <td className="p-3 text-center text-xs">
          {d.almosaferAvailability==='error' ? (
            <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded">تعذر التحقق</span>
          ) : d.isAlternative ? (
            <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">متاح عبر بديل: {d.alternativeRoomName}</span>
          ) : d.almosaferAvailability==='unavailable' ? (
            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">لا توجد غرفة متاحة</span>
          ) : (
            <span className="text-slate-700">{d.almosaferCancellation}</span>
          )}
          {onRetryDay && ['error','unavailable'].includes(d.almosaferAvailability) && (
            <button type="button" disabled={Boolean(retryingDate)} onClick={()=>onRetryDay(d.date)}
              className="block mx-auto mt-2 text-blue-700 underline disabled:opacity-50"
              aria-label={`إعادة التحقق من يوم ${d.date}`}>
              {retryingDate===d.date?'جاري التحقق…':'إعادة التحقق'}
            </button>
          )}
        </td>
      </tr>)}</tbody>
      <tfoot className="bg-slate-100 font-bold border-t"><tr>
        <td colSpan={2} className="p-3">مجموع {dailyBreakdown.length} ليلة × {summary?.rooms || 1} غرفة</td>
        {fields.map(([key])=><td key={key} className="p-3 text-center font-mono text-blue-700 font-extrabold">{money(summary?.[key])}</td>)}
        <td colSpan={2} className="p-3 text-xs text-slate-600 font-normal">
          {summary?.[fields[0]?.[0]] ? (hasAlternatives ? 'مجموع الليالي محتسب بالأسعار الحقيقية المباشرة' : 'إجمالي الليالي المكتملة') : 'المجموع يظهر عند توفر أسعار كل الليالي'}
        </td>
      </tr></tfoot>
    </table></div>
  </div>;
}
