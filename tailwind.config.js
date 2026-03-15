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
        border: "hsl(210, 10%, 90%)",
        input: "hsl(210, 10%, 90%)",
        ring: "hsl(142, 72%, 45%)",
        background: "hsl(0, 0%, 100%)",
        foreground: "hsl(210, 10%, 20%)",
        primary: {
          DEFAULT: "hsl(142, 72%, 45%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        secondary: {
          DEFAULT: "hsl(142, 35%, 35%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        tertiary: {
          DEFAULT: "hsl(216, 80%, 35%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        neutral: {
          DEFAULT: "hsl(0, 0%, 98%)",
          foreground: "hsl(210, 10%, 20%)",
        },
        success: "hsl(142, 72%, 35%)",
        warning: "hsl(24, 92%, 50%)",
        accent: {
          DEFAULT: "hsl(24, 92%, 58%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        muted: {
          DEFAULT: "hsl(210, 10%, 95%)",
          foreground: "hsl(210, 6%, 35%)",
        },
        destructive: {
          DEFAULT: "hsl(0, 84%, 60%)",
          foreground: "hsl(0, 0%, 100%)",
        },
        popover: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(210, 10%, 20%)",
        },
        card: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(210, 10%, 20%)",
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
