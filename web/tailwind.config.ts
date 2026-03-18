import type { Config } from "tailwindcss";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { heroui } = require("@heroui/react");

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        surface: {
          DEFAULT: "#1a1a1a",
          50: "#0a0a0a",
          100: "#141414",
          200: "#1a1a1a",
          300: "#262626",
          400: "#333333",
          500: "#404040",
        },

        accent: {
          DEFAULT: "#E53935",
          light: "#FF6F61",
          dark: "#B71C1C",
        },

        live: "#E53935",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        dark: {
          colors: {
            primary: "#E53935",
            secondary: "#FF6F61",
          },
        },
      },
    }),
  ],
} satisfies Config;
