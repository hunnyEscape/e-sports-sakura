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

		// インストールイベントをキャプチャして保存
		const handleBeforeInstallPrompt = (e: any) => {
			// デフォルトのプロンプト表示を防止
			e.preventDefault();
			// イベントを保存
			setInstallPrompt(e);
			console.log('Install prompt event captured and saved');
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		// インストール完了の検知
		window.addEventListener('appinstalled', () => {
			setIsInstalled(true);
			setInstallPrompt(null);
			console.log('App was installed successfully');
		});

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', () => { });
		};
	}, []);

	const handleInstallClick = async () => {
		// iOSの場合は手順を表示
		if (isIOS) {
			alert('このページをホーム画面に追加するには:\n\n1. 共有ボタンをタップ（下部の四角から矢印が出ているアイコン）\n2.「ホーム画面に追加」をタップ\n3.「追加」を選択');
			return;
		}

		// Windowsの場合、保存されたプロンプトを使用
		if (installPrompt) {
			setIsInstalling(true);

			try {
				// 保存したプロンプトを表示（Windowsでは直接インストールダイアログが開く）
				installPrompt.prompt();

				// ユーザーの選択を待機
				const { outcome } = await installPrompt.userChoice;
				console.log(`Installation result: ${outcome}`);

				if (outcome === 'accepted') {
					setIsInstalled(true);
				}
			} catch (error) {
				console.error('Installation error:', error);
			} finally {
				setIsInstalling(false);
				// 一度使用したプロンプトは再利用できないので削除
				setInstallPrompt(null);
			}
		} else {
			// プロンプトがない場合（すでに表示済みか、インストール条件を満たしていない）
			console.log('No install prompt available');
			alert('このサイトは現在インストールできません。\nブラウザのメニューから「インストール」オプションを探すか、しばらく使用した後に再度お試しください。');
		}
	};

	// アプリがすでにインストールされている場合は何も表示しない
	if (isInstalled) {
		return null;
	}

	return (
		<Button
			onClick={handleInstallClick}
			disabled={isInstalling}
			variant="primary"
			className="w-full mb-4"
		>
			{isInstalling ? 'インストール中...' :
				isIOS ? 'iPhoneでホーム画面に追加する方法を見る' :
					'ホーム画面にアプリを追加する。QRコードを開くときに便利です！'}
		</Button>
	);
}