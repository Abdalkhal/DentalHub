/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
        },
        background: "#E6F0FF",
        card: "#FFFFFF",
        border: "#E2E8F0",
        muted: "#F1F5F9",
      },
    },
  },
  plugins: [],
};
