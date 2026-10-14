export function bookingRateContextLabel(context) {
  if (context?.platform !== 'mobile') return '';
  return context.session === 'account'
    ? 'طلب أسعار الموبايل باستخدام جلسة الحساب'
    : 'أسعار الموبايل بدون جلسة حساب';
}

export function bookingSessionStatusLabel(pricing) {
  if (!pricing) return 'حالة جلسة Booking غير متاحة';
  if (pricing.expired) return 'جلسة أسعار Booking انتهت';
  return pricing.credentialConfigured ? 'جلسة أسعار Booking مهيأة' : 'Booking: أسعار موبايل بدون حساب';
}
