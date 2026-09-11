/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#536500",
        "on-primary": "#ffffff",
        "primary-container": "#aacc00",
        "on-primary-container": "#445300",
        "secondary": "#8429c8",
        "secondary-container": "#9e49e3",
        "on-secondary-container": "#fffbff",
        "tertiary": "#785a00",
        "tertiary-container": "#e5b951",
        "on-tertiary-container": "#634900",
        "surface": "#fcf9f8",
        "on-surface": "#1c1b1b",
        "surface-variant": "#e5e2e1",
        "on-surface-variant": "#454934",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f6f3f2",
        "surface-container": "#f0eded",
        "surface-container-high": "#eae7e7",
        "surface-container-highest": "#e5e2e1",
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
      },
      spacing: {
        "card-padding": "24px",
        "stack-gap-md": "16px",
        "grid-margin": "24px",
        "stack-gap-sm": "8px",
        "grid-gutter": "16px",
        "stack-gap-lg": "32px",
      },
      fontFamily: {
        "body-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "label-bold": ["Plus Jakarta Sans", "sans-serif"],
        "label-sm": ["Plus Jakarta Sans", "sans-serif"],
      }
    },
  },
  plugins: [],
}