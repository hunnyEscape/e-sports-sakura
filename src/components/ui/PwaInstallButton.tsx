'use client';

import { useState } from 'react';
import { usePwaInstall } from '@/context/pwa-install-provider';
import Button from '@/components/ui/button';

export default function PwaInstallButton() {
	const { isInstalled, isInstallable, isIOS, installApp } = usePwaInstall();
	const [isInstalling, setIsInstalling] = useState(false);

	// Don't render anything if the app is already installed
	if (isInstalled) {
		return null;
	}

	const handleInstallClick = async () => {
		setIsInstalling(true);
		await installApp();
		setIsInstalling(false);
	};

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