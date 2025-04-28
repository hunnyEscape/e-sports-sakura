'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

export default function ManualInstallButton() {
	const [installPrompt, setInstallPrompt] = useState<any>(null);
	const [isInstalled, setIsInstalled] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);

	useEffect(() => {
		// PWAがすでにインストールされているか確認
		if (window.matchMedia('(display-mode: standalone)').matches) {
			setIsInstalled(true);
			return;
		}

		// インストールイベントをキャプチャ
		const handleBeforeInstallPrompt = (e: Event) => {
			// デフォルトのプロンプトを無効化
			e.preventDefault();
			// イベントを保存
			setInstallPrompt(e);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		// インストール完了を検知
		window.addEventListener('appinstalled', () => {
			setIsInstalled(true);
			setInstallPrompt(null);
		});

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', () => { });
		};
	}, []);

	const handleInstallClick = async () => {
		if (!installPrompt) return;

		setIsInstalling(true);

		// インストールプロンプトを表示
		installPrompt.prompt();

		// ユーザーの選択を待機
		const choiceResult = await installPrompt.userChoice;

		if (choiceResult.outcome === 'accepted') {
			setIsInstalled(true);
		}

		setIsInstalling(false);
		setInstallPrompt(null);
	};

	// インストール済みまたはインストール不可能な場合は何も表示しない
	if (isInstalled || !installPrompt) {
		return null;
	}

	return (
		<Button
			onClick={handleInstallClick}
			disabled={isInstalling}
			variant="primary"
			className="w-full mb-4"
		>
			{isInstalling ? 'インストール中...' : 'ホーム画面にアプリを追加'}
		</Button>
	);
}