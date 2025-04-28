'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

export default function PwaUpdateNotifier() {
	const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

	useEffect(() => {
		// Service Workerが更新可能かどうかをチェック
		if ('serviceWorker' in navigator && 'workbox' in window) {
			const wb = window.workbox;

			// 新しいService Workerが利用可能になった時
			const handleUpdate = () => {
				setShowUpdatePrompt(true);
			};

			// workboxのイベントリスナーを設定
			wb?.addEventListener('waiting', handleUpdate);

			return () => {
				wb?.removeEventListener('waiting', handleUpdate);
			};
		}
	}, []);

	// アプリを更新する関数
	const updateApp = () => {
		if ('serviceWorker' in navigator && 'workbox' in window) {
			// 新しいService Workerに切り替え
			window.workbox?.messageSkipWaiting();

			// ページをリロード
			window.location.reload();
		}
	};

	if (!showUpdatePrompt) return null;

	return (
		<div className="fixed top-0 left-0 w-full bg-accent text-white py-3 px-4 text-center z-50">
			<p className="mb-2">新しいバージョンが利用可能です</p>
			<Button
				onClick={updateApp}
				variant="primary"
				className="bg-white text-accent hover:bg-white/90"
			>
				更新する
			</Button>
		</div>
	);
}