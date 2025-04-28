'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

export default function ManualInstallButton() {
	const [installPrompt, setInstallPrompt] = useState<any>(null);
	const [isInstalled, setIsInstalled] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);
	const [isIOS, setIsIOS] = useState(false);

	useEffect(() => {
		// iOS/iPadOSデバイスかどうかを検出
		const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
		setIsIOS(isIOSDevice);

		// PWAがすでにインストールされているか確認
		if (window.matchMedia('(display-mode: standalone)').matches) {
			setIsInstalled(true);
			return;
		}

		// インストールイベントをキャプチャ (iOS以外)
		if (!isIOSDevice) {
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
		}
	}, []);

	const handleInstallClick = async () => {
		if (isIOS) {
			// iOSデバイスの場合、インストール手順を表示
			alert('このページをホーム画面に追加するには:\n\n1. 共有ボタンをタップ（下部の四角から矢印が出ているアイコン）\n2.「ホーム画面に追加」をタップ\n3.「追加」を選択');
			return;
		}

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

	// インストール済みの場合は何も表示しない
	if (isInstalled) {
		return null;
	}

	return (
		<Button
			onClick={handleInstallClick}
			disabled={isInstalling && !isIOS}
			variant="primary"
			className="w-full mb-4"
		>
			{isInstalling ? 'インストール中...' :
				isIOS ? 'iPhoneでホーム画面に追加する方法を見る' :
					'ホーム画面にアプリを追加する。QRコードを開くときに便利です！'}
		</Button>
	);
}