import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {buildExportWorkbook,getExportFileName} from '../src/services/excelExport.js';
import {startHotelPriceSearch,getSystemStatus,fetchHotelRoomsList} from '../src/services/api.js';
import {summaryForRoom,replaceVerifiedNight} from '../src/services/rates.js';
import {buildDailyPricesWorkbook} from '../src/services/dailyPricesExport.js';

test('Retrying one verified night updates only that date and recalculates exact totals and Excel',()=>{
  const room={id:'almosafer-1287944-0',source:'Almosafer',roomIdentity:'triple',roomName:'ثلاثية',hotelName:'كينجزجيت',
    checkIn:'2026-10-19',checkOut:'2026-10-21',currency:'SAR',adults:3,children:0,rooms:1,nights:2,
    warnings:[{date:'2026-10-20',message:'incomplete'}],dailyRates:[
      {date:'2026-10-19',nextDate:'2026-10-20',dayNumber:1,dayTitle:'اليوم 1',availability:'available',roomOnlyPrice:800,breakfastPrice:1000},
      {date:'2026-10-20',nextDate:'2026-10-21',dayNumber:2,dayTitle:'اليوم 2',availability:'error',roomOnlyPrice:null,breakfastPrice:null},
    ]};
  const quote={...room,nights:1,lastUpdated:'now',dailyRates:[{date:'2026-10-20',nextDate:'2026-10-21',dayNumber:1,
    dayTitle:'اليوم 1',availability:'available',roomOnlyPrice:807.66,breakfastPrice:1107.34,
    offers:{roomOnly:{price:807.66,packageId:'real-source-offer',vendorSupplierId:100010}}}]};
  const updated=replaceVerifiedNight(room,quote);
  assert.equal(updated.dailyRates[0],room.dailyRates[0]);assert.equal(room.dailyRates[1].roomOnlyPrice,null);
  assert.equal(updated.dailyRates[1].dayNumber,2);assert.equal(updated.dailyRates[1].offers.roomOnly.packageId,'real-source-offer');
  assert.equal(updated.roomOnlyAvailableNights,2);assert.equal(updated.roomOnlyTotalPrice,1607.66);
  assert.equal(updated.breakfastTotalPrice,2107.34);assert.deepEqual(updated.warnings,[]);
  const base={...room,dailyBreakdown:room.dailyRates.map(d=>({date:d.date}))};
  const summary=summaryForRoom(base,updated);assert.equal(summary.dailyBreakdown[1].almosaferRoomOnly,807.66);
  const book=buildExportWorkbook({},[updated],summary);
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});
  assert.ok(rows.some(row=>row.includes(807.66)));
  for(const mismatch of [{roomIdentity:'quad'}, {id:'almosafer-999999-0'}, {adults:2}, {rooms:2}, {children:1}, {currency:'USD'},
    {dailyRates:[{...quote.dailyRates[0],nextDate:'2026-10-22'}]}]) {
    assert.throws(()=>replaceVerifiedNight(room,{...quote,...mismatch}),/لا تطابق/);
  }
});

test('Daily Excel retains all three requested meal columns even when room-only is unavailable', () => {
  const data = { hotelName: 'المروة ريحان من روتانا', roomName: 'غرفة واسعة بسرير توأم', adults: 2, rooms: 1, checkIn: '2026-10-01', checkOut: '2026-10-02', fetchedAt: '2026-10-01T20:55:29Z', mealPlan: 'breakfast', rows: [{ date: '2026-10-01', dayName: 'الخميس', dayStatus: 'غير قابل للإسترداد', offers: { breakfast: { price: 1115 }, halfBoard: { price: 1359 } } }] };
  const book = buildDailyPricesWorkbook(data);
  const bytes = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  const reloaded = XLSX.read(bytes, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(reloaded.Sheets[reloaded.SheetNames[0]], { header: 1 });
  assert.deepEqual(rows[7].slice(2, 5), ['إقامة فقط', 'إقامة وإفطار', 'إفطار + غداء أو عشاء']);
  assert.deepEqual(rows[8].slice(2, 5), ['غير متاح', 1115, 1359]);
});
test('Two-room exports distinguish adults per room from total adults and avoid filename collisions',()=>{
  const summary={hotelName:'فندق اختبار',sourceArabic:'المطار',almosaferRoom:'ستاندرد',checkIn:'2026-10-01',checkOut:'2026-11-01',nights:31,adults:2,children:0,rooms:2,dailyBreakdown:[]};
  const one=getExportFileName({},[],{...summary,rooms:1}),two=getExportFileName({},[],summary);
  assert.notEqual(one,two);assert.ok(two.includes('2 غرفة'));assert.ok(two.includes('2 بالغين لكل غرفة'));assert.ok(two.includes('المطار'));
  const wb=buildExportWorkbook({},[],summary),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
  assert.equal(rows.find(r=>r[0]==='إجمالي البالغين')[1],4);
  const occupancy=rows.find(r=>r[0]==='الوصول');assert.equal(occupancy[4],'البالغون لكل غرفة');assert.equal(occupancy[5],2);assert.equal(occupancy[7],2);
});
test('Selecting Almatar exports its actual meal names, source and selected booking link without labelling it Almosafer',()=>{
  const params={hotelInput:'https://almatar.com/ar/hotels/rooms/hotel-1660326/'};
  const summary={hotelName:'فندق إم الدانة مكة من ميلينيوم',checkIn:'2026-10-01',checkOut:'2026-10-02',nights:1,adults:2,rooms:1,dailyBreakdown:[{date:'2026-10-01',dayOfWeek:'الخميس'}]};
  const almo={id:'almo',source:'Almosafer',sourceArabic:'المسافر',roomName:'غرفة أخرى',bookingUrl:'https://almosafer.com/',dailyRates:[]};
  const matar={id:'matar',source:'Almatar',sourceArabic:'المطار',roomName:'غرفة ستاندرد توأم',beddingLabel:'TWIN Bed',mealPlanLabels:{roomOnly:'إقامة فقط',breakfast:'إقامة وإفطار',halfBoard:'إفطار + غداء أو عشاء'},bookingUrl:params.hotelInput,nights:1,roomOnlyTotalPrice:113,roomOnlyPricePerNight:113,roomOnlyAvailableNights:1,breakfastTotalPrice:180,breakfastPricePerNight:180,breakfastAvailableNights:1,halfBoardTotalPrice:352,halfBoardPricePerNight:352,halfBoardAvailableNights:1,dailyRates:[{date:'2026-10-01',availability:'available',roomOnlyPrice:113,breakfastPrice:180,halfBoardPrice:352}]};
  const selected=summaryForRoom(summary,matar),book=buildExportWorkbook(params,[almo,matar],selected);
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});
  assert.ok(rows[0][0].endsWith('المطار'));
  const headers=rows.find(r=>r[0]==='اليوم');assert.ok(headers.some(x=>x.startsWith('إقامة وإفطار')));assert.ok(headers.some(x=>x.startsWith('إفطار + غداء أو عشاء')));
  const day=rows.find(r=>r[0]==='الخميس');assert.equal(day[2],113);assert.equal(day.at(-1),matar.bookingUrl);assert.ok(book.SheetNames.includes('عروض المصادر'));
});
test('Booking Excel preserves its source, taxed prices, unavailable room-only and selected link',()=>{
  const params={hotelInput:'booking:184752'};
  const summary={hotelName:'Al Marwa',checkIn:'2026-10-20',checkOut:'2026-10-21',nights:1,adults:2,rooms:1,dailyBreakdown:[{date:'2026-10-20',dayOfWeek:'الثلاثاء'}]};
  const room={id:'booking-184752-0',source:'Booking',sourceArabic:'بوكينج',roomName:'Twin Kaaba view',beddingLabel:'2 single beds',bookingUrl:'https://www.booking.com/searchresults.html?hotel_id=184752',nights:1,breakfastTotalPrice:2527.90,breakfastPricePerNight:2527.90,breakfastAvailableNights:1,dailyRates:[{date:'2026-10-20',availability:'available',roomOnlyPrice:null,breakfastPrice:2527.90}]};
  const selected=summaryForRoom(summary,room),book=buildExportWorkbook(params,[room],selected);
  const reloaded=XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
  const rows=XLSX.utils.sheet_to_json(reloaded.Sheets[reloaded.SheetNames[0]],{header:1});
  assert.ok(rows[0][0].endsWith('بوكينج'));
  const headers=rows.find(r=>r[0]==='اليوم'),day=rows.find(r=>r[0]==='الثلاثاء');
  const breakfast=headers.findIndex(h=>h.startsWith('إقامة وفطور'));
  assert.equal(day[breakfast],2527.90);assert.equal(day.at(-1),room.bookingUrl);
  assert.equal(selected.dailyBreakdown[0].almosaferRoomOnly,null);
  assert.ok(getExportFileName(params,[room],selected).includes('بوكينج'));
});
test('Empty and unavailable backend responses never generate example prices',async()=>{
  const saved=globalThis.fetch;
  try {
    globalThis.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({success:true,data:[],summary:null})});
    assert.deepEqual((await startHotelPriceSearch({})).data,[]);
    globalThis.fetch=async()=>{throw new Error('network offline');};
    assert.equal((await startHotelPriceSearch({})).success,false);
    assert.equal((await getSystemStatus()).almosafer,'offline');
  } finally {globalThis.fetch=saved;}
});

test('Room-list errors retain diagnostic references and requests include exact occupancy and refresh',async()=>{
  const saved=globalThis.fetch;
  try {
    globalThis.fetch=async(url,options)=>{
      assert.equal(options.method,'POST');
      const body=JSON.parse(options.body);
      assert.equal(body.rooms,2);assert.equal(body.children,1);assert.deepEqual(body.childAges,[7]);assert.equal(body.refresh,true);
      return {ok:false,json:async()=>({success:false,message:'المصدر رفض الاتصال',code:'UPSTREAM_ACCESS_DENIED',diagnosticId:'test-reference'})};
    };
    const result=await fetchHotelRoomsList({hotelInput:'hotel',adults:2,rooms:2,children:1,childAges:[7],refresh:true});
    assert.equal(result.success,false);assert.equal(result.diagnosticId,'test-reference');assert.equal(result.code,'UPSTREAM_ACCESS_DENIED');
    assert.equal(result.message,'المصدر رفض الاتصال');
  } finally {globalThis.fetch=saved;}
});

test('Selecting a twin room keeps another Standard room breakfast out of the table and Excel',()=>{
  const summary={hotelName:'فندق كينجزجيت ديار',checkIn:'2026-10-24',checkOut:'2026-10-26',nights:2,adults:2,rooms:1,dailyBreakdown:[{date:'2026-10-24',dayOfWeek:'السبت',almosaferBreakfast:400},{date:'2026-10-25',dayOfWeek:'الأحد',almosaferBreakfast:841.39}]};
  const twin={id:'twin',hotelName:summary.hotelName,roomName:'ستاندرد - ٢ سرير فردي',nights:2,beddingVerified:true,roomOnlyTotalPrice:1093,roomOnlyPricePerNight:546.5,roomOnlyAvailableNights:2,breakfastTotalPrice:null,breakfastAvailableNights:1,dailyRates:[{date:'2026-10-24',availability:'available',roomOnlyPrice:300,breakfastPrice:400},{date:'2026-10-25',availability:'available',roomOnlyPrice:793,breakfastPrice:null}]};
  const selected=summaryForRoom(summary,twin);
  assert.equal(selected.dailyBreakdown[1].almosaferBreakfast,null);
  assert.equal(selected.dailyBreakdown[1].almosaferRoomOnly,793);
  assert.equal(selected.almosaferBreakfast,null);
  const book=buildExportWorkbook({},[twin],selected);
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});
  const headers=rows.find(r=>r[0]==='اليوم');const bb=headers.findIndex(h=>h.startsWith('إقامة وفطور'));
  const day=rows.find(r=>r[0]==='الأحد');assert.equal(day[2],793);assert.equal(day[bb],'غير متاح');
  assert.match(rows[1][3],/سرير فردي/);
});
test('Excel preserves missing breakfast, cancellation tier and precise totals without substituting prices',async()=>{
  const {params,result}=JSON.parse(await readFile(new URL('./fixtures/kingsgate-month.json',import.meta.url),'utf8'));
  const summary=structuredClone(result.summary);
  const day=summary.dailyBreakdown[24];day.almosaferBreakfast=null;day.almosaferBreakfastMealDiff=null;day.almosaferBreakfastPerPerson=null;
  summary.almosaferBreakfast=null;
  const workbook=buildExportWorkbook(params,result.data,summary);
  const bytes=XLSX.write(workbook,{type:'buffer',bookType:'xlsx'});
  const reloaded=XLSX.read(bytes,{type:'buffer'});
  const rows=XLSX.utils.sheet_to_json(reloaded.Sheets[reloaded.SheetNames[0]],{header:1});
  const row=rows.find(r=>r[1]==='2026-10-25');
  const headers=rows.find(r=>r[0]==='اليوم');const bb=headers.findIndex(h=>h.startsWith('إقامة وفطور'));
  assert.equal(row[2],714.4);assert.equal(row[bb],'غير متاح');
  assert.ok(!headers.some(h=>h.includes('إلغاء مجاني')));
  assert.ok(!JSON.stringify(rows).includes('أقل سعر'));
  const total=rows.at(-1);assert.equal(total[2],17657.78);assert.equal(total[bb],'غير متاح');
  assert.equal(rows.find(r=>r[1]==='2026-10-03')[2],357.54);
});
