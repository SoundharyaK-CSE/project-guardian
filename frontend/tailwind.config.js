/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0E17",
        panel: "#131725",
        panel2: "#1A1F32",
        line: "#262C42",
        signal: "#8B7CF6",   // violet — AI / understanding
        gold: "#F0B24A",     // amber — impact / risk
        teal: "#33D6C0",     // teal — health / alignment
        alert: "#F0654A",    // coral-red — critical drift
        ash: "#9AA3B8",      // muted text
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
