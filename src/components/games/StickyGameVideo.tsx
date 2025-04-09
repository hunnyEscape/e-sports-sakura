'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Play, Pause, Volume2, VolumeX, Eye, Download } from 'lucide-react';

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
	const [isPlaying, setIsPlaying] = useState(false);
	const [isMuted, setIsMuted] = useState(!globalAudioEnabled);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [loadProgress, setLoadProgress] = useState(0);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [videoDuration, setVideoDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isBuffering, setIsBuffering] = useState(false);
	const [hasUserInteracted, setHasUserInteracted] = useState(false);

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

	// Handle video play/pause
	useEffect(() => {
		if (!videoRef.current) return;

		if (isActive && isPlaying && !hasError) {
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
	}, [isActive, isPlaying, hasError]);

	// グローバル音声設定が変更されたときの処理
	useEffect(() => {
		if (!videoRef.current) return;

		if (isActive && globalAudioEnabled && !hasUserInteracted) {
			// ユーザーがまだ手動で変更していない場合のみグローバル設定を適用
			videoRef.current.muted = !globalAudioEnabled;
			setIsMuted(!globalAudioEnabled);
		}
	}, [globalAudioEnabled, isActive, hasUserInteracted]);

	// Handle video mute/unmute
	useEffect(() => {
		if (!videoRef.current) return;
		videoRef.current.muted = isMuted;

		// 音声状態が変更されたら親コンポーネントに通知
		if (onAudioStateChange && isActive) {
			onAudioStateChange(!isMuted);
		}
	}, [isMuted, isActive, onAudioStateChange]);

	// Auto-play when component becomes active
	useEffect(() => {
		if (isActive && !isPlaying && !hasError && !isLoading) {
			setIsPlaying(true);
		}

		if (!isActive && isPlaying) {
			setIsPlaying(false);
		}
	}, [isActive, isPlaying, hasError, isLoading]);

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

	const togglePlay = () => {
		if (hasError) return;
		setIsPlaying(!isPlaying);
	};

	const toggleMute = () => {
		setHasUserInteracted(true); // ユーザーが手動で変更したことを記録
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
		<div className="relative w-full h-full bg-black/40 rounded-xl overflow-hidden">
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
			{isBuffering && !isLoading && !hasError && (
				<div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
					<div className="w-8 h-8 border-4 border-white/60 border-t-transparent rounded-full animate-spin"></div>
				</div>
			)}

			{/* Error fallback */}
			{hasError && (
				<div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80 p-4 text-center">
					<p className="text-lg mb-2">動画をロードできませんでした</p>
					<p className="text-sm text-foreground/70 mb-4">
						ゲームプレイ映像は現在準備中です。後ほどお試しください。
					</p>

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

			{/* Video thumbnail placeholder before video loads */}
			{isLoading && thumbnailSrc && (
				<div className="absolute inset-0 z-0">
					<Image
						src={thumbnailSrc}
						alt={`${title} サムネイル`}
						fill
						style={{ objectFit: 'cover' }}
						className="opacity-50"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
				</div>
			)}

			{/* Video element */}
			<video
				ref={videoRef}
				className={`w-full h-full object-cover ${isLoading || hasError ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
				src={videoSrc}
				playsInline
				loop
				muted={isMuted}
				onCanPlay={handleVideoLoaded}
				onError={handleVideoError}
				preload="auto"
			/>

			{/* Video controls */}
			<div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex flex-col">
				{/* Progress bar */}
				{!isLoading && !hasError && videoDuration > 0 && (
					<div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
						<div
							className="h-full bg-accent"
							style={{ width: `${(currentTime / videoDuration) * 100}%` }}
						></div>
					</div>
				)}

				<div className="flex justify-between items-center">
					<div className="flex-1">
						<p className="text-white font-medium text-lg">{title}</p>
						{isPlaying && !isLoading && !hasError && (
							<div className="flex items-center text-white/70 text-xs">
								<Eye className="h-3 w-3 mr-1" />
								<span>リアルタイムゲームプレイ映像</span>
								<span className="ml-2">{formatTime(currentTime)} / {formatTime(videoDuration)}</span>
							</div>
						)}
					</div>

					<div className="flex gap-2">
						<button
							onClick={togglePlay}
							disabled={hasError || isLoading}
							className={`rounded-full p-2 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors ${(hasError || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
								}`}
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
							disabled={hasError || isLoading}
							className={`rounded-full p-2 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors ${(hasError || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
								}`}
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
		</div>
	);
}