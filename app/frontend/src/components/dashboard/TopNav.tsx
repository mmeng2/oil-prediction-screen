const ACCENT = '#ED5214';

interface TopNavProps {
  currentDate: string;
}

export default function TopNav({ currentDate }: TopNavProps) {
  const now = new Date();
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const realDateStr = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 ${weekDays[now.getDay()]}`;

  return (
    <div className="min-h-[48px] sm:min-h-[60px] flex items-center justify-between px-3 sm:px-8 border-b border-[#1a2540] bg-[#0c1220]/90 backdrop-blur-sm relative z-10">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <img src="/assets/logo.png" alt="Logo" className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg object-contain" />
        <h1 className="text-sm sm:text-lg font-bold tracking-wide text-slate-200 whitespace-nowrap">
          AI预测布伦特原油
        </h1>
      </div>

      {/* Center: Decorative line - hidden on mobile */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2">
        <div className="w-20 h-[1px]" style={{ background: `linear-gradient(to right, transparent, ${ACCENT}66)` }} />
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: `${ACCENT}99` }} />
        <div className="w-20 h-[1px]" style={{ background: `linear-gradient(to left, transparent, ${ACCENT}66)` }} />
      </div>

      {/* Right: Real current date */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-xs sm:text-sm text-slate-400 font-medium">{realDateStr}</div>
        </div>
        <div className="w-[1px] h-6 sm:h-8 bg-[#1a2540] hidden sm:block" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] sm:text-xs text-slate-500">实时监控</span>
        </div>
      </div>
    </div>
  );
}