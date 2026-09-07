/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          2: "var(--color-surface2)",
          3: "var(--color-surface3, var(--color-surface))",
        },
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          "on-accent": "var(--color-text-on-accent)",
        },
        accent: "var(--color-accent)",
        primary: "var(--color-primary)",
        border: {
          DEFAULT: "var(--color-border)",
          light: "var(--color-border-light)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
      },
      zIndex: {
        dropdown: "10",
        sticky: "30",
        modal: "50",
        submodal: "60",
        banner: "70",
        alert: "90",
        toast: "100",
        notification: "110",
        "calendar-modal": "200",
        search: "300",
        tour: "999",
      },
      borderRadius: {
        ds: "var(--radius-ds-sm, 0.75rem)",
      },
      spacing: {
        "card-padding": "var(--card-padding, 1rem)",
        "card-gap": "var(--card-gap, 0.75rem)",
      },
      height: {
        input: "var(--input-height, 2.5rem)",
        button: "var(--button-height, 2.5rem)",
      },
      fontSize: {
        "ds-xs": "var(--font-size-ds-xs, 0.75rem)",
        "ds-sm": "var(--font-size-ds-sm, 0.875rem)",
        "ds-base": "var(--font-size-ds-base, 1rem)",
      },
      boxShadow: {
        ds: "var(--shadow-sm)",
        "ds-md": "var(--shadow-md)",
        "ds-lg": "var(--shadow-lg)",
      },
      transitionDuration: {
        instant: "var(--duration-instant, 0.075s)",
        fast: "var(--duration-fast, 0.12s)",
        normal: "var(--duration-normal, 0.18s)",
        medium: "var(--duration-medium, 0.25s)",
        slow: "var(--duration-slow, 0.35s)",
        slower: "var(--duration-slower, 0.5s)",
      },
      transitionTimingFunction: {
        "ease-out": "var(--ease-out)",
        "ease-in": "var(--ease-in)",
        "ease-standard": "var(--ease-standard)",
        "ease-bounce": "var(--ease-bounce)",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
