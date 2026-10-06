import {useState} from 'react';
import ExportExcelButton from './ExportExcelButton';
import LiveDailyRateBreakdown from './DailyRateBreakdown';
import {rateFields} from '../services/rates';
export default function LiveSearchResultsTable({results,summary,searchParams,onExport,selectedRoomId,onRoomSelect,onRetryDay,retryingDate,retryDayError}) {
  const [rateTier,setRateTier]=useState('both');
  if(!results?.length) return null;
  const hasFree=rateFields(summary,'flexible').length>0;
  const activeTier=rateTier==='flexible'&&!hasFree?'both':rateTier;
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
  </div>;
}

