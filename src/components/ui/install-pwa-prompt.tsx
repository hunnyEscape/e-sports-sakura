'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

export default function InstallPWAPrompt() {
	const [showPrompt, setShowPrompt] = useState(false);
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

	useEffect(() => {
		// PWAインストールイベントのリスナー
		const handleBeforeInstallPrompt = (e: Event) => {
			// デフォルトのプロンプト表示をキャンセル
			e.preventDefault();
			// イベントを保存
			setDeferredPrompt(e);
			// カスタムプロンプト表示
			setShowPrompt(true);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);

		// 既にインストール済みかどうかの確認
		if (window.matchMedia('(display-mode: standalone)').matches) {
			setShowPrompt(false);
		}

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
		};
	}, []);

	// インストールボタンがクリックされた時の処理
	const handleInstallClick = () => {
		if (!deferredPrompt) return;

		// インストールプロンプト表示
		deferredPrompt.prompt();

		// ユーザー応答の待機
		deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
			if (choiceResult.outcome === 'accepted') {
				console.log('ユーザーがインストールを承認しました');
			} else {
				console.log('ユーザーがインストールをキャンセルしました');
			}
			// プロンプトは一度しか使用できない
			setDeferredPrompt(null);
			// プロンプトを非表示
			setShowPrompt(false);
		});
	};

	if (!showPrompt) return null;

	return (
		<div className="fixed bottom-4 left-0 right-0 mx-auto w-5/6 max-w-md bg-accent/10 border border-accent/20 rounded-xl p-4 z-40">
			<h3 className="font-medium text-lg mb-2">アプリをインストール</h3>
			<p className="mb-4">
				ホーム画面に追加してアプリとして使用できます
			</p>
			<div className="flex flex-wrap gap-2">
				<Button
					onClick={handleInstallClick}
					variant="primary"
				>
					インストール
				</Button>
				<button
					onClick={() => setShowPrompt(false)}
					className="text-foreground/70 hover:text-foreground"
				>
					あとで
				</button>
			</div>
		</div>
	);
}