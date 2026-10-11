// Arabic titles verified against Almosafer /api/enigma/hotel/lookup mealBoards.
export const mealPlans = [['roomOnly','إقامة فقط'],['breakfast','إقامة وفطور'],['halfBoard','وجبتان']];
export const money = value => value === null || value === undefined || !Number.isFinite(value) ? 'غير متاح' : value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export const completeSum = values => values.length && values.every(v=>typeof v==='number' && Number.isFinite(v)) ? Math.round(values.reduce((sum,v)=>sum+v,0)*100)/100 : null;

export function searchContextKey(params) {
  return JSON.stringify({hotel:String(params.hotelInput || '').trim(),checkIn:params.checkIn,checkOut:params.checkOut,
    adults:Number(params.adults),children:Number(params.children || 0),rooms:Number(params.rooms),childAges:params.childAges || [],
    sources:[...(params.sources || [])].sort(),roomName:params.roomName || '',roomKeywords:params.roomKeywords || [],
    mealPlan:params.mealPlan || '',roomNotes:params.roomNotes || '',bedCount:Number(params.bedCount || 0),bedType:params.bedType || 'any',includeUnknownBeds:params.includeUnknownBeds===true});
}

export function priceParts(offer, total = offer?.price) {
  const parts = offer?.taxBreakdown;
  if (!parts || parts.currency !== 'SAR' || ![parts.priceBeforeTax,parts.taxesAndFees,parts.totalPrice,total].every(v=>typeof v==='number' && Number.isFinite(v) && v>=0) ||
      Math.abs(parts.totalPrice-total)>0.005 || Math.abs(parts.priceBeforeTax+parts.taxesAndFees-total)>0.005) return null;
  return parts;
}
export function sumPriceParts(days,field,rooms=1) {
  if (!days?.length) return null;
  const values=days.map(day=>priceParts(day.almosaferOffers?.[field],day[`almosafer${field[0].toUpperCase()+field.slice(1)}`]));
  if (values.some(v=>!v)) return null;
  return Object.fromEntries(['priceBeforeTax','taxesAndFees','totalPrice'].map(key=>[key,completeSum(values.map(v=>v[key]*rooms))]));
}

export function replaceVerifiedNight(room, quote) {
  const fresh = quote?.dailyRates?.[0];
  const old = room.dailyRates.find(d => d.date === fresh?.date);
  if (!old || quote.dailyRates.length !== 1 || fresh.nextDate !== old.nextDate ||
      quote.source !== room.source || quote.roomIdentity !== room.roomIdentity ||
      !quote.id || quote.id.replace(/-\d+$/,'') !== room.id?.replace(/-\d+$/,'') ||
      quote.adults !== room.adults || quote.rooms !== room.rooms || quote.children !== room.children ||
      quote.currency !== room.currency) throw new Error('نتيجة إعادة التحقق لا تطابق الغرفة وبيانات الحجز');
  const updated = {...room, dailyRates:room.dailyRates.map(d => d.date === fresh.date
    ? {...d,...fresh,dayNumber:d.dayNumber,dayTitle:d.dayTitle} : d),
    lastUpdated:quote.lastUpdated,warnings:(room.warnings || []).filter(w=>w.date!==fresh.date)};
  for (const [plan] of mealPlans) for (const field of [plan,`${plan}Flexible`]) {
    const rates=updated.dailyRates.map(d=>d[`${field}Price`]);
    const complete=rates.every(p=>typeof p==='number'&&Number.isFinite(p));
    const count=rates.filter(p=>typeof p==='number'&&Number.isFinite(p)).length;
    const total=complete?Math.round(rates.reduce((s,p)=>s+p,0)*room.rooms*100)/100:null;
    updated[`${field}DirectAvailableNights`]=count;
    updated[`${field}AvailableNights`]=count;
    updated[`${field}IsDirectComplete`]=complete;
    updated[`${field}TotalPrice`]=total;
    updated[`${field}PricePerNight`]=total===null?null:Math.round(total/room.rooms/room.nights*100)/100;
  }
  updated.price=updated.roomOnlyTotalPrice??updated.breakfastTotalPrice;
  updated.pricePerNight=updated.roomOnlyPricePerNight??updated.breakfastPricePerNight;
  return updated;
}

// Equal prices alone do not identify an offer: different rooms/rates can cost the same.
export function sameSourceOffer(a,b) {
  return Boolean(a?.packageId && a?.roomId && a?.source && a?.currency && Number.isFinite(a.price) && b &&
    a.packageId===b.packageId && a.roomId===b.roomId && a.source===b.source &&
    a.price===b.price && a.currency===b.currency && a.refundable===b.refundable);
}
export function repeatedRateField(day,field,fields) {
  if(field.endsWith('Flexible') || !fields.some(([key])=>key===`${field}Flexible`))return null;
  const offers=day.almosaferOffers || day.offers;
  return sameSourceOffer(offers?.[field],offers?.[`${field}Flexible`]) ? `${field}Flexible` : null;
}

export function rateFields(summary,rateTier='both') {
  const available=(field)=>summary?.[`almosafer${field[0].toUpperCase()+field.slice(1)}AvailableNights`]>0||summary?.dailyBreakdown?.some(d=>d[`almosafer${field[0].toUpperCase()+field.slice(1)}`]!=null);
  const hasAnyRoomOnly = available('roomOnly') || available('roomOnlyFlexible');
  return mealPlans.filter(([plan])=>(plan==='roomOnly'?hasAnyRoomOnly:(available(plan)||available(`${plan}Flexible`)))).flatMap(([plan,defaultLabel])=>{
    const label=summary?.mealPlanLabels?.[plan] || defaultLabel;
    if(rateTier==='flexible')return available(`${plan}Flexible`)?[[`${plan}Flexible`,`${label} — إلغاء مجاني`]]:[];
    const flexible=`${plan}Flexible`;
    const days=summary?.dailyBreakdown?.filter(d=>(d.almosaferOffers || d.offers)?.[plan]) || [];
    const onlySameOffer=rateTier==='both' && available(flexible) && days.length>0 && days.every(d=>sameSourceOffer((d.almosaferOffers || d.offers)[plan],(d.almosaferOffers || d.offers)[flexible]));
    return [...(onlySameOffer?[]:[[plan,label]]),...(rateTier==='both'&&available(flexible)?[[flexible,`${label} — إلغاء مجاني`]]:[])];
  });
}
export function catalogFields(results,rateTier='both') {
  const summary={mealPlanLabels:{},dailyBreakdown:results.flatMap(r=>r.dailyRates || [])};
  for(const [plan] of mealPlans)summary.mealPlanLabels[plan]=[...new Set(results.map(r=>r.mealPlanLabels?.[plan]).filter(Boolean))].join(' / ');
  for(const [plan] of mealPlans)for(const field of [plan,`${plan}Flexible`])summary[`almosafer${field[0].toUpperCase()+field.slice(1)}AvailableNights`]=Math.max(0,...results.map(r=>r[`${field}AvailableNights`] || 0));
  return rateFields(summary,rateTier);
}

export function summaryForRoom(summary,room) {
  if(!summary || !room) return summary;
  const fields=mealPlans.flatMap(([plan])=>[plan,`${plan}Flexible`]);
  const title=field=>field[0].toUpperCase()+field.slice(1);
  const selected={...summary,activeRoomId:room.id,almosaferRoom:room.roomName,beddingLabel:room.beddingLabel || 'لم يحدد المصدر',bedFilterStatus:room.bedFilterStatus,requestedBeds:room.requestedBeds,activeRoomCategory:room.roomCategory,almosaferCancellation:room.cancellationPolicy,almosaferCancellationLowest:room.cancellationPolicyLowest,almosaferCancellationFlexible:room.cancellationPolicyFlexible,warnings:[...(summary.warnings || [])]};
  selected.source=room.source;selected.sourceArabic=room.sourceArabic || 'المسافر';selected.mealPlanLabels=room.mealPlanLabels;selected.roomSizeM2=room.roomSizeM2;
  selected.roomDescription=room.roomDescription;selected.roomAmenities=room.roomAmenities;
  if(room.bedFilterStatus==='unknown')selected.warnings.push('هذه الغرفة غير مؤكدة المطابقة لاختيار السراير؛ المصدر لم يحدد العدد أو النوع المطلوب.');
  selected.dailyBreakdown=summary.dailyBreakdown.map(base=>{
    const rate=room.dailyRates.find(d=>d.date===base.date);
    const day={
      ...base,
      almosaferRoom:room.roomName,
      almosaferAvailability:rate?.availability || 'unavailable',
      almosaferError:rate?.error || null,
      almosaferCancellation:rate?.cancellationPolicy || 'غير متاح',
      almosaferOffers:rate?.offers || {},
      isAlternative:rate?.isAlternative || false,
      alternativeRoomName:rate?.alternativeRoomName || null
    };
    fields.forEach(field=>{
      day[`almosafer${title(field)}`]=rate?.[`${field}Price`] ?? null;
      day[`almosafer${title(field)}IsAlternative`]=rate?.[`${field}IsAlternative`] || false;
    });
    for(const plan of ['Breakfast','HalfBoard']) {
      const price=day[`almosafer${plan}`],ro=day.almosaferRoomOnly;
      const diff = (price !== null && ro !== null) ? Math.round((price - ro) * 100) / 100 : (plan === 'Breakfast' && price !== null && ro === null ? 0 : (plan === 'HalfBoard' && price !== null && day.almosaferBreakfast !== null ? Math.round((price - day.almosaferBreakfast) * 100) / 100 : null));
      day[`almosafer${plan}MealDiff`]=diff;
      day[`almosafer${plan}PerPerson`]=diff===null ? null : Math.round(diff/summary.adults*100)/100;
    }
    return day;
  });
  for(const field of fields) {
    selected[`almosafer${title(field)}`]=room[`${field}TotalPrice`] ?? null;
    selected[`almosafer${title(field)}PerNight`]=room[`${field}PricePerNight`] ?? null;
    selected[`almosafer${title(field)}AvailableNights`]=room[`${field}AvailableNights`] || 0;
    selected[`almosafer${title(field)}DirectAvailableNights`]=room[`${field}DirectAvailableNights`] || 0;
  }
  return selected;
}
