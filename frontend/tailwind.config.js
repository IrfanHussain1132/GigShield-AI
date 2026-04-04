import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

export default {
  content: [
    "./index.html",
    "./admin.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-background": "#1b1c1c",
        "inverse-surface": "#303030",
        "primary": "#005e52",
        "tertiary-fixed-dim": "#88d982",
        "on-surface": "#1b1c1c",
        "surface": "#fcf9f8",
        "on-tertiary": "#ffffff",
        "outline-variant": "#bdc9c5",
        "secondary-fixed-dim": "#ffba38",
        "surface-container-low": "#f6f3f2",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-fixed": "#002204",
        "on-primary-fixed": "#00201b",
        "on-tertiary-fixed-variant": "#005312",
        "surface-variant": "#e5e2e1",
        "on-secondary-fixed-variant": "#604100",
        "on-error": "#ffffff",
        "surface-bright": "#fcf9f8",
        "surface-dim": "#dcd9d9",
        "error-container": "#ffdad6",
        "on-surface-variant": "#3e4946",
        "on-primary": "#ffffff",
        "tertiary-container": "#2b7a2f",
        "outline": "#6e7a76",
        "on-primary-fixed-variant": "#005046",
        "primary-fixed-dim": "#84d5c5",
        "secondary-fixed": "#ffdeac",
        "surface-container-highest": "#e5e2e1",
        "on-error-container": "#93000a",
        "secondary-container": "#feb300",
        "on-secondary-container": "#6a4800",
        "on-secondary-fixed": "#281900",
        "surface-container": "#f0eded",
        "error": "#ba1a1a",
        "inverse-primary": "#84d5c5",
        "surface-tint": "#046b5e",
        "tertiary-fixed": "#a3f69c",
        "surface-container-high": "#eae7e7",
        "on-primary-container": "#aafdec",
        "inverse-on-surface": "#f3f0ef",
        "on-secondary": "#ffffff",
        "secondary": "#7e5700",
        "on-tertiary-container": "#b5ffad",
        "tertiary": "#086019",
        "background": "#fcf9f8",
        "primary-container": "#1f786a",
        "primary-fixed": "#a0f2e1"
      },
      fontFamily: {
        "headline": ["Plus Jakarta Sans", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"],
        "noto": ["Noto Sans", "sans-serif"]
      },
      borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "1.5rem", "2xl": "2rem", "full": "9999px"}
    }
  },
  plugins: [
    forms,
    containerQueries
  ],
}
