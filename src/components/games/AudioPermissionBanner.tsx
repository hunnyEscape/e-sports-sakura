'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

interface AudioPermissionBannerProps {
	onDismiss?: () => void;
}

export default function AudioPermissionBanner({ onDismiss }: AudioPermissionBannerProps) {
	const { globalAudioEnabled, hasUserInteracted, enableAudio, disableAudio } = useAudio();
	const [isVisible, setIsVisible] = useState(false);

	// ユーザーがまだインタラクションしていない場合のみバナーを表示
	useEffect(() => {
		const timer = setTimeout(() => {
			if (!hasUserInteracted) {
				setIsVisible(true);
			}
		}, 1000); // 1秒後に表示（ページロード直後は表示しない）

		return () => clearTimeout(timer);
	}, [hasUserInteracted]);

	const handleEnableAudio = () => {
		enableAudio();
		setIsVisible(false);
		if (onDismiss) onDismiss();
	};

	const handleDisableAudio = () => {
		disableAudio();
		setIsVisible(false);
		if (onDismiss) onDismiss();
	};

	const handleClose = () => {
		setIsVisible(false);
		if (onDismiss) onDismiss();
	};

	if (!isVisible) return null;

	return (
		<div className="fixed bottom-4 left-0 right-0 mx-auto w-full max-w-md z-50 px-4">
			<div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 p-4 flex items-center justify-between">
				<div className="flex items-center">
					{globalAudioEnabled ? (
						<Volume2 className="h-5 w-5 mr-3 text-accent" />
					) : (
						<VolumeX className="h-5 w-5 mr-3 text-foreground/70" />
					)}
					<div>
						<h4 className="font-medium">ゲーム映像のオーディオ</h4>
						<p className="text-sm text-foreground/70">
							ゲームプレイ映像のサウンドを有効にしますか？
						</p>
					</div>
				</div>

				<div className="flex gap-2 ml-4">
					<button
						onClick={handleDisableAudio}
						className="px-3 py-1.5 text-sm rounded-md hover:bg-border/30 transition-colors"
					>
						オフ
					</button>
					<button
						onClick={handleEnableAudio}
						className="px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
					>
						オンにする
					</button>
					<button
						onClick={handleClose}
						className="p-1.5 rounded-md hover:bg-border/30 transition-colors"
						aria-label="閉じる"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}