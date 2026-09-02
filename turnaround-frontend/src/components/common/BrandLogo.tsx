import React from 'react';
import { useTheme } from '../../lib/ThemeContext';

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textSize?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 36,
  className = '',
  showText = true,
  textSize = 'text-base',
}) => {
  let isLight = false;
  try {
    const { theme } = useTheme();
    isLight = theme === 'light';
  } catch {
    isLight = false;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Clean FedEx-inspired geometric vector emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-150 group-hover:scale-105"
      >
        {/* Background container: FedEx Corporate Purple */}
        <rect width="40" height="40" rx="9" fill="#250C77" />
        
        {/* Dynamic Forward Express Arrow (Orange) */}
        <path
          d="M 8 9 L 24 9 C 28 9 30 11 30 14 C 30 17 28 19 24 19 L 14 19"
          stroke="#ED642B"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M 22 5.5 L 30 9 L 22 12.5"
          fill="#ED642B"
        />

        {/* Commercial Truck Silhouette (White) */}
        <rect x="7" y="21" width="15" height="11" rx="1.5" fill="#FFFFFF" />
        <path d="M22 23H28L31.5 27V32H22V23Z" fill="#FFFFFF" />
        <path d="M23.5 24.5H27.5L29.8 27.5H23.5V24.5Z" fill="#250C77" />
        
        {/* Wheels with orange hubs */}
        <circle cx="11" cy="32" r="2.8" fill="#16074A" />
        <circle cx="11" cy="32" r="1.3" fill="#ED642B" />
        <circle cx="27" cy="32" r="2.8" fill="#16074A" />
        <circle cx="27" cy="32" r="1.3" fill="#ED642B" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center">
            <span className={`${textSize} font-extrabold tracking-tight ${isLight ? 'text-blue-600' : 'text-white'}`}>
              Turn<span className="text-[#ED642B]">around</span>
            </span>
          </div>
          <span className="text-[9.5px] text-[#ED642B] font-bold tracking-widest uppercase mt-0.5">
            Fleet Operations
          </span>
        </div>
      )}
    </div>
  );
};
