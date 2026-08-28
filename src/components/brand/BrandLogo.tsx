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
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-sm",
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Biểu Tượng Vòng Nguyệt Quế & Ngọn Lửa Hoàng Kim SVG 4K */}
      <div
        className={`${iconSizes[size]} rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-600 p-[2px] shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0`}
      >
        <div className="w-full h-full rounded-[14px] bg-[#060a14] flex items-center justify-center p-1.5">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            {/* Vòng Tròn Viền Hào Quang */}
            <circle cx="50" cy="50" r="44" stroke="url(#goldGrad)" strokeWidth="3" strokeDasharray="3 3" opacity="0.6" />
            <circle cx="50" cy="50" r="39" stroke="url(#goldGrad)" strokeWidth="2" opacity="0.8" />

            {/* Vòng Nguyệt Quế Tinh Tế (Trái) */}
            <path
              d="M 28 68 C 22 55, 23 38, 36 26 C 36 34, 33 46, 38 56 C 40 60, 43 64, 46 68 C 39 68, 33 69, 28 68 Z"
              fill="url(#goldGrad)"
            />
            {/* Vòng Nguyệt Quế Tinh Tế (Phải) */}
            <path
              d="M 72 68 C 78 55, 77 38, 64 26 C 64 34, 67 46, 62 56 C 60 60, 57 64, 54 68 C 61 68, 67 69, 72 68 Z"
              fill="url(#goldGrad)"
            />

            {/* Ngọn Lửa Tri Thức Ở Trung Tâm */}
            <path
              d="M 50 24 C 53 37, 63 44, 59 62 C 56 70, 52 74, 50 74 C 48 74, 44 70, 41 62 C 37 44, 47 37, 50 24 Z"
              fill="url(#fireGrad)"
            />
            {/* Tim Lửa Sáng Rực */}
            <path
              d="M 50 44 C 53 50, 55 55, 53 63 C 52 67, 50 69, 50 69 C 50 69, 48 67, 47 63 C 45 55, 47 50, 50 44 Z"
              fill="#fef08a"
            />

            {/* Gradient Định Nghĩa */}
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef08a" />
                <stop offset="0.3" stopColor="#fbbf24" />
                <stop offset="0.7" stopColor="#f59e0b" />
                <stop offset="1" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="fireGrad" x1="50" y1="24" x2="50" y2="74" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef08a" />
                <stop offset="0.35" stopColor="#f59e0b" />
                <stop offset="1" stopColor="#dc2626" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Wordmark Chữ Chuẩn Broadcast */}
      {showWordmark && (
        <div className="leading-tight">
          <div className={`${titleSizes[size]} font-black tracking-tight text-white uppercase`}>
            OLYM<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">QUIZ</span>
          </div>
          <div className={`${subSizes[size]} font-extrabold tracking-[0.25em] text-slate-400 uppercase`}>
            ARENA BROADCAST
          </div>
        </div>
      )}
    </div>
  );
}

export default BrandLogo;
