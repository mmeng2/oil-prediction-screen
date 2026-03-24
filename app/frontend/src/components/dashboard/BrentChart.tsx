import { useState, useMemo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { BrentDataPoint, TODAY } from './types';
import { ChevronDown } from 'lucide-react';

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
}

export default function BrentChart({
  data,
  timeRange,
  onTimeRangeChange,
  viewMode,
  injectedPredictions,
}: BrentChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  
  // Simulated real-time update
  const [currentValue, setCurrentValue] = useState(72.26);
  const [highValue, setHighValue] = useState(7.88);
  const [lowValue, setLowValue] = useState(6.93);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);

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
  const filteredData = data;

  const option = useMemo(() => {
    const dates = filteredData.map(d => {
      // format date to MM/DD like 2026/2/28
      const dt = new Date(d.date);
      return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;
    });
    
    // Split data into historical and predict
    // Scale down by 10 to match the 5-10 Y-axis range in the design
    const scale = 10 / currency.rate;
    const realValues = filteredData.map(d => !d.isPredict ? Number((d.price! / scale).toFixed(2)) : null);
    
    // Create continuous prediction line (including historical predictions)
    const predictValues = filteredData.map(d => {
      // Show predictPrice if it exists, otherwise fall back to price (for future dates)
      const val = d.predictPrice ?? d.price;
      return val !== undefined ? Number((val / scale).toFixed(2)) : null;
    });
    
    // Connect the real line to the prediction line at TODAY
    const todayIdx = filteredData.findIndex(d => d.date === TODAY);
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
        show: true,
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
        left: 40,
        right: 20,
        bottom: 30,
        containLabel: true
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
          startValue: timeRange[0],
          endValue: timeRange[1],
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true
        }
      ],
      series: [
        {
          name: '真实值',
          type: 'line',
          data: realValues,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: COLOR_REAL,
            width: 3,
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
          markLine: {
            symbol: 'none',
            label: { show: true, position: 'start', color: '#94a3b8', formatter: '今日' },
            lineStyle: { color: '#64748b', type: 'dashed' },
            data: [
              { xAxis: todayIdx }
            ]
          },
          z: 2
        },
        {
          name: 'AI预测值',
          type: 'line',
          data: predictValues,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: COLOR_PREDICT,
            borderColor: '#0f1525',
            borderWidth: 2
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
          data: injectedValues,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          label: {
            show: true,
            position: 'top',
            color: COLOR_INJECT,
            formatter: function (params: any) {
              return currency.symbol + (params.value * scale).toFixed(2);
            }
          },
          itemStyle: {
            color: COLOR_INJECT,
            borderColor: '#0f1525',
            borderWidth: 2
          },
          lineStyle: {
            color: COLOR_INJECT,
            width: 4,
            type: 'dashed',
            shadowColor: 'rgba(34, 197, 94, 0.8)',
            shadowBlur: 12
          },
          z: 4
        }
      ]
    };
  }, [filteredData, injectedPredictions, currency]);

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
            
            // To prevent infinite update loops, we check if the values actually changed
            // Also, we use a small debounce/throttle approach by not updating if the change is identical
            if (startVal !== timeRange[0] || endVal !== timeRange[1]) {
              onTimeRangeChange([startVal, endVal]);
            }
          }
        }
      }
    };
  }, [timeRange, onTimeRangeChange]);

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
          <div className="flex items-center gap-2">
            <div className="w-4 h-[3px] bg-[#a855f7] shadow-[0_0_8px_#a855f7]"></div>
            <span className="text-slate-300 text-sm">真实值</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-[3px] border-b-[3px] border-dashed border-[#00ffff] shadow-[0_0_8px_#00ffff]"></div>
            <span className="text-slate-300 text-sm">AI预测值</span>
          </div>
          {injectedPredictions.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-[3px] border-b-[3px] border-dashed border-[#22c55e] shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-slate-300 text-sm">AI注入值</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 min-h-0 relative z-0 -mt-8">
        <ReactECharts
          ref={chartRef}
          option={option}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
}