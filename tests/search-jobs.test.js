import test from 'node:test';
import assert from 'node:assert/strict';
import {startHotelPriceSearch} from '../src/services/api.js';

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
