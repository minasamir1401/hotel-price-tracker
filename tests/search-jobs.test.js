import test from 'node:test';
import assert from 'node:assert/strict';
import {startHotelPriceSearch, startDailyPricesSearch, fetchHotelRoomsList} from '../src/services/api.js';
import {runPriceSearch} from '../src/services/searchTransport.js';

const jobId='00000000-0000-4000-8000-000000000001';
const month={hotelInput:'hotel',checkIn:'2026-10-20',checkOut:'2026-11-19',sources:['almosafer']};

test('The frontend submits one month job and follows its progress and complete source result',async()=>{
  const saved=globalThis.fetch,requests=[],progress=[];
  const result={success:true,data:[{roomName:'Twin',dailyRates:Array.from({length:30},(_,i)=>({day:i+1}))}]};
  let polls=0;
  try{
    globalThis.fetch=async(url,options)=>{
      requests.push({url,options});
      if(options?.method==='POST')return {ok:true,status:202,json:async()=>({success:true,jobId})};
      assert.equal(url,`/api/search-jobs/${jobId}`);
      polls++;
      return {ok:true,json:async()=>polls===1?{status:'running',progress:{completed:12,total:30,percent:40}}:{status:'completed',progress:{completed:30,total:30,percent:100},result}};
    };
    assert.deepEqual(await startHotelPriceSearch(month,p=>progress.push(p)),result);
    assert.equal(requests.filter(r=>r.options?.method==='POST').length,1);
    assert.equal(JSON.parse(requests[0].options.body).background,true);
    assert.equal(requests[0].options.headers.Accept,'application/json');
    assert.deepEqual(progress.map(p=>p.completed),[12,30]);
    assert.ok(progress.every(p=>p.jobId===jobId));
  }finally{globalThis.fetch=saved;}
});

test('Background failure returns its source diagnostics and legacy JSON remains supported',async()=>{
  const saved=globalThis.fetch;
  try{
    globalThis.fetch=async(_url,options)=>options?.method==='POST'?{ok:true,status:202,json:async()=>({jobId})}:{ok:true,json:async()=>({status:'failed',error:{message:'Source refused connection',code:'UPSTREAM_ACCESS_DENIED',diagnosticId:'test-reference'}})};
    const failure=await startHotelPriceSearch(month);
    assert.equal(failure.success,false);assert.equal(failure.code,'UPSTREAM_ACCESS_DENIED');assert.equal(failure.diagnosticId,'test-reference');
    globalThis.fetch=async()=>({ok:true,status:200,headers:new Headers({'content-type':'application/json'}),json:async()=>({success:true,data:[]})});
    assert.deepEqual(await startHotelPriceSearch(month),{success:true,data:[]});
  }finally{globalThis.fetch=saved;}
});

test('Almatar daily prices use a short background submission and retain exact room, dates and occupancy', async () => {
  const saved = globalThis.fetch, progress = [], requests = [];
  const input = { ...month, adults: 3, rooms: 2, childAges: [7], roomName: 'Twin',
    roomKeywords: ['Twin'], mealPlan: 'breakfast', bedCount: 2, bedType: 'single', includeUnknownBeds: true };
  const result = { success: true, rows: [{ date: month.checkIn, breakfast: '1115.00', offers: { breakfast: { packageId: 'source-package' } } }] };
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return Response.json(options.method === 'POST' ? { jobId } : { status: 'completed', progress: { completed: 30, total: 30 }, result },
        { status: options.method === 'POST' ? 202 : 200 });
    };
    assert.deepEqual(await startDailyPricesSearch(input, p => progress.push(p)), result);
    assert.equal(requests[0].url, '/api/daily-prices');
    const body = JSON.parse(requests[0].options.body);
    assert.equal(body.background, true);
    for (const key of ['hotelInput', 'checkIn', 'checkOut', 'adults', 'rooms', 'childAges', 'roomName', 'roomKeywords', 'mealPlan', 'bedCount', 'bedType', 'includeUnknownBeds'])
      assert.deepEqual(body[key], input[key]);
    assert.equal(requests[1].options.cache, 'no-store');
    assert.equal(progress[0].jobId, jobId);
  } finally { globalThis.fetch = saved; }
});

test('Temporary network, gateway HTML and incomplete JSON polling failures resume the SAME daily job', async () => {
  const saved = globalThis.fetch, requests = [], result = { success: true, rows: [{ breakfast: '123.00' }] };
  let polls = 0;
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (options.method === 'POST') return Response.json({ jobId }, { status: 202 });
      assert.equal(url, `/api/search-jobs/${jobId}`);
      polls++;
      if (polls === 1) throw new TypeError('Failed to fetch');
      if (polls === 2) return new Response('<html>Bad gateway</html>', { status: 502 });
      if (polls === 3) return new Response('{"status":');
      return Response.json({ status: 'completed', result });
    };
    assert.deepEqual(await startDailyPricesSearch(month), result);
    assert.equal(requests.filter(r => r.options.method === 'POST').length, 1);
    assert.equal(polls, 4);
  } finally { globalThis.fetch = saved; }
});

test('A lost submission response resends identical input so the server can deduplicate work', async () => {
  const saved = globalThis.fetch, bodies = [];
  try {
    globalThis.fetch = async (_url, options) => {
      if (options.method === 'POST') {
        bodies.push(options.body);
        if (bodies.length === 1) throw new TypeError('Connection reset after server accepted job');
        return Response.json({ jobId }, { status: 202 });
      }
      return Response.json({ status: 'completed', result: { success: true, rows: [] } });
    };
    assert.equal((await startDailyPricesSearch(month)).success, true);
    assert.equal(bodies.length, 2);
    assert.equal(bodies[0], bodies[1]);
  } finally { globalThis.fetch = saved; }
});

test('Expired tasks and invalid input are reported without restarting work or losing diagnostics', async () => {
  const saved = globalThis.fetch;
  let requests = 0;
  try {
    globalThis.fetch = async (_url, options) => {
      requests++;
      return options.method === 'POST' ? Response.json({ jobId }, { status: 202 })
        : Response.json({ message: 'المهمة غير موجودة أو انتهت صلاحيتها' }, { status: 404 });
    };
    const expired = await startDailyPricesSearch(month);
    assert.equal(expired.success, false);
    assert.equal(expired.jobId, jobId);
    assert.match(expired.message, /انتهت صلاحيتها/);
    assert.equal(requests, 2);
    requests = 0;
    globalThis.fetch = async () => {
      requests++;
      return Response.json({ message: 'Invalid dates', code: 'INVALID_DATES', diagnosticId: 'ref' }, { status: 400 });
    };
    const invalid = await startDailyPricesSearch(month);
    assert.equal(invalid.message, 'Invalid dates');
    assert.equal(invalid.code, 'INVALID_DATES');
    assert.equal(invalid.diagnosticId, 'ref');
    assert.equal(requests, 1);
  } finally { globalThis.fetch = saved; }
});

test('The overall deadline aborts an unresponsive poll and retains the job reference', async () => {
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      if (options.method === 'POST') return Response.json({ jobId }, { status: 202 });
      return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
    };
    const result = await runPriceSearch({ apiBase: '/api', endpoint: 'daily-prices', payload: month, timeoutMs: 30 });
    assert.equal(result.success, false);
    assert.equal(result.jobId, jobId);
    assert.match(result.message, /انتهت مهلة/);
  } finally { globalThis.fetch = saved; }
});

test('Legacy streams support CRLF and a final result without a trailing blank line', async () => {
  const saved = globalThis.fetch, progress = [];
  const result = { success: true, rows: [{ breakfast: '1115.00' }] };
  try {
    globalThis.fetch = async () => new Response(`: ping\r\n\r\ndata: ${JSON.stringify({ type: 'progress', completed: 1 })}\r\n\r\ndata: ${JSON.stringify({ type: 'done', result })}`, {
      headers: { 'content-type': 'text/event-stream' },
    });
    assert.deepEqual(await startDailyPricesSearch(month, p => progress.push(p)), result);
    assert.equal(progress[0].completed, 1);
  } finally { globalThis.fetch = saved; }
});

test('Room loading resumes the same background job after a gateway failure and preserves hotel and occupancy', async () => {
  const saved = globalThis.fetch, requests = [];
  let polls = 0;
  const result = { success: true, hotelId: '1441222', rooms: ['Superior Twin'] };
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (options.method === 'POST') return Response.json({ jobId }, { status: 202 });
      if (++polls === 1) return new Response('Bad gateway', { status: 502 });
      return Response.json({ status: 'completed', result });
    };
    assert.deepEqual(await fetchHotelRoomsList({ hotelInput: 'https://www.almosafer.com/ar/hotel/details/atg/hotel-1441222',
      checkIn: '2027-02-08', checkOut: '2027-02-09', source: 'almosafer', rooms: 2, adults: 3, children: 1, childAges: [7] }), result);
    const body = JSON.parse(requests[0].options.body);
    assert.equal(body.background, true);
    assert.equal(body.rooms, 2); assert.equal(body.adults, 3); assert.deepEqual(body.childAges, [7]);
    assert.equal(requests[0].url, '/api/hotel-rooms-list');
    assert.equal(requests.filter(r => r.options.method === 'POST').length, 1);
    assert.equal(requests[1].url, requests[2].url);
  } finally { globalThis.fetch = saved; }
});

test('Changing the room request aborts polling and does not submit a cancelled request', async () => {
  const saved = globalThis.fetch, controller = new AbortController();
  let requests = 0;
  controller.abort();
  try {
    globalThis.fetch = async () => { requests++; throw new Error('Must not request'); };
    assert.equal((await fetchHotelRoomsList(month, { signal: controller.signal })).success, false);
    assert.equal(requests, 0);
  } finally { globalThis.fetch = saved; }
});

test('A new search click has a new request ID; retrying the same submission keeps its original ID', async () => {
  const saved = globalThis.fetch, ids = [];
  try {
    globalThis.fetch = async (_url, options) => {
      if (options.method === 'POST') {
        ids.push(JSON.parse(options.body).requestId);
        return Response.json({ jobId }, { status: 202 });
      }
      return Response.json({ status: 'completed', result: { success: true, data: [] } });
    };
    await startHotelPriceSearch(month);
    await startHotelPriceSearch(month);
    assert.match(ids[0], /^[a-f0-9-]{36}$/i);
    assert.notEqual(ids[0], ids[1]);
  } finally { globalThis.fetch = saved; }
});
