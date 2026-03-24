import { useState, useEffect, useRef } from 'react';
import TopNav from '@/components/dashboard/TopNav';
import BrentChart from '@/components/dashboard/BrentChart';
import IndicatorChart from '@/components/dashboard/IndicatorChart';
import NewsPanel, { NewsPanelMode } from '@/components/dashboard/NewsPanel';
import ChatPanel from '@/components/dashboard/ChatPanel';
import { BRENT_DATA } from '@/components/dashboard/types';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState('2026-03-20');
  // Default: show ALL data (full range)
  const [timeRange, setTimeRange] = useState<[number, number]>([0, BRENT_DATA.length - 1]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [injectedCount, setInjectedCount] = useState(0);
  const [newsMode, setNewsMode] = useState<NewsPanelMode>('hot');
  const newsPanelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number>(0);

  // Smart time dimension switching logic
  useEffect(() => {
    const span = timeRange[1] - timeRange[0];
    if (span > 30) {
      if (viewMode !== 'weekly') setViewMode('weekly');
    } else {
      if (viewMode !== 'daily') setViewMode('daily');
    }
  }, [timeRange, viewMode]);

  useEffect(() => {
    if (newsPanelRef.current) {
      setPanelHeight(newsPanelRef.current.offsetHeight);
    }
    const observer = new ResizeObserver(() => {
      if (newsPanelRef.current) {
        setPanelHeight(newsPanelRef.current.offsetHeight);
      }
    });
    if (newsPanelRef.current) observer.observe(newsPanelRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleInject = (count: number) => {
    setInjectedCount(prev => prev + count);
    // Automatically switch to similar news when injecting (only if not already there)
    setNewsMode(prev => prev === 'similar' ? prev : 'similar');
  };

  const handleReset = () => {
    setInjectedCount(0);
    setNewsMode('hot');
  };

  // Generate fake injected predictions based on injected count
  const injectedPredictions = injectedCount > 0 ? Array.from({ length: 30 }).map((_, i) => {
    const d = new Date('2026-03-20');
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // Create some fake drift for the injected predictions
    const basePrice = 72.26;
    const price = basePrice + (Math.sin(i * 0.5) * 2) + (injectedCount * 0.5);
    
    return {
      date: dateStr,
      price: Number(price.toFixed(2)),
      isPredict: true
    };
  }) : [];

  return (
    <div className="w-full h-screen bg-[#0a0e1a] text-slate-200 flex flex-col overflow-hidden relative font-sans">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,255,255,0.05)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.05)_0%,_transparent_50%)]" />
      </div>

      {/* Top Navigation */}
      <TopNav currentDate={selectedDate} />

      {/* Main Content */}
      <div className="flex-1 flex flex-row p-4 gap-4 relative z-10 min-h-0 overflow-hidden">
        
        {/* Left Section (Main Chart + Indicator Cards) */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Main Chart */}
          <div className="flex-1 rounded-xl bg-[#0f1525]/80 border border-[#1a2540] p-4 backdrop-blur-sm shadow-lg min-h-0">
            <BrentChart
              data={BRENT_DATA}
              onDateClick={handleDateClick}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              injectedPredictions={injectedPredictions}
              hasInjected={injectedCount > 0}
              onNewsModeChange={setNewsMode}
              selectedDate={selectedDate}
            />
          </div>

          {/* Indicator Cards Rolling Area */}
          <div className="h-[300px] rounded-xl bg-[#0f1525]/80 border border-[#1a2540] p-4 backdrop-blur-sm shadow-lg shrink-0 overflow-hidden relative">
            <IndicatorChart
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              viewMode={viewMode}
              injectedPredictions={injectedPredictions}
              selectedDate={selectedDate}
            />
          </div>
        </div>

        {/* Right Section (News) */}
        <div ref={newsPanelRef} className="w-[360px] shrink-0 rounded-xl bg-[#0f1525]/80 border border-[#1a2540] backdrop-blur-sm shadow-lg relative flex flex-col overflow-hidden">
          <NewsPanel mode={newsMode} />
        </div>
      </div>
      
      {/* AI Assistant Drawer */}
      <ChatPanel onInject={handleInject} onReset={handleReset} containerHeight={panelHeight} />
    </div>
  );
}