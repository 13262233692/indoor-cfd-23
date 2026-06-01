/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'cfd-bg': 'var(--bg-primary)',
        'cfd-bg-secondary': 'var(--bg-secondary)',
        'cfd-bg-tertiary': 'var(--bg-tertiary)',
        'cfd-accent': 'var(--accent-primary)',
        'cfd-accent-secondary': 'var(--accent-secondary)',
        'cfd-supply': 'var(--supply)',
        'cfd-return': 'var(--return)',
        'cfd-text': 'var(--text-primary)',
        'cfd-text-secondary': 'var(--text-secondary)',
        'cfd-text-muted': 'var(--text-muted)',
        'cfd-border': 'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
