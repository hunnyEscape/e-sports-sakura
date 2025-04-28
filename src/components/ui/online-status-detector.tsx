'use client';

import { useState, useEffect } from 'react';

export default function OnlineStatusDetector() {
	const [isOnline, setIsOnline] = useState(true);

	useEffect(() => {
		// 初期ステータス設定
		setIsOnline(navigator.onLine);

		// オンライン/オフライン検出イベントリスナー
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	// オフライン時のみ警告表示
	if (!isOnline) {
		return (
			<div className="fixed top-0 left-0 w-full bg-accent text-white py-2 text-center z-50">
				オフラインモードです。一部機能が制限されます。
			</div>
		);
	}

	// オンライン時は何も表示しない
	return null;
}