import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { BrentDataPoint, TODAY, SIMILAR_EVENTS } from './types';
import { ChevronDown } from 'lucide-react';
import { NewsPanelMode } from './NewsPanel';

const COLOR_REAL = '#a855f7';
const COLOR_PREDICT = '#00ffff';
const COLOR_INJECT = '#22c55e';

const CURRENCIES = [
  { code: 'CNY/bbl', symbol: '¥', rate: 1 },
  { code: 'USD/bbl', symbol: '$', rate: 0.14 },
];

interface BrentChartProps {
  data: BrentDataPoint[];
  onDateClick: (date: string) => void;
  timeRange: [number, number];
  onTimeRangeChange: (range: [number, number]) => void;
  viewMode: 'daily' | 'weekly';
  onViewModeChange: (mode: 'daily' | 'weekly') => void;
  injectedPredictions: BrentDataPoint[];
  hasInjected?: boolean;
  onNewsModeChange?: (mode: NewsPanelMode) => void;
  selectedDate: string;
  onHoverDateChange?: (date: string | null) => void;
}

const EVENT_SEEDS = [0.23, 0.67, 0.15, 0.88, 0.42];

const useWeeklyData = (data: BrentDataPoint[], viewMode: 'daily' | 'weekly') => {
  return useMemo(() => {
    if (viewMode === 'daily') return data;
    
    const weeks: BrentDataPoint[] = [];
    let currentWeek: BrentDataPoint[] = [];
    
    data.forEach((d, i) => {
      currentWeek.push(d);
      const date = new Date(d.date);
      if (date.getDay() === 0 || i === data.length - 1) {
        const prices = currentWeek.map(w => w.price).filter(p => p !== undefined && p !== null) as number[];
        const predicts = currentWeek.map(w => w.predictPrice).filter(p => p !== undefined && p !== null) as number[];
        
        weeks.push({
          date: d.date,
          price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
          predictPrice: predicts.length > 0 ? predicts.reduce((a, b) => a + b, 0) / predicts.length : null,
          isPredict: currentWeek.every(w => w.isPredict)
        });
        currentWeek = [];
      }
    });
    return weeks;
  }, [data, viewMode]);
};

const useEventIndices = (displayData: BrentDataPoint[], viewMode: 'daily' | 'weekly') => {
  return useMemo(() => {
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
    const totalAvailable = Math.max(1, endIdx - startIdx);
    const segmentSize = totalAvailable / 5;
    
    return EVENT_SEEDS.map(seed => {
      const segmentStart = startIdx + Math.floor(segmentSize * EVENT_SEEDS.indexOf(seed));
      const offset = Math.floor(seed * (segmentSize * 0.7));
      return Math.min(segmentStart + offset, displayData.length - 1);
    });
  }, [displayData, viewMode]);
};

const useSelectedIndex = (displayData: BrentDataPoint[], viewMode: 'daily' | 'weekly', selectedDate: string) => {
  return useMemo(() => {
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
};

const useChartOption = (
  filteredData: BrentDataPoint[],
  injectedPredictions: BrentDataPoint[],
  currency: typeof CURRENCIES[0],
  hasInjected: boolean,
  activeEvent: number | null,
  selectedIdx: number,
  todayIdx: number,
  eventIndices: number[],
  viewMode: 'daily' | 'weekly',
  timeRange: [number, number],
  displayData: BrentDataPoint[]
) => {
  return useMemo(() => {
    const scale = 10 / currency.rate;
    
    const dates = filteredData.map(d => {
      const dt = new Date(d.date);
      if (viewMode === 'weekly') {
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - (dt.getDay() === 0 ? 6 : dt.getDay() - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return `${monday.getMonth() + 1}/${monday.getDate()}-${sunday.getMonth() + 1}/${sunday.getDate()}`;
      }
      return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;
    });
    
    const realValues = filteredData.map(d => !d.isPredict ? (d.price !== null ? Number((d.price! / scale).toFixed(2)) : null) : null);
    
    const predictValues = filteredData.map(d => {
      const val = d.predictPrice ?? d.price;
      return val !== null && val !== undefined ? Number((val / scale).toFixed(2)) : null;
    });
    
    if (todayIdx !== -1 && todayIdx > 0 && realValues[todayIdx] !== null) {
      predictValues[todayIdx] = realValues[todayIdx];
    }

    const injectedValues = filteredData.map(() => null as number | null);
    if (injectedPredictions.length > 0 && todayIdx !== -1) {
      const sorted = [...injectedPredictions].sort((a, b) => a.date.localeCompare(b.date));
      let lastVal = realValues[todayIdx] || (75 / scale);
      injectedValues[todayIdx] = lastVal;
      
      for (let i = todayIdx + 1; i < filteredData.length; i++) {
        const fd = filteredData[i];
        const match = sorted.find(s => s.date === fd.date);
        if (match && match.price) {
          lastVal = match.price / scale;
        } else {
          lastVal += (Math.sin(i) * 0.05);
        }
        injectedValues[i] = Number(lastVal.toFixed(2));
      }
    }

    return {
      backgroundColor: 'transparent',
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        axisPointer: {
          type: 'line',
          snap: true,
          lineStyle: { color: '#00ffff', width: 1.5, type: 'dashed' },
          label: { show: false }
        },
        formatter: (params: any) => {
          const content = params.map((item: any) => {
            if (item.value === null || item.value === undefined) return '';
            const val = (item.value * scale).toFixed(2);
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${item.color};"></span>
                  <span style="color: #f1f5f9; font-size: 12px; font-weight: 600;">${item.seriesName}</span>
                </div>
                <div style="display: flex; align-items: baseline; gap: 4px;">
                  <span style="color: ${item.color}; font-size: 14px; font-weight: bold;">${val}</span>
                  <span style="color: #94a3b8; font-size: 10px;">${currency.code}</span>
                </div>
              </div>
            `;
          }).join('');

          return `
            <div style="width: 188px; height: 83.26px; padding: 5.63px; background: rgba(158, 197, 225, 0.1); border-radius: 5.63px; border: 0.47px solid; border-image: linear-gradient(119deg, rgba(255, 255, 255, 0.3) 2%, rgba(255, 255, 255, 0.05) 100%) 0.47; backdrop-filter: blur(14.55px); box-sizing: border-box;">
              <div style="width: 100%; height: 100%; background: linear-gradient(90deg, rgba(158, 197, 225, 0.15) 0%, rgba(158, 197, 225, 0.08) 100%); border-radius: 4px; padding: 8px; display: flex; flex-direction: column; justify-content: center; gap: 6px; box-sizing: border-box;">
                ${content}
              </div>
            </div>
          `;
        }
      },
      grid: { top: 40, left: 60, right: 20, bottom: 40, containLabel: false },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 12, margin: 15 },
        splitLine: { show: false },
        axisPointer: {
          show: true,
          snap: true,
          type: 'line',
          lineStyle: { color: '#00ffff', width: 1.5, type: 'dashed', shadowBlur: 8, shadowColor: '#00ffff' },
          label: { show: false },
          z: 100
        }
      },
      yAxis: {
        type: 'value',
        min: 'dataMin',
        max: 'dataMax',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 12 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } }
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 37,
          height: 6,
          borderColor: 'transparent',
          backgroundColor: 'rgba(71, 85, 105, 0.1)',
          fillerColor: '#475569',
          handleIcon: 'path://M-0.5,-1 L0.5,-1 L0.5,1 L-0.5,1 Z',
          handleSize: '200%',
          handleStyle: {
            color: '#475569',
            borderWidth: 0
          },
          moveHandleSize: 0,
          showDetail: false,
          showDataShadow: false,
          start: timeRange[0],
          end: timeRange[1],
          z: 10
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
          // smooth: true,
          symbol: 'circle',
          symbolSize: (val: any, params: any) => params.dataIndex === selectedIdx ? 12 : 0,
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
            data: [{
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
            }]
          } : undefined,
          markLine: {
            symbol: 'none',
            label: { show: true, position: 'start', color: '#94a3b8', formatter: '今日' },
            lineStyle: { color: '#64748b', type: 'dashed' },
            data: [
              { xAxis: todayIdx },
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
          name: 'AI 预测值',
          type: 'line',
          triggerLineEvent: true,
          data: predictValues,
          // smooth: true,
          symbol: 'circle',
          symbolSize: (val: any, params: any) => params.dataIndex === selectedIdx ? 12 : 0,
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
          name: 'AI 注入值',
          type: 'line',
          triggerLineEvent: true,
          data: injectedValues,
          // smooth: true,
          symbol: 'circle',
          symbolSize: (val: any, params: any) => params.dataIndex === selectedIdx ? 12 : 0,
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
            itemStyle: { color: 'rgba(34, 197, 94, 0.1)' },
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
  }, [filteredData, injectedPredictions, currency, hasInjected, activeEvent, selectedIdx, todayIdx, eventIndices, viewMode, timeRange, displayData]);
};

export default function BrentChart(props: BrentChartProps) {
  const {
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
  } = props;

  const chartRef = useRef<ReactECharts>(null);
  const [currentValue, setCurrentValue] = useState(72.26);
  const [highValue, setHighValue] = useState(7.88);
  const [lowValue, setLowValue] = useState(6.93);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [activeEvent, setActiveEvent] = useState<number | null>(null);

  const weeklyData = useWeeklyData(data, viewMode);
  const displayData = weeklyData;
  const eventIndices = useEventIndices(displayData, viewMode);
  const selectedIdx = useSelectedIndex(displayData, viewMode, selectedDate);

  const todayIdx = useMemo(() => {
    if (viewMode === 'weekly') {
      return displayData.findIndex(d => {
        const dDate = new Date(d.date);
        const tDate = new Date(TODAY);
        const mon = new Date(dDate);
        mon.setDate(dDate.getDate() - (dDate.getDay() === 0 ? 6 : dDate.getDay() - 1));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return tDate >= mon && tDate <= sun;
      });
    }
    return displayData.findIndex(d => d.date === TODAY);
  }, [displayData, viewMode]);

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
      const change = (Math.random() - 0.5) * 0.5;
      setCurrentValue(prev => Number((prev + change).toFixed(2)));
      setHighValue(prev => Number((prev + Math.random() * 0.1).toFixed(2)));
      setLowValue(prev => Number((prev - Math.random() * 0.1).toFixed(2)));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const filteredData = displayData;

  const option = useChartOption(
    filteredData,
    injectedPredictions,
    currency,
    hasInjected || false,
    activeEvent,
    selectedIdx,
    todayIdx,
    eventIndices,
    viewMode,
    timeRange,
    displayData
  );

  const getCardStyle = useCallback((idx: number) => {
    const eventStartIdx = eventIndices[idx];
    const start = timeRange[0];
    const end = Math.min(timeRange[1], displayData.length - 1);
    const visibleCount = Math.max(1, end - start + 1);
    const relativePos = (eventStartIdx - start) / visibleCount;
    const isVisible = relativePos >= -0.05 && relativePos <= 1.05;
    const percent = relativePos * 100;
    
    return {
      left: `${percent}%`,
      bottom: `20px`,
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? 'auto' as const : 'none' as const,
      zIndex: activeEvent === SIMILAR_EVENTS[idx].id ? 50 : (isVisible ? 20 + idx : -1),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transformOrigin: 'bottom left',
    };
  }, [eventIndices, timeRange, displayData.length, activeEvent]);

  const onEvents = useMemo(() => ({
    click: (params: any) => {
      console.log('=== Click Event ===', {
        componentType: params.componentType,
        dataIndex: params.dataIndex,
        hasEvent: !!params.event,
        seriesName: params.seriesName
      });
      
      let clickedIndex: number | null = null;
      
      if (params.componentType === 'series' && params.dataIndex !== undefined) {
        console.log('Series click, dataIndex:', params.dataIndex);
        clickedIndex = params.dataIndex;
      } else {
        const chart = chartRef.current;
        console.log('Chart ref:', chart);
        if (chart) {
          const echartInstance = chart.getEchartsInstance();
          console.log('ECharts instance:', echartInstance);
          
          const event = params.event;
          console.log('Event object:', event);
          if (event) {
            const offsetX = event.offsetX || event.event?.offsetX;
            const offsetY = event.offsetY || event.event?.offsetY;
            console.log('Offset:', { offsetX, offsetY });
            
            if (offsetX !== null && offsetX !== undefined && echartInstance.containPixel('grid', [offsetX, offsetY])) {
              const pointInGrid = echartInstance.convertFromPixel('grid', [offsetX, offsetY]);
              console.log('Point in grid:', pointInGrid);
              if (pointInGrid && pointInGrid[0] !== null) {
                clickedIndex = Math.max(0, Math.min(Math.round(pointInGrid[0]), filteredData.length - 1));
                console.log('Clicked index:', clickedIndex);
              }
            }
          }
        }
      }

      if (clickedIndex !== null && filteredData[clickedIndex]) {
        console.log('Calling onDateClick with:', filteredData[clickedIndex].date);
        onDateClick(filteredData[clickedIndex].date);
      }
      
      if (onNewsModeChange) {
        if (params.seriesName === '真实值') onNewsModeChange('hot');
        else if (params.seriesName === 'AI 预测值') onNewsModeChange('key');
        else if (params.seriesName === 'AI 注入值') onNewsModeChange('similar');
      }
    },
    dataZoom: (params: any) => {
      if (chartRef.current) {
        const echartInstance = chartRef.current.getEchartsInstance();
        const option = echartInstance.getOption() as any;
        if (option?.dataZoom?.length > 0) {
          const startVal = option.dataZoom[0].start;
          const endVal = option.dataZoom[0].end;
          if (startVal !== undefined && endVal !== undefined) {
            if (Math.abs(startVal - timeRange[0]) > 0.01 || Math.abs(endVal - timeRange[1]) > 0.01) {
              onTimeRangeChange([startVal, endVal]);
            }
          }
        }
      }
    },
    updateAxisPointer: (params: any) => {
      if (params.axesInfo?.length > 0) {
        const index = Math.round(params.axesInfo[0].value);
        const clampedIndex = Math.max(0, Math.min(index, displayData.length - 1));
        const dateStr = displayData[clampedIndex]?.date;
        if (dateStr) {
          onHoverDateChange?.(dateStr);
        }
      }
    },
    globalout: () => {
      onHoverDateChange?.(null);
    },
    hideTip: () => {
      onHoverDateChange?.(null);
    },
  }), [filteredData, timeRange, onTimeRangeChange, displayData, onHoverDateChange, onDateClick, onNewsModeChange]);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-start justify-between mb-4 z-10 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 relative">
            <span className="text-5xl font-bold text-[#00ffff] tracking-tight" style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}>
              {(currentValue * currency.rate).toFixed(2)}
            </span>
            <div 
              className="flex items-center gap-1 cursor-pointer group mt-2"
              onClick={() => setShowCurrencySelector(!showCurrencySelector)}
            >
              <span className="text-lg text-white font-medium">{currency.code}</span>
              <ChevronDown className="w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            
            {showCurrencySelector && (
              <div className="absolute top-full left-[110px] mt-1 w-28 bg-[#0f1525]/95 border border-[#1a2540] rounded-lg shadow-xl overflow-hidden backdrop-blur-md z-50">
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
                    {c.code}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-[13px] mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">最高</span>
              <span className="text-red-500 font-bold">{(highValue * currency.rate).toFixed(2)}</span>
              <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-500 text-[10px]">▲</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">最低</span>
              <span className="text-green-500 font-bold">{(lowValue * currency.rate).toFixed(2)}</span>
              <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-500 text-[10px]">▼</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 mt-2">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNewsModeChange?.('hot')}>
            <div className="w-4 h-[3px] bg-[#a855f7] shadow-[0_0_8px_#a855f7]"></div>
            <span className="text-slate-300 text-sm">真实值</span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNewsModeChange?.('key')}>
            <div className="w-4 h-[3px] border-b-[3px] border-dashed border-[#00ffff] shadow-[0_0_8px_#00ffff]"></div>
            <span className="text-slate-300 text-sm">AI 预测值</span>
          </div>
          {injectedPredictions.length > 0 && (
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNewsModeChange?.('similar')}>
              <div className="w-4 h-[3px] border-b-[3px] border-dashed border-[#22c55e] shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-slate-300 text-sm">AI 注入值</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative z-0 -mt-8">
        <ReactECharts
          ref={chartRef}
          option={option}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
        />

        {hasInjected && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden" style={{ top: '40px', bottom: '24px', left: '60px', right: '20px' }}>
            {SIMILAR_EVENTS.slice(0, 10).map((evt, idx) => (
              <div 
                key={evt.id}
                className={`absolute cursor-pointer shadow-lg group transition-all duration-300 ${
                  activeEvent === evt.id ? 'z-50' : 'z-20 hover:z-30'
                }`}
                style={{ 
                  width: activeEvent === evt.id ? '311.27px' : '189.98px',
                  height: activeEvent === evt.id ? '172.27px' : '106.98px',
                  padding: '5.63px',
                  background: 'rgba(158, 197, 225, 0.1)',
                  borderRadius: '5.63px',
                  border: '0.47px solid',
                  borderImage: 'linear-gradient(119deg, rgba(255, 255, 255, 0.3) 2%, rgba(255, 255, 255, 0.05) 100%) 0.47',
                  backdropFilter: 'blur(14.55px)',
                  ...getCardStyle(idx) 
                }}
                onMouseEnter={() => setActiveEvent(evt.id)}
                onMouseLeave={() => setActiveEvent(null)}
              >
                <div 
                  className="w-full h-full flex flex-col"
                  style={{
                    background: 'linear-gradient(90deg, rgba(158, 197, 225, 0.15) 0%, rgba(158, 197, 225, 0.08) 100%)',
                    borderRadius: '4px',
                    padding: activeEvent === evt.id ? '12px' : '8px',
                    gap: '7.51px'
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div 
                      className="truncate transition-colors text-slate-200 group-hover:text-white flex-1 mr-2"
                      style={{
                        fontSize: activeEvent === evt.id ? '14px' : '10px',
                        fontWeight: 600,
                        lineHeight: activeEvent === evt.id ? '1.4' : '10.33px'
                      }}
                    >
                      相似事件{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][idx]}：{evt.title}
                    </div>
                    <div 
                      className="shrink-0 text-red-500"
                      style={{
                        fontSize: activeEvent === evt.id ? '12px' : '10px',
                        fontWeight: 'bold',
                        lineHeight: 'normal'
                      }}
                    >
                      {evt.similarity}%
                    </div>
                  </div>
                  <div 
                    className="transition-colors text-slate-400 group-hover:text-slate-300"
                    style={{
                      fontSize: activeEvent === evt.id ? '12px' : '8px',
                      fontWeight: 'normal',
                      lineHeight: activeEvent === evt.id ? '1.4' : '9.39px'
                    }}
                  >
                    {evt.periodStart} ~ {evt.periodEnd}
                  </div>
                  
                  <div className="flex-1 w-full relative mt-2 min-h-0">
                    <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path 
                        d={`M 0,${40 - (evt.chartData[0].actual / 10000) * 40} 
                            L 33,${40 - (evt.chartData[1].actual / 10000) * 40} 
                            L 66,${40 - (evt.chartData[2].actual / 10000) * 40} 
                            L 100,${40 - (evt.chartData[3].actual / 10000) * 40}`} 
                        fill="none" 
                        stroke="#672073" 
                        strokeWidth="3" 
                      />
                      <path 
                        d={`M 0,${40 - (evt.chartData[0].predicted / 10000) * 40} 
                            L 33,${40 - (evt.chartData[1].predicted / 10000) * 40} 
                            L 66,${40 - (evt.chartData[2].predicted / 10000) * 40} 
                            L 100,${40 - (evt.chartData[3].predicted / 10000) * 40}`} 
                        fill="none" 
                        stroke="#00FF55" 
                        strokeWidth="2" 
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
