/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn/ui 标准颜色
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // 应用专用颜色
        surface: {
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
          sunken: 'var(--surface-sunken)',
        },
        'text-color': {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          disabled: 'var(--text-disabled)',
        },
        status: {
          success: 'var(--success)',
          'success-emphasis': 'var(--success-emphasis)',
          warning: 'var(--warning)',
          'warning-emphasis': 'var(--warning-emphasis)',
          danger: 'var(--danger)',
          'danger-emphasis': 'var(--danger-emphasis)',
          info: 'var(--info)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      typography: {
        invert: {
          css: {
            '--tw-prose-body': '#c9d1d9',
            '--tw-prose-headings': '#f0f6fc',
            '--tw-prose-lead': '#8b949e',
            '--tw-prose-links': '#58a6ff',
            '--tw-prose-bold': '#f0f6fc',
            '--tw-prose-counters': '#8b949e',
            '--tw-prose-bullets': '#8b949e',
            '--tw-prose-hr': '#30363d',
            '--tw-prose-quotes': '#c9d1d9',
            '--tw-prose-quote-borders': '#30363d',
            '--tw-prose-captions': '#8b949e',
            '--tw-prose-code': '#f0f6fc',
            '--tw-prose-pre-code': '#c9d1d9',
            '--tw-prose-pre-bg': '#161b22',
            '--tw-prose-th-borders': '#30363d',
            '--tw-prose-td-borders': '#21262d',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
};
