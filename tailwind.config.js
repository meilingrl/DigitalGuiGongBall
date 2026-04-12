/** @type {import('tailwindcss').Config} */
export default {
  /** 与 document.documentElement.classList.toggle('dark') 一致，兼容性最好 */
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        mist: '#e2e8f0',
        jade: '#0f766e',
        paper: '#f8fafc',
        slatebg: '#e2e8f0',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        display: ['"Noto Serif SC"', '"Noto Sans SC"', 'Songti SC', 'SimSun', 'serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      // 流体字号刻度：clamp(min, preferred, max)，随视口宽度线性缩放
      fontSize: {
        'fluid-xs':   ['clamp(0.75rem,  0.70rem + 0.25vw, 0.875rem)', { lineHeight: '1.5' }],
        'fluid-sm':   ['clamp(0.875rem, 0.82rem + 0.28vw, 1rem)',     { lineHeight: '1.5' }],
        'fluid-base': ['clamp(1rem,     0.92rem + 0.40vw, 1.125rem)', { lineHeight: '1.6' }],
        'fluid-lg':   ['clamp(1.125rem, 1.00rem + 0.63vw, 1.375rem)', { lineHeight: '1.4' }],
        'fluid-xl':   ['clamp(1.25rem,  1.08rem + 0.84vw, 1.75rem)',  { lineHeight: '1.3' }],
        'fluid-2xl':  ['clamp(1.5rem,   1.20rem + 1.50vw, 2.25rem)',  { lineHeight: '1.2' }],
        'fluid-3xl':  ['clamp(1.875rem, 1.40rem + 2.40vw, 3rem)',     { lineHeight: '1.1' }],
      },
      // 流体间距刻度：供 padding / margin / gap 使用
      spacing: {
        'fluid-xs':  'clamp(0.25rem, 0.20rem + 0.25vw, 0.5rem)',
        'fluid-sm':  'clamp(0.5rem,  0.40rem + 0.50vw, 0.75rem)',
        'fluid-md':  'clamp(1rem,    0.80rem + 1.00vw, 1.5rem)',
        'fluid-lg':  'clamp(1.5rem,  1.20rem + 1.50vw, 2.5rem)',
        'fluid-xl':  'clamp(2rem,    1.50rem + 2.50vw, 4rem)',
        'fluid-2xl': 'clamp(3rem,    2.00rem + 5.00vw, 6rem)',
      },
    },
  },
  plugins: [],
}

