import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Plus, CheckCircle2, Loader2, ChevronDown, ChevronUp, BrainCircuit, Activity, Clock, Target, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isInjection?: boolean;
  injectionData?: {
    count: number;
    events: { title: string; date: string; impact: string }[];
  };
}

export default function ChatPanel({ onInject }: { onInject?: (count: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [injectionProgress, setInjectionProgress] = useState(0);
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [history, setHistory] = useState<{type: string, scope: string, duration: string, time: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: '地缘政治',
    scope: '全球',
    duration: '1个月'
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen, thinkingExpanded, injectionProgress]);

  const handleWithdraw = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleEdit = (msg: ChatMessage) => {
    setInput(msg.content);
    handleWithdraw(msg.id);
  };

  const handleSend = (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isTyping) return;
    
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);
    setInjectionProgress(0);
    setThinkingExpanded(true);

    // Simulate progress steps
    setTimeout(() => setInjectionProgress(1), 1000);
    setTimeout(() => setInjectionProgress(2), 2000);

    setTimeout(() => {
      setInjectionProgress(3);
      const count = 3;
      
      const fakeEvents = [
        { title: '事件一：炼油厂遭袭击', date: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
        { title: '事件二：霍尔木兹海峡关闭', date: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' },
        { title: '事件三：能源设施意外事故', date: '2024/03/12 ~ 2024/05/23', impact: '+0.02%' }
      ];

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `已为你注入 ${count} 条明天伊朗冲突升级的模拟事件`,
        timestamp: Date.now(),
        isInjection: true,
        injectionData: {
          count,
          events: fakeEvents
        }
      }]);
      setIsTyping(false);
      setThinkingExpanded(false); // Collapse thinking when done
      
      if (onInject) {
        onInject(count);
      }
    }, 3500);
  };

  return (
    <>
      {/* Floating Ball Entry */}
      <div 
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.5)] z-[998] transition-all duration-300 hover:scale-110 ${isOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
        onClick={() => setIsOpen(true)}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-400/30 animate-ping"></div>
          <Bot className="w-6 h-6 text-white relative z-10" />
        </div>
      </div>

      {/* Mask (Removed) */}

      {/* Floating Card */}
      <div 
        className={`fixed bottom-24 right-8 w-[400px] h-[600px] bg-[#0f1525]/60 backdrop-blur-xl border border-[#1e293b] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-[1000] flex flex-col transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e293b]/50 bg-[#0f1525]/40 shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white italic tracking-wide">{showForm ? '事件注入表单' : 'AI 助手'}</span>
          </div>
          <button onClick={() => { setIsOpen(false); setShowForm(false); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#1e293b] text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {showForm ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="space-y-4 bg-[#0f1525]/60 backdrop-blur-md p-4 rounded-xl border border-[#1e293b]">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">事件类型</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-[#111827]/80 backdrop-blur-md border border-[#1e293b] rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
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
                  onChange={e => setFormData({...formData, scope: e.target.value})}
                  className="w-full bg-[#111827]/80 backdrop-blur-md border border-[#1e293b] rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
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
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  className="w-full bg-[#111827]/80 backdrop-blur-md border border-[#1e293b] rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option>1周内</option>
                  <option>1个月</option>
                  <option>3个月</option>
                  <option>长期</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl space-y-2">
              <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                <Target className="w-4 h-4" /> 预期影响预览
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                基于历史模型推演，该【{formData.type}】事件在【{formData.scope}】范围内持续【{formData.duration}】，预计将导致布伦特原油价格短期波动幅度约 <span className="text-red-400 font-bold">+2.5% ~ +4.0%</span>。
              </p>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> 最近注入记录
                </h4>
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="text-xs bg-[#0f1525]/60 backdrop-blur-md p-2.5 rounded-lg border border-[#1e293b] flex justify-between items-center text-slate-300">
                      <span>{h.type} · {h.scope}</span>
                      <span className="text-slate-500">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#1e293b] text-slate-300 hover:bg-[#1e293b] transition-colors text-sm"
              >
                取消
              </button>
              <button 
                onClick={() => setShowConfirm(true)}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium"
              >
                生成注入事件
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent" ref={scrollRef}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed relative ${
                msg.role === 'user' 
                  ? 'bg-blue-600/90 backdrop-blur-md text-white rounded-tr-sm shadow-lg shadow-blue-900/20' 
                  : 'bg-[#111827]/80 backdrop-blur-md border border-[#1e293b] text-slate-200 shadow-md rounded-tl-sm'
              }`}>
                {msg.content}
                <div className={`text-[10px] mt-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Actions for User Messages */}
              {msg.role === 'user' && (Date.now() - msg.timestamp < 120000) && !isTyping && (
                <div className="flex gap-3 text-[11px] text-slate-500 mt-1.5 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(msg)} className="hover:text-blue-400 transition-colors">重新编辑</button>
                  <button onClick={() => handleWithdraw(msg.id)} className="hover:text-red-400 transition-colors">撤回</button>
                </div>
              )}

              {/* Injection Results Rendering */}
              {msg.role === 'assistant' && msg.isInjection && msg.injectionData && (
                <div className="w-full mt-4 space-y-3">
                  <div className="text-sm text-slate-300 mb-2">已为你注入 {msg.injectionData.count} 条模拟事件：</div>
                  {msg.injectionData.events.map((evt, idx) => (
                    <div key={idx} className="bg-[#0f1525]/80 backdrop-blur-md border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2 shadow-md">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-200 text-sm">{evt.title}</span>
                        <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-xs font-bold">
                          <Activity className="w-3 h-3" />
                          {evt.impact}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>汇通社</span>
                        <span>{evt.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing / Thinking Indicator */}
          {isTyping && (
            <div className="flex flex-col items-start w-full">
              {/* Collapsible Thinking Process */}
              <div className="max-w-[85%] rounded-2xl p-3.5 text-sm text-slate-400 bg-[#111827]/80 backdrop-blur-md border border-[#1e293b] shadow-md rounded-tl-sm flex flex-col gap-3 w-full">
                <button 
                  onClick={() => setThinkingExpanded(!thinkingExpanded)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mb-2 select-none"
                >
                  <BrainCircuit className="w-4 h-4 text-blue-400" />
                  <span>{injectionProgress >= 3 ? '思考与分析完成' : '思考与分析中...'}</span>
                  {thinkingExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                <div className={`grid transition-all duration-300 ease-in-out ${thinkingExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="space-y-2 mt-2 bg-[#0f1525]/80 backdrop-blur-md rounded-xl p-3 border border-[#1e293b]">
                      <div className={`flex items-center justify-between text-xs p-2 rounded-lg transition-colors ${injectionProgress >= 1 ? 'bg-green-900/10 border border-green-500/20 text-green-400' : 'bg-[#0f1525]/60 backdrop-blur-md text-slate-500 border border-transparent'}`}>
                        <div className="flex items-center gap-2">
                          {injectionProgress >= 1 ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                          <span>{injectionProgress >= 1 ? '已完成' : '正在进行'} 关键词提取</span>
                        </div>
                        {injectionProgress >= 1 && <span className="text-slate-400">1.2s &gt;</span>}
                      </div>
                      
                      <div className={`flex items-center justify-between text-xs p-2 rounded-lg transition-colors ${injectionProgress >= 2 ? 'bg-green-900/10 border border-green-500/20 text-green-400' : 'bg-[#0f1525]/60 backdrop-blur-md text-slate-500 border border-transparent'}`}>
                        <div className="flex items-center gap-2">
                          {injectionProgress >= 2 ? <CheckCircle2 className="w-4 h-4" /> : (injectionProgress >= 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-slate-600" />)}
                          <span>{injectionProgress >= 2 ? '已完成' : (injectionProgress >= 1 ? '正在进行' : '等待中')} 情感分析</span>
                        </div>
                        {injectionProgress >= 2 && <span className="text-slate-400">1.5s &gt;</span>}
                      </div>
                      
                      <div className={`flex items-center justify-between text-xs p-2 rounded-lg transition-colors ${injectionProgress >= 3 ? 'bg-green-900/10 border border-green-500/20 text-green-400' : 'bg-[#0f1525]/60 backdrop-blur-md text-slate-500 border border-transparent'}`}>
                        <div className="flex items-center gap-2">
                          {injectionProgress >= 3 ? <CheckCircle2 className="w-4 h-4" /> : (injectionProgress >= 2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-slate-600" />)}
                          <span>{injectionProgress >= 3 ? '已完成' : (injectionProgress >= 2 ? '正在进行' : '等待中')} 关联度计算</span>
                        </div>
                        {injectionProgress >= 3 && <span className="text-slate-400">0.8s &gt;</span>}
                      </div>

                      {/* Analysis Result Visualization (Progress Bars) */}
                      {injectionProgress >= 3 && (
                        <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-2">
                          <div className="text-[10px] text-slate-400 mb-2">综合影响分析</div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-300">供给侧影响</span>
                              <span className="text-blue-400">85%</span>
                            </div>
                            <div className="h-1.5 bg-[#0f1525]/60 backdrop-blur-md rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-300">需求侧预期</span>
                              <span className="text-purple-400">42%</span>
                            </div>
                            <div className="h-1.5 bg-[#0f1525]/60 backdrop-blur-md rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: '42%' }}></div>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-300">地缘溢价</span>
                              <span className="text-red-400">92%</span>
                            </div>
                            <div className="h-1.5 bg-[#0f1525]/60 backdrop-blur-md rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: '92%' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
          <div className="p-4 border-t border-[#1e293b]/50 bg-[#0f1525]/40 shrink-0 rounded-b-2xl">
            <div className="relative flex items-center bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-blue-900/20 rounded-full p-[1px]">
              <div className="w-full bg-[#111827]/80 backdrop-blur-md rounded-full flex items-center pr-2 pl-1">
                  <button 
                    onClick={() => setShowForm(true)}
                    className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-blue-400 hover:bg-[#1e293b] hover:text-blue-300 transition-colors"
                    title="打开注入表单"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <input 
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="您可以输入一些模拟事件..."
                    className="w-full bg-transparent border-none py-3.5 pl-2 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0"
                  />
                  <button 
                    onClick={() => handleSend()}
                    disabled={isTyping || !input.trim()}
                    className="w-9 h-9 shrink-0 rounded-full bg-[#1e293b] flex items-center justify-center text-slate-300 hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
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
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-[#1e293b] text-slate-300 hover:bg-[#1e293b] transition-colors text-sm"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setShowConfirm(false);
                  setShowForm(false);
                  // Update history
                  const newHist = [{ ...formData, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }, ...history].slice(0, 5);
                  setHistory(newHist);
                  
                  // Auto send message
                  handleSend(`注入一条【${formData.type}】模拟事件，范围【${formData.scope}】，持续【${formData.duration}】`);
                }}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium"
              >
                确认注入
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}