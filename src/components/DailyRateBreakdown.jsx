import { money, rateFields, sumPriceParts, repeatedRateField } from '../services/rates';
import PriceBreakdown from './PriceBreakdown';
export default function LiveDailyRateBreakdown({dailyBreakdown,summary,rateTier='both',onRetryDay,retryingDate}) {
  if(!dailyBreakdown?.length) return null;
  const availableFields=rateFields(summary,rateTier);
  const activeFields=availableFields.length?availableFields:[['roomOnly','إقامة فقط']];
  const fields=activeFields.map(([field,label])=>[`almosafer${field[0].toUpperCase()+field.slice(1)}`,label,field]);
  const hasAlternatives = dailyBreakdown.some(d=>d.isAlternative);
  return <div className="bg-white/90 rounded-3xl border border-slate-200 overflow-hidden mb-6">
    <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
      <div>
        <h3 className="font-bold text-slate-900">الأسعار اليومية المباشرة — {summary?.sourceArabic || 'المسافر'} — {summary?.almosaferRoom || summary?.roomName || 'تفاصيل الغرفة'}</h3>
        {/Room Assigned on Arrival/i.test(summary?.almosaferRoom || summary?.roomName || '') && <p className="text-sm text-indigo-700 mt-2">نوع الغرفة يُحدد عند الوصول حسب عرض الشريك.</p>}
        <p className="text-sm text-slate-600 mt-2">السراير: {summary.beddingLabel || 'لم يحدد المصدر'}{summary.roomSizeM2>0 ? ` • مساحة الغرفة: ${summary.roomSizeM2} م²` : ''}</p>
        {summary.roomAmenities?.length>0 && <p className="text-xs text-slate-600 mt-2" dir="auto">{summary.roomAmenities.join(' • ')}</p>}
        {summary.roomDescription && <details className="text-xs text-slate-600 mt-2 max-w-3xl"><summary className="cursor-pointer">وصف الغرفة حسب المصدر</summary><p className="mt-2" dir="auto">{summary.roomDescription}</p></details>}
        <p className="text-xs text-slate-500 mt-1">{summary.adults} بالغين لكل غرفة • {summary.rooms} غرفة • الأسعار بالريال لكل غرفة وليلة. السعر بدون الضرائب، وتحته الضرائب والرسوم والإجمالي حسب تفصيل المصدر.</p>
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
        <td className="p-3 text-center font-mono whitespace-nowrap">{d.date}</td>
        {fields.map(([key,,field])=><td key={key} className="p-3 text-center align-top" title={d.almosaferError || ''}>
          {d.almosaferAvailability==='error'?'تعذر التحقق':repeatedRateField(d,field,activeFields)?<span className="text-xs text-slate-500">نفس عرض الإلغاء المجاني</span>:<PriceBreakdown total={d[key]} offer={d.almosaferOffers?.[field]} showPolicy/>}
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
        {fields.map(([key,,field])=><td key={key} className="p-3 text-center"><PriceBreakdown total={summary?.[key]} parts={sumPriceParts(dailyBreakdown,field,summary?.rooms || 1)}/></td>)}
        <td colSpan={2} className="p-3 text-xs text-slate-600 font-normal">
          {summary?.[fields[0]?.[0]] ? (hasAlternatives ? 'مجموع الليالي محتسب بالأسعار الحقيقية المباشرة' : 'إجمالي الليالي المكتملة') : 'المجموع يظهر عند توفر أسعار كل الليالي'}
        </td>
      </tr></tfoot>
    </table></div>
  </div>;
}
