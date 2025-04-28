'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/button';

export default function ManualInstallButton() {
	const [installPrompt, setInstallPrompt] = useState<any>(null);
	const [isInstalled, setIsInstalled] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);
	const [isIOS, setIsIOS] = useState(false);
	const [isDesktop, setIsDesktop] = useState(false);
	const [debugInfo, setDebugInfo] = useState<string | null>(null);

	// Keep track of whether the event listener has been added
	const promptEventListenerAdded = useRef(false);

	useEffect(() => {
		// Detect iOS/iPadOS devices
		const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
		setIsIOS(isIOSDevice);

		// Detect desktop browsers
		const isDesktopDevice = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
		setIsDesktop(isDesktopDevice);

		// Check if PWA is already installed
		if (window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as any).standalone === true) {
			setIsInstalled(true);
			return;
		}

		// Only add the event listener once
		if (!promptEventListenerAdded.current) {
			// Capture and save install prompt event
			const handleBeforeInstallPrompt = (e: any) => {
				// Prevent default prompt display
				e.preventDefault();
				// Save the event
				setInstallPrompt(e);
				console.log('Install prompt event captured and saved');
				setDebugInfo('インストールプロンプトが利用可能です');
			};

			window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			promptEventListenerAdded.current = true;

			// This is for debugging - log when we don't get the event
			setTimeout(() => {
				if (!installPrompt) {
					console.log('No install prompt event received after 3 seconds');
					const manifestLink = document.querySelector('link[rel="manifest"]');
					if (!manifestLink) {
						setDebugInfo('マニフェストリンクが見つかりません');
					} else {
						// Check if Service Worker is registered
						if ('serviceWorker' in navigator) {
							navigator.serviceWorker.getRegistration().then(registration => {
								if (!registration) {
									setDebugInfo('Service Workerが登録されていません');
								} else {
									setDebugInfo('インストール条件を満たしていない可能性があります');
								}
							});
						} else {
							setDebugInfo('Service Workerがサポートされていません');
						}
					}
				}
			}, 3000);
		}

		// Detect when app is installed
		window.addEventListener('appinstalled', () => {
			setIsInstalled(true);
			setInstallPrompt(null);
			setDebugInfo('アプリが正常にインストールされました');
			console.log('App was installed successfully');
		});

		return () => {
			window.removeEventListener('beforeinstallprompt', () => { });
			window.removeEventListener('appinstalled', () => { });
		};
	}, [installPrompt]);

	const handleInstallClick = async () => {
		// For iOS devices, show instructions
		if (isIOS) {
			alert('このページをホーム画面に追加するには:\n\n1. 共有ボタンをタップ（下部の四角から矢印が出ているアイコン）\n2.「ホーム画面に追加」をタップ\n3.「追加」を選択');
			return;
		}

		// For desktop browsers without the install prompt
		if (isDesktop && !installPrompt) {
			const browserInfo = getBrowserInfo();
			alert(
				`${browserInfo}でのインストール方法:\n\n` +
				`ブラウザのアドレスバー右側にあるインストールアイコンをクリックするか、\n` +
				`ブラウザのメニューから「インストール」または「アプリとしてインストール」を選択してください。`
			);
			return;
		}

		// For devices with install prompt available
		if (installPrompt) {
			setIsInstalling(true);

			try {
				// Show the saved prompt
				installPrompt.prompt();

				// Wait for user's choice
				const { outcome } = await installPrompt.userChoice;
				console.log(`Installation result: ${outcome}`);

				if (outcome === 'accepted') {
					setIsInstalled(true);
				} else {
					setDebugInfo('インストールはキャンセルされました');
				}
			} catch (error) {
				console.error('Installation error:', error);
				setDebugInfo(`インストールエラー: ${error}`);
			} finally {
				setIsInstalling(false);
				// Prompts can only be used once
				setInstallPrompt(null);
			}
		} else {
			console.log('No install prompt available');
			alert(
				'このサイトは現在インストールできません。\n' +
				'ブラウザのメニューから「インストール」オプションを探すか、\n' +
				'しばらく使用した後に再度お試しください。\n\n' +
				'PC版ブラウザの場合は、アドレスバーの右側にインストールアイコンがあるか確認してください。'
			);
		}
	};

	// Helper function to identify the browser
	const getBrowserInfo = () => {
		const userAgent = navigator.userAgent;
		if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
		if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
		if (userAgent.indexOf('Edge') > -1) return 'Edge';
		if (userAgent.indexOf('Safari') > -1) return 'Safari';
		return 'お使いのブラウザ';
	};

	// If already installed, don't show the button
	if (isInstalled) {
		return null;
	}

	return (
		<>
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

			{debugInfo && (
				<div className="text-sm text-accent-foreground/70 mb-4 text-center">
					<p>{debugInfo}</p>
				</div>
			)}
		</>
	);
}