import { useState, useRef, useCallback, useMemo } from 'react';
import React from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, FileText, Loader2 } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  source?: string;
  dateRange: string;
  impact: string;
  bgColor?: string;
  isSimilar?: boolean;
}

interface NewsContent {
  detail: string;
  analysis: Array<{ label: string; content: string }>;
}

const TODAY_HOT_TOP_10: NewsItem[] = [
  { id: 'h1', title: '今日热点一：全球能源需求激增', source: '财联社', dateRange: '2026/03/24', impact: '+1.2%', bgColor: 'bg-gradient-to-r from-red-900/40 to-transparent' },
  { id: 'h2', title: '今日热点二：中东局势再度紧张', source: '新华社', dateRange: '2026/03/24', impact: '+0.8%', bgColor: 'bg-gradient-to-r from-orange-900/40 to-transparent' },
  { id: 'h3', title: '今日热点三：新能源技术突破', source: '科技日报', dateRange: '2026/03/24', impact: '-0.5%', bgColor: 'bg-gradient-to-r from-blue-900/40 to-transparent' },
  { id: 'h4', title: '今日热点四：OPEC 会议结果超预期', source: '路透社', dateRange: '2026/03/24', impact: '+2.1%' },
  { id: 'h5', title: '今日热点五：全球航运费上涨', source: '航运周刊', dateRange: '2026/03/24', impact: '+0.3%' },
  { id: 'h6', title: '今日热点六：美联储货币政策转向', source: '华尔街日报', dateRange: '2026/03/24', impact: '-0.2%' },
  { id: 'h7', title: '今日热点七：页岩油产量创新高', source: '能源资讯', dateRange: '2026/03/24', impact: '-0.7%' },
  { id: 'h8', title: '今日热点八：碳中和政策加速推进', source: '环境报', dateRange: '2026/03/24', impact: '-0.4%' },
  { id: 'h9', title: '今日热点九：新兴市场能源需求回升', source: '经济观察', dateRange: '2026/03/24', impact: '+0.6%' },
  { id: 'h10', title: '今日热点十：原油库存意外下降', source: 'EIA', dateRange: '2026/03/24', impact: '+1.5%' },
];

const KEY_NEWS_TOP_10: NewsItem[] = [
  { id: 'k1', title: '关键新闻一：美伊以冲突升级', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%', bgColor: 'bg-gradient-to-r from-fuchsia-900/40 to-transparent' },
  { id: 'k2', title: '关键新闻二：中东地区地缘事件', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%', bgColor: 'bg-gradient-to-r from-teal-900/40 to-transparent' },
  { id: 'k3', title: '关键新闻三：俄乌冲突持续', source: 'Oilprice', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%', bgColor: 'bg-gradient-to-r from-emerald-900/40 to-transparent' },
  { id: 'k4', title: '关键新闻四：胡塞武装袭击红海油轮', source: 'Oilprice', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: 'k5', title: '关键新闻五：利比亚内战', source: 'Oilprice', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: 'k6', title: '关键新闻六：页岩油产能波动', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: 'k7', title: '关键新闻七：OPEC+ 减产决议', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: 'k8', title: '关键新闻八：全球经济衰退', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: 'k9', title: '关键新闻九：货币政策调整', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: 'k10', title: '关键新闻十：航运与物流中断', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
];

const SIMILAR_EVENTS_TOP_10: NewsItem[] = [
  { id: 's1', title: '相似事件一：美伊以冲突升级', dateRange: '2024/03/12 ~ 2024/05/23', impact: '90%', isSimilar: true },
  { id: 's2', title: '相似事件二：俄乌冲突持续', dateRange: '2024/03/12 ~ 2024/05/23', impact: '85%', isSimilar: true },
  { id: 's3', title: '相似事件三：胡塞武装袭击红海油轮', dateRange: '2024/03/12 ~ 2024/05/23', impact: '70%', isSimilar: true },
  { id: 's4', title: '相似事件四：利比亚内战', dateRange: '2024/03/12 ~ 2024/05/23', impact: '65%', isSimilar: true },
  { id: 's5', title: '相似事件五：两伊战争', dateRange: '2024/03/12 ~ 2024/05/23', impact: '60%', isSimilar: true },
  { id: 's6', title: '相似事件六：尼日利亚产油区动乱', dateRange: '2024/03/12 ~ 2024/05/23', impact: '55%', isSimilar: true },
  { id: 's7', title: '相似事件七：阿尔及利亚与摩洛哥地缘政治冲突', dateRange: '2024/03/12 ~ 2024/05/23', impact: '53%', isSimilar: true },
  { id: 's8', title: '相似事件八：页岩油产能波动', dateRange: '2024/03/12 ~ 2024/05/23', impact: '46%', isSimilar: true },
  { id: 's9', title: '相似事件九：资源枯竭与产能下滑', dateRange: '2024/03/12 ~ 2024/05/23', impact: '43%', isSimilar: true },
  { id: 's10', title: '相似事件十：季节性需求波动', dateRange: '2024/03/12 ~ 2024/05/23', impact: '34%', isSimilar: true },
];

const CONTENT_CACHE = new Map<string, NewsContent>();

const generateContent = (item: NewsItem): NewsContent => {
  if (CONTENT_CACHE.has(item.id)) {
    return CONTENT_CACHE.get(item.id)!;
  }
  
  const content: NewsContent = {
    detail: `据${item.source || '权威媒体'}最新报道，该事件引发了全球能源市场的广泛关注。多位分析师指出，此次变动不仅直接影响了区域内的原油供应链，更可能在未来几个季度内对全球大宗商品定价体系产生深远影响。相关利益方正在紧急磋商以应对可能出现的流动性紧缩。

市场反应方面，早盘交易时段已出现明显异动。多家机构上调了避险资产的配置比例，并建议投资者密切关注后续政策走向及实际供需数据的验证。`,
    analysis: [
      { label: '影响评估', content: `短期内将对布伦特原油产生 ${item.impact} 的价格波动预期，主要传导路径为供给侧收缩担忧。` },
      { label: '趋势预测', content: '若局势在一周内未能缓解，溢价效应可能扩散至远期合约，带动整体价格曲线上移。' },
      { label: '关联建议', content: '建议密切关注下周三的 EIA 库存数据发布，可能会产生对冲或叠加效应。' }
    ]
  };
  
  CONTENT_CACHE.set(item.id, content);
  return content;
};

interface NewsCardProps {
  item: NewsItem;
}

const NewsCard = ({ item }: NewsCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  const content = useMemo(() => generateContent(item), [item]);

  const handleToggle = useCallback(() => {
    if (!expanded && !contentLoaded) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setContentLoaded(true);
      }, 600);
    }
    setExpanded(prev => !prev);
  }, [expanded, contentLoaded]);

  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-300 overflow-hidden ${
        item.bgColor ? item.bgColor : 'bg-[#111827]/60'
      } border-[#1e293b] hover:border-slate-600`}
    >
      <div className="cursor-pointer group select-none" onClick={handleToggle}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className={`text-sm font-semibold text-slate-200 flex-1 transition-colors ${expanded ? 'text-[#00ffff]' : 'group-hover:text-white'}`}>
            {item.title}
          </h4>
          <div className={`flex items-center gap-1 shrink-0 ${item.isSimilar ? 'text-red-500' : item.impact.startsWith('+') ? 'text-red-500' : 'text-green-500'}`}>
            {!item.isSimilar && (item.impact.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
            <span className="text-xs font-bold">{item.impact}</span>
            <div className="ml-1 text-slate-500 group-hover:text-slate-300 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {item.source && <span className="text-[11px] text-slate-500">{item.source}</span>}
          <span className="text-[11px] text-slate-500">{item.dateRange}</span>
        </div>
      </div>

      <div 
        className={`grid transition-all duration-400 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-[#1e293b]' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">加载详情中...</span>
            </div>
          ) : contentLoaded ? (
            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto no-scrollbar pr-1 pb-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#00ffff] mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold tracking-wider">事件详报</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed text-justify whitespace-pre-line">
                  {content.detail}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const MemoizedNewsCard = React.memo(NewsCard, (prev, next) => {
  return prev.item.id === next.item.id;
});

export type NewsPanelMode = 'hot' | 'key' | 'similar';

export default function NewsPanel({ mode = 'hot' }: { mode?: NewsPanelMode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const displayData = useMemo(() => {
    switch (mode) {
      case 'hot': return { title: '今日热点新闻 TOP 10', list: TODAY_HOT_TOP_10 };
      case 'key': return { title: '关键新闻事件 TOP 10', list: KEY_NEWS_TOP_10 };
      case 'similar': return { title: '历史相似事件 TOP 10', list: SIMILAR_EVENTS_TOP_10 };
      default: return { title: '今日热点新闻 TOP 10', list: TODAY_HOT_TOP_10 };
    }
  }, [mode]);

  return (
    <div className="h-full flex flex-col relative z-0">
      <div className="flex items-center justify-between mb-4 mt-2 px-2 shrink-0">
        <h3 className="text-base font-bold text-slate-200 italic tracking-wider">{displayData.title}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2 flex flex-col gap-3 relative" ref={containerRef}>
        {displayData.list.map((item) => (
          <MemoizedNewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
