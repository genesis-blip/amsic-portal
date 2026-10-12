export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF3F2', 100: '#FCE4E4', 200: '#F8C9C9', 300: '#F29C9C', 400: '#E85A5A',
          500: '#DC2626', 600: '#C21E1E', 700: '#A11A1A', 800: '#7F1515', 900: '#5C0F0F',
        },
        ink: { DEFAULT: '#231B17', soft: '#4A3F38', muted: '#75685F', faint: '#A3968C' },
        paper: { DEFAULT: '#FBF7F0', raised: '#FFFFFF', line: '#EADFD1', rule: '#F3EBDF' },
        seal: { DEFAULT: '#B4161B', soft: '#FDE8E8', dark: '#8A0F13' },
        leaf: { DEFAULT: '#2E7D4F', soft: '#E7F3EB', dark: '#1F5C39' },
        stamp: { DEFAULT: '#2446C7', soft: '#E7ECFB', dark: '#1A3496' },
        maroon: { DEFAULT: '#8C1D1D', 100: '#FBE4E4' },
        gold: { DEFAULT: '#AB7A22', 100: '#F3E6C8' },
        sunflower: { DEFAULT: '#E8A317', soft: '#FDF3DC', dark: '#8A5F07' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: { panel: '14px', control: '10px' },
      boxShadow: {
        panel: '0 1px 0 rgba(35,27,23,0.04), 0 8px 24px -16px rgba(127,21,21,0.22)',
        lift: '0 18px 40px -20px rgba(127,21,21,0.40)',
      },
      fontSize: {
        'display-xl': ['3.25rem', { lineHeight: '1.04', letterSpacing: '-0.02em' }],
        'display-lg': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        'display-md': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
    },
  },
  plugins: [],
};
