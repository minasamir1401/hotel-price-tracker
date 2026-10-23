import { runPriceSearch } from './searchTransport.js';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';
function searchTimeout(searchData) {
  const nights = Math.max(1, Math.min(62, Math.ceil((Date.parse(searchData.checkOut) - Date.parse(searchData.checkIn)) / 86400000) || 31));
  return 60000 + Math.ceil(nights / 4) * 90000 + Math.ceil(nights / 2) * 45000;
}
export async function startHotelPriceSearch(searchData, onProgress) {
  return runPriceSearch({ apiBase: API_BASE_URL, endpoint: 'search-hotel-prices',
    payload: { ...searchData, bookingRateMode: 'guest', refresh: true }, onProgress, timeoutMs: searchTimeout(searchData) });
}
export async function startDailyPricesSearch(searchData, onProgress, maxAttempts = 2) {
  return runPriceSearch({ apiBase: API_BASE_URL, endpoint: 'daily-prices',
    payload: {
      hotelInput: searchData.hotelInput, checkIn: searchData.checkIn, checkOut: searchData.checkOut,
      adults: searchData.adults ?? 2, childAges: searchData.childAges || [],
      roomKeywords: searchData.roomKeywords || [], concurrency: searchData.concurrency || 4,
      rooms: searchData.rooms ?? 1, roomName: searchData.roomName || '',
      bedCount: searchData.bedCount || 0, bedType: searchData.bedType || 'any',
      includeUnknownBeds: Boolean(searchData.includeUnknownBeds), mealPlan: searchData.mealPlan || '',
    }, onProgress, timeoutMs: searchTimeout(searchData), submissionAttempts: maxAttempts });
}

export async function getSystemStatus() {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),3000);
  try {
    const response=await fetch(`${API_BASE_URL}/system-status`,{signal:controller.signal});
    if(!response.ok) throw new Error('offline');
    return await response.json();
  } catch {
    return {almosafer:'offline',almatar:'offline',booking:'offline',nusuk:'offline',excelExport:'ready',lastSearch:'الخادم غير متصل',activeProxies:0,errors:['تعذر الاتصال بالخادم']};
  } finally {clearTimeout(timer);}
}

export async function requestBookingOtp(email) {
  const res = await fetch(`${API_BASE_URL}/booking-request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function verifyBookingOtp(email, code) {
  const res = await fetch(`${API_BASE_URL}/booking-verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return res.json();
}

export async function disconnectBookingAccount() {
  const res = await fetch(`${API_BASE_URL}/booking-disconnect`, { method: 'POST' });
  return res.json();
}

export async function getBookingSession() {
  try {
    const res = await fetch(`${API_BASE_URL}/booking-session`);
    if (!res.ok) return { connected: false, email: null };
    return res.json();
  } catch {
    return { connected: false, email: null };
  }
}

async function bookingPriceAccess(method, body) {
  const response = await fetch(`${API_BASE_URL}/booking-price-access`, {
    method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok || (method !== 'GET' && !data.success)) throw new Error(data.message || 'تعذر تحديث الوصول لأسعار الحساب');
  return data;
}
export const unlockBookingPrices = key => bookingPriceAccess('POST', { key });
export const lockBookingPrices = () => bookingPriceAccess('DELETE');
export const getBookingPriceAccess = () => bookingPriceAccess('GET');

export async function fetchHotelRoomsList(searchData, { signal, onProgress } = {}) {
  const startupTimeout = searchData.source === 'almosafer' || /almosafer\.com/i.test(searchData.hotelInput || '') ? 180000 : 60000;
  return runPriceSearch({ apiBase: API_BASE_URL, endpoint: 'hotel-rooms-list', signal, onProgress, timeoutMs: Math.max(startupTimeout, searchTimeout(searchData)),
    payload: {
      hotelInput: searchData.hotelInput, checkIn: searchData.checkIn, checkOut: searchData.checkOut,
      adults: searchData.adults ?? 2, rooms: searchData.rooms ?? 1, source: searchData.source,
      children: searchData.children ?? (searchData.childAges || []).length,
      refresh: Boolean(searchData.refresh), childAges: searchData.childAges || [],
      bookingRateMode: 'guest',
    },
  });
}
