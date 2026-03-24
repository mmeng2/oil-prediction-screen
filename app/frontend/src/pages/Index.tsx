import { useState, useCallback } from 'react';
import TopNav from '@/components/dashboard/TopNav';
import BrentChart from '@/components/dashboard/BrentChart';
import IndicatorChart from '@/components/dashboard/IndicatorChart';
import NewsPanel from '@/components/dashboard/NewsPanel';
import ChatPanel from '@/components/dashboard/ChatPanel';
import { BRENT_DATA, type NewsItem, type BrentDataPoint } from '@/components/dashboard/types';

export type NewsPanelMode = 'history' | 'future' | 'injected';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState('2026-03-20');
  // Default: show ALL data (full range)
  const [timeRange, setTimeRange] = useState<[number, number]>([0, BRENT_DATA.length - 1]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  // Injected state from ChatPanel
  const [injectedNews, setInjectedNews] = useState<NewsItem[]>([]);
  const [injectedPredictions, setInjectedPredictions] = useState<BrentDataPoint[]>([]);
  const [isInjecting, setIsInjecting] = useState(false);

  // Explicit news panel mode override (set by clicking curves in BrentChart)
  const [forcedPanelMode, setForcedPanelMode] = useState<NewsPanelMode | null>(null);

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(date);
    // Reset forced mode when user clicks a date point
    setForcedPanelMode(null);
  }, []);

  const handleCurveClick = useCallback((curve: 'predict' | 'injected') => {
    if (curve === 'predict') {
      setForcedPanelMode('future');
    } else if (curve === 'injected') {
      setForcedPanelMode('injected');
    }
  }, []);

  const handleInjectNews = useCallback((news: NewsItem) => {
    setInjectedNews((prev) => [...prev, news]);
  }, []);

  const handleInjectPrediction = useCallback((point: BrentDataPoint) => {
    setInjectedPredictions((prev) => [...prev, point]);
  }, []);

  const handleInjectionStart = useCallback(() => {
    setIsInjecting(true);
  }, []);

  const handleInjectionEnd = useCallback(() => {
    setIsInjecting(false);
  }, []);

  const handleReset = useCallback(() => {
    setInjectedNews([]);
    setInjectedPredictions([]);
    setIsInjecting(false);
  }, []);

  return (
    <div className="w-full min-h-screen lg:h-screen bg-[#0a0e1a] text-slate-200 flex flex-col lg:overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(237,82,20,0.03)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.03)_0%,_transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Top Navigation */}
      <TopNav currentDate={selectedDate} />

      {/* Main Content */}
      <div className="flex-1 p-2 sm:p-3 relative z-10 lg:min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Desktop: 3 rows × 4 columns grid */}
        {/* Tablet: 2 columns */}
        {/* Mobile: single column stacked */}
        <div className="h-auto lg:h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3 gap-2 sm:gap-3">
          {/* Brent Chart - Desktop: 2 rows × 3 cols, Tablet: full width, Mobile: full width */}
          <div className="h-[350px] sm:h-[400px] md:h-[420px] lg:h-auto md:col-span-2 lg:col-span-3 lg:row-span-2 rounded-xl bg-[#0f1525]/80 border border-[#1a2540] p-2 sm:p-3 backdrop-blur-sm shadow-lg shadow-black/20 min-h-0 overflow-hidden">
            <BrentChart
              data={BRENT_DATA}
              onDateClick={handleDateClick}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              injectedPredictions={injectedPredictions}
              onCurveClick={handleCurveClick}
              activeCurve={forcedPanelMode === 'future' ? 'predict' : forcedPanelMode === 'injected' ? 'injected' : null}
            />
          </div>

          {/* News Panel - Desktop: 2 rows × 1 col, Tablet: 1 col, Mobile: full width */}
          <div className="h-[320px] sm:h-[350px] md:h-[420px] lg:h-auto md:col-span-1 lg:col-span-1 lg:row-span-2 rounded-xl bg-[#0f1525]/80 border border-[#1a2540] p-2 sm:p-3 backdrop-blur-sm shadow-lg shadow-black/20 min-h-0 overflow-hidden">
            <NewsPanel
              selectedDate={selectedDate}
              injectedNews={injectedNews}
              isInjecting={isInjecting}
              forcedMode={forcedPanelMode}
            />
          </div>

          {/* Indicator Chart - Desktop: 1 row × 3 cols, Tablet: full width or 1 col, Mobile: full width */}
          <div className="h-[250px] sm:h-[280px] md:h-[260px] lg:h-auto md:col-span-1 lg:col-span-3 lg:row-span-1 rounded-xl bg-[#0f1525]/80 border border-[#1a2540] p-2 sm:p-3 backdrop-blur-sm shadow-lg shadow-black/20 min-h-0 overflow-hidden">
            <IndicatorChart
              timeRange={timeRange}
              viewMode={viewMode}
              injectedPredictions={injectedPredictions}
            />
          </div>

          {/* Chat Panel - Desktop: 1 row × 1 col, Tablet: 1 col, Mobile: full width */}
          <div className="h-[300px] sm:h-[320px] md:h-[260px] lg:h-auto md:col-span-1 lg:col-span-1 lg:row-span-1 rounded-xl bg-[#0f1525]/80 border border-[#1a2540] p-2 sm:p-3 backdrop-blur-sm shadow-lg shadow-black/20 min-h-0 overflow-hidden">
            <ChatPanel
              onInjectNews={handleInjectNews}
              onInjectPrediction={handleInjectPrediction}
              onInjectionStart={handleInjectionStart}
              onInjectionEnd={handleInjectionEnd}
              onReset={handleReset}
            />
          </div>
        </div>
      </div>

      {/* Bottom decorative bar */}
      <div className="h-1 shrink-0" style={{ background: 'linear-gradient(to right, transparent, rgba(237,82,20,0.2), transparent)' }} />
    </div>
  );
}