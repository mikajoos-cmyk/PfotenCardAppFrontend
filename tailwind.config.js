/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--color-border))",
        input: "hsl(var(--color-input))",
        ring: "hsl(var(--color-ring))",
        background: "hsl(var(--color-background))",
        foreground: "hsl(var(--color-foreground))",
        primary: {
          DEFAULT: "hsl(var(--color-primary))",
          foreground: "hsl(var(--color-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--color-secondary))",
          foreground: "hsl(var(--color-secondary-foreground))",
        },
        tertiary: {
          DEFAULT: "hsl(var(--color-tertiary))",
          foreground: "hsl(var(--color-tertiary-foreground))",
        },
        neutral: {
          DEFAULT: "hsl(var(--color-neutral))",
          foreground: "hsl(var(--color-neutral-foreground))",
        },
        success: "hsl(var(--color-success))",
        warning: "hsl(var(--color-warning))",
        accent: {
          DEFAULT: "hsl(var(--color-accent))",
          foreground: "hsl(var(--color-accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--color-muted))",
          foreground: "hsl(var(--color-muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--color-destructive))",
          foreground: "hsl(var(--color-destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--color-popover))",
          foreground: "hsl(var(--color-popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--color-card))",
          foreground: "hsl(var(--color-card-foreground))",
        },
        gray: {
          50: "hsl(0, 0%, 98%)",
          100: "hsl(210, 10%, 95%)",
          200: "hsl(210, 10%, 90%)",
          300: "hsl(210, 8%, 80%)",
          400: "hsl(210, 6%, 60%)",
          500: "hsl(210, 5%, 45%)",
          600: "hsl(210, 6%, 35%)",
          700: "hsl(210, 8%, 25%)",
          800: "hsl(210, 10%, 15%)",
          900: "hsl(220, 15%, 8%)",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
      },
      spacing: {
        '4': '1rem',
        '8': '2rem',
        '12': '3rem',
        '16': '4rem',
        '24': '6rem',
        '32': '8rem',
        '48': '12rem',
        '64': '16rem',
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      backgroundImage: {
        'gradient-1': 'linear-gradient(135deg, hsl(142, 72%, 45%) 0%, hsl(142, 35%, 35%) 100%)',
        'gradient-2': 'linear-gradient(135deg, hsl(216, 80%, 35%) 0%, hsl(216, 60%, 28%) 100%)',
        'button-border-gradient': 'linear-gradient(90deg, hsl(24, 92%, 58%) 0%, hsl(142, 72%, 45%) 100%)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
