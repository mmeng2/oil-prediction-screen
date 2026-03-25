import { useMemo, useRef, useCallback } from 'react';
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { INDICATORS, type IndicatorInfo, type BrentDataPoint, TODAY, type IndicatorDataPoint } from './types';

interface IndicatorChartProps {
  timeRange: [number, number];
  onTimeRangeChange: (range: [number, number]) => void;
  viewMode: 'daily' | 'weekly';
  injectedPredictions: BrentDataPoint[];
  selectedDate: string;
  hoveredDate?: string | null;
}

interface MiniChartProps {
  indicator: IndicatorInfo;
  timeRange: [number, number];
  onTimeRangeChange: (range: [number, number]) => void;
  hasInjected: boolean;
  viewMode: 'daily' | 'weekly';
  selectedDate: string;
  hoveredDate?: string | null;
}

const useChartData = (rawData: IndicatorDataPoint[], viewMode: 'daily' | 'weekly') => {
  return useMemo(() => {
    if (viewMode === 'daily') return rawData;
    
    const weeks: IndicatorDataPoint[] = [];
    let currentWeek: IndicatorDataPoint[] = [];
    
    rawData.forEach((d, i) => {
      currentWeek.push(d);
      const date = new Date(d.date);
      if (date.getDay() === 0 || i === rawData.length - 1) {
        const values = currentWeek.map(w => w.value).filter(v => v !== null) as number[];
        const predicts = currentWeek.map(w => w.predictValue).filter(v => v !== null && v !== undefined) as number[];
        
        weeks.push({
          date: d.date,
          value: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          predictValue: predicts.length > 0 ? predicts.reduce((a, b) => a + b, 0) / predicts.length : undefined,
          isPredict: currentWeek.every(w => w.isPredict)
        });
        currentWeek = [];
      }
    });
    return weeks;
  }, [rawData, viewMode]);
};

const useMiniChartOption = (
  chartData: IndicatorDataPoint[],
  indicator: IndicatorInfo,
  timeRange: [number, number],
  hasInjected: boolean,
  selectedDate: string,
  hoveredDate: string | null | undefined,
  viewMode: 'daily' | 'weekly'
) => {
  return useMemo(() => {
    const dates = chartData.map(d => {
      const dt = new Date(d.date);
      if (viewMode === 'weekly') {
        const mon = new Date(dt);
        mon.setDate(dt.getDate() - (dt.getDay() === 0 ? 6 : dt.getDay() - 1));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return `${mon.getMonth() + 1}/${mon.getDate()}-${sun.getMonth() + 1}/${sun.getDate()}`;
      }
      return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;
    });
    
    const todayIdx = viewMode === 'weekly' 
      ? chartData.findIndex(d => {
          const dDate = new Date(d.date);
          const tDate = new Date(TODAY);
          const mon = new Date(dDate);
          mon.setDate(dDate.getDate() - (dDate.getDay() === 0 ? 6 : dDate.getDay() - 1));
          const sun = new Date(mon);
          sun.setDate(mon.getDate() + 6);
          return tDate >= mon && tDate <= sun;
        })
      : chartData.findIndex(d => d.date === TODAY);

    const realValues = chartData.map((d, i) => {
      if (todayIdx !== -1 && i > todayIdx) return null;
      return !d.isPredict ? d.value : null;
    });
    
    const predictValues = chartData.map((d, i) => d.predictValue ?? d.value);
    
    if (todayIdx !== -1 && todayIdx > 0 && realValues[todayIdx] !== null) {
      predictValues[todayIdx] = realValues[todayIdx];
    }

    const findIndex = (dateStr: string) => {
      if (viewMode === 'weekly') {
        return chartData.findIndex(d => {
          const dDate = new Date(d.date);
          const target = new Date(dateStr);
          const mon = new Date(dDate);
          mon.setDate(dDate.getDate() - (dDate.getDay() === 0 ? 6 : dDate.getDay() - 1));
          const sun = new Date(mon);
          sun.setDate(mon.getDate() + 6);
          return target >= mon && target <= sun;
        });
      }
      return chartData.findIndex(d => d.date === dateStr);
    };

    const selectedIdx = findIndex(selectedDate);
    const hoveredIdx = hoveredDate ? findIndex(hoveredDate) : -1;
    const displayIdx = hoveredIdx !== -1 ? hoveredIdx : selectedIdx;
    const displayValue = displayIdx !== -1 && realValues[displayIdx] !== null ? realValues[displayIdx] : null;
    const showMarkPoint = displayValue !== null && displayIdx !== -1;

    const series: any[] = [
      {
        name: '历史值',
        type: 'line',
        data: realValues,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: indicator.color, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: indicator.color },
              { offset: 1, color: 'transparent' }
            ]
          },
          opacity: 0.2
        },
        markPoint: showMarkPoint ? {
          data: [{
            coord: [displayIdx, displayValue],
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color: indicator.color,
              borderColor: '#fff',
              borderWidth: 2,
              shadowColor: indicator.color,
              shadowBlur: 8
            },
            value: Number(displayValue).toFixed(2),
            label: {
              show: true,
              position: 'inside',
              color: '#fff',
              fontSize: 9,
              formatter: (params: any) => params.value,
              backgroundColor: indicator.color,
              padding: [2, 4],
              borderRadius: 3
            }
          }],
          silent: true
        } : [],
        markLine: {
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: '#64748b', type: 'dashed' },
          data: [
            { xAxis: todayIdx },
            ...(selectedIdx !== -1 ? [{
              xAxis: selectedIdx,
              lineStyle: { color: '#00ffff', type: 'dashed', width: 1.5, shadowBlur: 8, shadowColor: '#00ffff' }
            }] : []),
            ...(hoveredIdx !== -1 && hoveredIdx !== selectedIdx ? [{
              xAxis: hoveredIdx,
              lineStyle: { color: 'rgba(255, 255, 255, 0.5)', type: 'dashed', width: 1 }
            }] : [])
          ]
        },
      },
      {
        name: '预测值',
        type: 'line',
        data: predictValues,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#00ffff' },
        lineStyle: { color: '#00ffff', width: 2, type: 'dashed' }
      }
    ];

    if (hasInjected) {
      series.push({
        name: 'AI 注入值',
        type: 'line',
        data: predictValues.map((v, i) => {
          if (v === null || i < todayIdx) return null;
          if (i === todayIdx) return v;
          return v + (Math.sin(i) * (v * 0.05));
        }),
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#22c55e' },
        lineStyle: { color: '#22c55e', width: 2, type: 'dashed' },
        animationDuration: 3000,
        animationEasing: 'cubicOut'
      });
    }

    return {
      backgroundColor: 'transparent',
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f1525',
        borderColor: '#1a2540',
        textStyle: { color: '#e2e8f0', fontSize: 10 },
        axisPointer: {
          type: 'line',
          snap: true,
          lineStyle: { color: '#00ffff', width: 1, type: 'dashed' },
          label: { show: false }
        },
        formatter: (params: any) => {
          let res = params[0].name + '<br/>';
          params.forEach((item: any) => {
            if (item.value !== null && item.value !== undefined) {
              res += item.marker + ' ' + item.seriesName + ': ' + Number(item.value).toFixed(2) + '<br/>';
            }
          });
          return res;
        }
      },
      grid: { top: 25, left: 10, right: 10, bottom: 20 },
      xAxis: {
        type: 'category',
        data: dates,
        show: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 9, margin: 8 },
        splitLine: { show: false },
        axisPointer: {
          show: true,
          snap: true,
          type: 'line',
          lineStyle: { color: '#00ffff', width: 1, type: 'dashed' },
          label: { show: false }
        }
      },
      yAxis: {
        type: 'value',
        min: 'dataMin',
        max: 'dataMax',
        show: false,
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } }
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0],
          start: timeRange[0],
          end: timeRange[1],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true
        }
      ],
      series
    };
  }, [chartData, indicator.color, timeRange, hasInjected, selectedDate, hoveredDate, viewMode]);
};

const MiniChart = React.memo(({ indicator, timeRange, onTimeRangeChange, hasInjected, viewMode, selectedDate, hoveredDate }: MiniChartProps) => {
  const chartRef = useRef<ReactECharts>(null);
  const chartData = useChartData(indicator.data, viewMode);
  const option = useMiniChartOption(chartData, indicator, timeRange, hasInjected, selectedDate, hoveredDate, viewMode);

  const onEvents = useMemo(() => ({
    dataZoom: (params: any) => {
      if (chartRef.current) {
        const echartInstance = chartRef.current.getEchartsInstance();
        const opt = echartInstance.getOption() as any;
        if (opt?.dataZoom?.length > 0) {
          const startVal = opt.dataZoom[0].start;
          const endVal = opt.dataZoom[0].end;
          if (startVal !== undefined && endVal !== undefined) {
            if (Math.abs(startVal - timeRange[0]) > 0.01 || Math.abs(endVal - timeRange[1]) > 0.01) {
              onTimeRangeChange([startVal, endVal]);
            }
          }
        }
      }
    }
  }), [timeRange, onTimeRangeChange]);

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      onEvents={onEvents}
      style={{ height: '100%', width: '100%' }}
      notMerge={false}
      lazyUpdate={true}
    />
  );
}, (prev, next) => {
  return (
    prev.indicator.key === next.indicator.key &&
    prev.timeRange[0] === next.timeRange[0] &&
    prev.timeRange[1] === next.timeRange[1] &&
    prev.hasInjected === next.hasInjected &&
    prev.viewMode === next.viewMode &&
    prev.selectedDate === next.selectedDate &&
    prev.hoveredDate === next.hoveredDate
  );
});

const DESC_MAP: Record<string, string> = {
  usd_index: '美元强弱直接影响以美元计价的原油价格',
  sp500: '全球经济活动与能源消费需求综合指标',
  usd_cny: '全球经济活动与能源消费需求综合指标',
  wti: '美元强弱直接影响以美元计价的原油价格',
  effr: '产量决策对供给端的核心影响',
  nasdaq: '全球经济活动与能源消费需求综合指标',
  cboe_etf: '全球经济活动与能源消费需求综合指标'
};

MiniChart.displayName = 'MiniChart';

export default function IndicatorChart({ timeRange, onTimeRangeChange, injectedPredictions, viewMode, selectedDate, hoveredDate }: IndicatorChartProps) {
  const hasInjected = injectedPredictions && injectedPredictions.length > 0;
  const displayIndicators = useMemo(() => [...INDICATORS, ...INDICATORS], []);

  const getCardWidth = useCallback(() => {
    if (typeof window === 'undefined') return '400px';
    return `calc((100vw - 360px - 2rem - 2rem) / 3 - 11px)`;
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden" id="indicator-carousel">
      <div 
        className="flex h-full absolute left-0 top-0 gap-4 animate-marquee hover:[animation-play-state:paused]"
        style={{ width: 'max-content' }}
      >
        {displayIndicators.map((indicator, idx) => {
          const currentVal = indicator.data[indicator.data.length - 1]?.value || 0;
          
          return (
            <div 
              key={`${indicator.key}-${idx}`} 
              className="h-full bg-[#111827]/80 rounded-lg border border-[#1f2937] p-3 flex flex-col relative overflow-hidden shrink-0"
              style={{ width: getCardWidth() }}
            >
              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shadow-lg" style={{ backgroundColor: indicator.color, boxShadow: `0 0 8px ${indicator.color}` }}></div>
                  <span className="text-sm font-medium text-slate-300">{indicator.name}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">{currentVal}</span>
                  <span className="text-xs text-slate-400">{indicator.unit}</span>
                </div>
              </div>

              <div className="flex-1 w-full min-h-0 relative z-0 -mt-2">
                <MiniChart
                  indicator={indicator}
                  timeRange={timeRange}
                  onTimeRangeChange={onTimeRangeChange}
                  hasInjected={hasInjected}
                  viewMode={viewMode}
                  selectedDate={selectedDate}
                  hoveredDate={hoveredDate}
                />
              </div>

              <div className="text-[10px] text-slate-500 mt-1 z-10 line-clamp-1">
                {DESC_MAP[indicator.key] || ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
