import React, { useState, useEffect, useRef } from 'react';
import { Mail, KeyRound, LogOut, X, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { requestBookingOtp, verifyBookingOtp, disconnectBookingAccount, getBookingSession } from '../services/api';

export default function BookingConnectModal({ onSessionChange }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState({ connected: false, email: null, geniusLevel: null });
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const overlayRef = useRef(null);

  useEffect(() => {
    getBookingSession().then(s => {
      setSession(s);
      if (typeof onSessionChange === 'function') onSessionChange(s);
    });
  }, [onSessionChange]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  function closeModal() {
    setOpen(false);
    setStatus('idle');
    setMessage('');
    if (!session.connected) {
      setStep('email');
      setOtpCode('');
    }
  }

  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatus('error');
      setMessage('يرجى كتابة بريد إلكتروني صحيح');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await requestBookingOtp(cleanEmail);
      if (res.success) {
        setStep('otp');
        setStatus('idle');
        setMessage(res.message || `تم إرسال رمز التحقق إلى ${cleanEmail}`);
        setCountdown(60);
      } else {
        setStatus('error');
        setMessage(res.message || 'تعذر إرسال رمز التحقق');
      }
    } catch {
      setStatus('error');
      setMessage('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    }
  }

  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setStatus('error');
      setMessage('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await verifyBookingOtp(email.trim(), cleanCode);
      if (res.success) {
        const updated = { connected: true, email: res.email, geniusLevel: res.geniusLevel };
        setSession(updated);
        if (typeof onSessionChange === 'function') onSessionChange(updated);
        setStatus('success');
        setMessage('تم التحقق بنجاح وتفعيل أسعار Genius');
        setTimeout(() => closeModal(), 2000);
      } else {
        setStatus('error');
        setMessage(res.message || 'رمز التحقق غير صحيح');
      }
    } catch {
      setStatus('error');
      setMessage('تعذر الاتصال بالخادم أثناء التحقق');
    }
  }

  async function handleDisconnect() {
    setStatus('loading');
    try {
      await disconnectBookingAccount();
      const updated = { connected: false, email: null, geniusLevel: null };
      setSession(updated);
      if (typeof onSessionChange === 'function') onSessionChange(updated);
      setStatus('idle');
      setMessage('');
      setStep('email');
      setEmail('');
      setOtpCode('');
      closeModal();
    } catch {
      setStatus('error');
      setMessage('تعذر إلغاء الربط');
    }
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) closeModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={session.connected ? `Booking: ${session.email}` : 'ربط حساب Booking.com لجلب خصومات Genius'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow-2xs transition-all ${
          session.connected
            ? 'bg-blue-600/15 border-blue-500/30 text-blue-800 hover:bg-blue-600/25'
            : 'bg-white/70 border-slate-200/60 text-slate-700 hover:bg-white/90 hover:border-slate-300'
        }`}
      >
        {session.connected ? (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Genius مفعّل</span>
            <span className="sm:hidden">Genius</span>
          </>
        ) : (
          <>
            <Mail className="w-3.5 h-3.5 shrink-0 text-slate-600" />
            <span className="hidden sm:inline">ربط Booking عبر OTP</span>
            <span className="sm:hidden">Booking</span>
          </>
        )}
      </button>

      {open && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
            style={{ animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">ربط حساب Booking.com</h2>
                  <p className="text-[11px] text-slate-500">تسجيل الدخول عبر رمز التحقق (OTP)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {session.connected ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
                    <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">حساب Booking متصل</p>
                      <p className="text-xs text-blue-700 mt-0.5 break-all">{session.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                        {session.geniusLevel || 'Genius Active'}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-center leading-relaxed">
                    يتم استدعاء عروض وخصومات Genius تلقائياً عند استخراج أسعار الفنادق من مصدر Booking.
                  </p>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-60"
                  >
                    {status === 'loading' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    إلغاء ربط الحساب
                  </button>
                </div>
              ) : step === 'email' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    أدخل البريد الإلكتروني المسجل في حساب Booking.com وسيتم إرسال رمز تحقق مؤقت (OTP) بدون الحاجة لكلمة مرور.
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-left"
                    />
                  </div>

                  {message && (
                    <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${
                      status === 'error'
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-blue-50 border border-blue-200 text-blue-800'
                    }`}>
                      {status === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      )}
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading' || !email.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جارٍ إرسال الرمز...
                      </>
                    ) : (
                      <>
                        <span>إرسال رمز التحقق</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-900 leading-relaxed">
                    <div className="font-semibold">تم إرسال رمز التحقق إلى:</div>
                    <div className="font-mono text-slate-700 mt-0.5 break-all">{email}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">رمز التحقق (OTP)</label>
                      <button
                        type="button"
                        onClick={() => { setStep('email'); setMessage(''); }}
                        className="text-[11px] text-blue-600 hover:underline font-medium"
                      >
                        تغيير البريد
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={10}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/gi, ''))}
                        placeholder="AQYQM3"
                        required
                        dir="ltr"
                        autoFocus
                        className="w-full px-3.5 py-2.5 tracking-widest text-center text-lg font-bold font-mono rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                      <KeyRound className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {message && (
                    <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${
                      status === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      {status === 'success' ? (
                        <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      )}
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading' || !otpCode.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جارٍ التحقق...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        تأكيد وتفعيل Genius
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    {countdown > 0 ? (
                      <span className="text-[11px] text-slate-500">
                        إعادة إرسال الرمز خلال {countdown} ثانية
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={status === 'loading'}
                        className="text-[11px] text-blue-600 hover:underline font-semibold"
                      >
                        إعادة إرسال رمز التحقق
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
