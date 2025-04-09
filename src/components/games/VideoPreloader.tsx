'use client';

import React, { useEffect, useRef } from 'react';

interface VideoPreloaderProps {
	videoSrcs: string[];
	currentIndex: number;
}

/**
 * ビデオプリロードコンポーネント
 * 現在表示中の動画の前後の動画をプリロードします
 */
export default function VideoPreloader({ videoSrcs, currentIndex }: VideoPreloaderProps) {
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

	useEffect(() => {
		// 現在のインデックスの前後の動画をプリロード
		const preloadIndices = [
			currentIndex - 1, // 前の動画
			currentIndex + 1, // 次の動画
			currentIndex + 2  // 次の次の動画
		].filter(i => i >= 0 && i < videoSrcs.length);

		// プリロード処理
		preloadIndices.forEach(index => {
			if (!videoRefs.current[index]) return;

			// video要素のpreload属性を設定
			const video = videoRefs.current[index];
			if (video) {
				video.preload = 'auto';

				// 読み込み済みかチェック
				if (video.readyState === 0) {
					// まだ読み込まれていない場合はロード開始
					video.load();
				}
			}
		});
	}, [currentIndex, videoSrcs]);

	// スタイルなしの非表示ビデオ要素を配置
	return (
		<div style={{ display: 'none', visibility: 'hidden', position: 'absolute' }}>
			{videoSrcs.map((src, index) => (
				<video
					key={`preload-${index}`}
					ref={(el) => {
						videoRefs.current[index] = el;
					}}

					src={src}
					muted
					playsInline
				/>
			))}
		</div>
	);
}