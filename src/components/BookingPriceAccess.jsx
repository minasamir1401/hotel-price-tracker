import { useEffect, useState } from 'react';
import { unlockBookingPrices, lockBookingPrices, getBookingPriceAccess } from '../services/api.js';

export default function BookingPriceAccess({ onChange }) {
  const [open, setOpen] = useState(false), [key, setKey] = useState('');
  const [busy, setBusy] = useState(false), [authorized, setAuthorized] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    getBookingPriceAccess().then(state => { if (active) setAuthorized(state.authorized); }).catch(() => {});
    return () => { active = false; };
  }, []);
  async function login(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await unlockBookingPrices(key); setAuthorized(true); setOpen(false); setMessage('تم فتح الوصول الخاص لأسعار الحساب'); onChange?.(); }
    catch (error) { setMessage(error.message); }
    finally { setKey(''); setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await lockBookingPrices(); setAuthorized(false); setMessage('تم إغلاق الوصول الخاص'); onChange?.(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <div className="text-xs">
    <button type="button" disabled={busy} onClick={() => authorized ? logout() : setOpen(!open)} className="rounded-lg border border-blue-200 px-2 py-1 text-blue-700">{authorized ? 'إغلاق أسعار الحساب' : 'دخول أسعار الحساب'}</button>
    {open && <form onSubmit={login} className="absolute left-4 top-full mt-2 w-72 space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <p className="font-semibold">وصول خاص لصاحب الموقع</p>
      <p className="text-slate-600">مفتاح دخول الموقع، وليس كلمة مرور Booking. لا يقوم هذا الدخول بإنشاء جلسة Booking.</p>
      <label className="block">مفتاح الدخول<input type="password" value={key} onChange={event => setKey(event.target.value)} autoComplete="off" required maxLength={1024} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2" /></label>
      <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-3 py-2 text-white">{busy ? 'جارٍ التحقق…' : 'فتح الوصول'}</button>
    </form>}
    {message && <p role="status" className="max-w-64 text-slate-600">{message}</p>}
  </div>;
}
