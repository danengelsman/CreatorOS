import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Layered Surfaces
        'surface-1': '#050507',
        'surface-2': '#0a0a0f',
        'surface-3': '#12121a',
        'surface-glass': 'rgba(18,18,26,0.7)',

        // Accent System
        accent: '#F4A261',
        'accent-soft': 'rgba(244,162,97,0.15)',
        'accent-glow': 'rgba(244,162,97,0.08)',
        'accent-edge': 'rgba(244,162,97,0.3)',

        // Semantic
        'system-green': '#8faa6e',
        'system-orange': '#d89b5c',
        'system-red': '#c5644a',

        // Text
        'label-primary': '#ffffff',
        'label-secondary': 'rgba(255,255,255,0.7)',
        'label-tertiary': 'rgba(255,255,255,0.4)',
        separator: 'rgba(255,255,255,0.12)',
      },
      borderRadius: {
        'sm': '10px',
        'md': '14px',
        'lg': '20px',
        'xl': '28px',
        '2xl': '36px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      fontSize: {
        'xs': '11px',
        'sm': '13px',
        'base': '15px',
        'lg': '17px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
        '5xl': '44px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0,0,0,0.3)',
        'medium': '0 8px 24px rgba(0,0,0,0.4)',
        'strong': '0 16px 48px rgba(0,0,0,0.5)',
        'glow': '0 0 24px rgba(244,162,97,0.15)',
        'accent-edge': 'inset 0 1px 0 rgba(244,162,97,0.3), 0 8px 24px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '20px',
        'xl': '32px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;