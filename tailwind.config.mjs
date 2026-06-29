/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic tokens — each maps to a CSS custom property defined in
        // src/styles/theme.css. Light defaults live under :root; dark
        // overrides live under .dark. Tailwind utilities like `bg-surface`,
        // `text-ink`, `border-line` etc. resolve through the vars so the
        // same class produces both themes.
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-elevated": "rgb(var(--color-surface-elevated) / <alpha-value>)",
        "surface-sunken": "rgb(var(--color-surface-sunken) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--color-ink-muted) / <alpha-value>)",
        "ink-subtle": "rgb(var(--color-ink-subtle) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        "line-strong": "rgb(var(--color-line-strong) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-emphasis": "rgb(var(--color-accent-emphasis) / <alpha-value>)",
        "accent-muted": "rgb(var(--color-accent-muted) / <alpha-value>)",
        "canvas-bg": "rgb(var(--color-canvas-bg) / <alpha-value>)",
        "axis-x": "rgb(var(--color-axis-x) / <alpha-value>)",
        "axis-y": "rgb(var(--color-axis-y) / <alpha-value>)",
        "axis-z": "rgb(var(--color-axis-z) / <alpha-value>)",
        "bloch-arrow": "rgb(var(--color-bloch-arrow) / <alpha-value>)",
        positive: "rgb(var(--color-positive) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
