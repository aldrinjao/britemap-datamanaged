import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verification state palette
        state: {
          submitted: '#EAB308',
          under_review: '#3B82F6',
          returned: '#F97316',
          approved: '#22C55E',
          abandoned: '#6B7280',
        },
      },
    },
  },
  plugins: [],
}

export default config
