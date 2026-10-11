import { money, priceParts } from '../services/rates';

export default function PriceBreakdown({total,offer,parts,showPolicy=false}) {
  const breakdown = parts || priceParts(offer,total);
  if(total==null) return <span>غير متاح</span>;
  return <div className="min-w-44 space-y-1">
    {breakdown ? <>
      {offer?.originalPriceBeforeTax>breakdown.priceBeforeTax && <div className="text-sm text-slate-500"><s>{money(offer.originalPriceBeforeTax)} ر.س</s> <span className="text-emerald-700">خصم {money(offer.discountAmount)} ر.س</span>{offer.discountLabels?.map(label=><span key={label} className="block" dir="auto">{label}</span>)}</div>}
      <div className="text-lg font-bold text-slate-900 font-mono" dir="ltr">{money(breakdown.priceBeforeTax)} <span className="text-xs">ر.س</span></div>
      <div className="text-xs text-slate-500">سعر الغرفة بدون الضرائب والرسوم</div>
      <div className="text-sm text-slate-600">+ {money(breakdown.taxesAndFees)} ر.س ضرائب ورسوم</div>
      <div className="text-sm font-bold text-blue-700">الإجمالي: {money(total)} ر.س</div>
      {breakdown.items?.length>0 && <details className="text-xs text-slate-500 font-normal"><summary className="cursor-pointer">تفصيل الضرائب والرسوم</summary>{breakdown.items.map((item,i)=><div key={i}>{item.name}: {money(item.amount)} ر.س</div>)}{Math.abs(breakdown.items.reduce((sum,item)=>sum+item.amount,0)-breakdown.taxesAndFees)>0.005 && <p className="mt-1">مجموع البنود المقربة قد يختلف عن إجمالي الرسوم؛ الإجمالي مأخوذ من المصدر قبل تقريب البنود.</p>}</details>}
    </> : <>
      <div className="font-bold font-mono">الإجمالي: {money(total)} ر.س</div>
      <div className="text-xs text-slate-500 font-normal">المصدر لم يفصل السعر عن الضرائب والرسوم</div>
    </>}
    {showPolicy && offer && <div className="text-xs font-normal font-sans text-slate-600 border-t border-slate-100 pt-2 space-y-1">
      <p>{offer.cancellationPolicy}</p>
      {offer.mealLabelFromSource && <p dir="auto">{offer.mealLabelFromSource}</p>}
      {offer.partnerOffer && <p className="font-semibold text-indigo-700">عرض من شريك Booking.com</p>}
      {offer.partnerConditions?.map((condition,i)=><p key={i} dir="auto">{condition}</p>)}
      {offer.noPrepayment && <p className="text-emerald-700">بدون دفع مسبق — الدفع أثناء الإقامة</p>}
      {offer.paymentLabel ? <p dir="auto">{offer.paymentLabel}</p> : offer.paymentType==='full_prepayment' && <p>دفع مسبق لكامل المبلغ حسب شروط العرض</p>}
      {offer.reschedulePolicy && <p dir="auto">{offer.reschedulePolicy}</p>}
      {(offer.paymentDetails || offer.cancellationDetails) && <details><summary className="cursor-pointer">تفصيل شروط الدفع والإلغاء من المصدر</summary>{offer.paymentDetails && <p dir="auto">{offer.paymentDetails}</p>}{offer.cancellationDetails && <p dir="auto">{offer.cancellationDetails}</p>}</details>}
      {offer.noCreditCard && <p className="text-emerald-700">لا تحتاج بطاقة ائتمانية</p>}
      {offer.capacityAdults>0 && <p>سعة العرض: {offer.capacityAdults} بالغين</p>}
      {offer.roomsLeft!=null && <p>المتبقي من العرض: {offer.roomsLeft} غرفة</p>}
    </div>}
  </div>;
}
