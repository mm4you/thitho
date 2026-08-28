"use client";

import React from "react";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

export function BrandLogo({ size = "md", showWordmark = true, className = "" }: BrandLogoProps) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  const titleSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-3xl",
  };

  const subSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-sm",
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Biểu Tượng Cyber Crown & Vector Spark Sắc Nét */}
      <div
        className={`${iconSizes[size]} rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-600 p-[1.5px] shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0`}
      >
        <div className="w-full h-full rounded-[14px] bg-[#05070e] flex items-center justify-center p-2">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            {/* Khối Đa Giác Kim Cương Sắc Lạnh */}
            <polygon
              points="50,15 85,35 85,65 50,85 15,65 15,35"
              stroke="url(#cyberGrad)"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Lõi Vương Miện & Ngôi Sao Năng Lượng */}
            <path
              d="M 32 60 L 38 40 L 50 50 L 62 40 L 68 60 Z"
              fill="url(#coreGrad)"
            />
            <circle cx="50" cy="30" r="4" fill="#38bdf8" />
            <circle cx="35" cy="34" r="3" fill="#818cf8" />
            <circle cx="65" cy="34" r="3" fill="#818cf8" />

            <defs>
              <linearGradient id="cyberGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="0.5" stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="coreGrad" x1="50" y1="40" x2="50" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Wordmark Chữ Tối Giản Hiện Đại */}
      {showWordmark && (
        <div className="leading-tight">
          <div className={`${titleSizes[size]} font-black tracking-tight text-white uppercase`}>
            OLYM<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">QUIZ</span>
          </div>
          <div className={`${subSizes[size]} font-mono font-bold tracking-[0.25em] text-slate-400 uppercase`}>
            ARENA 2.5
          </div>
        </div>
      )}
    </div>
  );
}

export default BrandLogo;
