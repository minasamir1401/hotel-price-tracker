import React, { useState, useEffect } from 'react';
import { Search, Calendar, Link2, Loader2, ClipboardPaste, Building2, Tag, Compass, Users, ListFilter } from 'lucide-react';
import SourceSelector from './SourceSelector';
import { fetchHotelRoomsList } from '../services/api';

export default function HotelSearchForm({
  formData,
  resolvedHotelName,
  setFormData,
  onSearch,
  isLoading,
}) {
  const [urlDetails, setUrlDetails] = useState(null);
  const [availableRooms, setAvailableRooms] = useState(formData.roomName ? [formData.roomName] : []);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState('');

  const addDaysToDate = (dateStr, days) => {
    if (!dateStr) {
      const today = new Date();
      dateStr = today.toISOString().split('T')[0];
    }
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
    d.setUTCDate(d.getUTCDate() + Number(days));

    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const calculateNights = (inStr, outStr) => {
    if (!inStr || !outStr) return null;
    const [y1, m1, d1] = inStr.split('-').map(Number);
    const [y2, m2, d2] = outStr.split('-').map(Number);
    const d1Obj = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0));
    const d2Obj = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0));
    const diff = d2Obj.getTime() - d1Obj.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  };

  const formatToIso = (dStr) => {
    if (!dStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    const mdy=dStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(mdy)return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
    const dmyMatch = dStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  };

  const parseHotelUrl = (urlStr) => {
    try {
      const url = new URL(urlStr);
      const updates = {};
      const decodedPath = decodeURIComponent(url.pathname);

      let detectedPlatform = null;
      if (urlStr.includes('almosafer.com')) {
        updates.sources = ['almosafer'];
        detectedPlatform = 'المسافر (Almosafer)';
      } else if (urlStr.includes('almatar.com')) {
        updates.sources = ['almatar'];
        detectedPlatform = 'المطار (Almatar)';
      }

      const atgMatch = detectedPlatform === 'المطار (Almatar)'
        ? decodedPath.match(/\/hotels\/rooms\/([^/]+)\/?$/)
        : decodedPath.match(/(?:\/atg\/|\/hotel\/details\/atg\/|\/hotels?\/details\/atg\/|\/hotels\/)([^?#]+)/);
      if (atgMatch && atgMatch[1]) {
        const slug = atgMatch[1];
        const idMatch = slug.match(/-(\d+)$/);
        updates.extractedHotelId = idMatch ? idMatch[1] : null;
        let cleanSlug = slug.replace(/-\d+$/, '').replace(/-/g, ' ').trim();
        if (cleanSlug) {
          updates.extractedHotelName = cleanSlug.startsWith('فندق') ? cleanSlug : `فندق ${cleanSlug}`;
        }
      }

      if (!updates.extractedHotelId) {
        const qId = url.searchParams.get('hotelId') || url.searchParams.get('id');
        if (qId) updates.extractedHotelId = qId;
      }

      const inDate = url.searchParams.get('checkin') || url.searchParams.get('checkIn');
      const outDate = url.searchParams.get('checkout') || url.searchParams.get('checkOut');
      const isoIn = formatToIso(inDate);
      const isoOut = formatToIso(outDate);
      if (isoIn) updates.checkIn = isoIn;
      if (isoOut) updates.checkOut = isoOut;

      const roomsParam = url.searchParams.get('rooms');
      if (roomsParam) {
        if (roomsParam.includes('_adult')) {
          const adultsCount = parseInt(roomsParam.split('_')[0], 10);
          if (!isNaN(adultsCount)) updates.adults = adultsCount;
          updates.rooms = roomsParam.split(/[,\*]/).length;
        } else {
          const rNum = parseInt(roomsParam, 10);
          if (!isNaN(rNum)) updates.rooms = rNum;
        }
      }

      const adultsParam = url.searchParams.get('adults');
      if (adultsParam) {
        const aNum = parseInt(adultsParam, 10);
        if (!isNaN(aNum)) updates.adults = aNum;
      }

      updates.detectedPlatform = detectedPlatform;
      return updates;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (formData.hotelInput && typeof formData.hotelInput === 'string' && formData.hotelInput.trim().startsWith('http')) {
      const parsed = parseHotelUrl(formData.hotelInput.trim());
      if (parsed) {
        setUrlDetails(parsed);
      }
    } else {
      setUrlDetails(null);
    }
  }, [formData.hotelInput]);

  const handleApplyPastedText = (rawText) => {
    const text = (rawText || '').trim();
    if (!text) return;

    let updated = {
      ...formData,
      hotelInput: text,
      roomName: '', roomKeywords: [], mealPlan: '',
    };

    if (text.startsWith('http')) {
      const parsed = parseHotelUrl(text);
      if (parsed) {
        setUrlDetails(parsed);
        updated = {
          ...updated,
          ...parsed,
        };
      }
    }

    if (!updated.checkIn) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      updated.checkIn = d.toISOString().split('T')[0];
    }
    if (!updated.checkOut) {
      updated.checkOut = addDaysToDate(updated.checkIn, 12);
    }

    setFormData(updated);
    setAvailableRooms([]);
    
    // Automatically fetch rooms if we have Almatar or Almosafer link
    if (updated.hotelInput?.startsWith('http') && (updated.hotelInput.includes('almatar.com') || updated.hotelInput.includes('almosafer.com'))) {
      handleFetchRooms(updated);
    }
  };

  const handlePasteEvent = (e) => {
    const pasted = e.clipboardData?.getData('text');
    if (pasted && pasted.trim()) {
      e.preventDefault();
      handleApplyPastedText(pasted);
    }
  };

  const handleClipboardButton = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          handleApplyPastedText(clipText);
        }
      }
    } catch (err) {}
  };

  const handleFetchRooms = async (currentFormData = formData) => {
    const input = currentFormData.hotelInput || '';
    const isSupported = input.includes('almatar.com') || input.includes('almosafer.com');
    if (!isSupported) {
      setRoomsError('يرجى إدخال رابط فندق صالح من المسافر أو المطار');
      return;
    }
    setIsFetchingRooms(true);
    setRoomsError('');
    try {
      const data = await fetchHotelRoomsList({
        hotelInput: currentFormData.hotelInput,
        checkIn: currentFormData.checkIn || new Date().toISOString().split('T')[0],
        checkOut: addDaysToDate(currentFormData.checkIn || new Date().toISOString().split('T')[0], 1),
        adults: currentFormData.adults || 2,
        childAges: currentFormData.childAges || [],
      });
      if (data && data.success) {
        if (data.hotelName) {
          setUrlDetails(prev => prev ? ({ ...prev, extractedHotelName: data.hotelName }) : prev);
          setFormData(prev => ({ ...prev, resolvedHotelName: data.hotelName }));
        }
        if (data.rooms && data.rooms.length > 0) {
          setAvailableRooms(data.rooms);
          if (!currentFormData.roomKeywords || currentFormData.roomKeywords.length === 0) {
            setFormData(prev => ({ ...prev, roomKeywords: [data.rooms[0]], roomName: data.rooms[0] }));
          }
        } else {
          setAvailableRooms([]);
          setRoomsError('لا توجد غرف متاحة في هذه التواريخ');
        }
      } else {
        setRoomsError(data.message || 'فشل استخراج الغرف');
      }
    } catch (error) {
      setRoomsError('تعذر الاتصال بالخادم لجلب الغرف');
    }
    setIsFetchingRooms(false);
  };

  const syncUrlOccupancy = (urlStr, newAdults) => {
    if (!urlStr || typeof urlStr !== 'string' || !urlStr.startsWith('http')) return urlStr;
    try {
      const u = new URL(urlStr);
      if (u.searchParams.has('rooms')) {
        const rVal = u.searchParams.get('rooms');
        if (rVal && rVal.includes('_adult')) {
          u.searchParams.set('rooms', `${newAdults}_adult`);
          return u.toString();
        }
      }
      if (u.searchParams.has('adults')) {
        u.searchParams.set('adults', String(newAdults));
        return u.toString();
      }
      return urlStr;
    } catch (e) {
      return urlStr;
    }
  };

  const handleChange = (field, value) => {
    let updated = {
      ...formData,
      [field]: value,
    };

    if (field === 'hotelInput' && typeof value === 'string' && value.trim().startsWith('http')) {
      updated.roomName = '';
      updated.roomKeywords = [];
      updated.mealPlan = '';
      setAvailableRooms([]);
      const parsed = parseHotelUrl(value.trim());
      if (parsed) {
        setUrlDetails(parsed);
        updated = {
          ...updated,
          ...parsed,
        };
        if (value.includes('almatar.com') || value.includes('almosafer.com')) {
          handleFetchRooms(updated);
        }
      }
    } else if (field === 'adults' && updated.hotelInput?.startsWith('http')) {
      updated.hotelInput = syncUrlOccupancy(updated.hotelInput, value);
    }

    setFormData(updated);
  };

  const handleQuickDays = (days) => {
    const baseIn = formData.checkIn || new Date().toISOString().split('T')[0];
    const newOut = addDaysToDate(baseIn, days);
    const updated = {
      ...formData,
      checkIn: baseIn,
      checkOut: newOut,
    };
    setFormData(updated);
  };

  const handleSelectCapacity = (capacity) => {
    let nextHotelInput = formData.hotelInput?.trim() || '';
    if (nextHotelInput.startsWith('http')) {
      nextHotelInput = syncUrlOccupancy(nextHotelInput, capacity);
    }
    const updated = {
      ...formData,
      hotelInput: nextHotelInput,
      adults: Number(capacity),
    };
    if (!updated.checkIn) {
      updated.checkIn = new Date().toISOString().split('T')[0];
    }
    if (!updated.checkOut) {
      updated.checkOut = addDaysToDate(updated.checkIn, 12);
    }
    setFormData(updated);
  };

  const handleOccupancyChange = (field, rawValue) => {
    const val = parseInt(rawValue, 10);
    const num = isNaN(val) ? 0 : val;
    let safeVal = num;
    if (field === 'adults') safeVal = Math.max(1, Math.min(8, num));
    if (field === 'rooms') safeVal = Math.max(1, Math.min(4, num));
    if (field === 'children') safeVal = Math.max(0, Math.min(10, num));

    let nextHotelInput = formData.hotelInput?.trim() || '';
    if (field === 'adults' && nextHotelInput.startsWith('http')) {
      nextHotelInput = syncUrlOccupancy(nextHotelInput, safeVal);
    }

    const updated = {
      ...formData,
      hotelInput: nextHotelInput,
      [field]: safeVal,
    };
    if (field === 'children') updated.childAges = Array.from({length:safeVal},(_,i)=>formData.childAges?.[i] ?? null);
    if (!updated.checkIn) {
      updated.checkIn = new Date().toISOString().split('T')[0];
    }
    if (!updated.checkOut) {
      updated.checkOut = addDaysToDate(updated.checkIn, 12);
    }
    setFormData(updated);
  };

  const handleDateChange = (field, value) => {
    const updated = {
      ...formData,
      [field]: value,
    };

    if (field === 'checkIn' && updated.checkOut && updated.checkOut <= value) {
      updated.checkOut = addDaysToDate(value, 1);
    }
    setFormData(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let targetSearch = { ...formData };
    if (!targetSearch.hotelInput?.trim()) {
      setRoomsError('يرجى إدخال اسم الفندق أو لصق الرابط المباشر للبدء');
      return;
    }
    if (!targetSearch.checkIn) {
      targetSearch.checkIn = new Date().toISOString().split('T')[0];
    }
    if (!targetSearch.checkOut) {
      targetSearch.checkOut = addDaysToDate(targetSearch.checkIn, 12);
    }
    if (!targetSearch.sources || targetSearch.sources.length === 0) {
      targetSearch.sources = ['almosafer', 'almatar'];
    }
    targetSearch.nights = calculateNights(targetSearch.checkIn, targetSearch.checkOut);

    setFormData(targetSearch);
    onSearch(targetSearch);
  };

  const currentNights = calculateNights(formData.checkIn, formData.checkOut);

  return (
    <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-950/5 p-5 sm:p-6 lg:p-7">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200/50">
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
          <Search className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            أدخل بيانات الحجز والبحث
          </h2>
          <p className="text-xs text-slate-500">
            حدد بيانات الفندق أو الصق الرابط المباشر لبدء مقارنة الأسعار بالريال السعودي
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Hotel Name or Link */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              اسم الفندق أو الرابط المباشر
            </label>
            <button
              type="button"
              onClick={handleClipboardButton}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition-all cursor-pointer shadow-2xs"
              title="لصق الرابط مباشرة من الحافظة"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>لصق من الحافظة</span>
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Link2 className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={formData.hotelInput}
              onChange={(e) => handleChange('hotelInput', e.target.value)}
              onPaste={handlePasteEvent}
              placeholder="اكتب اسم الفندق أو الصق رابط الفندق المباشر من المسافر أو المطار..."
              className="w-full pr-10 pl-3.5 py-2.5 bg-white/60 backdrop-blur-md border border-slate-300/80 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white/95 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
            />
          </div>

          {/* Extracted URL Details Card */}
          {urlDetails && (
            <div className="mt-3 p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 rounded-2xl border border-blue-200/90 text-xs sm:text-sm text-slate-800 shadow-sm animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-blue-200/60">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>تفاصيل الرابط المستخرج للاستعلام (Scraping Target)</span>
                </div>
                <div className="flex items-center gap-2">
                  {urlDetails.detectedPlatform && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs border border-blue-300">
                      {urlDetails.detectedPlatform}
                    </span>
                  )}
                  {urlDetails.extractedHotelId && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-white text-slate-800 font-mono font-bold text-xs border border-slate-300 shadow-2xs">
                      معرّف الفندق: {urlDetails.extractedHotelId}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-700">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-slate-500 font-medium">اسم الفندق المستخرج:</span>
                  <strong className="text-slate-900 font-semibold">{resolvedHotelName || urlDetails.extractedHotelName || formData.hotelInput}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-slate-500 font-medium">الفترة المحددة:</span>
                  <strong className="text-slate-900 font-mono font-semibold">{formData.checkIn} إلى {formData.checkOut} ({currentNights} ليالٍ)</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-slate-500 font-medium">سعة النزلاء:</span>
                  <strong className="text-slate-900 font-semibold">{formData.adults} بالغين لكل غرفة، {formData.rooms} غرفة، إجمالي {formData.adults*formData.rooms} بالغين</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-500 font-medium">جاهزية المحرك:</span>
                  <strong className="text-emerald-700 font-semibold">استعلام مباشر وحقيقي عبر API</strong>
                </div>
              </div>
            </div>
          )}
          
          {/* Room Selection */}
          {(Boolean(urlDetails?.detectedPlatform) || formData.hotelInput?.includes('almatar.com') || formData.hotelInput?.includes('almosafer.com')) && (
            <div className="mt-3 p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-blue-200 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-blue-600" />
                  الغرفة المستهدفة للسحب
                  {formData.roomName && (
                    <span className="text-xs font-normal text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                      محددة
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => handleFetchRooms(formData)}
                  disabled={isFetchingRooms}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-40"
                >
                  {isFetchingRooms ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جاري الجلب...
                    </>
                  ) : (
                    'تحديث الغرف'
                  )}
                </button>
              </div>

              {roomsError && (
                <p className="text-xs text-red-600 mb-3 px-1">{roomsError}</p>
              )}

              {isFetchingRooms && availableRooms.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-500">
                    يتم جلب الغرف المتاحة من {urlDetails?.detectedPlatform?.includes('المسافر') || formData.hotelInput?.includes('almosafer.com') ? 'المسافر' : 'المطار'}...
                  </p>
                </div>
              )}

              {!isFetchingRooms && availableRooms.length === 0 && !roomsError && (
                <div className="flex flex-col items-center justify-center py-5 gap-2 border border-dashed border-blue-200 rounded-xl bg-blue-50/40">
                  <ListFilter className="w-5 h-5 text-blue-300" />
                  <p className="text-xs text-slate-500 text-center">
                    اضغط على <span className="font-bold text-blue-600">تحديث الغرف</span> لجلب الغرف المتاحة من {urlDetails?.detectedPlatform?.includes('المسافر') || formData.hotelInput?.includes('almosafer.com') ? 'المسافر' : 'المطار'}
                  </p>
                </div>
              )}

              {availableRooms.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, roomKeywords: [], roomName: '' }))}
                    className={`w-full text-right px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                      !formData.roomName
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="leading-snug">جميع الغرف المتاحة (أفضل سعر متاح)</span>
                      {!formData.roomName && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </button>
                  {availableRooms.map((room, idx) => {
                    const isSelected = formData.roomName === room;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData(prev => ({ ...prev, roomKeywords: [], roomName: '' }));
                          } else {
                            setFormData(prev => ({ ...prev, roomKeywords: [room], roomName: room }));
                          }
                        }}
                        className={`w-full text-right px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="leading-snug">{room}</span>
                          {isSelected && (
                            <span className="shrink-0 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              تاريخ الوصول (Check-in)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={formData.checkIn}
                onChange={(e) => handleDateChange('checkIn', e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 bg-white/60 backdrop-blur-md border border-slate-300/80 rounded-xl text-sm text-slate-900 focus:bg-white/95 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              تاريخ المغادرة (Check-out)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                min={formData.checkIn}
                value={formData.checkOut}
                onChange={(e) => handleDateChange('checkOut', e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 bg-white/60 backdrop-blur-md border border-slate-300/80 rounded-xl text-sm text-slate-900 focus:bg-white/95 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Quick Duration Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
            <span>فترة مقارنة الأيام:</span>
            <span className="font-bold text-blue-700 font-mono">
              {currentNights ? `${currentNights} ليالٍ` : 'غير محددة'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 hidden sm:inline">اختيار سريع:</span>
            {[
              { label: 'ليلة واحدة (1 يوم)', days: 1 },
              { label: '3 أيام', days: 3 },
              { label: '7 أيام (أسبوع)', days: 7 },
              { label: '12 يوماً (12 ليالٍ)', days: 12 },
              { label: '14 يوماً (أسبوعين)', days: 14 },
              { label: 'شهر كامل (31 يوماً)', days: 31 },
            ].map((preset) => {
              const isActive = currentNights === preset.days;

              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => handleQuickDays(preset.days)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/70 text-slate-700 hover:bg-white hover:text-blue-700 border border-slate-200/50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Adults & Occupancy Selector */}
        <div className="p-3 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs sm:text-sm font-bold text-slate-900">
              سعة الغرفة وعدد الأفراد (سنجل، دبل، ثلاثية، رباعية):
            </label>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {formData.adults} {formData.adults === 1 ? 'فرد (سنجل)' : formData.adults === 2 ? 'أفراد (دبل)' : formData.adults === 3 ? 'أفراد (ثلاثية)' : formData.adults === 4 ? 'أفراد (رباعية)' : 'أفراد'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { count: 1, label: '1 فرد (سنجل / مفردة)' },
              { count: 2, label: '2 أفراد (دبل / مزدوجة)' },
              { count: 3, label: '3 أفراد (غرفة ثلاثية)' },
              { count: 4, label: '4 أفراد (غرفة رباعية)' },
            ].map((occ) => {
              const isSelected = Number(formData.adults) === occ.count;
              return (
                <button
                  key={occ.count}
                  type="button"
                  onClick={() => handleSelectCapacity(occ.count)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-white/70 text-slate-700 hover:bg-white hover:text-blue-700 border-slate-200/60'
                  }`}
                >
                  {occ.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Occupancy Grid: Adults, Children, Rooms */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              البالغون في كل غرفة
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={formData.adults || ''}
              onChange={(e) => handleOccupancyChange('adults', e.target.value)}
              className="w-full px-3 py-2 bg-white/60 backdrop-blur-md border border-slate-300/80 rounded-xl text-sm text-slate-900 text-center font-bold focus:bg-white/95 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              عدد الأطفال
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.children ?? 0}
              onChange={(e) => handleOccupancyChange('children', e.target.value)}
              className="w-full px-3 py-2 bg-white/60 backdrop-blur-md border border-slate-300/80 rounded-xl text-sm text-slate-900 text-center font-bold focus:bg-white/95 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              عدد الغرف
            </label>
            <input
              type="number"
              min="1"
              max="4"
              value={formData.rooms || 1}
              onChange={(e) => handleOccupancyChange('rooms', e.target.value)}
              className="w-full px-3 py-2 bg-white/60 backdrop-blur-md border border-slate-300/80 rounded-xl text-sm text-slate-900 text-center font-bold focus:bg-white/95 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm font-semibold text-slate-800" htmlFor="bed-count">عدد السراير في كل غرفة<select id="bed-count" value={formData.bedCount || 0} onChange={e=>handleChange('bedCount',Number(e.target.value))} className="mt-2 w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl"><option value="0">أي عدد</option>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} {n===1?'سرير':'سراير'}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-800" htmlFor="bed-type">نوع السراير<select id="bed-type" value={formData.bedType || 'any'} onChange={e=>handleChange('bedType',e.target.value)} className="mt-2 w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl">{[['any','أي نوع'],['single','سرير فردي'],['double','سرير مزدوج'],['king','سرير كينج'],['queen','سرير كوين']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={formData.includeUnknownBeds===true} onChange={e=>handleChange('includeUnknownBeds',e.target.checked)}/>إظهار العروض غير محددة السراير<span className="text-xs text-slate-500">(تظهر بوضوح كمطابقة غير مؤكدة)</span></label>
        {/* Room Notes */}
        {Number(formData.children)>0 && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({length:Number(formData.children)},(_,i)=><label key={i} className="text-xs font-semibold text-slate-800">عمر الطفل {i+1} في كل غرفة<input type="number" min="0" max="17" required value={formData.childAges?.[i] ?? ''} onChange={e=>{const ages=Array.from({length:Number(formData.children)},(_,j)=>formData.childAges?.[j]??null);ages[i]=e.target.value===''?null:Number(e.target.value);setFormData({...formData,childAges:ages});}} className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl" /></label>)}</div>}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
            ملاحظات الغرفة
            <span className="text-slate-400 font-normal mr-1 text-xs">(اختياري)</span>
          </label>
          <textarea
            rows="2"
            value={formData.roomNotes || ''}
            onChange={(e) => handleChange('roomNotes', e.target.value)}
            placeholder="مثال: غرفة مزدوجة، إفطار شامل، سريرين منفصلين..."
            className="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-md border border-slate-300/80 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white/95 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none shadow-2xs"
          />
        </div>

        {/* Sources Selector */}
        <SourceSelector
          selectedSources={formData.sources}
          onChange={(newSources) => handleChange('sources', newSources)}
        />

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
              isLoading
                ? 'bg-slate-200/80 text-slate-400 cursor-not-allowed backdrop-blur-md'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:shadow-lg active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري استخراج الأسعار الحية من المصادر...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>بحث واستخراج الأسعار المباشرة</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

