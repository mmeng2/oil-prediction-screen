import { useState, useMemo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { INDICATORS, type IndicatorInfo, type BrentDataPoint, TODAY } from './types';

interface IndicatorChartProps {
  timeRange: [number, number];
  onTimeRangeChange: (range: [number, number]) => void;
  viewMode: 'daily' | 'weekly';
  injectedPredictions: BrentDataPoint[];
}

function MiniChart({ indicator, timeRange, onTimeRangeChange, hasInjected }: { indicator: IndicatorInfo; timeRange: [number, number]; onTimeRangeChange: (range: [number, number]) => void; hasInjected: boolean }) {
  // Use full data and let ECharts handle the zoom via option
  const chartData = indicator.data;
  const chartRef = useRef<ReactECharts>(null);

  const option = useMemo(() => {
    // Format dates to match main chart (YYYY/MM/DD)
    const dates = chartData.map(d => {
      const dt = new Date(d.date);
      return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;
    });
    
    // realValues should only exist before or on TODAY
    const todayIdx = chartData.findIndex(d => d.date === TODAY);
    const realValues = chartData.map((d, i) => {
      if (todayIdx !== -1 && i > todayIdx) return null; // No real values after today
      return !d.isPredict ? d.value : null;
    });
    
    // Continuous predict line for both history and future
    const predictValues = chartData.map((d, i) => {
      return d.predictValue ?? d.value;
    });
    
    // Connect the lines at TODAY
    if (todayIdx !== -1 && todayIdx > 0 && realValues[todayIdx] !== null) {
      predictValues[todayIdx] = realValues[todayIdx];
    }

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
        markLine: {
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: '#64748b', type: 'dashed' },
          data: [
            { xAxis: todayIdx }
          ]
        },
        markArea: {
          itemStyle: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          data: [
            [
              { xAxis: todayIdx > 15 ? todayIdx - 15 : 0 },
              { xAxis: todayIdx }
            ]
          ]
        }
      },
      {
        name: '预测值',
        type: 'line',
        data: predictValues,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#00ffff' },
        lineStyle: {
          color: '#00ffff',
          width: 2,
          type: 'dashed'
        }
      }
    ];

    if (hasInjected) {
      series.push({
        name: 'AI注入值',
        type: 'line',
        data: predictValues.map((v, i) => {
          if (v === null || i < todayIdx) return null;
          if (i === todayIdx) return v; // connect to the main predict line at today
          return v + (Math.sin(i) * (v * 0.05)); // Add some variance for the green line
        }),
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#22c55e' },
        lineStyle: {
          color: '#22c55e',
          width: 2,
          type: 'dashed'
        }
      });
    }

    return {
      backgroundColor: 'transparent',
      legend: {
        show: true,
        top: 0,
        right: 10,
        icon: 'circle',
        itemWidth: 6,
        itemHeight: 6,
        textStyle: { color: '#94a3b8', fontSize: 9 }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f1525',
        borderColor: '#1a2540',
        textStyle: { color: '#e2e8f0', fontSize: 10 },
        formatter: function (params: any) {
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
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        min: 'dataMin',
        max: 'dataMax',
        show: false,
        splitLine: {
          show: true,
          lineStyle: { color: '#1e293b', type: 'dashed' }
        }
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0],
          startValue: timeRange[0],
          endValue: timeRange[1],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true
        }
      ],
      series: series
    };
  }, [chartData, indicator.color, timeRange, hasInjected]);

  // Listen to dataZoom events and sync to parent
  const onEvents = useMemo(() => {
    return {
      dataZoom: (params: any) => {
        if (chartRef.current) {
          const echartInstance = chartRef.current.getEchartsInstance();
          const option = echartInstance.getOption() as any;
          if (option && option.dataZoom && option.dataZoom.length > 0) {
            const startVal = option.dataZoom[0].startValue;
            const endVal = option.dataZoom[0].endValue;
            
            if (startVal !== timeRange[0] || endVal !== timeRange[1]) {
              onTimeRangeChange([startVal, endVal]);
            }
          }
        }
      }
    };
  }, [timeRange, onTimeRangeChange]);

  return <ReactECharts ref={chartRef} option={option} onEvents={onEvents} style={{ height: '100%', width: '100%' }} notMerge={false} lazyUpdate={true} />;
}

export default function IndicatorChart({ timeRange, onTimeRangeChange, injectedPredictions }: IndicatorChartProps) {
  const getDesc = (key: string) => {
    const descs: Record<string, string> = {
      usd_index: '美元强弱直接影响以美元计价的原油价格',
      sp500: '全球经济活动与能源消费需求综合指标',
      usd_cny: '全球经济活动与能源消费需求综合指标',
      wti: '美元强弱直接影响以美元计价的原油价格',
      effr: '产量决策对供给端的核心影响',
      nasdaq: '全球经济活动与能源消费需求综合指标',
      cboe_etf: '全球经济活动与能源消费需求综合指标'
    };
    return descs[key] || '';
  };

  // Duplicate for infinite scroll
  const displayIndicators = [...INDICATORS, ...INDICATORS];
  const hasInjected = injectedPredictions && injectedPredictions.length > 0;

  return (
    <div className="w-full h-full relative overflow-hidden" id="indicator-carousel">
      {/* 
        Using a continuous marquee animation.
        The width is set so that each item takes up exactly 1/3 of the container width (minus gap),
        and the animation translates by exactly 50% of the flex container (which contains 2x items).
      */}
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
              style={{ width: 'calc((100vw - 360px - 2rem - 2rem) / 3 - 11px)' }} // Roughly 1/3 of the available width for left section
            >
              {/* Top Row: Name and Value */}
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

              {/* Chart Area */}
              <div className="flex-1 w-full min-h-0 relative z-0 -mt-2">
                <MiniChart indicator={indicator} timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} hasInjected={hasInjected} />
              </div>

              {/* Bottom Row: Description */}
              <div className="text-[10px] text-slate-500 mt-1 z-10 line-clamp-1">
                {getDesc(indicator.key)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}