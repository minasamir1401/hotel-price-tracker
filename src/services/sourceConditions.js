import {money} from './rates.js';

// Source policies can be text or structured fee/date records. Keep their
// amounts and currency intact while producing text usable by React and Excel.
export function formatSourceConditions(value) {
  if(value==null)return '';
  if(Array.isArray(value))return value.map(formatSourceConditions).filter(Boolean).join(' • ');
  if(typeof value!=='object')return String(value);
  if('cancellationFee' in value) {
    const fee=value.cancellationFee;
    const amount=typeof fee==='number'?fee:fee?.finalPrice;
    const dates=[value.dateFrom?`من ${value.dateFrom}`:'',value.dateTo?`إلى ${value.dateTo}`:''].filter(Boolean).join(' ');
    const charge=typeof amount==='number'&&Number.isFinite(amount)
      ? `رسوم الإلغاء: ${money(amount)}${fee?.currency?` ${fee.currency}`:''}`
      : `رسوم الإلغاء: ${formatSourceConditions(fee)||'لم يحدد المصدر'}`;
    return [dates,charge].filter(Boolean).join(' — ');
  }
  return Object.entries(value).map(([key,detail])=>`${key}: ${formatSourceConditions(detail)}`).join(' • ');
}
