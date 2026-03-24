import { useState, useMemo } from 'react';
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
import { INDICATORS, type IndicatorInfo, type BrentDataPoint, TODAY, getWeekMonday, formatWeekLabel } from './types';

const ACCENT = '#ED5214';

interface IndicatorChartProps {
  timeRange: [number, number];
  viewMode: 'daily' | 'weekly';
  injectedPredictions: BrentDataPoint[];
}

export default function IndicatorChart({ timeRange, viewMode, injectedPredictions }: IndicatorChartProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<string>('wti');

  const indicator: IndicatorInfo = useMemo(
    () => INDICATORS.find((i) => i.key === selectedIndicator) || INDICATORS[0],
    [selectedIndicator]
  );

  const chartData = useMemo(() => {
    const sliced = indicator.data.slice(timeRange[0], timeRange[1] + 1);
    if (viewMode === 'weekly') {
      const weekMap = new Map<string, (typeof sliced[number])[]>();
      for (const d of sliced) {
        const monday = getWeekMonday(d.date);
        const key = monday.toISOString().split('T')[0];
        if (!weekMap.has(key)) weekMap.set(key, []);
        weekMap.get(key)!.push(d);
      }
      const weekly: (typeof sliced[0])[] = [];
      for (const [, points] of weekMap) {
        const avgVal = points.reduce((s, d) => s + d.value, 0) / points.length;
        const avgPred = points.reduce((s, d) => s + (d.predictValue ?? d.value), 0) / points.length;
        weekly.push({
          date: points[0].date,
          value: Math.round(avgVal * 100) / 100,
          isPredict: points.every((d) => d.isPredict),
          predictValue: Math.round(avgPred * 100) / 100,
        });
      }
      return weekly;
    }
    return sliced;
  }, [indicator, timeRange, viewMode]);

  // Build AI injected curve for indicator
  const injectedCurveMap = useMemo(() => {
    if (injectedPredictions.length === 0) return new Map<string, number>();

    const todayData = chartData.find((d) => d.date === TODAY);
    const baseVal = todayData?.value || chartData[chartData.length - 1]?.value || 0;

    const futureData = chartData.filter((d) => d.isPredict);
    const curveMap = new Map<string, number>();

    curveMap.set(TODAY, baseVal);

    let runningVal = baseVal;
    for (const fd of futureData) {
      const drift = (Math.sin(futureData.indexOf(fd) * 0.25) * baseVal * 0.005);
      runningVal = Math.round((runningVal + drift) * 100) / 100;
      curveMap.set(fd.date, runningVal);
    }

    return curveMap;
  }, [injectedPredictions, chartData]);

  const todayDisplayLabel = viewMode === 'weekly' ? formatWeekLabel(TODAY) : TODAY;

  const displayData = useMemo(() => {
    return chartData.map((d) => {
      const displayDate = viewMode === 'weekly' ? formatWeekLabel(d.date) : d.date;

      return {
        date: d.date,
        displayDate,
        realValue: d.value,
        predictValue: d.predictValue ?? d.value,
        aiValue: injectedCurveMap.get(d.date) ?? undefined,
      };
    });
  }, [chartData, injectedCurveMap, viewMode]);

  const stats = useMemo(() => {
    const values = chartData.map((d) => d.value);
    if (values.length === 0) return { max: 0, min: 0, current: 0 };
    return {
      max: Math.round(Math.max(...values) * 100) / 100,
      min: Math.round(Math.min(...values) * 100) / 100,
      current: Math.round(values[values.length - 1] * 100) / 100,
    };
  }, [chartData]);

  const hasInjected = injectedPredictions.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header - indicator info left, selector buttons right, aligned on same row */}
      <div className="flex items-center justify-between mb-1 px-1 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          <span className="text-xs sm:text-sm font-semibold" style={{ color: indicator.color }}>
            {indicator.name}:
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-100">{stats.current}</span>
          <span className="text-[9px] sm:text-[10px] text-slate-500">{indicator.unit}</span>
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-green-400">
            <TrendingUp className="w-3 h-3" />
            最高 {stats.max}
          </span>
          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-red-400">
            <TrendingDown className="w-3 h-3" />
            最低 {stats.min}
          </span>
        </div>

        {/* Indicator selector buttons - aligned with left stats */}
        <div className="flex flex-wrap gap-1 justify-end">
          {INDICATORS.map((ind) => (
            <button
              key={ind.key}
              onClick={() => setSelectedIndicator(ind.key)}
              className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all border ${
                selectedIndicator === ind.key
                  ? 'border-opacity-50 text-white'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
              style={
                selectedIndicator === ind.key
                  ? { backgroundColor: `${ind.color}20`, borderColor: `${ind.color}50`, color: ind.color }
                  : {}
              }
            >
              {ind.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="indHistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={indicator.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={indicator.color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="indPredGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.2} />
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="displayDate"
              stroke="transparent"
              tick={false}
              axisLine={false}
              tickLine={false}
              height={1}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10 }}
              domain={['auto', 'auto']}
              width={55}
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
                const labels: Record<string, string> = { realValue: '真实值', predictValue: '预测值', aiValue: '注入值' };
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
              stroke={indicator.color}
              strokeWidth={2}
              fill="url(#indHistGrad)"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 3, fill: indicator.color, stroke: '#0f1525', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="predictValue"
              stroke={ACCENT}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              activeDot={{ r: 3, fill: ACCENT, stroke: '#0f1525', strokeWidth: 2 }}
            />
            {hasInjected && (
              <Line
                type="monotone"
                dataKey="aiValue"
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}