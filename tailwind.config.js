/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				// LP用カラーパレット
				background: '#1f1c1a',      // 深めブラウン
				foreground: '#fefefe',      // 優しい白
				accent: '#fb923c',          // orange-400（椅子とマッチ）
				highlight: '#16a34a',       // emerald-600（安心感）
				border: '#3f3f46',          // neutral-700（境界）
			},
			fontFamily: {
				sans: ['Noto Sans JP', 'sans-serif'],
			},
			borderRadius: {
				'2xl': '1rem',
				'3xl': '1.5rem',
			},
			boxShadow: {
				soft: '0 4px 14px 0 rgba(0, 0, 0, 0.1)',
			},
			// Real Viewport Height のカスタムユーティリティを追加
			height: {
				'real-screen': 'calc(var(--vh, 1vh) * 100)',
				'real-screen-90': 'calc(var(--vh, 1vh) * 90)',
				'real-screen-80': 'calc(var(--vh, 1vh) * 80)',
				'real-screen-70': 'calc(var(--vh, 1vh) * 70)',
				'real-screen-60': 'calc(var(--vh, 1vh) * 60)',
				'real-screen-50': 'calc(var(--vh, 1vh) * 50)',
			},
			minHeight: {
				'real-screen': 'calc(var(--vh, 1vh) * 100)',
				'real-screen-90': 'calc(var(--vh, 1vh) * 90)',
				'real-screen-80': 'calc(var(--vh, 1vh) * 80)',
				'real-screen-70': 'calc(var(--vh, 1vh) * 70)',
				'real-screen-60': 'calc(var(--vh, 1vh) * 60)',
				'real-screen-50': 'calc(var(--vh, 1vh) * 50)',
			},
			maxHeight: {
				'real-screen': 'calc(var(--vh, 1vh) * 100)',
				'real-screen-90': 'calc(var(--vh, 1vh) * 90)',
				'real-screen-80': 'calc(var(--vh, 1vh) * 80)',
			},
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
	],
}