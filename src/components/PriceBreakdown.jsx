import { money, priceParts } from '../services/rates';

export default function PriceBreakdown({total,offer,parts,showPolicy=false}) {
  const breakdown = parts || priceParts(offer,total);
  if(total==null) return <span>غير متاح</span>;
  return <div className="min-w-44 space-y-1">
    {breakdown ? <>
      <div className="text-lg font-bold text-slate-900 font-mono" dir="ltr">{money(breakdown.priceBeforeTax)} <span className="text-xs">ر.س</span></div>
      <div className="text-xs text-slate-500">سعر الغرفة بدون الضرائب والرسوم</div>
      <div className="text-sm text-slate-600">+ {money(breakdown.taxesAndFees)} ر.س ضرائب ورسوم</div>
      <div className="text-sm font-bold text-blue-700">الإجمالي: {money(total)} ر.س</div>
      {breakdown.items?.length>0 && <details className="text-xs text-slate-500 font-normal"><summary className="cursor-pointer">تفصيل الضرائب والرسوم</summary>{breakdown.items.map((item,i)=><div key={i}>{item.name}: {money(item.amount)} ر.س</div>)}</details>}
    </> : <>
      <div className="font-bold font-mono">الإجمالي: {money(total)} ر.س</div>
      <div className="text-xs text-slate-500 font-normal">المصدر لم يفصل السعر عن الضرائب والرسوم</div>
    </>}
    {showPolicy && offer && <div className="text-xs font-normal font-sans text-slate-600 border-t border-slate-100 pt-2 space-y-1">
      <p>{offer.cancellationPolicy}</p>
      {offer.noPrepayment && <p className="text-emerald-700">بدون دفع مسبق — الدفع أثناء الإقامة</p>}
      {offer.noCreditCard && <p className="text-emerald-700">لا تحتاج بطاقة ائتمانية</p>}
      {offer.capacityAdults>0 && <p>سعة العرض: {offer.capacityAdults} بالغين</p>}
      {offer.roomsLeft!=null && <p>المتبقي من العرض: {offer.roomsLeft} غرفة</p>}
    </div>}
  </div>;
}
