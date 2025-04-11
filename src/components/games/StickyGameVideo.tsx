'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Play, Pause, Volume2, VolumeX, Eye, Download } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

interface StickyGameVideoProps {
	videoSrc: string;
	title: string;
	isActive: boolean;
	thumbnailSrc?: string;
	onLoaded?: () => void;
	globalAudioEnabled?: boolean;
	onAudioStateChange?: (isAudioOn: boolean) => void;
}

export default function StickyGameVideo({
	videoSrc,
	title,
	isActive,
	thumbnailSrc,
	onLoaded,
	globalAudioEnabled = false,
	onAudioStateChange
}: StickyGameVideoProps) {
	// AudioContextを使用
	const { hasUserInteracted, enableAudio } = useAudio();

	const [isPlaying, setIsPlaying] = useState(false);
	const [isMuted, setIsMuted] = useState(!globalAudioEnabled);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [loadProgress, setLoadProgress] = useState(0);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [videoDuration, setVideoDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isBuffering, setIsBuffering] = useState(false);
	const [hasLocalUserInteracted, setHasLocalUserInteracted] = useState(false);
	const [wasEverPlayed, setWasEverPlayed] = useState(false); // この動画が一度でも再生されたかを記録
	const [showThumbnail, setShowThumbnail] = useState(true); // サムネイル表示制御用

	// Load state tracking
	useEffect(() => {
		let interval: NodeJS.Timeout;

		if (isLoading && videoRef.current) {
			interval = setInterval(() => {
				if (videoRef.current && videoRef.current.readyState > 2) {
					// More than HAVE_CURRENT_DATA state
					setLoadProgress(Math.min(95, loadProgress + 5)); // Simulate loading progress
				}
			}, 200);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isLoading, loadProgress]);

	// Handle video play/pause - ユーザーインタラクション状態を考慮
	useEffect(() => {
		if (!videoRef.current || hasError) return;

		if (isPlaying) {
			const playPromise = videoRef.current.play();
			if (playPromise !== undefined) {
				playPromise.catch(error => {
					console.error('Video play error:', error);
					setIsPlaying(false);
				});
			}
		} else {
			videoRef.current.pause();
		}
	}, [isPlaying, hasError]);

	// ビデオのアクティブ状態による制御
	useEffect(() => {
		// アクティブになった時の処理
		if (isActive) {
			// 一度でも再生されたことがあり、ユーザーがインタラクションしていれば
			if (wasEverPlayed && hasUserInteracted) {
				// サムネイルを非表示にして動画を表示
				setShowThumbnail(false);
				// 再生開始
				setIsPlaying(true);
			}
		} else {
			// 非アクティブになったときは再生停止
			if (isPlaying) {
				setIsPlaying(false);
			}
		}
	}, [isActive, wasEverPlayed, hasUserInteracted]);

	// グローバル音声設定が変更されたときの処理
	useEffect(() => {
		if (!videoRef.current) return;

		if (isActive && globalAudioEnabled && !hasLocalUserInteracted) {
			// ユーザーがまだ手動で変更していない場合のみグローバル設定を適用
			setIsMuted(!globalAudioEnabled);
		}
	}, [globalAudioEnabled, isActive, hasLocalUserInteracted]);

	// Handle video mute/unmute
	useEffect(() => {
		if (!videoRef.current) return;
		videoRef.current.muted = isMuted;

		// 音声状態が変更されたら親コンポーネントに通知
		if (onAudioStateChange && isActive) {
			onAudioStateChange(!isMuted);
		}
	}, [isMuted, isActive, onAudioStateChange]);

	// Track video time
	useEffect(() => {
		if (!videoRef.current || !isPlaying) return;

		const updateTime = () => {
			if (videoRef.current) {
				setCurrentTime(videoRef.current.currentTime);
				setVideoDuration(videoRef.current.duration || 0);
			}
		};

		const timeInterval = setInterval(updateTime, 1000);
		return () => clearInterval(timeInterval);
	}, [isPlaying]);

	// Handle buffering state
	useEffect(() => {
		if (!videoRef.current) return;

		const handleWaiting = () => setIsBuffering(true);
		const handlePlaying = () => setIsBuffering(false);

		videoRef.current.addEventListener('waiting', handleWaiting);
		videoRef.current.addEventListener('playing', handlePlaying);

		return () => {
			if (videoRef.current) {
				videoRef.current.removeEventListener('waiting', handleWaiting);
				videoRef.current.removeEventListener('playing', handlePlaying);
			}
		};
	}, []);

	// サムネイルをクリックして再生開始
	const handleThumbnailClick = () => {
		if (hasError || isLoading) return;

		// ユーザーインタラクションフラグを設定
		enableAudio();
		setHasLocalUserInteracted(true);

		// 一度でも再生された状態にする
		setWasEverPlayed(true);

		// サムネイルを非表示にして動画を表示
		setShowThumbnail(false);

		// 再生開始
		setIsPlaying(true);

		// 音量設定（グローバル設定に従う）
		setIsMuted(!globalAudioEnabled);
	};

	const togglePlay = () => {
		if (hasError) return;

		// もし初めての再生なら、この動画が再生されたことを記録
		if (!wasEverPlayed) {
			setWasEverPlayed(true);
			enableAudio(); // ユーザーインタラクションを記録
		}

		setIsPlaying(!isPlaying);
		if (showThumbnail) {
			setShowThumbnail(false);
		}
	};

	const toggleMute = () => {
		setHasLocalUserInteracted(true); // ユーザーが手動で変更したことを記録
		setIsMuted(!isMuted);
	};

	const handleVideoLoaded = () => {
		setIsLoading(false);
		setLoadProgress(100);
		if (onLoaded) onLoaded();
	};

	const handleVideoError = () => {
		setIsLoading(false);
		setHasError(true);
		setIsPlaying(false);
		console.error('Video load error for:', videoSrc);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
	};

	return (
		<div className="relative w-full h-full bg-black/40 md:rounded-xl overflow-hidden">
			{/* Loading indicator */}
			{isLoading && (
				<div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/50">
					<div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
					<div className="w-48 h-2 bg-background/30 rounded-full overflow-hidden">
						<div
							className="h-full bg-accent animate-pulse-subtle"
							style={{ width: `${loadProgress}%` }}
						></div>
					</div>
					<p className="text-xs mt-2 text-foreground/70">読み込み中...</p>
				</div>
			)}

			{/* Buffering indicator */}
			{isBuffering && !isLoading && !hasError && !showThumbnail && (
				<div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
					<div className="w-8 h-8 border-4 border-white/60 border-t-transparent rounded-full animate-spin"></div>
				</div>
			)}

			{/* Error fallback */}
			{hasError && (
				<div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80 p-4 text-center">
					<p className="text-lg mb-2">動画をロードできませんでした</p>
					{thumbnailSrc && (
						<div className="mt-2 relative w-full max-w-md h-32 bg-border/30 rounded overflow-hidden">
							<Image
								src={thumbnailSrc}
								alt={`${title} ゲームプレイ映像`}
								fill
								style={{ objectFit: 'cover' }}
								className="animate-pulse-subtle"
							/>
						</div>
					)}

					<button
						onClick={() => window.location.reload()}
						className="mt-4 px-4 py-2 bg-accent/80 text-white rounded-full text-sm flex items-center hover:bg-accent transition-colors"
					>
						<Download className="h-4 w-4 mr-1" /> 再読み込み
					</button>
				</div>
			)}

			{/* クリック可能なサムネイル（初回表示または非再生時） */}
			{!isLoading && !hasError && showThumbnail && thumbnailSrc && (
				<div
					className="absolute inset-0 z-20 cursor-pointer group"
					onClick={handleThumbnailClick}
				>
					<Image
						src={thumbnailSrc}
						alt={`${title} サムネイル`}
						fill
						style={{ objectFit: 'cover' }}
						className="brightness-75 group-hover:brightness-90 transition-all duration-300"
					/>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<div className="bg-accent/80 rounded-full p-5 shadow-lg transform transition-transform group-hover:scale-110">
							<Play className="h-12 w-12 text-white" />
						</div>
						<p className="mt-4 text-white text-lg font-medium text-shadow shadow-black">
							クリックして再生
						</p>
					</div>
					<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent h-24">
						<div className="absolute bottom-4 left-4">
							<p className="text-white font-medium text-lg">{title}</p>
						</div>
					</div>
				</div>
			)}
			<video
				ref={videoRef}
				className={`w-full h-full object-cover ${isLoading || hasError || showThumbnail ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
				src={videoSrc}
				playsInline
				loop
				muted={isMuted}
				onCanPlay={handleVideoLoaded}
				onError={handleVideoError}
				preload="auto"
			/>
			{!showThumbnail && !isLoading && !hasError && (
				<div className="absolute bottom-0 left-0 right-0 py-2 px-4 bg-gradient-to-t from-black/70 to-transparent flex flex-col">
					{videoDuration > 0 && (
						<div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
							<div
								className="h-full bg-accent"
								style={{ width: `${(currentTime / videoDuration) * 100}%` }}
							></div>
						</div>
					)}

					<div className="flex justify-between items-center">
						<div className="flex-1">
							<div className="flex items-end justify-left text-white font-medium text-lg">
								<span>{title}</span>
								<div className="flex items-center text-white/70 text-xs ml-2 mb-1">
									<span>
										{formatTime(currentTime)} / {formatTime(videoDuration)}
									</span>
								</div>
							</div>

						</div>
						<div className="flex gap-2">
							<button
								onClick={togglePlay}
								className="rounded-full p-2 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors"
								aria-label={isPlaying ? 'Pause video' : 'Play video'}
							>
								{isPlaying ? (
									<Pause className="h-5 w-5 text-white" />
								) : (
									<Play className="h-5 w-5 text-white" />
								)}
							</button>

							<button
								onClick={toggleMute}
								className="rounded-full p-2 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors"
								aria-label={isMuted ? 'Unmute video' : 'Mute video'}
							>
								{isMuted ? (
									<VolumeX className="h-5 w-5 text-white" />
								) : (
									<Volume2 className="h-5 w-5 text-white" />
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}