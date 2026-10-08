/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        brand: 'var(--app-brand)',
        'app-bg': 'var(--app-bg)',
        'app-surface': 'var(--app-surface)',
        'app-border': 'var(--app-border)',
        'app-text': 'var(--app-text)',
        'app-muted': 'var(--app-muted)',
      }
    }
  },
  plugins: [],
}