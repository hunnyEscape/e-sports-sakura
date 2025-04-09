/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		domains: [
			'lh3.googleusercontent.com', // Google プロフィール画像用
			'firebasestorage.googleapis.com', // Firebase Storage 用（後で必要になる場合）
			'd1abhb48aypmuo.cloudfront.net'
		],
	},
}

module.exports = nextConfig