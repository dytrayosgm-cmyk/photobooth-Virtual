/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        digi: {
          dark: "#0b0e14",
          surface: "#131722",
          card: "#1a1f2c",
          border: "#283042",
          pink: "#ec4899",
          magenta: "#f43f5e",
          amber: "#f59e0b",
          cyan: "#06b6d4",
          green: "#10b981",
          text: "#f1f5f9",
          muted: "#94a3b8"
        }
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'Share Tech Mono'", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};
