const withPWA = require('next-pwa')({
	dest: 'public',
	disable: process.env.NODE_ENV === 'development',
	register: true,
	skipWaiting: true,

	// オフラインフォールバックページ
	fallbacks: {
		document: '/offline.html',
	},

	// カスタムワーカー設定
	runtimeCaching: [
		{
			urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
			handler: 'CacheFirst',
			options: {
				cacheName: 'google-fonts',
				expiration: {
					maxEntries: 30,
					maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
				},
			},
		},
		{
			urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
			handler: 'CacheFirst',
			options: {
				cacheName: 'static-font-assets',
				expiration: {
					maxEntries: 30,
					maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
				},
			},
		},
		{
			urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico)$/i,
			handler: 'CacheFirst',
			options: {
				cacheName: 'static-image-assets',
				expiration: {
					maxEntries: 30,
					maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
				},
			},
		},
		{
			urlPattern: /\/_next\/image\?url=.+$/i,
			handler: 'CacheFirst',
			options: {
				cacheName: 'next-image',
				expiration: {
					maxEntries: 30,
					maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
				},
			},
		},
		{
			urlPattern: /\.(?:mp3|wav|ogg)$/i,
			handler: 'CacheFirst',
			options: {
				cacheName: 'static-audio-assets',
				expiration: {
					maxEntries: 30,
					maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
				},
			},
		},
		{
			urlPattern: /\.(?:js)$/i,
			handler: 'StaleWhileRevalidate',
			options: {
				cacheName: 'static-js-assets',
				expiration: {
					maxEntries: 32,
					maxAgeSeconds: 24 * 60 * 60, // 24 hours
				},
			},
		},
		{
			urlPattern: /\.(?:css|less)$/i,
			handler: 'StaleWhileRevalidate',
			options: {
				cacheName: 'static-style-assets',
				expiration: {
					maxEntries: 32,
					maxAgeSeconds: 24 * 60 * 60, // 24 hours
				},
			},
		},
		{
			// ダッシュボードページを常に優先的にキャッシュ
			urlPattern: ({ url }) => {
				return url.pathname === '/dashboard';
			},
			handler: 'NetworkFirst',
			options: {
				cacheName: 'dashboard-page',
				expiration: {
					maxEntries: 4,
					maxAgeSeconds: 60 * 60, // 1 hour
				},
			},
		},
		{
			urlPattern: ({ url }) => {
				return url.pathname.startsWith('/api/');
			},
			handler: 'NetworkFirst',
			options: {
				cacheName: 'apis',
				expiration: {
					maxEntries: 32,
					maxAgeSeconds: 60 * 5, // 5 minutes
				},
				networkTimeoutSeconds: 10, // フォールバックまでのタイムアウト
			},
		},
		{
			urlPattern: ({ url }) => {
				const isSameOrigin = self.origin === url.origin;
				return isSameOrigin && !url.pathname.startsWith('/api/');
			},
			handler: 'NetworkFirst',
			options: {
				cacheName: 'others',
				expiration: {
					maxEntries: 32,
					maxAgeSeconds: 60 * 60, // 1 hour
				},
				networkTimeoutSeconds: 10,
			},
		},
		{
			urlPattern: ({ url }) => {
				return !self.origin.startsWith(url.origin);
			},
			handler: 'NetworkFirst',
			options: {
				cacheName: 'cross-origin',
				expiration: {
					maxEntries: 32,
					maxAgeSeconds: 60 * 60, // 1 hour
				},
			},
		},
	],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		domains: [
			'lh3.googleusercontent.com',
			'firebasestorage.googleapis.com',
			'd1abhb48aypmuo.cloudfront.net'
		],
	},
};

module.exports = withPWA(nextConfig);