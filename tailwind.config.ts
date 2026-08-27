import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        olympia: {
          dark: "#0B132B",
          navy: "#1C2541",
          blue: "#3A86FF",
          gold: "#FFD166",
          green: "#06D6A0",
          red: "#EF476F",
          purple: "#7209B7"
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'flip': 'flip 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(58, 134, 255, 0.4), inset 0 0 15px rgba(58, 134, 255, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(58, 134, 255, 0.8), inset 0 0 25px rgba(58, 134, 255, 0.5)' },
        },
        flip: {
          '0%': { transform: 'rotateX(90deg)', opacity: '0' },
          '100%': { transform: 'rotateX(0deg)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
