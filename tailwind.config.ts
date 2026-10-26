import type { Config } from "tailwindcss";

// Theme taken from the chalkboard-cafe reference photo:
// black chalkboard wall, butter-yellow hanging flowers, teal velvet chairs, warm wood table.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: { DEFAULT: "#17181a", soft: "#222426", line: "#34373a" },
        chalk: { DEFAULT: "#f4efe4", dim: "#b9b4a8", pink: "#e86aa5", green: "#5fd1a0", orange: "#f08a3c" },
        bloom: { DEFAULT: "#f2c230", deep: "#d9a514" },
        teal: { velvet: "#2f6f6a", light: "#4a9a93" },
        wood: { DEFAULT: "#c98a3d", dark: "#6b3f22" },
      },
      fontFamily: {
        chalk: ["var(--font-caveat)", "cursive"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "1.25rem" },
      boxShadow: { card: "0 10px 30px -12px rgba(0,0,0,.6)" },
    },
  },
  plugins: [],
} satisfies Config;
