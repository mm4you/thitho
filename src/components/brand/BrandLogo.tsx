"use client";

import React from "react";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

export function BrandLogo({ size = "md", showWordmark = true, className = "" }: BrandLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const titleSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const subSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-sm",
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Biểu Tượng Vòng Nguyệt Quế & Ngọn Lửa Hoàng Kim SVG */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-sm flex items-center justify-center shrink-0`}
      >
        <div className="w-full h-full rounded-[10px] bg-[#070a12] flex items-center justify-center p-1">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            {/* Vòng Tròn Viền Vàng */}
            <circle cx="50" cy="50" r="44" stroke="url(#goldGrad)" strokeWidth="3.5" />

            {/* Vòng Nguyệt Quế Tinh Tế (Trái) */}
            <path
              d="M 28 68 C 22 55, 23 38, 36 26 C 36 34, 33 46, 38 56 C 40 60, 43 64, 46 68 C 39 68, 33 69, 28 68 Z"
              fill="url(#goldGrad)"
              opacity="0.9"
            />
            {/* Vòng Nguyệt Quế Tinh Tế (Phải) */}
            <path
              d="M 72 68 C 78 55, 77 38, 64 26 C 64 34, 67 46, 62 56 C 60 60, 57 64, 54 68 C 61 68, 67 69, 72 68 Z"
              fill="url(#goldGrad)"
              opacity="0.9"
            />

            {/* Ngọn Lửa Tri Thức Ở Trung Tâm */}
            <path
              d="M 50 25 C 53 38, 64 45, 60 62 C 57 70, 52 74, 50 74 C 48 74, 43 70, 40 62 C 36 45, 47 38, 50 25 Z"
              fill="url(#fireGrad)"
            />
            {/* Tim Lửa Sáng */}
            <path
              d="M 50 46 C 53 52, 56 56, 54 64 C 52 68, 50 70, 50 70 C 50 70, 48 68, 46 64 C 44 56, 47 52, 50 46 Z"
              fill="#fef08a"
            />

            {/* Gradient Định Nghĩa */}
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fbbf24" />
                <stop offset="0.5" stopColor="#f59e0b" />
                <stop offset="1" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="fireGrad" x1="50" y1="25" x2="50" y2="74" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef08a" />
                <stop offset="0.4" stopColor="#f59e0b" />
                <stop offset="1" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Wordmark Chữ */}
      {showWordmark && (
        <div className="leading-tight">
          <div className={`${titleSizes[size]} font-bold tracking-tight text-white uppercase`}>
            OLYM<span className="text-amber-400">QUIZ</span>
          </div>
          <div className={`${subSizes[size]} font-semibold tracking-wider text-slate-400 uppercase`}>
            ĐẤU TRÍ ARENA
          </div>
        </div>
      )}
    </div>
  );
}

export default BrandLogo;