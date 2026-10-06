import React, { useState } from 'react';
import { FileSpreadsheet, Check, Layers } from 'lucide-react';
import { exportToExcel, getCleanHotelName, getCleanRoomName } from '../services/excelExport';

export default function ExportExcelButton({
  searchParams,
  results,
  summary,
  viewMode = 'all',
  rateTier = 'both',
  onExport,
}) {
  const [downloadingMode, setDownloadingMode] = useState(null);
  const [downloadedMode, setDownloadedMode] = useState(null);

  const handleExport = (targetMode) => {
    if (!results || results.length === 0) return;
    setDownloadingMode(targetMode);

    try {
      exportToExcel(searchParams, results, summary, targetMode, rateTier);
      setDownloadedMode(targetMode);
      if (onExport) onExport();

      setTimeout(() => {
        setDownloadedMode(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to export to Excel:', err);
    } finally {
      setDownloadingMode(null);
    }
  };

  const isDisabled = !results || results.length === 0;

  let currentLabel = 'تصدير دليل الأسعار إلى Excel';
  if (viewMode === 'separated') {
    currentLabel = 'تصدير الجداول المنفصلة';
  } else if (viewMode === 'combined') {
    currentLabel = 'تصدير الجدول المجمع';
  }

  const isCurrentActive = viewMode !== 'all';
  const targetAdults = Number(summary?.adults || searchParams?.adults || 2);
  const nights = Math.max(1, summary?.dailyBreakdown?.length || summary?.nights || searchParams?.nights || 1);
  const cleanHotel = getCleanHotelName(searchParams, summary, results);
  const cleanRoom = getCleanRoomName(searchParams, summary, results, targetAdults);
  const exportTooltip = `تحميل ملف Excel: ${cleanHotel} - ${cleanRoom} (${summary?.rooms || searchParams?.rooms || 1} غرفة - ${targetAdults} بالغين لكل غرفة - ${nights} ليلة)`;

  return (
    <div className="inline-flex items-center gap-2">
      {/* Primary Export Button */}
      <button
        type="button"
        disabled={isDisabled || Boolean(downloadingMode)}
        onClick={() => handleExport(viewMode)}
        title={exportTooltip}
        className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold backdrop-blur-md transition-all shadow-sm ${
          isDisabled
            ? 'bg-white/40 text-slate-400 cursor-not-allowed border border-white/50'
            : downloadedMode === viewMode
            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-600/25'
        }`}
      >
        {downloadedMode === viewMode ? (
          <>
            <Check className="w-4 h-4" />
            <span>تم التصدير بنجاح</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4" />
            <span>{currentLabel}</span>
          </>
        )}
      </button>

      {/* Secondary Button: Export All if viewing a specific tab */}
      {isCurrentActive && (
        <button
          type="button"
          disabled={isDisabled || Boolean(downloadingMode)}
          onClick={() => handleExport('all')}
          title="تصدير ملف شامل يجمع كافة التابات (دليل الغرف، الجداول المنفصلة، والمجمع)"
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold backdrop-blur-md transition-all border ${
            isDisabled
              ? 'bg-white/40 text-slate-400 cursor-not-allowed border-white/50'
              : downloadedMode === 'all'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white/80 text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
          }`}
        >
          {downloadedMode === 'all' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>تم تصدير الكل</span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>تصدير الكل (ملف كامل)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
