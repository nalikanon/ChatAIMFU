import React from 'react';
import { Usage } from '../utils/types';

interface TokenUsageDisplayProps {
  usage: Usage;
}

const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({ usage }) => {
  const { dailyTokens, tokenLimit } = usage;
  
  // คำนวณเปอร์เซ็นต์ที่ใช้ไป
  const percentUsed = Math.min(100, Math.round((dailyTokens / tokenLimit) * 100));
  
  // กำหนดสีตามการใช้งาน
  let progressColor = 'bg-green-500';
  if (percentUsed > 80) {
    progressColor = 'bg-red-500';
  } else if (percentUsed > 50) {
    progressColor = 'bg-yellow-500';
  }

  return (
    <div className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 
                   flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
      <div className="relative w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full ${progressColor}`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
        <span>{(dailyTokens / 1000).toFixed(1)}K</span>
        <span className="mx-1">/</span>
        <span>{(tokenLimit / 1000).toFixed(0)}K</span>
      </div>
    </div>
  );
};

export default TokenUsageDisplay;
