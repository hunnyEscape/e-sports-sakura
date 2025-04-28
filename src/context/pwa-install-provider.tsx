'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface PwaInstallContextType {
	installPrompt: any;
	isInstalled: boolean;
	isInstallable: boolean;
	isIOS: boolean;
	installApp: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallContextType | undefined>(undefined);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
	const [installPrompt, setInstallPrompt] = useState<any>(null);
	const [isInstalled, setIsInstalled] = useState(false);
	const [isInstallable, setIsInstallable] = useState(false);
	const [isIOS, setIsIOS] = useState(false);

	useEffect(() => {
		// 重要：クライアントサイドでのみ実行
		if (typeof window === 'undefined') return;

		const findButtonWithText = (text: string) => {
			const buttons = document.querySelectorAll('button');
			// Array.fromを使ってNodeListを配列に変換
			return Array.from(buttons).some(button =>
				button.textContent?.includes(text)
			);
		};

		// PWA状態の検出 - 複数の方法を組み合わせる
		const detectPwaStatus = () => {
			// 1. display-mode: standalone の確認
			const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

			// 2. iOS Safari の navigator.standalone の確認
			const isIOSStandalone = (window.navigator as any).standalone === true;

			// 3. localStorage での過去のインストール記録確認
			const hasBeenInstalled = localStorage.getItem('pwaInstalled') === 'true';

			// 4. URL検査（PWAモードで開いた場合のパラメータチェック）
			const urlParams = new URLSearchParams(window.location.search);
			const hasPwaParam = urlParams.has('pwa') ||
				window.location.href.includes('?source=pwa') ||
				window.location.href.includes('&source=pwa');

			// 5. openInApp ボタンの存在を確認（修正版）
			const hasOpenInAppButton = !!document.querySelector('[aria-label="Open in app"]') ||
				findButtonWithText('Open in app');

			// デバッグ出力
			console.log('PWA状態検出:', {
				isStandalone,
				isIOSStandalone,
				hasBeenInstalled,
				hasPwaParam,
				hasOpenInAppButton,
				userAgent: navigator.userAgent
			});

			// いずれかの条件に該当すればインストール済みと判断
			return isStandalone || isIOSStandalone || hasBeenInstalled || hasPwaParam || hasOpenInAppButton;
		};

		// 初期状態の設定
		const isPwaInstalled = detectPwaStatus();
		setIsInstalled(isPwaInstalled);

		// インストール済みならローカルストレージに記録
		if (isPwaInstalled) {
			localStorage.setItem('pwaInstalled', 'true');
		}

		// iOS端末かどうかの判定
		const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
		setIsIOS(isIOSDevice);

		// インストールプロンプトのイベントリスナー
		const handleBeforeInstallPrompt = (e: any) => {
			e.preventDefault();
			setInstallPrompt(e);
			setIsInstallable(true);
		};

		// インストール完了のイベントリスナー
		const handleAppInstalled = () => {
			setIsInstalled(true);
			setInstallPrompt(null);
			setIsInstallable(false);
			localStorage.setItem('pwaInstalled', 'true');
			console.log('PWA was installed');
		};

		// 定期的なチェックを設定（DOM変更検出のため）
		const intervalId = setInterval(() => {
			const currentStatus = detectPwaStatus();
			if (currentStatus && !isInstalled) {
				setIsInstalled(true);
				localStorage.setItem('pwaInstalled', 'true');
			}
		}, 2000);  // 2秒ごとに確認

		// イベントリスナーの登録
		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);

		// クリーンアップ関数
		return () => {
			clearInterval(intervalId);
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
		};
	}, [isInstalled]);

	// インストール実行関数
	const installApp = async () => {
		if (!installPrompt) {
			console.log('Installation prompt not available');

			if (isIOS) {
				alert('このページをホーム画面に追加するには:\n\n1. 共有ボタンをタップ（下部の四角から矢印が出ているアイコン）\n2.「ホーム画面に追加」をタップ\n3.「追加」を選択');
			} else {
				alert('このアプリは現在インストールできません。\nブラウザのメニューからインストールオプションを確認するか、しばらく使用した後に再試行してください。');
			}

			return;
		}

		try {
			installPrompt.prompt();
			const { outcome } = await installPrompt.userChoice;

			if (outcome === 'accepted') {
				setIsInstalled(true);
				localStorage.setItem('pwaInstalled', 'true');
				console.log('User accepted the installation');
			} else {
				console.log('User declined the installation');
			}

			setInstallPrompt(null);
			setIsInstallable(false);
		} catch (error) {
			console.error('Error during installation:', error);
		}
	};

	return (
		<PwaInstallContext.Provider
			value={{
				installPrompt,
				isInstalled,
				isInstallable,
				isIOS,
				installApp
			}}
		>
			{children}
		</PwaInstallContext.Provider>
	);
}

// コンテキスト使用のためのフック
export function usePwaInstall() {
	const context = useContext(PwaInstallContext);

	if (context === undefined) {
		throw new Error('usePwaInstall must be used within a PwaInstallProvider');
	}

	return context;
}