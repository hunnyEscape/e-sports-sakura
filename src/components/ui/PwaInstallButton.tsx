'use client';

import { useState } from 'react';
import { usePwaInstall } from '@/context/pwa-install-provider';
import Button from '@/components/ui/button';
import Image from 'next/image';

export default function PwaInstallButton() {
	const { isInstalled, isInstallable, isIOS, installApp } = usePwaInstall();
	const [isInstalling, setIsInstalling] = useState(false);
	const [showIosInstructions, setShowIosInstructions] = useState(false);

	// Context側の isInstalled を使用して、コンポーネントの独自チェックは不要になりました
	if (isInstalled) {
		return null;
	}

	const handleInstallClick = async () => {
		if (!isIOS) {
			setShowIosInstructions(!showIosInstructions);
		} else {
			setIsInstalling(true);
			await installApp();
			setIsInstalling(false);
		}
	};

	return (
		<div className="w-full mb-6">
			<Button
				onClick={handleInstallClick}
				disabled={isInstalling}
				variant="primary"
				className="w-full mb-2"
			>
				{isInstalling ? 'インストール中...' :
					isIOS ? 'iPhoneでホーム画面に追加する方法を見る' :
						'ホーム画面にアプリを追加する。QRコードを表示するときにスムーズです！'}
			</Button>

			{!isIOS && showIosInstructions && (
				<div className="mt-4 bg-accent/5 border border-accent/20 rounded-xl p-6 shadow-sm">
					<h3 className="font-semibold text-lg mb-4 text-center text-accent">iPhoneでホーム画面に追加する手順</h3>

					<div className="space-y-4">
						<div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
							<div className="bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
							<p>Safari下部の<strong className="text-accent">共有ボタン</strong>をタップします（四角から矢印が出ているアイコン）</p>
						</div>

						<div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
							<div className="bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
							<p>表示されるメニューから<strong className="text-accent">「ホーム画面に追加」</strong>をタップします</p>
						</div>

						<div className="flex items-center space-x-3 bg-white/10 p-3 rounded-lg">
							<div className="bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
							<p>確認画面で右上の<strong className="text-accent">「追加」</strong>をタップすれば完了です</p>
						</div>
					</div>

					<div className="flex justify-center my-6">
						{process.env.NEXT_PUBLIC_CLOUDFRONT_URL ? (
							<Image
								src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/PWA.png`}
								alt="iPhoneでのインストール手順"
								width={300}
								height={200}
								className="rounded-lg shadow-md"
							/>
						) : (
							<div className="w-72 h-40 bg-gray-200 rounded-lg flex items-center justify-center">
								<p className="text-gray-500 text-sm">インストール手順の図解</p>
							</div>
						)}
					</div>

					<p className="mt-4 text-sm text-center">
						追加後はホーム画面からアプリのように起動できます。
					</p>

					<div className="flex justify-center mt-5">
						<button
							onClick={() => setShowIosInstructions(false)}
							className="px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent font-medium rounded-full transition-colors"
						>
							閉じる
						</button>
					</div>
				</div>
			)}
		</div>
	);
}