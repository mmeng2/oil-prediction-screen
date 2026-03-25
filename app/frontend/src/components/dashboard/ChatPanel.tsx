import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import React from "react";
import {
  Send,
  X,
  Bot,
  Plus,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Activity,
  Clock,
  Target,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isInjection?: boolean;
  injectionData?: {
    count: number;
    events: { title: string; date: string; impact: string }[];
  };
}

const INJECTION_EVENTS = [
  { title: "事件一：炼油厂遭袭击", date: "2024/03/12 ~ 2024/05/23", impact: "+0.02%" },
  { title: "事件二：霍尔木兹海峡关闭", date: "2024/03/12 ~ 2024/05/23", impact: "+0.02%" },
  { title: "事件三：能源设施意外事故", date: "2024/03/12 ~ 2024/05/23", impact: "+0.02%" },
];

const SUGGESTIONS = [
  "模拟 10 条 2026.4.1-2026.4.5 曼谷新闻...",
  "注入 3 条明天伊朗冲突升级的模拟事件",
  "模拟明日美伊以事件冲突结束",
];

const PRESET_QUESTIONS = [
  "霍尔木兹海峡封锁",
  "沙特下调原油出口价格",
  "OPEC+ 宣布减产"
];

export default function ChatPanel({
  onInject,
  onReset,
  containerHeight,
}: {
  onInject?: (count: number) => void;
  onReset?: () => void;
  containerHeight?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [injectionProgress, setInjectionProgress] = useState(0);
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [history, setHistory] = useState<
    { type: string; scope: string; duration: string; time: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  const [formData, setFormData] = useState({
    type: "地缘政治",
    scope: "全球",
    duration: "1 个月",
  });

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen, thinkingExpanded, injectionProgress]);

  const handleWithdraw = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleEdit = useCallback((msg: ChatMessage) => {
    setInput(msg.content);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
  }, []);

  const handleSend = useCallback((overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isTyping) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);
    setInjectionProgress(0);
    setThinkingExpanded(true);

    setTimeout(() => setInjectionProgress(1), 1000);
    setTimeout(() => setInjectionProgress(2), 2000);

    setTimeout(() => {
      setInjectionProgress(3);

      const assistantMsgId = Date.now().toString();
      
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: `正在为您生成模拟事件并注入模型...`,
          timestamp: Date.now(),
          isInjection: true,
          injectionData: { count: 0, events: [] },
        },
      ]);

      INJECTION_EVENTS.forEach((evt, index) => {
        setTimeout(() => {
          setMessages((prev) => {
            const msgIndex = prev.findIndex(m => m.id === assistantMsgId);
            if (msgIndex === -1) return prev;
            
            const updatedMsg = {
              ...prev[msgIndex],
              content: `已为您注入 ${index + 1} 条明天伊朗冲突升级的模拟事件`,
              injectionData: {
                count: index + 1,
                events: [...prev[msgIndex].injectionData!.events, evt]
              }
            };
            
            const newMessages = [...prev];
            newMessages[msgIndex] = updatedMsg;
            return newMessages;
          });

          onInject?.(1);

          if (index === INJECTION_EVENTS.length - 1) {
            setIsTyping(false);
            setThinkingExpanded(false);
          }
        }, (index + 1) * 1200);
      });

    }, 3500);
  }, [input, isTyping, onInject]);

  const handleReset = useCallback(() => {
    onReset?.();
    setMessages([]);
    setHistory([]);
  }, [onReset]);

  const handleFormSubmit = useCallback(() => {
    setShowConfirm(false);
    setShowForm(false);
    
    const newHist = [
      {
        ...formData,
        time: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...history,
    ].slice(0, 5);
    setHistory(newHist);

    handleSend(
      `注入一条【${formData.type}】模拟事件，范围【${formData.scope}】，持续【${formData.duration}】`,
    );
  }, [formData, history, handleSend]);

  const ThinkingModule = useCallback(({ progress, expanded, setExpanded }: { progress: number, expanded: boolean, setExpanded: (v: boolean) => void }) => (
    <div className="w-full flex flex-col gap-3">
      <div 
        className="flex items-center gap-2 text-[13px] text-white/60 font-medium cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <BrainCircuit className="w-4 h-4" />
        <span>{progress >= 3 ? "思考与分析完成" : "思考与分析中..."}</span>
        <div className="ml-1">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>
      
      <div className={`grid transition-all duration-300 ease-in-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="space-y-2.5">
            {[
              { id: 1, label: "数据感知" },
              { id: 2, label: "深度思考" },
              { id: 3, label: "生成分析结果" }
            ].map((step) => (
              <div 
                key={step.id}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-500 ${
                  progress >= step.id 
                    ? "bg-[#061a11] border-[#1a4d32] text-green-400" 
                    : "bg-white/5 border-white/5 text-white/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  {progress >= step.id ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : progress === step.id - 1 ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  )}
                  <span className="text-[13px] font-medium">{progress >= step.id ? "已完成" : "进行中"} {step.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] opacity-60">3.5s</span>
                  <ChevronRight className="w-3 h-3 opacity-40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ), []);

  const MessageList = useMemo(() => {
    return messages.map((msg) => (
      <React.Fragment key={msg.id}>
        <div
          className={`flex flex-col group ${msg.role === "user" ? "items-end" : "items-start"}`}
        >
          <div
            className={`max-w-[90%] rounded-2xl p-3.5 text-sm leading-relaxed relative ${
              msg.role === "user"
                ? "bg-blue-600/90 backdrop-blur-md text-white rounded-tr-sm shadow-lg shadow-blue-900/20"
                : "bg-white/10 backdrop-blur-md border border-white/10 text-slate-200 shadow-md rounded-tl-sm"
            }`}
          >
            {msg.content}
            <div
              className={`text-[10px] mt-2 opacity-60 ${msg.role === "user" ? "text-right" : "text-left"}`}
            >
              {new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {msg.role === "user" &&
            Date.now() - msg.timestamp < 120000 &&
            !isTyping && (
              <div className="flex gap-3 text-[11px] text-slate-500 mt-1.5 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(msg)} className="hover:text-blue-400 transition-colors">
                  重新编辑
                </button>
                <button onClick={() => handleWithdraw(msg.id)} className="hover:text-red-400 transition-colors">
                  撤回
                </button>
              </div>
            )}

          {msg.role === "assistant" && msg.isInjection && msg.injectionData && (
            <div className="w-full mt-4 space-y-4">
              {/* Permanent Thinking Module for Injection Messages */}
              <ThinkingModule 
                progress={3} 
                expanded={thinkingExpanded} 
                setExpanded={setThinkingExpanded} 
              />

              <div className="space-y-3">
                <div className="text-sm text-slate-300 mb-2 font-medium">
                  已为你注入 {msg.injectionData.count} 条模拟事件：
                </div>
                {msg.injectionData.events.map((evt, idx) => (
                  <div
                    key={idx}
                    className="bg-[#111827]/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col gap-2 shadow-xl transition-all hover:bg-white/5"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-100 text-[14px]">
                        {evt.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-[#ff4d4f] bg-[#ff4d4f]/10 px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#ff4d4f]/20">
                          <span className="text-[10px]">▲</span>
                          {evt.impact}
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        汇通社
                      </span>
                      <span>{evt.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </React.Fragment>
    ));
  }, [messages, isTyping, handleEdit, handleWithdraw, thinkingExpanded, ThinkingModule]);

  return (
    <>
      <div
        className={`fixed bottom-10 z-[998] transition-all duration-500 ease-in-out ${
          isOpen ? "opacity-0 scale-0 pointer-events-none" : "opacity-100 scale-100"
        }`}
        style={{
          right: isHovered ? "60px" : "20px"
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          {/* Tooltip */}
          <div 
            className={`transition-all duration-300 flex flex-col justify-center px-4 py-2.5 ${
              isHovered ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-10 scale-95 pointer-events-none"
            }`}
            style={{
              width: "300px",
              height: "64px",
              background: "linear-gradient(90deg, rgba(158, 197, 225, 0.25) 0%, rgba(158, 197, 225, 0.1) 100%)",
              backdropFilter: "blur(12px)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: "12px" }}>
              <span className="text-white/80 font-medium whitespace-nowrap">
                给AI 注入事件因子，<span className="text-blue-400">轻松拿捏油价走势</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <button 
                className="text-white font-bold hover:text-blue-400 transition-colors flex-1 text-left truncate"
                style={{ fontSize: "14px" }}
                onClick={() => {
                  handleSend(PRESET_QUESTIONS[currentQuestionIdx]);
                  setIsOpen(true);
                }}
              >
                {PRESET_QUESTIONS[currentQuestionIdx]}
              </button>
              <div className="flex items-center gap-1 ml-2">
                <button 
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentQuestionIdx(prev => (prev - 1 + PRESET_QUESTIONS.length) % PRESET_QUESTIONS.length);
                  }}
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button 
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentQuestionIdx(prev => (prev + 1) % PRESET_QUESTIONS.length);
                  }}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Avatar - Positioned to overlap top-right corner of tooltip */}
          <div 
            className="absolute -top-12 -right-12 group cursor-pointer z-10"
            onClick={() => setIsOpen(true)}
          >
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-[15px] group-hover:bg-blue-500/40 transition-all duration-500"></div>
            <div className="relative w-20 h-20 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-all overflow-hidden shadow-2xl bg-[#0f172a]">
              <img 
                src="/assets/logo1.png" 
                alt="AI" 
                className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500" 
              />
            </div>
          </div>
        </div>
      </div>


      <div
        className={`fixed right-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-[1000] flex flex-col transition-all duration-300 origin-bottom-right ${isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}`}
        style={{
          width: "360px",
          height: containerHeight ? `${containerHeight}px` : "600px",
          bottom: "16px",
          background: "linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), rgba(118, 118, 118, 0.04)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20"></div>
        </div>

        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span 
              className="tracking-wide"
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                lineHeight: "28px",
                color: "rgba(255, 255, 255, 0.8)"
              }}
            >
              {showForm ? "事件注入表单" : "九天数据助手"}
            </span>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setShowForm(false);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {showForm ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-none">
              <div className="space-y-4 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">事件类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[#111827]/80 backdrop-blur-md border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option>地缘政治</option>
                    <option>自然灾害</option>
                    <option>经济政策</option>
                    <option>产能调整</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">影响范围</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="w-full bg-[#111827]/80 backdrop-blur-md border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option>全球</option>
                    <option>中东地区</option>
                    <option>北美地区</option>
                    <option>欧洲地区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">持续时间</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full bg-[#111827]/80 backdrop-blur-md border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option>1 周内</option>
                    <option>1 个月</option>
                    <option>3 个月</option>
                    <option>长期</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl space-y-2">
                <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                  <Target className="w-4 h-4" /> 预期影响预览
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  基于历史模型推演，该【{formData.type}】事件在【{formData.scope}】范围内持续【{formData.duration}】，预计将导致布伦特原油价格短期波动幅度约{" "}
                  <span className="text-red-400 font-bold">+2.5% ~ +4.0%</span>
                  。
                </p>
              </div>

              {history.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 最近注入记录
                  </h4>
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <div
                        key={i}
                        className="text-xs bg-white/5 backdrop-blur-md p-2.5 rounded-lg border border-white/5 flex justify-between items-center text-slate-300"
                      >
                        <span>{h.type} · {h.scope}</span>
                        <span className="text-slate-500">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm">
                  取消
                </button>
                <button onClick={() => setShowConfirm(true)} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium">
                  生成注入事件
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth scrollbar-none relative" ref={scrollRef}>
              {messages.length === 0 && !isTyping ? (
                <div className="flex flex-col items-center justify-center h-[489px] -mt-4">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-[40px] animate-pulse"></div>
                    <div className="relative w-289 h-289 p-1.5 overflow-hidden ">
                      <img src="/assets/image.png" alt="AI Avatar" className="w-full h-full object-cover rounded-full" />
                    </div>
                  </div>
                  <div className="w-full space-y-3 px-1 max-w-[300px]">
                    {SUGGESTIONS.map((text, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(text)}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl py-3 px-4 flex items-center gap-3 text-sm text-white/60 transition-all hover:border-white/10 group shadow-lg"
                      >
                        <Sparkles className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="truncate text-left">{text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {MessageList}
                  {isTyping && !messages.some(m => m.role === 'assistant' && m.isInjection) && (
                    <div className="flex flex-col items-start w-full">
                      <ThinkingModule 
                        progress={injectionProgress} 
                        expanded={thinkingExpanded} 
                        setExpanded={setThinkingExpanded} 
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 bg-white/5 shrink-0 rounded-b-2xl flex items-center gap-3">
          <div className="flex-1 relative flex items-center bg-gradient-to-r from-yellow-400/40 via-blue-500/40 to-purple-600/40 rounded-2xl p-[1.5px] shadow-lg shadow-black/20">
            <div className="w-full bg-[#111827]/90 backdrop-blur-md rounded-[14px] flex items-center pr-2 pl-1.5 py-0.5">
              <button
                onClick={() => setShowForm(true)}
                className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-blue-400 hover:bg-white/5 transition-colors"
                title="打开注入表单"
              >
                <Plus className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="您可以输入一些模拟事件..."
                className="w-full bg-transparent border-none py-2.5 pl-2 pr-10 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-0"
              />
              <div className="flex items-center gap-2 pr-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="重置对话"
                  >
                    <RotateCcw className="w-4.5 h-4.5" />
                  </button>
                )}
                <button
                  onClick={() => handleSend()}
                  disabled={isTyping || !input.trim()}
                  className="w-9 h-9 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#0f1525] border border-[#1e293b] rounded-xl p-6 w-[320px] shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-bold text-white">确认注入事件</h3>
            </div>
            <p className="text-sm text-slate-300 mb-6">
              您确定要注入【{formData.type}】模拟事件吗？这将影响所有预测曲线的走势。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg border border-[#1e293b] text-slate-300 hover:bg-[#1e293b] transition-colors text-sm">
                取消
              </button>
              <button onClick={handleFormSubmit} className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium">
                确认注入
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
