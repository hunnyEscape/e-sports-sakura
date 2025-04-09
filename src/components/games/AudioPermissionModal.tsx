'use client';

import React from 'react';

interface AudioPermissionModalProps {
	onAccept: () => void;
	onDecline: () => void;
	isOpen: boolean;
}

export default function AudioPermissionModal({
	onAccept,
	onDecline,
	isOpen
}: AudioPermissionModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
			<div className="bg-background rounded-2xl max-w-md w-full p-6 border border-border/30 shadow-xl">
				<h2 className="text-2xl font-bold mb-4">音声を再生しますか？</h2>
				<p className="text-foreground/80 mb-6">
					動画の音声をONにすると、ゲームの雰囲気をよりお楽しみいただけます。
					音声をONにしますか？
				</p>
				<div className="flex space-x-3">
					<button
						onClick={onDecline}
						className="flex-1 px-4 py-2 rounded-lg border border-border/30 hover:bg-border/10 transition-colors"
					>
						今はしない
					</button>
					<button
						onClick={onAccept}
						className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
					>
						音声をONにする
					</button>
				</div>
			</div>
		</div>
	);
}