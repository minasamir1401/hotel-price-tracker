const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';
export async function startHotelPriceSearch(searchData, onProgress) {
  const controller = new AbortController();
  const nights = Math.max(1, Math.min(62, Math.ceil((Date.parse(searchData.checkOut) - Date.parse(searchData.checkIn)) / 86400000) || 31));
  const timer = setTimeout(() => controller.abort(), 60000 + Math.ceil(nights / 4) * 90000 + Math.ceil(nights / 2) * 45000);
  try {
    const response = await fetch(`${API_BASE_URL}/search-hotel-prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json',
      },
      body: JSON.stringify({ ...searchData, refresh: true }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const parsed = JSON.parse(errText);
        return { success: false, message: parsed.error || parsed.message || 'فشل استخراج الأسعار' };
      } catch {
        return { success: false, message: errText || `خطأ الخادم ${response.status}` };
      }
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const trimmed = block.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          for (const line of trimmed.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.type === 'progress') {
                  if (typeof onProgress === 'function') onProgress(payload);
                } else if (payload.type === 'done') {
                  finalResult = payload.result;
                } else if (payload.type === 'error') {
                  return { success: false, message: payload.message || 'فشل استخراج الأسعار' };
                }
              } catch {}
            }
          }
        }
      }

      if (finalResult) return finalResult;
      return { success: false, message: 'انقطع الاتصال قبل اكتمال السحب؛ يرجى إعادة المحاولة' };
    }

    const result = await response.json();
    if (!result || result.success === false) {
      return { success: false, message: result?.error || result?.message || 'فشل استخراج الأسعار من المصدر' };
    }
    return result;
  } catch (error) {
    return {
      success: false,
      message: error.name === 'AbortError'
        ? 'انتهت مهلة البحث؛ أعد المحاولة أو اختر مدة أقصر.'
        : 'تعذر الاتصال بالخادم. شغّل الخادم وأعد البحث.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function startDailyPricesSearch(searchData, onProgress) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 600000);

  try {
    const response = await fetch(`${API_BASE_URL}/daily-prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        hotelInput: searchData.hotelInput,
        checkIn: searchData.checkIn,
        checkOut: searchData.checkOut,
        adults: searchData.adults || 2,
        childAges: searchData.childAges || [],
        roomKeywords: searchData.roomKeywords || [],
        concurrency: searchData.concurrency || 4,
        rooms: searchData.rooms || 1,
        roomName: searchData.roomName || '',
        bedCount: searchData.bedCount || 0,
        bedType: searchData.bedType || 'any',
        includeUnknownBeds: Boolean(searchData.includeUnknownBeds),
        mealPlan: searchData.mealPlan || '',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const parsed = JSON.parse(errText);
        return { success: false, message: parsed.message || 'فشل استخراج الأسعار اليومية' };
      } catch {
        return { success: false, message: errText || `خطأ الخادم ${response.status}` };
      }
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const trimmed = block.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          for (const line of trimmed.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.type === 'progress') {
                  if (typeof onProgress === 'function') onProgress(payload);
                } else if (payload.type === 'done') {
                  finalResult = payload.result;
                } else if (payload.type === 'error') {
                  return { success: false, message: payload.message || 'فشل استخراج الأسعار اليومية' };
                }
              } catch {}
            }
          }
        }
      }

      if (finalResult) return finalResult;
      return { success: false, message: 'انقطع الاتصال قبل اكتمال السحب؛ يرجى إعادة المحاولة' };
    }

    const result = await response.json();
    if (!result || result.success === false) {
      return { success: false, message: result?.message || 'فشل استخراج الأسعار اليومية' };
    }
    return result;
  } catch (error) {
    return {
      success: false,
      message: error.name === 'AbortError'
        ? 'انتهت مهلة البحث المحددة؛ يرجى إعادة المحاولة.'
        : 'تعذر الاتصال بالخادم أثناء عملية السحب.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getSystemStatus() {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),3000);
  try {
    const response=await fetch(`${API_BASE_URL}/system-status`,{signal:controller.signal});
    if(!response.ok) throw new Error('offline');
    return await response.json();
  } catch {
    return {almosafer:'offline',almatar:'offline',booking:'offline',excelExport:'ready',lastSearch:'الخادم غير متصل',activeProxies:0,errors:['تعذر الاتصال بالخادم']};
  } finally {clearTimeout(timer);}
}

export async function fetchHotelRoomsList(searchData, { signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${API_BASE_URL}/hotel-rooms-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelInput: searchData.hotelInput,
        checkIn: searchData.checkIn,
        checkOut: searchData.checkOut,
        adults: searchData.adults || 2,
        rooms: searchData.rooms || 1,
        source: searchData.source,
        children: searchData.children ?? (searchData.childAges || []).length,
        refresh: Boolean(searchData.refresh),
        childAges: searchData.childAges || [],
      }),
      signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
    });
    const result = await response.json();
    if (!response.ok || result.success === false)
      return { success: false, message: result.message || 'فشل استخراج الغرف', code: result.code, diagnosticId: result.diagnosticId };
    return result;
  } catch (error) {
    return {
      success: false,
      message: error.name === 'AbortError'
        ? 'انتهت مهلة استخراج الغرف.'
        : 'تعذر الاتصال بالخادم.',
    };
  } finally {
    clearTimeout(timer);
  }
}
