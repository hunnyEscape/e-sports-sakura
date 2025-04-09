'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

export default function AudioPermissionModal() {
	const { hasUserInteracted, enableAudio, disableAudio } = useAudio();
	const [isVisible, setIsVisible] = useState(false);

	// ユーザーが初めて訪問したときだけモーダルを表示
	useEffect(() => {
		if (!hasUserInteracted) {
			// ページ読み込み後少し遅延させて表示する
			const timer = setTimeout(() => {
				setIsVisible(true);
			}, 1000);

			return () => clearTimeout(timer);
		}
	}, [hasUserInteracted]);

	// モーダル非表示
	const handleClose = (audioEnabled: boolean) => {
		if (audioEnabled) {
			enableAudio();
		} else {
			disableAudio();
		}
		setIsVisible(false);
	};

	if (!isVisible) return null;

	return (
		<div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
			<div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
				<h3 className="text-xl font-bold mb-4">ゲーム映像のオーディオ設定</h3>

				<p className="mb-4">
					より良いゲーム体験のために、音声付きでゲームプレイ映像をご覧いただけます。
					このページでは一度許可すると、すべての動画で音声を楽しめます。
				</p>

				<div className="grid grid-cols-2 gap-4 mb-6">
					<button
						onClick={() => handleClose(false)}
						className="flex flex-col items-center justify-center p-4 border border-border rounded-lg hover:bg-border/10 transition-colors"
					>
						<VolumeX className="h-8 w-8 mb-2 text-foreground/70" />
						<span className="font-medium">音声なし</span>
					</button>

					<button
						onClick={() => handleClose(true)}
						className="flex flex-col items-center justify-center p-4 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
					>
						<Volume2 className="h-8 w-8 mb-2" />
						<span className="font-medium">音声あり</span>
					</button>
				</div>

				<p className="text-xs text-foreground/60 text-center">
					※ この設定はいつでも各動画のコントロールから変更できます
				</p>
			</div>
		</div>
	);
}