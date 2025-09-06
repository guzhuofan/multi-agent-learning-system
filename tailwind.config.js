/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // 主色调：白色和灰黑色系
        primary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Agent相关色彩
        agent: {
          main: "#3b82f6",
          branch: "#10b981",
          hover: "#1d4ed8",
        },
        // 消息气泡色彩
        message: {
          user: "#f3f4f6",
          assistant: "#ffffff",
          border: "#e5e7eb",
        },
        // 分支树色彩
        tree: {
          node: "#6366f1",
          edge: "#d1d5db",
          active: "#4f46e5",
        },
      },
      fontFamily: {
        // 中文使用思源宋体，英文使用Merriweather
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Noto Sans",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        serif: ["Merriweather", "Noto Serif SC", "serif"],
      },
      fontSize: {
        // 主要字号16px，标题20px
        base: "16px",
        title: "20px",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      borderRadius: {
        "xl": "1rem",
        "2xl": "1.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
