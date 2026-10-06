import * as XLSX from 'xlsx';

export const baseDailyMealPlans = [
  ['roomOnly', 'إقامة فقط'],
  ['breakfast', 'إقامة وإفطار'],
  ['halfBoard', 'إفطار + غداء أو عشاء'],
];

export const extraDailyMealPlans = [
  ['breakfastDiff', 'فرق الإفطار'],
  ['roomOnlyFlexible', 'إقامة فقط (مرن)'],
  ['breakfastFlexible', 'إقامة وإفطار (مرن)'],
  ['halfBoardFlexible', 'إفطار + غداء أو عشاء (مرن)'],
];

export const dailyMealPlans = [
  ...baseDailyMealPlans,
  ...extraDailyMealPlans,
];

export const dailyPriceFields = [
  ['date', 'التاريخ'],
  ['dayName', 'اليوم'],
  ...dailyMealPlans,
  ['dayStatus', 'سياسة الإلغاء'],
];

export const hasPrice = (row, key) => {
  if (key === 'breakfastDiff') {
    const val = row?.breakfastDiff;
    return val !== null && val !== undefined && val !== 'غير متاح' && !isNaN(Number(val));
  }
  const p = row?.offers?.[key]?.price;
  if (p !== undefined && p !== null && !isNaN(Number(p))) return true;
  const val = row?.[key];
  return val !== null && val !== undefined && val !== 'غير متاح' && val !== '' && !isNaN(Number(val));
};

export function buildDailyPricesWorkbook(data, hideEmptyColumns = true, hideUnavailableRows = false) {
  const wb = XLSX.utils.book_new();
  const rows = data?.rows || [];
  const additionalPlans = extraDailyMealPlans.filter(([key]) => rows.some(row => hasPrice(row, key)));
  const activeMealPlans = [...baseDailyMealPlans, ...additionalPlans];

  const exportFields = [
    ['date', 'التاريخ'],
    ['dayName', 'اليوم'],
    ...activeMealPlans,
    ['dayStatus', 'سياسة الإلغاء'],
  ];

  const filteredRows = hideUnavailableRows
    ? rows.filter(row => activeMealPlans.some(([key]) => key !== 'breakfastDiff' && hasPrice(row, key)))
    : rows;

  const getCellValue = (row, key) => {
    if (key === 'date') return row.date;
    if (key === 'dayName') return row.dayName;
    if (key === 'dayStatus') {
      const hasAnyPrice = activeMealPlans.some(([f]) => f !== 'breakfastDiff' && hasPrice(row, f));
      return hasAnyPrice ? (row.dayStatus || 'غير محدد') : (row.error ? 'تعذر التحقق' : 'غير متاح');
    }
    if (key === 'breakfastDiff') {
      return hasPrice(row, 'breakfastDiff') ? parseFloat(row.breakfastDiff) : '—';
    }
    if (row.offers?.[key]?.price !== undefined && row.offers?.[key]?.price !== null) {
      return Number(row.offers[key].price);
    }
    if (hasPrice(row, key)) {
      return parseFloat(row[key]);
    }
    return 'غير متاح';
  };

  const sheet = XLSX.utils.aoa_to_sheet([
    ['أسعار المطار — ' + (data?.hotelName || '')],
    ['الغرفة', data?.roomName || data?.roomKeywords?.join('، ') || ''],
    ['الإشغال', `${data?.adults || 2} بالغين لكل غرفة × ${data?.rooms || 1} غرفة`],
    ['الفترة', `${data?.checkIn} إلى ${data?.checkOut} — كل ليلة باستعلام مستقل`],
    ['وقت الاستعلام (UTC)', data?.fetchedAt || ''],
    ['العملة', 'ريال سعودي — السعر لكل غرفة وليلة شامل الضريبة وخصم المصدر'],
    [],
    exportFields.map(([, title]) => title),
    ...filteredRows.map(row => exportFields.map(([key]) => getCellValue(row, key))),
  ]);

  sheet['!cols'] = exportFields.map(([key]) => ({
    wch: key === 'dayStatus' ? 24 : 18
  }));
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, sheet, 'أسعار الإقامة');
  return wb;
}
