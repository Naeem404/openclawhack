import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        goat: {
          gold: "#FFB400",
          dark: "#0A0A0B",
          panel: "#111114",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,180,0,0.4), 0 8px 32px -8px rgba(255,180,0,0.25)",
      },
      animation: {
        "pulse-gold": "pulse-gold 1.6s ease-in-out infinite",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,180,0,0.5)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(255,180,0,0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
