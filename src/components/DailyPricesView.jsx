import React from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { dailyMealPlans, hasPrice, buildDailyPricesWorkbook } from '../services/dailyPricesExport';

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '' || value === 'غير متاح') return 'غير متاح';
  const num = Number(value);
  if (!Number.isFinite(num)) return 'غير متاح';
  if (Number.isInteger(num)) {
    return num.toLocaleString('en-US');
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function DailyPricesView({ data }) {
  const [hideUnavailableDays, setHideUnavailableDays] = React.useState(false);
  const rows = data?.rows || [];
  
  // Filter out any column that has no prices available in any row, or fallback to standard columns
  const activeColumns = dailyMealPlans.filter(([key]) =>
    rows.some(row => hasPrice(row, key))
  );
  const displayColumns = activeColumns.length > 0
    ? activeColumns
    : dailyMealPlans.slice(0, 2);
  
  const fields = [
    ['date', 'التاريخ'],
    ['dayName', 'اليوم'],
    ...displayColumns,
    ['dayStatus', 'سياسة الإلغاء'],
  ];

  const available = rows.filter(row => displayColumns.some(([key]) => key !== 'breakfastDiff' && hasPrice(row, key))).length;
  const failures = rows.filter(row => row.error).length;

  if (!rows.length) return null;

  const displayedRows = hideUnavailableDays
    ? rows.filter(row => displayColumns.some(([key]) => key !== 'breakfastDiff' && hasPrice(row, key)))
    : rows;

  function exportExcel() {
    const wb = buildDailyPricesWorkbook(data, true, hideUnavailableDays);
    const sanitizedHotel = (data?.hotelName || 'اسعار_الفندق').replace(/[\\/:*?"<>|]/g, '_');
    const sanitizedRoom = (data?.roomName || 'غرفة').replace(/[\\/:*?"<>|]/g, '_');
    XLSX.writeFile(wb, `${sanitizedHotel}_${sanitizedRoom}_${data.checkIn}_${data.checkOut}.xlsx`);
  }

  return <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-right shadow-sm" dir="rtl">
    <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-lg text-slate-900">{data.hotelName}</h2>
          {data.hotelNameEn && data.hotelName !== data.hotelNameEn && (
            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {data.hotelNameEn}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-700 mt-1 font-medium">{data.roomName || data.roomKeywords?.join('، ')} — {data.adults} بالغين — {data.rooms} غرفة</p>
        <p className="text-xs text-slate-500 mt-1">الأسعار المعروضة لكل غرفة في الليلة بالريال السعودي، شاملة الضريبة وخصم المصدر المباشر.</p>
        <p className="text-xs text-slate-400 mt-1.5">وقت الجلب: {new Date(data.fetchedAt).toLocaleString('ar-SA')} (تحديث مباشر عبر API). النقر على بحث يجدد الأسعار حياً.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors select-none shadow-xs">
          <input
            type="checkbox"
            checked={hideUnavailableDays}
            onChange={e => setHideUnavailableDays(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span>إخفاء الأيام غير المتاحة</span>
        </label>
        <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm">
          <Download size={16} />
          <span>تصدير Excel</span>
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {fields.map(([key, title]) => (
              <th key={key} className={`px-4 py-3 whitespace-nowrap font-bold text-slate-800 ${key === 'breakfastDiff' ? 'text-center' : 'text-right'}`}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {displayedRows.map(row => {
            const hasAnyPrice = displayColumns.some(([key]) => key !== 'breakfastDiff' && hasPrice(row, key));
            return (
              <tr key={row.date} className={`transition-colors ${row.error ? 'bg-amber-50/80' : hasAnyPrice ? 'hover:bg-slate-50/80' : 'bg-red-50/60'}`}>
                <td className="px-4 py-3 font-mono whitespace-nowrap text-slate-700 font-medium" dir="ltr">{row.date}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-medium">{row.dayName}</td>
                {displayColumns.map(([key]) => {
                  if (key === 'breakfastDiff') {
                    const diffVal = row.breakfastDiff;
                    const rawDiff = row.rawBreakfastDiff;
                    const isAvailable = diffVal !== null && diffVal !== undefined && diffVal !== 'غير متاح' && !isNaN(Number(diffVal));
                    const num = Number(diffVal);
                    return (
                      <td key={key} className="px-4 py-3 text-center whitespace-nowrap tabular-nums">
                        {isAvailable ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200/60">
                              <span>{num > 0 ? `+${formatPrice(num)}` : formatPrice(num)}</span>
                              <span className="text-[10px] font-normal text-blue-500">ر.س</span>
                            </span>
                            {rawDiff !== null && rawDiff !== undefined && Math.abs(rawDiff - num) > 0.001 && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5" title="الفرق الدقيق بالهللات">
                                ({rawDiff > 0 ? `+${rawDiff.toFixed(2)}` : rawDiff.toFixed(2)} ر.س)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  }

                  const p = row[key];
                  const orig = row.originalPrices?.[key];
                  const raw = row.rawPrices?.[key];
                  const hasDiscount = orig && p !== 'غير متاح' && Number(orig) > Number(p);
                  const isAvailable = p !== 'غير متاح' && p !== null && p !== undefined && !isNaN(Number(p));

                  return (
                    <td key={key} className="px-4 py-3 tabular-nums">
                      {isAvailable ? (
                        <div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900 text-sm">{formatPrice(p)}</span>
                            <span className="text-[11px] text-slate-500 font-medium">ر.س</span>
                          </div>
                          {hasDiscount && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <span>بدلاً من</span>
                              <span className="line-through">{formatPrice(orig)}</span>
                            </div>
                          )}
                          {raw !== null && raw !== undefined && Math.abs(raw - Number(p)) > 0.001 && (
                            <span className="text-[10px] text-slate-400 font-mono" title="السعر الدقيق بعد الخصم مع الهللات">
                              ({raw.toFixed(2)} ر.س)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-slate-400 text-xs font-normal">غير متاح</span>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                    row.dayStatus === 'قابل للإسترداد' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : row.dayStatus === 'غير قابل للإسترداد'
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : row.error 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {hasAnyPrice ? row.dayStatus : row.error ? 'تعذر التحقق' : 'غير متاح'}
                  </span>
                  {row.error && <p className="mt-1 text-xs text-amber-700">{row.error}</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="px-5 py-4 bg-slate-50 text-sm text-slate-600 flex flex-wrap justify-between items-center gap-2 border-t border-slate-200">
      <div>
        {available} ليلة متاحة من {data.nights}، {rows.length - available - failures} غير متاحة، {failures} تعذر التحقق منها.
        <p className="mt-1 text-xs text-slate-500">كل سعر لحجز ليلة واحدة مستقلة بالريال السعودي. لا يمثل مجموع الليالي عرض إقامة متصلة، والأسعار قابلة للتغير وفقاً للمصدر.</p>
      </div>
      {activeColumns.length < dailyMealPlans.length && (
        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg">
          تم إخفاء الأعمدة غير المتوفرة بالكامل تلقائياً ({dailyMealPlans.length - activeColumns.length} عمود)
        </span>
      )}
    </div>
  </section>;
}
