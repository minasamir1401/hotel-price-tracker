import * as XLSX from 'xlsx';
import { rateFields, catalogFields } from './rates.js';
const value = n => n==null ? 'غير متاح' : n;
export function getCleanHotelName(searchParams,summary,results) { return summary?.hotelName || results?.[0]?.hotelName || searchParams.hotelInput; }
export function getCleanRoomName(searchParams,summary,results) { return summary?.almosaferRoom || results?.[0]?.roomName || ''; }
export function getExportFileName(searchParams,results,summary) {
  const name=`${summary.sourceArabic || 'المسافر'} - ${getCleanHotelName(searchParams,summary,results)} - ${getCleanRoomName(searchParams,summary,results)} - ${summary.rooms} غرفة - ${summary.adults} بالغين لكل غرفة - ${summary.nights} ليلة - ${summary.checkIn} إلى ${summary.checkOut}`;
  return `${name.replace(/[\\/:*?"<>|]/g,'')}.xlsx`;
}

// Workbook generation uses the same nullable prices and exact totals as the UI.
export function buildExportWorkbook(searchParams,results,summary,viewMode='all',rateTier='both') {
  const workbook=XLSX.utils.book_new();
  const sourceName=summary.sourceArabic || 'المسافر';
  const selectedRoom=results.find(r=>r.id===summary.activeRoomId) || results[0];
  const pairs=summary.dailyBreakdown || [];
  const fields=rateFields(summary,rateTier);
  const dailyFields=fields.map(([field,label])=>[`almosafer${field[0].toUpperCase()+field.slice(1)}`,label]);
  const meta=[[`أسعار حجوزات ليلة واحدة مستقلة — ${sourceName}`],['الفندق',getCleanHotelName(searchParams,summary,results),'الغرفة',getCleanRoomName(searchParams,summary,results)],['السراير حسب المصدر',summary.beddingLabel || 'لم يحدد المصدر','عدد السراير المطلوب',searchParams.bedCount || 'أي عدد','نوع السراير المطلوب',({any:'أي نوع',single:'سرير فردي',double:'سرير مزدوج',king:'سرير كينج',queen:'سرير كوين'})[searchParams.bedType || 'any']],['الوصول',summary.checkIn,'المغادرة',summary.checkOut,'البالغون لكل غرفة',summary.adults,'الغرف',summary.rooms],['إجمالي البالغين',summary.adults*summary.rooms,'الأطفال لكل غرفة',summary.children || 0],['العملة','SAR','وقت الاستعلام',summary.searchedAt],['ملاحظة','مجموع الليالي المستقلة قد يختلف عن سعر حجز إقامة متصلة. غير متاح لا يعني سعر صفر.'],...(summary.warnings || []).map(w=>['تنبيه',w]),[]];
  const daily=[...meta,['اليوم','التاريخ',...dailyFields.map(f=>`${f[1]} (ر.س/غرفة/ليلة)`),'فرق الفطور للغرفة','فرق الفطور للفرد','حالة اليوم','رابط المصدر']];
  pairs.forEach(d=>daily.push([d.dayOfWeek,d.date,...dailyFields.map(([key])=>d.almosaferAvailability==='error'?'تعذر التحقق':value(d[key])),value(d.almosaferBreakfastMealDiff),value(d.almosaferBreakfastPerPerson),d.almosaferError || d.almosaferCancellation || 'غير متاح',selectedRoom?.bookingUrl]));
  daily.push(['مجموع الليالي لكل الغرف','',...dailyFields.map(([key])=>value(summary[key])),'-','-','المجموع يظهر عند توفر كل الليالي','']);
  const sheet=data=>{const ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=Array.from({length:Math.max(...data.map(r=>r.length))},(_,i)=>({wch:i===0?28:i===1?18:30}));ws['!views']=[{RTL:true}];return ws;};
  XLSX.utils.book_append_sheet(workbook,sheet(daily),`الجدول اليومي (${pairs.length} ليلة)`);
  if(viewMode==='all'||viewMode==='separated'||viewMode==='combined') {
    const allFields=catalogFields(results,rateTier);
    const catalog=[...meta,['المصدر','الغرفة','السراير',...allFields.flatMap(([,label])=>[`${label}: متوسط الليلة`,`${label}: مجموع الليالي`,`${label}: الليالي المتاحة`]),'سياسة الإلغاء','رابط المصدر']];
    results.forEach(r=>catalog.push([r.sourceArabic,r.roomName,r.beddingLabel || 'لم يحدد المصدر',...allFields.flatMap(([field])=>[value(r[`${field}PricePerNight`]),value(r[`${field}TotalPrice`]),`${r[`${field}AvailableNights`]}/${r.nights}`]),r.cancellationPolicy,r.bookingUrl]));
    XLSX.utils.book_append_sheet(workbook,sheet(catalog),results.every(r=>r.source===selectedRoom?.source)?`عروض ${sourceName}`:'عروض المصادر');
  }
  return workbook;
}
export function exportToExcel(searchParams,results,summary,viewMode='all',rateTier='both') {
  if(!results?.length||!summary) return;
  const workbook=buildExportWorkbook(searchParams,results,summary,viewMode,rateTier);
  XLSX.writeFile(workbook,getExportFileName(searchParams,results,summary));
}

