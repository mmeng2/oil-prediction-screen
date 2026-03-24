import { useState, useEffect } from 'react';

const ACCENT = '#00FFFF';

interface TopNavProps {
  currentDate: string;
}

export default function TopNav({ currentDate }: TopNavProps) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const HH = String(now.getHours()).padStart(2, '0');
      const MM = String(now.getMinutes()).padStart(2, '0');
      const SS = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${yyyy}/${mm}/${dd} ${HH}:${MM}:${SS}`);
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-[80px] flex items-center justify-between px-8 relative z-10 w-full shrink-0">
      {/* Background shape for top header to match design */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex">
        {/* Left cyber shape */}
        <div className="w-[400px] h-full relative">
          <svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 H400 L370 40 H150 L120 80 H0 V0" fill="rgba(10, 25, 45, 0.8)" stroke="#00FFFF" strokeWidth="1" />
            <path d="M120 80 L150 40 H370 L400 0" stroke="#00FFFF" strokeWidth="2" />
          </svg>
        </div>
        {/* Right empty space or a top border line */}
        <div className="flex-1 border-t border-[#00FFFF]/30"></div>
      </div>

      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3 relative z-10 pl-4 pb-4">
        <div className="text-[#00FFFF] text-2xl font-black italic tracking-widest flex items-center gap-2" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}>
          <span className="text-xl opacity-80">&lt;</span>
          <img src="/assets/logo.png" alt="Logo" className="w-8 h-8 rounded-full object-contain" />
          <span>AI油价预测系统</span>
          <span className="text-xl opacity-80">&gt;</span>
        </div>
      </div>

      {/* Right: Real current time */}
      <div className="flex items-center relative z-10 pr-4">
        <div className="text-xl font-mono tracking-wider text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
          {timeStr}
        </div>
      </div>
    </div>
  );
}