const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

// Retry only transport failures. The same submission is deduplicated by the
// server; polling always keeps the original job rather than restarting scraping.
async function request(url, options, signal, attempts, timeoutMs) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.any([signal, controller.signal]) });
      if (!response.ok) {
        let data;
        try { data = await response.json(); } catch { data = {}; }
        const error = Object.assign(new Error(data.message || data.error || `تعذر الاتصال بالخادم (HTTP ${response.status})`), {
          code: data.code, diagnosticId: data.diagnosticId,
          retryable: RETRYABLE_STATUSES.has(response.status),
        });
        throw error;
      }
      if (response.headers?.get('content-type')?.includes('text/event-stream') && response.body) {
        return { response };
      }
      return { response, data: await response.json() };
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      if (error.retryable === false || attempt + 1 >= attempts) throw error;
    } finally { clearTimeout(timer); }
    await wait(Math.min(8000, 1000 * 2 ** attempt), signal);
  }
}

async function readStream(response, onProgress) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', result = null;
  const consume = block => {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data:')) continue;
      let payload;
      try { payload = JSON.parse(line.slice(5).trim()); } catch { continue; }
      if (payload.type === 'progress') onProgress?.(payload);
      if (payload.type === 'done') result = payload.result;
      if (payload.type === 'error') result = { success: false, message: payload.message, code: payload.code, diagnosticId: payload.diagnosticId };
    }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';
      for (const block of blocks) consume(block);
      if (result) return result;
      if (done) { consume(buffer); break; }
    }
  } finally { await reader.cancel().catch(() => {}); }
  return result || { success: false, message: 'انقطع الاتصال قبل اكتمال السحب؛ يرجى إعادة المحاولة.' };
}

export async function runPriceSearch({ apiBase, endpoint, payload, onProgress, timeoutMs, submissionAttempts = 2 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let jobId;
  try {
    const { response, data } = await request(`${apiBase}/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...payload, background: true }),
    }, controller.signal, submissionAttempts, 30000);
    if (response.status !== 202) {
      if (!data && response.body) return await readStream(response, onProgress);
      return data || { success: false, message: 'الخادم لم يرجع نتيجة صالحة.' };
    }
    if (!/^[a-f0-9-]{36}$/i.test(data?.jobId || '')) throw new Error('الخادم لم يرجع معرف مهمة صالحًا');
    jobId = data.jobId;
    while (!controller.signal.aborted) {
      const { data: state } = await request(`${apiBase}/search-jobs/${encodeURIComponent(jobId)}`, {
        cache: 'no-store',
      }, controller.signal, 5, 15000);
      onProgress?.({ ...state.progress, jobId });
      if (state.status === 'completed') return state.result || { success: false, message: 'الخادم لم يرجع نتيجة المهمة.' };
      if (state.status === 'failed') return { success: false, ...state.error, jobId };
      if (state.status !== 'running') throw new Error('الخادم لم يرجع حالة مهمة صالحة');
      await wait(1500, controller.signal);
    }
    throw controller.signal.reason;
  } catch (error) {
    return {
      success: false, ...(jobId ? { jobId } : {}), code: error.code, diagnosticId: error.diagnosticId,
      message: controller.signal.aborted
        ? (jobId ? 'انتهت مهلة متابعة المهمة؛ قد يظل السحب جاريًا على الخادم.' : 'انتهت مهلة البحث؛ يرجى إعادة المحاولة.')
        : error.retryable !== undefined ? error.message
        : (jobId ? 'تعذر استعادة اتصال متابعة البحث؛ أعد نفس البحث لاستكمال متابعة المهمة.' : 'تعذر الاتصال بالخادم أثناء عملية السحب؛ يرجى إعادة المحاولة.'),
    };
  } finally { clearTimeout(timer); }
}
