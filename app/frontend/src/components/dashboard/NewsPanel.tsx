import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, FileText, BrainCircuit, Loader2 } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  source?: string;
  dateRange: string;
  impact: string;
  bgColor?: string; // Support for specific background gradients
  isSimilar?: boolean;
}

const STATIC_TOP_10: NewsItem[] = [
  { id: '1', title: '事件一：美伊以冲突升级', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%', bgColor: 'bg-gradient-to-r from-fuchsia-900/40 to-transparent' },
  { id: '2', title: '事件二：中东地区地缘事件', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%', bgColor: 'bg-gradient-to-r from-teal-900/40 to-transparent' },
  { id: '3', title: '事件三：俄乌冲突持续', source: 'Oilprice', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%', bgColor: 'bg-gradient-to-r from-emerald-900/40 to-transparent' },
  { id: '4', title: '事件四：胡塞武装袭击红海油轮', source: 'Oilprice', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: '5', title: '事件五：利比亚内战', source: 'Oilprice', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: '6', title: '事件六：页岩油产能波动', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: '7', title: '事件七：OPEC+减产决议', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: '8', title: '事件八：全球经济衰退', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: '9', title: '事件九：货币政策调整', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
  { id: '10', title: '事件十：航运与物流中断', source: '汇通社', dateRange: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
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

function NewsCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);

  const handleToggle = () => {
    if (!expanded && !contentLoaded) {
      setIsLoading(true);
      // Simulate loading detail content
      setTimeout(() => {
        setIsLoading(false);
        setContentLoaded(true);
      }, 600);
    }
    setExpanded(!expanded);
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-300 overflow-hidden ${
        item.bgColor ? item.bgColor : 'bg-[#111827]/60'
      } border-[#1e293b] hover:border-slate-600`}
    >
      {/* Header / Summary row */}
      <div 
        className="cursor-pointer group select-none" 
        onClick={handleToggle}
      >
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

      {/* Expanded Content Area */}
      <div 
        className={`grid transition-all duration-400 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-[#1e293b]' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">加载深度分析中...</span>
            </div>
          ) : contentLoaded ? (
            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto no-scrollbar pr-1 pb-2">
              {/* News Detail Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#00ffff] mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold tracking-wider">事件详报</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed text-justify">
                  据{item.source}最新报道，该事件引发了全球能源市场的广泛关注。多位分析师指出，此次变动不仅直接影响了区域内的原油供应链，更可能在未来几个季度内对全球大宗商品定价体系产生深远影响。相关利益方正在紧急磋商以应对可能出现的流动性紧缩。
                  {/* Extra text to demonstrate inner scrolling */}
                  <br/><br/>
                  市场反应方面，早盘交易时段已出现明显异动。多家机构上调了避险资产的配置比例，并建议投资者密切关注后续政策走向及实际供需数据的验证。
                </p>
              </div>

              {/* AI Analysis Section */}
              <div className="space-y-2 bg-blue-900/10 rounded-md p-2.5 border border-blue-500/20">
                <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold tracking-wider">AI深度分析</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold mt-0.5">•</span>
                    <span><strong className="text-slate-200">影响评估：</strong>短期内将对布伦特原油产生 {item.impact} 的价格波动预期，主要传导路径为供给侧收缩担忧。</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold mt-0.5">•</span>
                    <span><strong className="text-slate-200">趋势预测：</strong>若局势在一周内未能缓解，溢价效应可能扩散至远期合约，带动整体价格曲线上移。</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold mt-0.5">•</span>
                    <span><strong className="text-slate-200">关联建议：</strong>建议密切关注下周三的 EIA 库存数据发布，可能会产生对冲或叠加效应。</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function NewsPanel({ hasInjected = false }: { hasInjected?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const displayList = hasInjected ? SIMILAR_EVENTS_TOP_10 : STATIC_TOP_10;
  const title = hasInjected ? "历史相似事件 TOP 10" : "历史事件 TOP 10";

  return (
    <div className="h-full flex flex-col relative z-0">
      <div className="flex items-center justify-between mb-4 mt-2 px-2 shrink-0">
        <h3 className="text-base font-bold text-slate-200 italic tracking-wider">{title}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2 flex flex-col gap-3 relative" ref={containerRef}>
        {/* Top 10 Events Section */}
        {displayList.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>

      {/* 预测值区域 */}
      <div className="shrink-0 p-4 border-t border-[#1a2540] bg-[#0c1220]/80 backdrop-blur-md flex items-center justify-between">
        <span className="text-sm text-slate-400">AI 最新预测价格</span>
        <div className="text-2xl font-bold text-[#00ffff]">
          72.26 <span className="text-sm font-normal">¥</span>
        </div>
      </div>
    </div>
  );
}