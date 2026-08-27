import React from 'react';

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
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Clean, high-contrast geometric vector emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-150 group-hover:scale-105"
      >
        {/* Background container */}
        <rect width="40" height="40" rx="10" fill="#2563EB" />
        
        {/* Turnaround Route Arrow & Commercial Truck Cab */}
        {/* Truck Trailer Chassis */}
        <rect x="8" y="14" width="14" height="12" rx="2" fill="#FFFFFF" fillOpacity="0.95" />
        {/* Truck Front Cab */}
        <path d="M22 17H27L30 21V26H22V17Z" fill="#FFFFFF" />
        {/* Windshield cutout */}
        <path d="M23 18.5H26.2L28.5 21.5H23V18.5Z" fill="#2563EB" />
        
        {/* Wheels */}
        <circle cx="12" cy="26" r="2.5" fill="#0F172A" />
        <circle cx="12" cy="26" r="1.2" fill="#FFFFFF" />
        <circle cx="26" cy="26" r="2.5" fill="#0F172A" />
        <circle cx="26" cy="26" r="1.2" fill="#FFFFFF" />

        {/* Turnaround Dynamic Arrow Curve on top */}
        <path
          d="M 9 10 C 9 7.5 11 6 14 6 L 27 6"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M 25 3.5 L 29.5 6 L 25 8.5"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className={`${textSize} font-bold tracking-tight text-white leading-none`}>
            Turnaround
          </span>
          <span className="text-[10px] text-[#60A5FA] font-medium tracking-wide mt-0.5">
            Fleet Operations
          </span>
        </div>
      )}
    </div>
  );
};
