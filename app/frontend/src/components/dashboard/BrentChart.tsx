import { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BrentDataPoint, USD_TO_CNY, TODAY, formatWeekLabel, getWeekMonday } from './types';

const ACCENT = '#ED5214';

function RmbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v20" />
      <path d="M6 6h12l-6 8H6" />
      <path d="M8 18h8" />
      <path d="M8 14h8" />
    </svg>
  );
}

function UsdIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

interface BrentChartProps {
  data: BrentDataPoint[];
  onDateClick: (date: string) => void;
  timeRange: [number, number];
  onTimeRangeChange: (range: [number, number]) => void;
  viewMode: 'daily' | 'weekly';
  onViewModeChange: (mode: 'daily' | 'weekly') => void;
  injectedPredictions: BrentDataPoint[];
  onCurveClick?: (curve: 'predict' | 'injected') => void;
  activeCurve?: 'predict' | 'injected' | null;
}

export default function BrentChart({
  data,
  onDateClick,
  timeRange,
  onTimeRangeChange,
  viewMode,
  onViewModeChange,
  injectedPredictions,
  onCurveClick,
  activeCurve,
}: BrentChartProps) {
  const [currency, setCurrency] = useState<'USD' | 'CNY'>('USD');

  const filteredData = useMemo(() => {
    const sliced = data.slice(timeRange[0], timeRange[1] + 1);
    if (viewMode === 'weekly') {
      const weekMap = new Map<string, BrentDataPoint[]>();
      for (const d of sliced) {
        const monday = getWeekMonday(d.date);
        const key = monday.toISOString().split('T')[0];
        if (!weekMap.has(key)) weekMap.set(key, []);
        weekMap.get(key)!.push(d);
      }
      const weekly: BrentDataPoint[] = [];
      for (const [, points] of weekMap) {
        const avgPrice = points.reduce((s, p) => s + p.price, 0) / points.length;
        const avgPredPrice = points.reduce((s, p) => s + (p.predictPrice ?? p.price), 0) / points.length;
        weekly.push({
          ...points[0],
          price: Math.round(avgPrice * 100) / 100,
          predictPrice: Math.round(avgPredPrice * 100) / 100,
        } as BrentDataPoint);
      }
      return weekly;
    }
    return sliced;
  }, [data, timeRange, viewMode]);

  // Build injected prediction curve
  const injectedCurveMap = useMemo(() => {
    if (injectedPredictions.length === 0) return new Map<string, number>();

    const todayData = data.find((d) => d.date === TODAY);
    const basePrice = todayData ? todayData.price : 75;

    const futureData = data.filter((d) => d.isPredict);
    const curveMap = new Map<string, number>();
    const sorted = [...injectedPredictions].sort((a, b) => a.date.localeCompare(b.date));

    curveMap.set(TODAY, currency === 'CNY' ? Math.round(basePrice * USD_TO_CNY * 100) / 100 : basePrice);

    let runningPrice = basePrice;
    for (const fd of futureData) {
      const matchingEvent = sorted.find((s) => s.date === fd.date);
      if (matchingEvent) {
        runningPrice = matchingEvent.price;
      } else {
        const drift = (Math.sin(futureData.indexOf(fd) * 0.3) * 0.5);
        runningPrice = runningPrice + drift;
      }
      const displayPrice = currency === 'CNY'
        ? Math.round(runningPrice * USD_TO_CNY * 100) / 100
        : Math.round(runningPrice * 100) / 100;
      curveMap.set(fd.date, displayPrice);
    }

    return curveMap;
  }, [injectedPredictions, data, currency]);

  const chartData = useMemo(() => {
    return filteredData.map((d) => {
      const realPrice = currency === 'CNY' ? Math.round(d.price * USD_TO_CNY * 100) / 100 : d.price;
      const predPrice = currency === 'CNY'
        ? Math.round((d.predictPrice ?? d.price) * USD_TO_CNY * 100) / 100
        : (d.predictPrice ?? d.price);
      const displayDate = viewMode === 'weekly' ? formatWeekLabel(d.date) : d.date;

      return {
        date: d.date,
        displayDate,
        realValue: realPrice,
        predictValue: predPrice,
        injectedValue: injectedCurveMap.get(d.date) ?? undefined,
      };
    });
  }, [filteredData, currency, injectedCurveMap, viewMode]);

  const stats = useMemo(() => {
    const prices = filteredData.map((d) => currency === 'CNY' ? d.price * USD_TO_CNY : d.price);
    if (prices.length === 0) return { max: 0, min: 0, current: 0 };
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const histPrices = filteredData.filter((d) => !d.isPredict).map((d) => d.price);
    const latestHist = histPrices.length > 0 ? histPrices[histPrices.length - 1] : 0;
    return {
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      current: Math.round((currency === 'CNY' ? latestHist * USD_TO_CNY : latestHist) * 100) / 100,
    };
  }, [filteredData, currency]);

  const handleChartClick = useCallback(
    (e: any) => {
      if (e?.activePayload?.[0]?.payload?.date) {
        onDateClick(e.activePayload[0].payload.date);
      }
    },
    [onDateClick]
  );

  const unitLabel = currency === 'USD' ? '$/桶' : '¥/桶';
  const hasInjected = injectedPredictions.length > 0;
  const todayDisplayLabel = viewMode === 'weekly' ? formatWeekLabel(TODAY) : TODAY;

  return (
    <div className="h-full flex flex-col">
      {/* Header - responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 px-1 gap-1 sm:gap-0">
        {/* Stats row */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold" style={{ color: ACCENT }}>Brent:</span>
          <span className="text-lg sm:text-2xl font-bold text-slate-100">{stats.current}</span>
          <span className="text-[10px] sm:text-xs text-slate-500">{unitLabel}</span>
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-green-400">
            <TrendingUp className="w-3 h-3" />
            最高 {stats.max}
          </span>
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-red-400">
            <TrendingDown className="w-3 h-3" />
            最低 {stats.min}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Legend - hidden on very small screens, clickable when both predict & injected exist */}
          <div className="hidden sm:flex items-center gap-3 mr-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] bg-blue-500 rounded" />
              <span className="text-[9px] text-slate-500">真实值</span>
            </div>
            <div
              className={`flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-all ${
                hasInjected
                  ? activeCurve === 'predict'
                    ? 'bg-orange-500/20 ring-1 ring-orange-500/40'
                    : 'hover:bg-slate-700/50'
                  : ''
              }`}
              onClick={() => hasInjected && onCurveClick?.('predict')}
              title={hasInjected ? '点击查看历史相似事件' : ''}
            >
              <div className="w-3 h-0 border-t-[2px] border-dashed" style={{ borderColor: ACCENT }} />
              <span className={`text-[9px] ${activeCurve === 'predict' ? 'text-orange-300 font-semibold' : 'text-slate-500'}`}>预测值</span>
            </div>
            {hasInjected && (
              <div
                className={`flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-all ${
                  activeCurve === 'injected'
                    ? 'bg-green-500/20 ring-1 ring-green-500/40'
                    : 'hover:bg-slate-700/50'
                }`}
                onClick={() => onCurveClick?.('injected')}
                title="点击查看注入预测事件"
              >
                <div className="w-3 h-0 border-t-[2px] border-dashed border-green-500" />
                <span className={`text-[9px] ${activeCurve === 'injected' ? 'text-green-300 font-semibold' : 'text-slate-500'}`}>注入值</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCurrency(currency === 'USD' ? 'CNY' : 'USD')}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all bg-slate-800/60 border border-slate-700 text-slate-300"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${ACCENT}80`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
          >
            {currency === 'USD' ? (
              <UsdIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            ) : (
              <RmbIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            )}
            {currency === 'USD' ? 'USD → CNY' : 'CNY → USD'}
          </button>
          <div className="flex rounded-md overflow-hidden border border-slate-700">
            <button
              onClick={() => onViewModeChange('daily')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-all ${
                viewMode === 'daily'
                  ? 'text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-300'
              }`}
              style={viewMode === 'daily' ? { backgroundColor: `${ACCENT}33`, color: ACCENT } : {}}
            >
              日
            </button>
            <button
              onClick={() => onViewModeChange('weekly')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-all ${
                viewMode === 'weekly'
                  ? 'text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-300'
              }`}
              style={viewMode === 'weekly' ? { backgroundColor: `${ACCENT}33`, color: ACCENT } : {}}
            >
              周
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} onClick={handleChartClick} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.2} />
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="displayDate"
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 9 }}
              interval={Math.max(0, Math.floor(chartData.length / 10) - 1)}
              angle={-30}
              textAnchor="end"
              height={45}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10 }}
              domain={['auto', 'auto']}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f1525',
                border: '1px solid #1a2540',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  realValue: '真实值',
                  predictValue: '预测值',
                  injectedValue: '注入值',
                };
                return [value?.toFixed(2), labels[name] || name];
              }}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <ReferenceLine
              x={todayDisplayLabel}
              stroke={ACCENT}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: '今日',
                position: 'insideTopRight',
                fill: ACCENT,
                fontSize: 10,
                offset: 5,
              }}
            />
            <Area
              type="monotone"
              dataKey="realValue"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#histGradient)"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#0f1525', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="predictValue"
              stroke={ACCENT}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              activeDot={{ r: 4, fill: ACCENT, stroke: '#0f1525', strokeWidth: 2 }}
            />
            {hasInjected && (
              <Line
                type="monotone"
                dataKey="injectedValue"
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
                activeDot={{ r: 4, fill: '#22c55e', stroke: '#0f1525', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Time Slider */}
      <div className="mt-1 px-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[9px] sm:text-[10px] text-slate-600 whitespace-nowrap">
            {data[timeRange[0]]?.date}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, data.length - 30)}
            value={timeRange[0]}
            onChange={(e) => {
              const start = Number(e.target.value);
              onTimeRangeChange([start, Math.min(start + (timeRange[1] - timeRange[0]), data.length - 1)]);
            }}
            className="flex-1 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full"
            style={{ accentColor: ACCENT }}
          />
          <span className="text-[9px] sm:text-[10px] text-slate-600 whitespace-nowrap">
            {data[timeRange[1]]?.date}
          </span>
        </div>
      </div>
    </div>
  );
}