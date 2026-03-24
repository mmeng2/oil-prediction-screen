import { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getNewsForDate, SIMILAR_EVENTS, type NewsItem, type SimilarEvent, TODAY } from './types';

const ACCENT = '#ED5214';

interface NewsPanelProps {
  selectedDate: string;
  injectedNews: NewsItem[];
  isInjecting: boolean;
  forcedMode?: 'history' | 'future' | 'injected' | null;
}

type PanelMode = 'history' | 'future' | 'injected';

function getAutoMode(selectedDate: string, hasInjected: boolean): PanelMode {
  if (hasInjected) return 'injected';
  if (selectedDate > TODAY) return 'future';
  return 'history';
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const isPositive = sentiment === '利好';
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shrink-0 ${
        isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      }`}
    >
      {isPositive ? '利好' : '利空'}
    </span>
  );
}

function NewsCard({ item, isNew }: { item: NewsItem; isNew?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = item.changePercent.startsWith('+');
  const displaySentiment = isPositive ? '利好' : '利空';

  return (
    <div
      className={`p-2.5 rounded-lg border transition-all duration-500 mb-2 ${
        isNew
          ? 'bg-green-900/20 border-green-500/30 animate-slideIn'
          : 'bg-[#111827]/60 border-[#1e293b] hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <SentimentBadge sentiment={displaySentiment} />
          <h4 className="text-xs font-medium text-slate-200 truncate whitespace-nowrap overflow-hidden text-ellipsis">{item.title}</h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-bold whitespace-nowrap ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {item.changePercent}
          </span>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] text-slate-500">{item.source}</span>
        <span className="text-[9px] text-slate-600">{item.date}</span>
      </div>
      {expanded && (
        <div className="mt-1.5 pt-1.5 border-t border-[#1e293b]">
          <p className="text-[10px] text-slate-400 leading-relaxed">{item.summary}</p>
        </div>
      )}
    </div>
  );
}

function SimilarEventCard({ event }: { event: SimilarEvent }) {
  return (
    <div className="p-2.5 rounded-lg bg-[#111827]/60 border border-[#1e293b] hover:border-slate-600 transition-all mb-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-slate-200 truncate whitespace-nowrap overflow-hidden text-ellipsis flex-1 mr-2">{event.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-slate-400">相似度</span>
          <span className="text-sm font-bold" style={{ color: ACCENT }}>{event.similarity}%</span>
        </div>
      </div>
      <p className="text-[9px] text-slate-500 mb-1.5">
        影响周期：{event.periodStart} ~ {event.periodEnd}
      </p>
      <div className="h-[70px] bg-[#0a0e1a]/50 rounded-md p-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={event.chartData} margin={{ top: 2, right: 5, left: 5, bottom: 2 }}>
            <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 8 }} stroke="#1e293b" />
            <YAxis tick={{ fill: '#64748b', fontSize: 8 }} stroke="#1e293b" width={25} />
            <Line type="monotone" dataKey="actual" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="predicted" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 mt-1 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-[1.5px] bg-slate-400 rounded" />
          <span className="text-[8px] text-slate-500">实际走势</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0 border-t border-dashed border-red-400" />
          <span className="text-[8px] text-slate-500">预测走势</span>
        </div>
      </div>
    </div>
  );
}

export default function NewsPanel({ selectedDate, injectedNews, isInjecting, forcedMode }: NewsPanelProps) {
  const autoMode = getAutoMode(selectedDate, injectedNews.length > 0);
  // Use forced mode if provided and valid, otherwise fall back to auto mode
  const mode: PanelMode = forcedMode && (
    (forcedMode === 'injected' && injectedNews.length > 0) ||
    (forcedMode === 'future' && injectedNews.length > 0) ||
    forcedMode === 'history'
  ) ? forcedMode : autoMode;
  const [baseNews, setBaseNews] = useState<NewsItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (mode === 'history') {
      setBaseNews(getNewsForDate(selectedDate));
    }
  }, [selectedDate, mode]);

  // Auto-scroll to bottom when new injected news arrives
  useEffect(() => {
    if (mode === 'injected' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [injectedNews.length, mode]);

  // Auto-scroll carousel for non-injected modes
  useEffect(() => {
    if (!autoScroll || mode === 'injected') return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const el = scrollRef.current;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
          el.scrollTop = 0;
        } else {
          el.scrollTop += 1;
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [autoScroll, mode]);

  const injectedDisplayNews = (() => {
    if (mode !== 'injected') return [];
    // Show injected news in order of arrival (most recent at bottom for scroll)
    return [...injectedNews].slice(-10);
  })();

  const injectedIds = new Set(injectedNews.map((n) => n.id));

  const titleMap: Record<PanelMode, string> = {
    history: '关键新闻事件',
    future: '历史相似事件',
    injected: '注入预测事件',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200 whitespace-nowrap">{titleMap[mode]}</h3>
          {mode === 'history' && baseNews.length > 0 && (
            <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{baseNews.length}条</span>
          )}
          {mode === 'future' && (
            <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{SIMILAR_EVENTS.length}条</span>
          )}
          {mode === 'injected' && injectedDisplayNews.length > 0 && (
            <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{injectedNews.length}条</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isInjecting && mode === 'injected' && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] text-green-400">注入中</span>
            </div>
          )}
          <span className="text-[9px] text-slate-500">{selectedDate}</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
        onMouseEnter={() => setAutoScroll(false)}
        onMouseLeave={() => setAutoScroll(true)}
      >
        {mode === 'future' ? (
          SIMILAR_EVENTS.map((event) => <SimilarEventCard key={event.id} event={event} />)
        ) : mode === 'injected' ? (
          injectedDisplayNews.map((item) => (
            <NewsCard key={`${item.id}-${item.title}`} item={item} isNew={injectedIds.has(item.id)} />
          ))
        ) : (
          baseNews.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}