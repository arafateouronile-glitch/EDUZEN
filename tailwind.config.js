/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: false, // Mode sombre désactivé - application en mode clair uniquement
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        'space-grotesk': ['Space Grotesk', 'var(--font-sans)', 'sans-serif'],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '-0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '-0.01em' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.011em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.012em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.018em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.022em' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.025em' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
      },
      letterSpacing: {
        tightest: '-0.08em',
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '-0.011em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
        luxe: '-0.06em',
      },
      lineHeight: {
        tightest: '0.85',
        tighter: '0.9',
        tight: '0.95',
        snug: '1.1',
        relaxed: '1.4',
        loose: '1.6',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Couleur Majeure - Deep Blue #274472 (Dominance 60%)
        'brand-blue': {
          DEFAULT: '#274472', // La couleur principale
          dark: '#1d3556',    // Version plus sombre pour le hover
          darker: '#15263f',  // Version encore plus sombre pour le active
          light: '#3b5c8a',   // Version plus claire
          lighter: '#4f749d', // Version encore plus claire
          pale: '#d1d9e2',    // Version pâle pour les fonds
          ghost: '#e8ecf0',   // Version quasi-blanche
        },
        'brand-zen': {
          DEFAULT: '#274472',
          50: '#e8ecf0',
          100: '#d1d9e2',
          200: '#a3b3c5',
          300: '#758da8',
          400: '#47678b',
          500: '#274472', // Main
          600: '#1f3658',
          700: '#17283f',
          800: '#0f1a26',
          900: '#080c13',
        },
        // Cyan Vibrant - Sky Blue #34B9EE (Secondaire 25-30%)
        'brand-cyan': {
          DEFAULT: '#34B9EE',
          dark: '#2A95BF',
          darker: '#1F7190',
          light: '#5CCBF3',
          lighter: '#8DDBF7',
          pale: '#BFEAFB',
          ghost: '#E5F6FD',
        },
        // Purple accent pour variations
        'brand-purple': {
          DEFAULT: '#8B5CF6',
          dark: '#7C3AED',
          darker: '#6D28D9',
          light: '#A78BFA',
          lighter: '#C4B5FD',
          pale: '#EDE9FE',
          ghost: '#F5F3FF',
        },
        // Primary alias pour compatibilité
        primary: {
          DEFAULT: '#274472', // Updated to Deep Blue
          dark: '#1d3556',
          darker: '#15263f',
          light: '#3b5c8a',
          lighter: '#4f749d',
          pale: '#d1d9e2',
          ghost: '#e8ecf0',
          foreground: '#FFFFFF',
        },
        // Secondary alias pour compatibilité
        secondary: {
          DEFAULT: '#34B9EE',
          dark: '#2A95BF',
          darker: '#1F7190',
          light: '#5CCBF3',
          lighter: '#8DDBF7',
          pale: '#BFEAFB',
          ghost: '#E5F6FD',
          foreground: '#FFFFFF',
        },
        // Success - Bleu (statuts positifs, sans vert)
        success: {
          DEFAULT: '#335ACF',
          bg: '#E0E7FF',
          border: '#A5B4FC',
          foreground: '#FFFFFF',
        },
        // Danger - Rouge (Statuts uniquement)
        danger: {
          DEFAULT: '#EF4444',
          bg: '#FEE2E2',
          border: '#FCA5A5',
          foreground: '#FFFFFF',
        },
        // Warning - Cyan (avertissement, sans jaune)
        warning: {
          DEFAULT: '#34B9EE',
          bg: '#E0F2FE',
          border: '#BAE6FD',
          foreground: '#FFFFFF',
        },
        // Textes - Noir uniquement
        text: {
          primary: '#000000',
          secondary: '#1A1A1A',
          tertiary: '#4D4D4D',
          disabled: '#999999',
          placeholder: '#B3B3B3',
          'on-blue': '#FFFFFF',
          'on-cyan': '#FFFFFF',
        },
        // Backgrounds - Gris clair et blanc
        bg: {
          white: '#FFFFFF',
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
          },
        },
        // Legacy support
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'premium': 'var(--shadow-premium)',
        'glow': 'var(--shadow-glow)',
        'ultra': 'var(--shadow-ultra)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.4)',
        'glow-xl': '0 0 60px rgba(99, 102, 241, 0.5)',
        'inner-glow': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #335ACF 0%, #34B9EE 100%)',
        'gradient-brand-vertical': 'linear-gradient(180deg, #335ACF 0%, #34B9EE 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, #5C7DD9 0%, #5CCBF3 100%)',
        'gradient-brand-diagonal': 'linear-gradient(45deg, #335ACF 0%, #34B9EE 100%)',
        'gradient-brand-radial': 'radial-gradient(circle, #335ACF 0%, #34B9EE 100%)',
        'gradient-brand-overlay': 'linear-gradient(135deg, rgba(51,90,207,0.95) 0%, rgba(52,185,238,0.95) 100%)',
        'gradient-brand-subtle': 'linear-gradient(135deg, rgba(51,90,207,0.1) 0%, rgba(52,185,238,0.1) 100%)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
        '192': '48rem',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.16, 1, 0.3, 1)', // Apple's signature easing
        'smooth': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'premium': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: 0, transform: 'translateX(20px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-premium': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.8, transform: 'scale(1.02)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: 0.5, transform: 'scale(1)' },
          '50%': { opacity: 0.8, transform: 'scale(1.05)' },
        },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(40px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: 0, transform: 'translateY(-40px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'zoom-in': {
          from: { opacity: 0, transform: 'scale(0.8)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        'rotate-in': {
          from: { opacity: 0, transform: 'rotate(-10deg) scale(0.9)' },
          to: { opacity: 1, transform: 'rotate(0deg) scale(1)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'gradient-y': {
          '0%, 100%': { backgroundPosition: '50% 0%' },
          '50%': { backgroundPosition: '50% 100%' },
        },
        'gradient-xy': {
          '0%, 100%': { backgroundPosition: '0% 0%' },
          '25%': { backgroundPosition: '100% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '75%': { backgroundPosition: '0% 100%' },
        },
        'wave': {
          '0%, 100%': { transform: 'translateX(0) translateY(0)' },
          '25%': { transform: 'translateX(5px) translateY(-5px)' },
          '50%': { transform: 'translateX(0) translateY(-10px)' },
          '75%': { transform: 'translateX(-5px) translateY(-5px)' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: 1 },
          '75%, 100%': { transform: 'scale(1.5)', opacity: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-in-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-premium': 'pulse-premium 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'zoom-in': 'zoom-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'rotate-in': 'rotate-in 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'gradient-x': 'gradient-x 4s ease infinite',
        'gradient-y': 'gradient-y 4s ease infinite',
        'gradient-xy': 'gradient-xy 8s ease infinite',
        'wave': 'wave 3s ease-in-out infinite',
        'bounce-slow': 'bounce-slow 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'ping-slow': 'ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      boxShadow: {
        'premium': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'glow': '0 10px 40px -10px rgba(37, 99, 235, 0.3)',
        'glow-lg': '0 0 30px rgba(37, 99, 235, 0.4)',
        'glow-xl': '0 0 50px rgba(37, 99, 235, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(37, 99, 235, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transform: {
        '3d-perspective': 'perspective(1000px) rotateX(5deg) rotateY(-5deg)',
        '3d-perspective-reverse': 'perspective(1000px) rotateX(-5deg) rotateY(5deg)',
      },
      perspective: {
        1000: '1000px',
        2000: '2000px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}


