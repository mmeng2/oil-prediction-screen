import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@metagptx/web-sdk';
import { PRESET_QUESTIONS, type NewsItem, type BrentDataPoint } from './types';

const client = createClient();
const ACCENT = '#ED5214';

interface ChatPanelProps {
  onInjectNews: (news: NewsItem) => void;
  onInjectPrediction: (point: BrentDataPoint) => void;
  onInjectionStart: () => void;
  onInjectionEnd: () => void;
  onReset: () => void;
}

/** Each round of conversation: user message + generation status */
interface ConversationRound {
  userContent: string;
  status: 'generating' | 'done' | 'error';
  newsCount: number;
}

function tryParseNewsFromText(text: string, id: number): NewsItem | null {
  const titleMatch = text.match(/(?:标题[：:]|^\d+[.、]\s*)(.*?)(?:\s*[|｜]|$)/m);
  const sentimentMatch = text.match(/(?:情绪|影响方向|类型)[：:]\s*(利好|利空)/);
  const changeMatch = text.match(/(?:影响|涨跌幅|变化)[：:]\s*([+-]?\d+\.?\d*%)/);
  const sourceMatch = text.match(/(?:来源|出处)[：:]\s*(\S+)/);
  const dateMatch = text.match(/(?:日期|时间)[：:]\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/);
  const summaryMatch = text.match(/(?:摘要|内容|详情)[：:]\s*(.*?)(?:\s*$)/m);

  const title = titleMatch?.[1]?.trim() || text.slice(0, 30).trim();
  if (!title || title.length < 3) return null;

  const changePercent = changeMatch?.[1] || `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 4 + 0.5).toFixed(1)}%`;
  const isPositive = changePercent.startsWith('+');
  const sentiment: '利好' | '利空' = sentimentMatch?.[1] === '利空' ? '利空' : sentimentMatch?.[1] === '利好' ? '利好' : (isPositive ? '利好' : '利空');
  const weight = Math.floor(Math.random() * 40) + 55;

  return {
    id: 10000 + id,
    source: sourceMatch?.[1] || 'AI预测',
    title,
    date: dateMatch?.[1]?.replace(/\./g, '-') || '2026-04-01',
    sentiment,
    changePercent,
    summary: summaryMatch?.[1]?.trim() || text.slice(0, 100),
    weight,
  };
}

function generatePredictionPoint(date: string, basePrice: number, sentiment: string): BrentDataPoint {
  const impact = sentiment === '利好' ? 1 : -1;
  const change = impact * (Math.random() * 3 + 0.5);
  return { date, price: Math.round((basePrice + change) * 100) / 100, isPredict: true };
}

export default function ChatPanel({ onInjectNews, onInjectPrediction, onInjectionStart, onInjectionEnd, onReset }: ChatPanelProps) {
  const [rounds, setRounds] = useState<ConversationRound[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Global news counter across all rounds */
  const globalNewsIdRef = useRef(0);
  const basePriceRef = useRef(75);
  /** Accumulate all messages for AI context continuity */
  const aiContextRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rounds]);

  const handleReset = () => {
    setRounds([]);
    setInput('');
    setIsLoading(false);
    globalNewsIdRef.current = 0;
    basePriceRef.current = 75;
    aiContextRef.current = [];
    onReset();
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const trimmed = content.trim();
    const roundIndex = rounds.length;
    let roundNewsCount = 0;

    // Add new round
    const newRound: ConversationRound = {
      userContent: trimmed,
      status: 'generating',
      newsCount: 0,
    };
    setRounds((prev) => [...prev, newRound]);
    setInput('');
    setIsLoading(true);

    // Signal injection start for every round (data accumulates, not cleared)
    onInjectionStart();

    // Add user message to AI context
    aiContextRef.current.push({ role: 'user', content: trimmed });

    try {
      // Always use the news generation system prompt so every round generates news data
      const systemPrompt = `你是"AI预测布伦特原油"的AI助手。用户要求你模拟生成影响油价的新闻事件。
请严格按照以下格式逐条生成，每条新闻之间用空行分隔：

标题：[新闻标题]
情绪：[利好/利空]
影响：[+X.X%/-X.X%]
来源：[新闻来源]
日期：[YYYY-MM-DD]
摘要：[50字以内的新闻摘要]

请确保每条新闻都包含以上所有字段。当前日期是2026年3月20日。`;

      const aiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...aiContextRef.current,
      ];

      let buffer = '';
      let fullResponse = '';

      await client.ai.gentxt({
        messages: aiMessages,
        model: 'deepseek-v3.2',
        stream: true,
        onChunk: (chunk: any) => {
          const chunkContent = chunk.content || '';
          buffer += chunkContent;
          fullResponse += chunkContent;

          // Parse news blocks from buffer - inject into list and charts in real-time
          const blocks = buffer.split(/\n\n+/);
          while (blocks.length > 1) {
            const block = blocks.shift()!;
            if (block.includes('标题') || block.match(/^\d+[.、]/)) {
              globalNewsIdRef.current += 1;
              roundNewsCount += 1;
              const newsItem = tryParseNewsFromText(block, globalNewsIdRef.current);
              if (newsItem) {
                onInjectNews(newsItem);
                const predPoint = generatePredictionPoint(newsItem.date, basePriceRef.current, newsItem.sentiment);
                basePriceRef.current = predPoint.price;
                onInjectPrediction(predPoint);
              }
              // Update this round's newsCount
              setRounds((prev) => {
                const updated = [...prev];
                if (updated[roundIndex]) {
                  updated[roundIndex] = { ...updated[roundIndex], newsCount: roundNewsCount };
                }
                return updated;
              });
            }
          }
          buffer = blocks[0] || '';
        },
        onComplete: () => {
          // Process remaining buffer
          if (buffer.trim()) {
            if (buffer.includes('标题') || buffer.match(/^\d+[.、]/)) {
              globalNewsIdRef.current += 1;
              roundNewsCount += 1;
              const newsItem = tryParseNewsFromText(buffer, globalNewsIdRef.current);
              if (newsItem) {
                onInjectNews(newsItem);
                const predPoint = generatePredictionPoint(newsItem.date, basePriceRef.current, newsItem.sentiment);
                basePriceRef.current = predPoint.price;
                onInjectPrediction(predPoint);
              }
            }
          }

          // Save assistant response to context for multi-round continuity
          aiContextRef.current.push({ role: 'assistant', content: fullResponse });

          onInjectionEnd();
          setRounds((prev) => {
            const updated = [...prev];
            if (updated[roundIndex]) {
              updated[roundIndex] = { ...updated[roundIndex], status: 'done', newsCount: roundNewsCount };
            }
            return updated;
          });
          setIsLoading(false);
        },
        onError: (error: any) => {
          console.error('AI error:', error);
          onInjectionEnd();
          setRounds((prev) => {
            const updated = [...prev];
            if (updated[roundIndex]) {
              updated[roundIndex] = { ...updated[roundIndex], status: 'error', newsCount: roundNewsCount };
            }
            return updated;
          });
          setIsLoading(false);
        },
        timeout: 60000,
      });
    } catch {
      onInjectionEnd();
      setRounds((prev) => {
        const updated = [...prev];
        if (updated[roundIndex]) {
          updated[roundIndex] = { ...updated[roundIndex], status: 'error', newsCount: roundNewsCount };
        }
        return updated;
      });
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasConversation = rounds.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar space-y-2">
        {!hasConversation ? (
          <div className="space-y-1.5 sm:space-y-2 pt-1">
            {PRESET_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="w-full text-left p-2 sm:p-2.5 rounded-lg bg-[#111827]/60 border border-[#1e293b] hover:bg-[#111827] transition-all group"
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${ACCENT}4D`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src="/assets/ai-generate-icon.png"
                    alt="AI"
                    className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                  <span className="text-[10px] sm:text-[11px] text-slate-400 group-hover:text-slate-300 truncate whitespace-nowrap overflow-hidden text-ellipsis block">
                    {q}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            {rounds.map((round, idx) => (
              <div key={idx} className="space-y-2">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[90%] px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] leading-relaxed bg-blue-600/20 border border-blue-500/30 text-slate-200">
                    {round.userContent}
                  </div>
                </div>

                {/* Status indicator with event count */}
                {round.status === 'generating' && (
                  <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg border" style={{ backgroundColor: `${ACCENT}1A`, borderColor: `${ACCENT}33` }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: ACCENT }} />
                    <span className="text-[10px]" style={{ color: ACCENT }}>正在生成中...</span>
                    <span className="text-[10px] text-slate-500">已生成 {round.newsCount} 条</span>
                  </div>
                )}
                {round.status === 'done' && (
                  <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] text-green-400">已完成生成</span>
                    <span className="text-[10px] text-slate-500">共 {round.newsCount} 条事件</span>
                  </div>
                )}
                {round.status === 'error' && (
                  <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-[10px] text-red-400">生成失败，请重试</span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Bottom: Input with reset button at top-right */}
      <div className="mt-2">
        {/* Reset button row - always visible above input */}
        <div className="flex justify-end mb-1">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="重置对话"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span className="text-[9px]">重置对话</span>
          </button>
        </div>
        {/* Input row */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="试试AI注入新闻事件对预测的影响吧~"
            disabled={isLoading}
            className="flex-1 bg-[#111827]/80 border border-[#1e293b] rounded-lg px-3 py-2 text-[10px] sm:text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none transition-colors disabled:opacity-50"
            onFocus={(e) => (e.currentTarget.style.borderColor = `${ACCENT}80`)}
            onBlur={(e) => (e.currentTarget.style.borderColor = '')}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            style={{ backgroundColor: `${ACCENT}33`, border: `1px solid ${ACCENT}4D` }}
          >
            <Send className="w-3 h-3" style={{ color: ACCENT }} />
          </button>
        </div>
      </div>
    </div>
  );
}