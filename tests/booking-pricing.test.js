import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { bookingRateContextLabel, bookingSessionStatusLabel } from '../src/services/bookingPricing.js';
import { searchContextKey, summaryForRoom } from '../src/services/rates.js';
import { fetchHotelRoomsList, startHotelPriceSearch } from '../src/services/api.js';
import { buildExportWorkbook } from '../src/services/excelExport.js';

test('Booking room discovery and price searches always request guest mobile rates, including legacy account or auto inputs', async () => {
  const input = { hotelInput: 'booking:14720082', checkIn: '2026-10-14', checkOut: '2026-10-15', adults: 2, rooms: 1, source: 'booking' };
  assert.equal(searchContextKey({ ...input, bookingRateMode: 'guest' }), searchContextKey({ ...input, bookingRateMode: 'account' }));
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = async (_, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.bookingRateMode, 'guest');
      assert.equal(body.hotelInput, input.hotelInput);
      assert.equal(body.adults, input.adults);
      assert.equal(body.rooms, input.rooms);
      return Response.json({ success: true, rooms: [], data: [] });
    };
    for (const bookingRateMode of [undefined, 'guest', 'auto', 'account']) {
      const params = { ...input, sources: ['booking'], bookingRateMode };
      assert.equal((await fetchHotelRoomsList(params)).success, true);
      assert.equal((await startHotelPriceSearch(params)).success, true);
    }
  } finally { globalThis.fetch = saved; }
});

test('Configured credentials do not become a verified login or invented Genius badge', () => {
  assert.match(bookingSessionStatusLabel({ credentialConfigured: true, loginVerified: false }), /مهيأة/);
  assert.ok(!bookingSessionStatusLabel({ credentialConfigured: true }).includes('Genius'));
  assert.match(bookingSessionStatusLabel({ credentialConfigured: true, expired: true }), /انتهت/);
  assert.match(bookingRateContextLabel({ platform: 'mobile', session: 'guest' }), /بدون جلسة/);
  assert.match(bookingRateContextLabel({ platform: 'mobile', session: 'account' }), /طلب أسعار/);
});

test('Excel keeps guest/account context on the exact offer, including identically named rooms', () => {
  const room = (id, session, genius) => ({ id, source: 'Booking', sourceArabic: 'بوكينج', roomName: 'غرفة مزدوجة',
    rooms: 1, adults: 2, nights: 1, roomOnlyTotalPrice: 188.45, roomOnlyAvailableNights: 1,
    dailyRates: [{ date: '2026-10-14', nextDate: '2026-10-15', dayOfWeek: 'الأربعاء', roomOnlyPrice: 188.45, offers: {
      roomOnly: { price: 188.45, rateContext: { platform: 'mobile', session, geniusDiscountApplied: genius },
        taxBreakdown: { currency: 'SAR', priceBeforeTax: 160.38, taxesAndFees: 28.07, totalPrice: 188.45 } },
    } }] });
  const guest = room('guest', 'guest', false), account = room('account', 'account', true);
  const summary = summaryForRoom({ rooms: 1, adults: 2, dailyBreakdown: [{ date: '2026-10-14' }] }, account);
  const book = buildExportWorkbook({}, [guest, account], summary);
  const rows = XLSX.utils.sheet_to_json(book.Sheets['تفاصيل الغرف والأيام'], { header: 1 });
  const headers = rows.find(row => row[0] === 'المصدر');
  const contextIndex = headers.indexOf('سياق سعر Booking'), geniusIndex = headers.indexOf('خصم Genius من المصدر');
  const prices = rows.filter(row => row[0] === 'بوكينج');
  assert.equal(prices.length, 2);
  assert.match(prices[0][contextIndex], /بدون جلسة/);
  assert.equal(prices[0][geniusIndex], 'لم يرد في العرض');
  assert.match(prices[1][contextIndex], /باستخدام جلسة/);
  assert.equal(prices[1][geniusIndex], 'وارد في عرض Booking');
  assert.equal(prices[1][12], 188.45);
});
