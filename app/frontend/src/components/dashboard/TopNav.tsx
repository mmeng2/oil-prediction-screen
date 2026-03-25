import { useState, useEffect } from 'react';
import headerTitle from "../../assets/header-title.png";

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
    <div className="h-16 flex items-center justify-between pr-8 relative z-10 w-full shrink-0">
      {/* Background shape for top header to match design */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex" style={{
        background: 'linear-gradient(270deg, rgba(0, 140, 255, 0.1098) 0%, rgba(0, 166, 255, 0.0431) 100%)'
      }} />

      {/* Left: Logo + Title */}
      <div className="flex items-end relative z-10 h-16">
        <img src={headerTitle} alt="AI油价预测系统" className="h-[55px] object-contain"/>
      </div>

      {/* Right: Real current time */}
      <div className="flex items-center relative z-10 pr-4">
        <div className="text-lg" style={{
          fontFamily: 'D-DIN',
          color: '#E6F8FF',
        }}>
          {timeStr}
        </div>
      </div>
    </div>
  );
}
