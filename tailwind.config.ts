import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sri Lankan tea inspired palette
        tea: {
          50: "#f4f7f0",
          100: "#e3ecd8",
          200: "#c7d9b4",
          300: "#a3c085",
          400: "#7fa65c",
          500: "#5f8a3f",
          600: "#496d2f",
          700: "#395427",
          800: "#2f4322",
          900: "#28391f",
          950: "#131f0e",
        },
        gold: {
          400: "#e2b857",
          500: "#d4a437",
          600: "#b5872a",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
