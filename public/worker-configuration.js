// PWAのキャッシュ戦略をカスタマイズするための設定

module.exports = {
	// キャッシュ名のプレフィックス
	cacheName: 'e-sports-sakura-v1',

	// レスポンスをキャッシュする前に変更するためのコールバック
	transformResponse: async (response) => {
		return response;
	},

	// キャッシュするURLパターン
	urlPattern: ({ url, sameOrigin, request }) => {
		// 常にオンラインでの最新情報を必要とするAPIエンドポイント
		const alwaysOnlineEndpoints = [
			'/api/unlockDoor',
			'/api/reservations',
			'/api/stripe',
			'/api/veriff'
		];

		// オンラインが必要なAPIは常にオンラインで取得
		if (alwaysOnlineEndpoints.some(endpoint => url.pathname.startsWith(endpoint))) {
			return false;
		}

		// 同一オリジンのリクエストはキャッシュ
		return sameOrigin;
	},

	// キャッシュ戦略
	handler: 'NetworkFirst',

	// その他のオプション
	options: {
		cacheName: 'api-cache',
		expiration: {
			// キャッシュの最大期間（1日）
			maxAgeSeconds: 24 * 60 * 60,
		},
	},
};