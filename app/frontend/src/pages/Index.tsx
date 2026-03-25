import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TopNav from '@/components/dashboard/TopNav';
import BrentChart from '@/components/dashboard/BrentChart';
import IndicatorChart from '@/components/dashboard/IndicatorChart';
import NewsPanel, { NewsPanelMode } from '@/components/dashboard/NewsPanel';
import ChatPanel from '@/components/dashboard/ChatPanel';
import { BRENT_DATA } from '@/components/dashboard/types';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState('2026-03-20');
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
  const [injectedCount, setInjectedCount] = useState(0);
  const [newsMode, setNewsMode] = useState<NewsPanelMode>('hot');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const newsPanelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number>(0);

  useEffect(() => {
    const totalDays = BRENT_DATA.length;
    const spanPercentage = timeRange[1] - timeRange[0];
    const spanDays = (spanPercentage / 100) * totalDays;
    
    if (spanDays > 60) {
      if (viewMode !== 'weekly') setViewMode('weekly');
    } else {
      if (viewMode !== 'daily') setViewMode('daily');
    }
  }, [timeRange, viewMode]);

  useEffect(() => {
    let rafId: number;
    let lastHeight = newsPanelRef.current?.offsetHeight || 0;
    
    const observer = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (newsPanelRef.current) {
          const currentHeight = newsPanelRef.current.offsetHeight;
          if (Math.abs(currentHeight - lastHeight) > 2) {
            setPanelHeight(currentHeight);
            lastHeight = currentHeight;
          }
        }
      });
    });
    
    if (newsPanelRef.current) {
      setPanelHeight(newsPanelRef.current.offsetHeight);
      observer.observe(newsPanelRef.current);
    }
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleInject = useCallback((count: number) => {
    setInjectedCount(prev => prev + count);
    setNewsMode(prev => prev === 'similar' ? prev : 'similar');
  }, []);

  const handleReset = useCallback(() => {
    setInjectedCount(0);
    setNewsMode('hot');
  }, []);

  const handleTimeRangeChange = useCallback((range: [number, number]) => {
    setTimeRange(range);
  }, []);

  const handleViewModeChange = useCallback((mode: 'daily' | 'weekly') => {
    setViewMode(mode);
  }, []);

  const handleNewsModeChange = useCallback((mode: NewsPanelMode) => {
    setNewsMode(mode);
  }, []);

  const handleHoverDateChange = useCallback((date: string | null) => {
    setHoveredDate(date);
  }, []);

  const injectedPredictions = useMemo(() => {
    if (injectedCount === 0) return [];
    
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date('2026-03-20');
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const basePrice = 72.26;
      const price = basePrice + (Math.sin(i * 0.5) * 2) + (injectedCount * 0.5);
      
      return {
        date: dateStr,
        price: Number(price.toFixed(2)),
        isPredict: true
      };
    });
  }, [injectedCount]);

  return (
    <div className="w-full h-screen bg-[#0a0e1a] text-slate-200 flex flex-col overflow-hidden relative font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,255,255,0.05)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.05)_0%,_transparent_50%)]" />
      </div>

      <TopNav currentDate={selectedDate} />

      <div className="flex-1 flex flex-row p-4 gap-4 relative z-10 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 rounded-xl bg-[#0f1525]/80 border border-[#1a2540] p-4 backdrop-blur-sm shadow-lg min-h-0">
            <BrentChart
              data={BRENT_DATA}
              onDateClick={handleDateClick}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              injectedPredictions={injectedPredictions}
              hasInjected={injectedCount > 0}
              onNewsModeChange={handleNewsModeChange}
              selectedDate={selectedDate}
              onHoverDateChange={handleHoverDateChange}
            />
          </div>

          <div className="h-[300px] rounded-xl bg-[#0f1525]/80 border border-[#1a2540] p-4 backdrop-blur-sm shadow-lg shrink-0 overflow-hidden relative">
            <IndicatorChart
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
              viewMode={viewMode}
              injectedPredictions={injectedPredictions}
              selectedDate={selectedDate}
              hoveredDate={hoveredDate}
            />
          </div>
        </div>

        <div ref={newsPanelRef} className="w-[360px] shrink-0 rounded-xl bg-[#0f1525]/80 border border-[#1a2540] backdrop-blur-sm shadow-lg relative flex flex-col overflow-hidden">
          <NewsPanel mode={newsMode} />
        </div>
      </div>
      
      <ChatPanel onInject={handleInject} onReset={handleReset} containerHeight={panelHeight} />
    </div>
  );
}
