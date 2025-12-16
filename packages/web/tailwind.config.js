/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
  plugins: [require('@tailwindcss/typography')],
};
