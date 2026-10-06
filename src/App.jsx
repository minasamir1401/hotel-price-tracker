import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HotelSearchForm from './components/HotelSearchForm';
import ComparisonSummaryCards from './components/ComparisonSummaryCards';
import SearchResultsTable from './components/SearchResultsTable';
import SystemStatusPanel from './components/SystemStatusPanel';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';
import DailyPricesView from './components/DailyPricesView';
import { startHotelPriceSearch, getSystemStatus, startDailyPricesSearch } from './services/api';
import { summaryForRoom, replaceVerifiedNight } from './services/rates';

export default function App() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const tenDaysLater = new Date(tomorrow);
  tenDaysLater.setDate(tenDaysLater.getDate() + 10);
  const tenDaysLaterStr = tenDaysLater.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    hotelInput: '',
    checkIn: tomorrowStr,
    checkOut: tenDaysLaterStr,
    adults: 2,
    children: 0,
    rooms: 1,
    roomNotes: '',
    bedCount: 0,
    bedType: 'any',
    includeUnknownBeds: false,
    sources: ['almosafer', 'almatar'],
    roomName: '',
    roomKeywords: [],
    mealPlan: '',
  });

  const [searchState, setSearchState] = useState('idle'); // idle | loading | success | no-results | error
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedRoomId,setSelectedRoomId] = useState(null);
  const [retryingDate,setRetryingDate] = useState(null);
  const [retryDayError,setRetryDayError] = useState('');
  const selectedSummary = summaryForRoom(summary,results.find(r=>r.id===selectedRoomId) || results[0]);
  const [dailyPricesData, setDailyPricesData] = useState(null);
  const [progressInfo, setProgressInfo] = useState(null);
  const [systemStatus, setSystemStatus] = useState({
    almosafer: 'ready',
    almatar: 'ready',
    excelExport: 'ready',
    lastSearch: 'جاهز للاستعلام',
    errors: [],
  });

  // Load system status on mount (clean idle state, zero hardcoded queries)
  useEffect(() => {
    refreshStatus();
  }, []);

  const refreshStatus = async () => {
    try {
      const status = await getSystemStatus();
      setSystemStatus(status);
    } catch (e) {
      console.error('Failed to get system status', e);
    }
  };

  const handleSearch = async (submittedParams) => {
    const hotelInput = submittedParams?.hotelInput?.trim();
    if (!hotelInput) {
      setSearchState('error');
      setErrorMessage('يرجى إدخال اسم الفندق أو لصق الرابط المباشر للبدء.');
      return;
    }

    const checkIn = submittedParams?.checkIn || tomorrowStr;
    const checkOut = submittedParams?.checkOut || tenDaysLaterStr;

    let calculatedNights = Number(submittedParams?.nights);
    if (!calculatedNights && checkIn && checkOut) {
      const [y1, m1, d1] = checkIn.split('-').map(Number);
      const [y2, m2, d2] = checkOut.split('-').map(Number);
      calculatedNights = Math.max(1, Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24)));
    }

    const params = {
      ...submittedParams,
      hotelInput,
      checkIn,
      checkOut,
      nights: calculatedNights || 10,
      sources: submittedParams?.sources?.length ? submittedParams.sources : ['almosafer', 'almatar'],
    };

    setFormData((prev) => ({ ...prev, ...params }));
    setSearchState('loading');
    setErrorMessage('');
    setProgressInfo(null);
    setDailyPricesData(null);
    setResults([]);
    setSummary(null);
    setRetryDayError('');

    try {
      const isAlmatarUrl = params.hotelInput && params.hotelInput.includes('almatar.com');
      const isAlmosaferUrl = params.hotelInput && params.hotelInput.includes('almosafer.com');

      if (isAlmatarUrl || (params.sources.includes('almatar') && !isAlmosaferUrl && (params.roomKeywords && params.roomKeywords.length > 0))) {
        // Run daily prices search if Almatar room is selected or direct Almatar URL is used
        const dailyResult = await startDailyPricesSearch({
          ...params,
          concurrency: 4,
        }, (prog) => {
          setProgressInfo(prog);
        });
        
        if (dailyResult.success) {
          setDailyPricesData(dailyResult);
          setSystemStatus(prev => ({ ...prev, lastSearch: new Date(dailyResult.fetchedAt).toLocaleTimeString('ar-SA') }));
          setSearchState('success');
          setProgressInfo(null);
          return;
        } else {
          setSearchState('error');
          setErrorMessage(dailyResult.message || 'فشل استخراج الأسعار اليومية');
          setProgressInfo(null);
          return;
        }
      }

      // Query the live source for comparison
      const response = await startHotelPriceSearch(params);

      if (response.success) {
        if (!response.data || response.data.length === 0) {
          if (!dailyPricesData) {
            setSearchState('no-results');
            setErrorMessage(response.warnings?.join(' • ') || '');
          }
          setResults([]);
          setSummary(null);
        } else {
          setResults(response.data);
          setSummary({ ...response.summary, searchParams: params });
          setSelectedRoomId(response.data[0].id);
          setSearchState('success');
          setSystemStatus((prev) => ({
            ...prev,
            lastSearch: new Date().toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));
        }
      } else {
        if (!dailyPricesData) {
          setSearchState('error');
          setErrorMessage(response.message || 'فشل جلب نتائج الفنادق');
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      setProgressInfo(null);
      setSearchState('error');
      setErrorMessage('حدث خطأ أثناء الاتصال بالخادم، يرجى إعادة المحاولة.');
    }
  };

  const handleRetryDay = async (date) => {
    const room=results.find(r=>r.id===selectedRoomId)||results[0];
    const day=room?.dailyRates.find(d=>d.date===date);
    if(!day || retryingDate) return;
    setRetryingDate(date);setRetryDayError('');
    try {
      const response=await startHotelPriceSearch({...summary.searchParams,
        checkIn:date,checkOut:day.nextDate,sources:[room.source.toLowerCase()]});
      if(!response.success) throw new Error(response.message || 'تعذر إعادة التحقق من هذا اليوم');
      const quote=response.data?.find(r=>r.roomIdentity===room.roomIdentity&&r.source===room.source);
      if(!quote) throw new Error(`لم يرجع المصدر عرضًا مطابقًا لهذه الغرفة يوم ${date}`);
      const updated=replaceVerifiedNight(room,quote);
      setResults(current=>current.map(r=>r===room?updated:r));
      setSummary(current=>current?.checkIn===room.checkIn&&current.checkOut===room.checkOut&&current.hotelName===room.hotelName
        ? {...current,warnings:(current.warnings||[]).filter(w=>!w.startsWith(`${date}:`)),searchedAt:quote.lastUpdated} : current);
    } catch(error) { setRetryDayError(`${date}: ${error.message}`); }
    finally { setRetryingDate(null); }
  };

  const handleQuickDuration = (days) => {
    const baseIn = formData.checkIn || tomorrowStr;
    const parts = baseIn.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + Number(days));
    const newOut = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const updated = {
      ...formData,
      checkIn: baseIn,
      checkOut: newOut,
    };
    setFormData(updated);
    if (updated.hotelInput?.trim()) {
      handleSearch(updated);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Background Image Layer */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <img
          src="/hotel-bg.jpg"
          alt="Luxury Hotel Architecture"
          className="w-full h-full object-cover object-center filter brightness-[0.93]"
        />
        {/* Ambient Luxury Overlay to Enhance Background Visibility & Maintain High Contrast */}
        <div className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/15 to-slate-950/60"></div>
      </div>

      <Header
        systemReady={systemStatus.almosafer === 'ready' && systemStatus.almatar === 'ready'}
        onRefreshStatus={refreshStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Top Search Input Section */}
        <section>
          <HotelSearchForm
            formData={formData}
            resolvedHotelName={summary?.searchParams?.hotelInput===formData.hotelInput?summary.hotelName:null}
            setFormData={setFormData}
            onSearch={handleSearch}
            isLoading={searchState === 'loading'}
          />
        </section>

        {/* Daily Prices Section */}
        {dailyPricesData && (
          <DailyPricesView data={dailyPricesData} searchParams={summary?.searchParams || formData} />
        )}

        {/* Comparison and search status */}

        {/* Dynamic Display Area */}
        <section className="space-y-6">
          {searchState === 'idle' && <EmptyState />}

          {searchState === 'loading' && (
            <LoadingState selectedSources={formData.sources} progress={progressInfo} />
          )}

          {searchState === 'error' && (
            <ErrorState
              type="error"
              message={errorMessage}
              onRetry={() => handleSearch(formData)}
            />
          )}

          {searchState === 'no-results' && (
            <ErrorState
              type="no-results"
              message={errorMessage}
              onRetry={() => handleSearch(formData)}
            />
          )}

          {searchState === 'success' && (
            <>
              <ComparisonSummaryCards
                summary={selectedSummary}
                resultsCount={results.length}
              />

              <SearchResultsTable
                results={results}
                summary={selectedSummary}
                searchParams={summary?.searchParams || formData}
                selectedRoomId={selectedRoomId}
                onRoomSelect={setSelectedRoomId}
                onQuickDuration={handleQuickDuration}
                onRetryDay={handleRetryDay}
                retryingDate={retryingDate}
                retryDayError={retryDayError}
              />
            </>
          )}
        </section>

        {/* System Checks — always visible */}
        <section className="pt-2">
          <SystemStatusPanel status={systemStatus} />
        </section>
      </main>

      <footer className="border-t border-white/20 bg-slate-950/70 backdrop-blur-2xl py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
          <div>
            جميع الأسعار المعروضة بالريال السعودي (SAR) وتخضع لشروط وأحكام مزودي الخدمة (المسافر والمطار).
          </div>
          <div className="font-mono text-[11px] text-emerald-400 font-semibold">
            أسعار المصادر من الاستعلام المباشر • راجع وقت آخر تحديث
          </div>
        </div>
      </footer>
    </div>
  );
}
