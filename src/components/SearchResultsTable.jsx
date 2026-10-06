import {useState} from 'react';
import ExportExcelButton from './ExportExcelButton';
import LiveDailyRateBreakdown from './DailyRateBreakdown';
import {rateFields,catalogFields,money} from '../services/rates';
export default function LiveSearchResultsTable({results,summary,searchParams,onExport,selectedRoomId,onRoomSelect,onRetryDay,retryingDate,retryDayError}) {
  const [rateTier,setRateTier]=useState('both');
  if(!results?.length) return null;
  const hasFree=rateFields(summary,'flexible').length>0;
  const activeTier=rateTier==='flexible'&&!hasFree?'both':rateTier;
  const fields=catalogFields(results,activeTier);
  return <div>
    <div className="bg-white/90 rounded-2xl p-4 mb-4 border border-slate-200">
      <div className="flex flex-wrap justify-between items-center mb-2">
        <label htmlFor="selected-room" className="font-bold text-slate-800">الغرفة المطلوب عرض جدول أسعارها اليومية وتصديرها</label>
        <span className="text-xs text-slate-500 font-medium">الترتيب يبدأ تلقائياً بالغرف الأكثر اكتمالاً لكامل المدة</span>
      </div>
      <select id="selected-room" value={selectedRoomId || results[0].id} onChange={e=>onRoomSelect?.(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none">
        {results.map(r=>{
          const directCount = r.breakfastDirectAvailableNights ?? r.roomOnlyDirectAvailableNights ?? r.breakfastAvailableNights ?? 0;
          const isFull = directCount === r.nights;
          return (
            <option key={r.id} value={r.id}>
              {r.sourceArabic} — {r.roomName} — {r.beddingLabel || 'لم يحدد المصدر السراير'} {isFull ? `• (مكتملة 100% لكامل الـ ${r.nights} ليلة)` : `• (متاحة مباشرة ${directCount}/${r.nights} ليلة)`} {r.bedFilterStatus==='unknown'?'[مطابقة غير مؤكدة]':''}
            </option>
          );
        })}
      </select>
    </div>
    <div className="flex flex-wrap justify-between items-center gap-3 mb-4"><div className="flex gap-2">{[['both','كل العروض'],['flexible','إلغاء مجاني']].map(([value,label])=><button type="button" key={value} disabled={value==='flexible'&&!hasFree} onClick={()=>setRateTier(value)} className={`px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-40 ${activeTier===value?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-700 border-slate-200'}`}>{label}</button>)}</div><ExportExcelButton results={results} summary={summary} searchParams={searchParams} rateTier={activeTier} onExport={onExport}/></div>
    {retryDayError && <p role="alert" className="mb-3 text-sm text-red-700 bg-red-50 rounded-xl p-3">{retryDayError}</p>}
    <LiveDailyRateBreakdown dailyBreakdown={summary?.dailyBreakdown} summary={summary} rateTier={activeTier} onRetryDay={onRetryDay} retryingDate={retryingDate}/>
    <div className="bg-white/90 rounded-3xl border border-slate-200 overflow-hidden mb-6"><h3 className="font-bold p-5">الغرف المتاحة لنفس عدد الأفراد</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3">الغرفة</th><th className="p-3">السراير</th>{fields.map(([key,label])=><th key={key} className="p-3 whitespace-nowrap">{label}</th>)}<th className="p-3">المصدر</th></tr></thead><tbody>{results.map(r=><tr key={r.id} className="border-t border-slate-100"><td className="p-3 whitespace-nowrap font-bold">{r.roomName}</td><td className="p-3 text-center text-xs">{r.beddingLabel || 'لم يحدد المصدر'}{r.bedFilterStatus==='unknown' && <p>مطابقة غير مؤكدة</p>}</td>{fields.map(([field])=><td key={field} className="p-3 text-center whitespace-nowrap"><div className="font-mono font-bold">{money(r[`${field}PricePerNight`])}</div><p className="text-xs text-slate-500 mt-1">متاح {r[`${field}AvailableNights`] || 0} / {r.nights} ليلة</p><p className="text-xs mt-1">المجموع: {money(r[`${field}TotalPrice`])}</p></td>)}<td className="p-3"><a href={r.bookingUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">فتح {r.sourceArabic || 'المسافر'}</a></td></tr>)}</tbody></table></div></div>
  </div>;
}

