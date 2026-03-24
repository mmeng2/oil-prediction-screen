import { useState, useMemo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { BrentDataPoint, TODAY, SIMILAR_EVENTS } from './types';
import { ChevronDown } from 'lucide-react';

import { NewsPanelMode } from './NewsPanel';

const COLOR_REAL = '#a855f7'; // Purple
const COLOR_PREDICT = '#00ffff'; // Cyan
const COLOR_INJECT = '#22c55e'; // Green

const CURRENCIES = [
  { code: 'CNY', symbol: '¥', rate: 1 },
  { code: 'USD', symbol: '$', rate: 0.14 },
  { code: 'GBP', symbol: '£', rate: 0.11 },
  { code: 'HKD', symbol: 'HK$', rate: 1.09 },
];

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
  hasInjected?: boolean;
  onNewsModeChange?: (mode: NewsPanelMode) => void;
  selectedDate: string;
  onHoverDateChange?: (date: string | null) => void;
}

export default function BrentChart({
  data,
  timeRange,
  onTimeRangeChange,
  viewMode,
  injectedPredictions,
  hasInjected,
  onNewsModeChange,
  selectedDate,
  onHoverDateChange,
  onDateClick,
}: BrentChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  
  // Simulated real-time update
  const [currentValue, setCurrentValue] = useState(72.26);
  const [highValue, setHighValue] = useState(7.88);
  const [lowValue, setLowValue] = useState(6.93);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);

  const [activeEvent, setActiveEvent] = useState<number | null>(null);

  // Group daily data into weekly averages
  const weeklyData = useMemo(() => {
    const weeks: { date: string; price: number | null; predictPrice: number | null; isPredict: boolean }[] = [];
    let currentWeek: BrentDataPoint[] = [];
    
    data.forEach((d, i) => {
      currentWeek.push(d);
      // If Sunday or last item, aggregate
      const date = new Date(d.date);
      if (date.getDay() === 0 || i === data.length - 1) {
        const prices = currentWeek.map(w => w.price).filter(p => p !== undefined && p !== null) as number[];
        const predicts = currentWeek.map(w => w.predictPrice).filter(p => p !== undefined && p !== null) as number[];
        
        weeks.push({
          date: d.date, // use the last day of week as label
          price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
          predictPrice: predicts.length > 0 ? predicts.reduce((a, b) => a + b, 0) / predicts.length : null,
          isPredict: currentWeek.every(w => w.isPredict)
        });
        currentWeek = [];
      }
    });
    return weeks;
  }, [data]);

  // Determine which data to show based on viewMode
  const displayData = viewMode === 'weekly' ? weeklyData : data;

  // Stable random positions for 5 similar events in the left area of today
  const eventIndices = useMemo(() => {
    const todayIdx = displayData.findIndex(d => {
      const dDate = new Date(d.date);
      const tDate = new Date(TODAY);
      if (viewMode === 'weekly') {
        const mon = new Date(dDate);
        mon.setDate(dDate.getDate() - (dDate.getDay() === 0 ? 6 : dDate.getDay() - 1));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return tDate >= mon && tDate <= sun;
      }
      return d.date === TODAY;
    });

    const startIdx = 5;
    const endIdx = Math.max(startIdx + 10, todayIdx - 10);
    const totalAvailable = endIdx - startIdx;
    
    const count = 5;
    const positions: number[] = [];
    
    // Divide into segments and pick random-looking but stable offsets
    const segmentSize = totalAvailable / count;
    // Fixed random-looking seeds for 5 events
    const seeds = [0.23, 0.67, 0.15, 0.88, 0.42];
    
    for (let i = 0; i < count; i++) {
      const segmentStart = startIdx + i * segmentSize;
      const offset = seeds[i] * (segmentSize * 0.7); // Leave some gap
      positions.push(Math.floor(segmentStart + offset));
    }
    
    return positions;
  }, [displayData, viewMode]);

  // Find index for selectedDate for highlighting
  const selectedIdx = useMemo(() => {
    if (viewMode === 'weekly') {
      return displayData.findIndex(d => {
        const dDate = new Date(d.date);
        const sDate = new Date(selectedDate);
        const mon = new Date(dDate);
        mon.setDate(dDate.getDate() - (dDate.getDay() === 0 ? 6 : dDate.getDay() - 1));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return sDate >= mon && sDate <= sun;
      });
    }
    return displayData.findIndex(d => d.date === selectedDate);
  }, [displayData, viewMode, selectedDate]);

  // Calculate high/low based on visible range and current aggregation
  useEffect(() => {
    const totalLen = displayData.length;
    const startIdx = Math.max(0, Math.floor((timeRange[0] / 100) * totalLen));
    const endIdx = Math.min(totalLen - 1, Math.ceil((timeRange[1] / 100) * totalLen));
    const visiblePoints = displayData.slice(startIdx, endIdx + 1);
    
    const prices = visiblePoints.map(d => d.price).filter(p => p !== null && p !== undefined) as number[];
    const predicts = visiblePoints.map(d => d.predictPrice).filter(p => p !== null && p !== undefined) as number[];
    const allVals = [...prices, ...predicts];
    
    if (allVals.length > 0) {
      setHighValue(Math.max(...allVals));
      setLowValue(Math.min(...allVals));
    }
  }, [displayData, timeRange, viewMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      // simulate slight price changes every 3s
      setCurrentValue(prev => {
        const change = (Math.random() - 0.5) * 0.5;
        return Number((prev + change).toFixed(2));
      });
      setHighValue(prev => Number((prev + Math.random() * 0.1).toFixed(2)));
      setLowValue(prev => Number((prev - Math.random() * 0.1).toFixed(2)));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Filter and process data
  // We no longer slice the data here, but pass the full data to ECharts 
  // and use dataZoom to handle the timeRange filtering visually.
  const filteredData = displayData;

  const option = useMemo(() => {
    const dates = filteredData.map(d => {
      // format date to MM/DD like 2026/2/28
      const dt = new Date(d.date);
      if (viewMode === 'weekly') {
        // Show week range for weekly mode
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - (dt.getDay() === 0 ? 6 : dt.getDay() - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return `${monday.getMonth() + 1}/${monday.getDate()}-${sunday.getMonth() + 1}/${sunday.getDate()}`;
      }
      return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;
    });
    
    // Split data into historical and predict
    // Scale down by 10 to match the 5-10 Y-axis range in the design
    const scale = 10 / currency.rate;
    const realValues = filteredData.map(d => !d.isPredict ? (d.price !== null ? Number((d.price! / scale).toFixed(2)) : null) : null);
    
    // Create continuous prediction line (including historical predictions)
    const predictValues = filteredData.map(d => {
      // Show predictPrice if it exists, otherwise fall back to price (for future dates)
      const val = d.predictPrice ?? d.price;
      return val !== null && val !== undefined ? Number((val / scale).toFixed(2)) : null;
    });
    
    // Connect the real line to the prediction line at TODAY
    // For weekly mode, today is in the week containing TODAY
    const todayIdx = viewMode === 'weekly' 
      ? filteredData.findIndex(d => {
          const dDate = new Date(d.date);
          const tDate = new Date(TODAY);
          // Find the week that contains TODAY
          const mon = new Date(dDate);
          mon.setDate(dDate.getDate() - (dDate.getDay() === 0 ? 6 : dDate.getDay() - 1));
          const sun = new Date(mon);
          sun.setDate(mon.getDate() + 6);
          return tDate >= mon && tDate <= sun;
        })
      : filteredData.findIndex(d => d.date === TODAY);

    if (todayIdx !== -1 && todayIdx > 0 && realValues[todayIdx] !== null) {
      // ensure predict line connects to real line at today
      predictValues[todayIdx] = realValues[todayIdx];
    }

    const injectedValues = filteredData.map(d => null as number | null);
    if (injectedPredictions.length > 0) {
      const sorted = [...injectedPredictions].sort((a, b) => a.date.localeCompare(b.date));
      let lastVal = realValues[todayIdx] || (75 / scale);
      injectedValues[todayIdx] = lastVal;
      
      for (let i = todayIdx + 1; i < filteredData.length; i++) {
        const fd = filteredData[i];
        const match = sorted.find(s => s.date === fd.date);
        if (match && match.price) {
          lastVal = match.price / scale;
        } else {
          lastVal += (Math.sin(i) * 0.05); // drift
        }
        injectedValues[i] = Number(lastVal.toFixed(2));
      }
    }

    return {
      backgroundColor: 'transparent',
      legend: {
        show: false, // 去掉图中多余的圆点图例
        top: 0,
        right: 20,
        icon: 'circle',
        textStyle: { color: '#94a3b8', fontSize: 12 }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f1525',
        borderColor: '#1a2540',
        textStyle: { color: '#e2e8f0' },
        formatter: function (params: any) {
          let res = params[0].name + '<br/>';
          params.forEach((item: any) => {
            if (item.value !== null && item.value !== undefined) {
              res += item.marker + ' ' + item.seriesName + ': ' + currency.symbol + (item.value * scale).toFixed(2) + '<br/>';
            }
          });
          return res;
        }
      },
      grid: {
        top: 40,
        left: 60,
        right: 20,
        bottom: 30,
        containLabel: false
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#475569' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 12, margin: 15 },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        min: 'dataMin',
        max: 'dataMax',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 12 },
        splitLine: {
          show: true,
          lineStyle: { color: '#1e293b', type: 'dashed' }
        }
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 0,
          height: 8,
          borderColor: 'transparent',
          backgroundColor: '#0f1525',
          fillerColor: '#475569',
          handleSize: 0,
          showDetail: false,
          showDataShadow: false,
          start: timeRange[0],
          end: timeRange[1],
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
          start: timeRange[0],
          end: timeRange[1],
        }
      ],
      series: [
        {
          name: '真实值',
          type: 'line',
          triggerLineEvent: true,
          data: realValues,
          smooth: true,
          symbol: 'circle',
          symbolSize: (val: any, params: any) => {
            return params.dataIndex === selectedIdx ? 12 : 0;
          },
          itemStyle: {
            color: COLOR_REAL,
            borderColor: '#fff',
            borderWidth: 2,
            shadowColor: COLOR_REAL,
            shadowBlur: 10
          },
          lineStyle: {
            color: COLOR_REAL,
            width: 2,
            shadowColor: 'rgba(168, 85, 247, 0.5)',
            shadowBlur: 10
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(168, 85, 247, 0.2)' },
                { offset: 1, color: 'rgba(168, 85, 247, 0)' }
              ]
            }
          },
          markPoint: todayIdx !== -1 && realValues[todayIdx] !== null ? {
            data: [
              {
                coord: [todayIdx, realValues[todayIdx]],
                symbol: 'circle',
                symbolSize: 12,
                itemStyle: {
                  color: COLOR_REAL,
                  borderColor: '#fff',
                  borderWidth: 2,
                  shadowColor: COLOR_REAL,
                  shadowBlur: 12
                }
              }
            ]
          } : undefined,
          markLine: {
            symbol: 'none',
            label: { show: true, position: 'start', color: '#94a3b8', formatter: '今日' },
            lineStyle: { color: '#64748b', type: 'dashed' },
            data: [
              { xAxis: todayIdx },
              // Add vertical highlight line for selectedDate
              ...(selectedIdx !== -1 ? [{
                xAxis: selectedIdx,
                lineStyle: { color: '#00ffff', type: 'dashed', width: 1.5, shadowBlur: 8, shadowColor: '#00ffff' },
                label: { show: false }
              }] : [])
            ]
          },
          z: 2
        },
        {
          name: 'AI预测值',
          type: 'line',
          triggerLineEvent: true,
          data: predictValues,
          smooth: true,
          symbol: 'circle',
          symbolSize: (val: any, params: any) => {
            return params.dataIndex === selectedIdx ? 12 : 0;
          },
          itemStyle: {
            color: COLOR_PREDICT,
            borderColor: '#fff',
            borderWidth: 2,
            shadowColor: COLOR_PREDICT,
            shadowBlur: 10
          },
          lineStyle: {
            color: COLOR_PREDICT,
            width: 4,
            type: 'dashed',
            dashOffset: 5,
            shadowColor: 'rgba(0, 255, 255, 0.8)',
            shadowBlur: 12
          },
          z: 3
        },
        {
          name: 'AI注入值',
          type: 'line',
          triggerLineEvent: true,
          data: injectedValues,
          smooth: true,
          symbol: 'circle',
          symbolSize: (val: any, params: any) => {
            return params.dataIndex === selectedIdx ? 12 : 6;
          },
          itemStyle: {
            color: COLOR_INJECT,
            borderColor: (params: any) => params.dataIndex === selectedIdx ? '#fff' : '#0f1525',
            borderWidth: 2,
            shadowColor: COLOR_INJECT,
            shadowBlur: (params: any) => params.dataIndex === selectedIdx ? 10 : 0
          },
          lineStyle: {
            color: COLOR_INJECT,
            width: 4,
            type: 'dashed',
            shadowColor: 'rgba(34, 197, 94, 0.8)',
            shadowBlur: 12
          },
          animationDuration: 3000,
          animationEasing: 'cubicOut',
          markArea: hasInjected ? {
            itemStyle: {
              color: 'rgba(34, 197, 94, 0.1)'
            },
            label: {
              position: 'insideTop',
              color: '#22c55e',
              fontSize: 14,
              fontWeight: 'bold'
            },
            data: SIMILAR_EVENTS.slice(0, 5).map((evt, idx) => {
              const eventStartIdx = eventIndices[idx];
              const eventEndIdx = Math.min(eventStartIdx + (viewMode === 'weekly' ? 1 : 3), displayData.length - 1);
              
              return [
                { 
                  name: '事件', 
                  xAxis: eventStartIdx, 
                  itemStyle: { color: activeEvent === evt.id ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.2)' } 
                },
                { xAxis: eventEndIdx }
              ];
            })
          } : undefined,
          z: 4
        }
      ]
    };
  }, [filteredData, injectedPredictions, currency, hasInjected, activeEvent, selectedIdx]);

  // Calculate coordinates for cards based on data Zoom and series
  // Since echarts doesn't provide easy direct coordinate mapping in React outside of its instance,
  // we can use CSS flex/absolute positioning that roughly aligns with the chart grid.
  // Alternatively, we can let the cards float near the bottom, but position them absolutely 
  // with left offsets based on their index.
  
  // To place them accurately, we'd need to convert the xAxis index to pixels.
  // We'll use a simplified approach: position them absolutely based on percentage width.
  const getCardStyle = (idx: number) => {
    const eventStartIdx = eventIndices[idx];
    
    // ECharts category axis with dataZoom uses indices.
    // If viewMode is weekly, displayData.length is much smaller than BRENT_DATA.length.
    // We must ensure we use indices relative to the current displayData.
    const start = timeRange[0];
    const end = Math.min(timeRange[1], displayData.length - 1);
    const visibleCount = end - start + 1;
    
    // The relative position inside the visible range (0 to 1)
    const relativePos = (eventStartIdx - start) / visibleCount;
    
    // If the card is outside the current zoom view, we might want to hide it
    const isVisible = relativePos >= -0.05 && relativePos <= 1.05;
    
    // Calculate actual pixel-like percentage based on visible area
    const percent = relativePos * 100;
    
    // Since we added a container that already has left: 60px and right: 20px,
    // we just need to position the card relative to this container.
    return {
      left: `${percent}%`,
      bottom: `20px`,
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? 'auto' as const : 'none' as const,
      zIndex: activeEvent === SIMILAR_EVENTS[idx].id ? 50 : (isVisible ? 20 + idx : -1),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transformOrigin: 'bottom left',
    };
  };
  const onEvents = useMemo(() => {
    return {
      click: (params: any) => {
        if (params.componentType === 'series') {
          // If a data point was clicked, call onDateClick
          if (params.dataIndex !== undefined) {
            const clickedData = filteredData[params.dataIndex];
            if (clickedData) {
              onDateClick(clickedData.date);
            }
          }

          // Handle news mode switching
          if (onNewsModeChange) {
            if (params.seriesName === '真实值') {
              onNewsModeChange('hot');
            } else if (params.seriesName === 'AI预测值') {
              onNewsModeChange('key');
            } else if (params.seriesName === 'AI注入值') {
              onNewsModeChange('similar');
            }
          }
        }
      },
      dataZoom: (params: any) => {
        if (chartRef.current) {
          const echartInstance = chartRef.current.getEchartsInstance();
          const option = echartInstance.getOption() as any;
          if (option && option.dataZoom && option.dataZoom.length > 0) {
            const startVal = option.dataZoom[0].start;
            const endVal = option.dataZoom[0].end;
            
            // To prevent infinite update loops, we check if the values actually changed
            if (startVal !== undefined && endVal !== undefined) {
              if (Math.abs(startVal - timeRange[0]) > 0.01 || Math.abs(endVal - timeRange[1]) > 0.01) {
                onTimeRangeChange([startVal, endVal]);
              }
            }
          }
        }
      },
      updateAxisPointer: (params: any) => {
        if (params.axesInfo && params.axesInfo.length > 0) {
          const xAxisInfo = params.axesInfo[0];
          if (xAxisInfo) {
            const index = xAxisInfo.value;
            const dateStr = displayData[index]?.date;
            if (dateStr) {
              onHoverDateChange?.(dateStr);
            }
          }
        }
      },
      globalout: () => {
        onHoverDateChange?.(null);
      },
      hideTip: () => {
        onHoverDateChange?.(null);
      }
    };
  }, [timeRange, onTimeRangeChange, displayData, onHoverDateChange, onDateClick, onNewsModeChange]);

  return (
    <div className="h-full flex flex-col relative">
      {/* Custom Header matching design */}
      <div className="flex items-start justify-between mb-4 z-10 relative">
        <div className="flex items-baseline gap-4">
          <div className="flex items-baseline gap-1 relative">
            <span className="text-5xl font-bold text-[#00ffff]" style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}>
              {(currentValue * currency.rate).toFixed(2)}
            </span>
            <div 
              className="flex items-center gap-1 cursor-pointer group"
              onClick={() => setShowCurrencySelector(!showCurrencySelector)}
            >
              <span className="text-xl text-[#00ffff]">{currency.symbol}</span>
              <ChevronDown className="w-4 h-4 text-[#00ffff] opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            
            {showCurrencySelector && (
              <div className="absolute top-full left-full mt-2 w-24 bg-[#0f1525]/95 border border-[#1a2540] rounded-lg shadow-xl overflow-hidden backdrop-blur-md z-50">
                {CURRENCIES.map(c => (
                  <div
                    key={c.code}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                      currency.code === c.code 
                        ? 'bg-[#00ffff]/20 text-[#00ffff]' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                    onClick={() => {
                      setCurrency(c);
                      setShowCurrencySelector(false);
                    }}
                  >
                    {c.symbol} {c.code}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm mt-2">
            <span className="flex items-center gap-1">
              <span className="text-slate-400">最高</span>
              <span className="text-red-500 font-bold">{(highValue * currency.rate).toFixed(2)}</span>
              <span className="text-red-500 text-xs">▲</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">最低</span>
              <span className="text-green-500 font-bold">{(lowValue * currency.rate).toFixed(2)}</span>
              <span className="text-green-500 text-xs">▼</span>
            </span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-6 mt-2">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNewsModeChange?.('hot')}
          >
            <div className="w-4 h-[3px] bg-[#a855f7] shadow-[0_0_8px_#a855f7]"></div>
            <span className="text-slate-300 text-sm">真实值</span>
          </div>
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNewsModeChange?.('key')}
          >
            <div className="w-4 h-[3px] border-b-[3px] border-dashed border-[#00ffff] shadow-[0_0_8px_#00ffff]"></div>
            <span className="text-slate-300 text-sm">AI预测值</span>
          </div>
          {injectedPredictions.length > 0 && (
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onNewsModeChange?.('similar')}
            >
              <div className="w-4 h-[3px] border-b-[3px] border-dashed border-[#22c55e] shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-slate-300 text-sm">AI注入值</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 min-h-0 relative z-0 -mt-8">
        <ReactECharts
          key={viewMode}
          ref={chartRef}
          option={option}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
        />

        {/* Floating Cards for Similar Events */}
        {hasInjected && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden" style={{ top: '40px', bottom: '24px', left: '60px', right: '20px' }}>
            {SIMILAR_EVENTS.slice(0, 5).map((evt, idx) => (
              <div 
                key={evt.id}
                className={`absolute rounded-xl border p-2 cursor-pointer shadow-lg group ${
                  activeEvent === evt.id 
                    ? 'w-[240px] border-blue-400 bg-[linear-gradient(90deg,rgba(158,197,225,0.95)_0%,rgba(158,197,225,0.85)_100%)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] scale-150 z-50' 
                    : 'w-[180px] border-slate-300/50 bg-[linear-gradient(90deg,rgba(158,197,225,0.15)_0%,rgba(158,197,225,0.08)_100%)] hover:border-blue-300/50 hover:bg-[linear-gradient(90deg,rgba(158,197,225,0.25)_0%,rgba(158,197,225,0.15)_100%)] z-20 hover:z-30'
                }`}
                style={{ 
                  backdropFilter: 'blur(12px)',
                  ...getCardStyle(idx)
                }}
                onMouseEnter={() => setActiveEvent(evt.id)}
                onMouseLeave={() => setActiveEvent(null)}
                onClick={() => {
                  // highlight node logic: could trigger an event or just keep it active
                  setActiveEvent(evt.id);
                }}
              >
                <div className="flex justify-between items-start mb-0.5">
                  <span className={`text-[10px] font-bold truncate pr-2 transition-colors ${activeEvent === evt.id ? 'text-slate-900' : 'text-slate-300 group-hover:text-slate-200'}`}>
                    相似事件{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][idx]}
                  </span>
                  <span className={`text-[10px] font-bold shrink-0 transition-colors ${activeEvent === evt.id ? 'text-red-600' : 'text-red-400 group-hover:text-red-500'}`}>
                    <span className={`font-normal transition-colors ${activeEvent === evt.id ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-300'}`}>相似度 </span>{evt.similarity}%
                  </span>
                </div>
                <div className={`text-xs font-bold mb-0.5 truncate transition-colors ${activeEvent === evt.id ? 'text-slate-900' : 'text-slate-200 group-hover:text-white'}`}>
                  {evt.title}
                </div>
                <div className={`text-[9px] mb-1 transition-colors ${activeEvent === evt.id ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {evt.periodStart} ~ {evt.periodEnd}
                </div>
                
                {/* Mini Chart SVG */}
                <div className="h-10 w-full mt-1 relative">
                  <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                    {/* Actual line (green solid) */}
                    <path 
                      d={`M 0,${40 - (evt.chartData[0].actual / 10000) * 40} 
                          L 33,${40 - (evt.chartData[1].actual / 10000) * 40} 
                          L 66,${40 - (evt.chartData[2].actual / 10000) * 40} 
                          L 100,${40 - (evt.chartData[3].actual / 10000) * 40}`} 
                      fill="none" 
                      stroke="#22c55e" 
                      strokeWidth="2" 
                    />
                    {/* Predict line (cyan dashed) */}
                    <path 
                      d={`M 0,${40 - (evt.chartData[0].predicted / 10000) * 40} 
                          L 33,${40 - (evt.chartData[1].predicted / 10000) * 40} 
                          L 66,${40 - (evt.chartData[2].predicted / 10000) * 40} 
                          L 100,${40 - (evt.chartData[3].predicted / 10000) * 40}`} 
                      fill="none" 
                      stroke="#00ffff" 
                      strokeWidth="1.5" 
                      strokeDasharray="3 3"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}