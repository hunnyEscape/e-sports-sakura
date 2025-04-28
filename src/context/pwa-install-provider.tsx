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
		// Check if the app is running in standalone mode (installed)
		if (window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as any).standalone === true) {
			setIsInstalled(true);
		}

		// Check if it's an iOS device
		const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
		setIsIOS(isIOSDevice);

		// Listen for the beforeinstallprompt event
		const handleBeforeInstallPrompt = (e: any) => {
			// Prevent Chrome 76+ from automatically showing the prompt
			e.preventDefault();
			// Stash the event so it can be triggered later
			setInstallPrompt(e);
			setIsInstallable(true);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		// Listen for successful installation
		window.addEventListener('appinstalled', () => {
			setIsInstalled(true);
			setInstallPrompt(null);
			setIsInstallable(false);
			console.log('PWA was installed');
		});

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	}, []);

	// Function to trigger the PWA installation
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
				console.log('User accepted the installation');
			} else {
				console.log('User declined the installation');
			}

			// Clear the saved prompt, it can't be used again
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

// Hook for easy context consumption
export function usePwaInstall() {
	const context = useContext(PwaInstallContext);

	if (context === undefined) {
		throw new Error('usePwaInstall must be used within a PwaInstallProvider');
	}

	return context;
}