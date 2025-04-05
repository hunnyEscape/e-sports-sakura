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
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
	],
}