/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          lavender: "#D9C7FF",
          purple: "#B9A0F5",
          pink: "#FFD9E8",
          babypink: "#FFF0F6",
          milky: "#FFFCFF",
          deep: "#655080",
          blue: "#DCEBFF",
          yellow: "#FFF1B8",
          green: "#D8F5E5",
        },
      },
      fontFamily: {
        thai: ["'IBM Plex Sans Thai'", "'Noto Sans Thai'", "sans-serif"],
        magic: ["'Cinzel'", "'Playfair Display'", "'IBM Plex Sans Thai'", "serif"],
      },
      animation: {
        'sparkle-slow': 'sparkle 4s ease-in-out infinite',
        'float-slow': 'float 5s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.9) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.1) rotate(15deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
};
