import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {formatSourceConditions} from '../src/services/sourceConditions.js';
import {buildExportWorkbook} from '../src/services/excelExport.js';

const cancellation=[{cancellationFee:{currency:'SAR',finalPrice:357.54},dateFrom:'2026-10-11',dateTo:'9999-12-31'}];
test('Structured Almosafer fees retain source dates, precision, currency and zero amounts as display text',()=>{
  assert.equal(formatSourceConditions(cancellation),'من 2026-10-11 إلى 9999-12-31 — رسوم الإلغاء: 357.54 SAR');
  assert.equal(formatSourceConditions([{cancellationFee:{currency:'SAR',finalPrice:0}}]),'رسوم الإلغاء: 0.00 SAR');
  assert.equal(formatSourceConditions('Free cancellation anytime'),'Free cancellation anytime');
  assert.equal(formatSourceConditions([]),'');
  assert.equal(formatSourceConditions(null),'');
  assert.ok(!formatSourceConditions({payment:'at property'}).includes('[object Object]'));
});
test('The actual Excel export stores structured cancellation policies as text rather than objects',()=>{
  const offer={price:357.54,cancellationPolicy:'غير مستردة',cancellationDetails:cancellation};
  const room={id:'source-room',source:'Almosafer',sourceArabic:'المسافر',roomName:'غرفة ستاندرد',adults:2,rooms:1,nights:1,
    roomOnlyAvailableNights:1,dailyRates:[{date:'2026-10-20',dayOfWeek:'الثلاثاء',nextDate:'2026-10-21',roomOnlyPrice:357.54,offers:{roomOnly:offer}}]};
  const summary={hotelName:'كينجزجيت ديار',sourceArabic:'المسافر',rooms:1,adults:2,nights:1,checkIn:'2026-10-20',checkOut:'2026-10-21',dailyBreakdown:[]};
  const book=buildExportWorkbook({},[room],summary);
  const reloaded=XLSX.read(XLSX.write(book,{type:'buffer'}),{type:'buffer'});
  const rows=XLSX.utils.sheet_to_json(reloaded.Sheets['تفاصيل الغرف والأيام'],{header:1});
  assert.ok(rows.some(row=>row.includes(formatSourceConditions(cancellation))));
  assert.ok(rows.some(row=>row.includes(357.54)));
});
