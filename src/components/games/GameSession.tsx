'use client';

import React, { useRef, useEffect, useState } from 'react';
import StickyGameVideo from './StickyGameVideo';
import { Game } from '../../lib/gameData';
interface GameSectionProps {
	game: Game;
	isActive: boolean;
	onVisibilityChange: (isVisible: boolean) => void;
	globalAudioEnabled?: boolean; // 新しいプロップ
}

const COLOR_MAP = {
	primary: 'text-primary-600 dark:text-primary-300',
	secondary: 'text-secondary-600 dark:text-secondary-300',
	accent: 'text-accent-600 dark:text-accent-300',
	foreground: 'text-foreground',
	muted: 'text-foreground/60', // More muted base text
	strong: 'text-foreground/70',
	danger: 'text-red-600 dark:text-red-400',
	warning: 'text-orange-600 dark:text-orange-400',
	success: 'text-green-600 dark:text-green-400',
};

// Custom Markdown-like text renderer
const renderMarkdownText = (text: string, baseMuted = true) => {
	// Split the text into parts
	const parts = text.split(/(\*\*.*?\*\*|__.*?__|<.*?>|\^.*?\^)/g);

	return parts.map((part, index) => {
		// Bold with **
		if (/^\*\*.*\*\*$/.test(part)) {
			return <strong key={index}>{part.slice(2, -2)}</strong>;
		}

		// Bold with __
		if (/^__.*__$/.test(part)) {
			return <strong key={index}>{part.slice(2, -2)}</strong>;
		}

		// Color emphasis with ^color^
		if (/^\^.*\^$/.test(part)) {
			const [, color, text] = part.match(/\^(.*?):(.+)\^/) || [];
			const colorClass = COLOR_MAP[color as keyof typeof COLOR_MAP] || COLOR_MAP.strong;
			return <span key={index} className={colorClass}>{text}</span>;
		}

		// HTML tags (like <em>, <strong>, <mark>)
		if (/^<.*>$/.test(part)) {
			// Remove angle brackets
			const tagContent = part.slice(1, -1);

			// Split tag into type and content
			const matches = tagContent.match(/^(\w+)>(.*)<\/\1$/);
			if (matches) {
				const [, tagType, content] = matches;
				const TagComponent = tagType as keyof JSX.IntrinsicElements;
				return <TagComponent key={index}>{content}</TagComponent>;
			}

			return part;
		}

		// Plain text
		return baseMuted ? <span key={index} className="text-foreground/60">{part}</span> : part;
	});
};

export default function GameSection({
	game,
	isActive,
	onVisibilityChange,
	globalAudioEnabled = false
}: GameSectionProps) {
	const sectionRef = useRef<HTMLDivElement>(null);
	const [audioState, setAudioState] = useState(false);

	// オーディオ状態の変更を追跡
	useEffect(() => {
		if (isActive) {
			// アクティブになったときにグローバルオーディオ設定を適用
			setAudioState(globalAudioEnabled);
		}
	}, [isActive, globalAudioEnabled]);
	//}, []);

	// 可視性を監視
	useEffect(() => {
		if (!sectionRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting) {
					onVisibilityChange(true);
				} else {
					onVisibilityChange(false);
				}
			},
			{ threshold: 0.3 } // 30%見えたら判定
		);

		observer.observe(sectionRef.current);

		return () => {
			if (sectionRef.current) {
				observer.unobserve(sectionRef.current);
			}
		};
	}, [onVisibilityChange]);
	//}, []);

	// 個別の動画のオーディオ状態が変更されたときの処理
	const handleAudioStateChange = (isAudioOn: boolean) => {
		setAudioState(isAudioOn);
	};

	return (
		<div
			ref={sectionRef}
			className={`relative min-h-screen py-0 md:py-28 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50'}`}
		>
			<div className="container mx-auto">
				<div className="md:hidden flex flex-col">
					<div className="sticky top-0 z-10 h-[200px] mb-8">
						<StickyGameVideo
							videoSrc={game.videoSrc}
							title={game.title}
							thumbnailSrc={game.thumbnailSrc}
							isActive={isActive}
							globalAudioEnabled={globalAudioEnabled}
							onAudioStateChange={handleAudioStateChange}
						/>
					</div>
					<div className="w-full mx-auto mb-20 p-4">
						{gameTitleDetails(game)}
						{renderGameDetails(game)}
					</div>
				</div>
				<div className="hidden md:flex">
					<div className="w-1/2 pr-8">
						<div className="max-w-4xl ml-auto h-screen flex items-center">
							{gameTitleDetails(game)}
						</div>
						<div className="max-w-4xl ml-auto h-screen">
							{renderGameDetails(game)}
						</div>
					</div>
					<div className="w-1/2">
						<div className="sticky top-1/2 -translate-y-1/2 max-w-4xl">
							<StickyGameVideo
								videoSrc={game.videoSrc}
								title={game.title}
								thumbnailSrc={game.thumbnailSrc}
								isActive={isActive}
								globalAudioEnabled={globalAudioEnabled}
								onAudioStateChange={handleAudioStateChange}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	function gameTitleDetails(game: Game) {
		return (
			<>
				<div className="w-full">
					<h2 className="text-3xl font-bold mb-1">{game.title}</h2>
					<p className="mb-4 text-sm sm:text-base">{renderMarkdownText(game.description)}</p>
					<div className="bg-border/5 rounded-xl overflow-hidden shadow-sm">
						{/* ヘッダー部分（オプション） */}
						<div className="bg-background/30 p-0 md:p-4 border-b border-border/10">
							<h3 className="text-base md:text-lg font-medium">ゲーム詳細</h3>
						</div>

						{/* 情報グリッド */}
						<div className="grid grid-cols-2 gap-2 p-0 md:p-5 sm:grid-cols-2 md:grid-cols-4 md:gap-4 mb-6">
							{/* プレイ人数 */}
							<div className="flex flex-col p-2 md:p-3 rounded-lg hover:bg-background/40 transition-colors duration-200">
								<span className="text-xs md:text-sm text-foreground/50 mb-1">プレイ人数</span>
								<div className="flex items-center">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-accent/80 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
										<circle cx="9" cy="7" r="4"></circle>
										<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
										<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
									</svg>
									<span className="text-sm md:text-base font-medium">{game.playerCount}</span>
								</div>
							</div>

							{/* 推奨プレイ時間 */}
							<div className="flex flex-col p-2 md:p-3 rounded-lg hover:bg-background/40 transition-colors duration-200">
								<span className="text-xs md:text-sm text-foreground/50 mb-1">プレイ時間</span>
								<div className="flex items-center">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-accent/80 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<circle cx="12" cy="12" r="10"></circle>
										<polyline points="12 6 12 12 16 14"></polyline>
									</svg>
									<span className="text-sm md:text-base font-medium">{game.recommendedTime}</span>
								</div>
							</div>

							{/* 難易度 */}
							<div className="flex flex-col p-2 md:p-3 rounded-lg hover:bg-background/40 transition-colors duration-200">
								<span className="text-xs md:text-sm text-foreground/50 mb-1">難易度</span>
								<div className="flex items-center">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-accent/80 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
										<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
									</svg>
									<span className="text-sm md:text-base font-medium">{game.difficulty}</span>
								</div>
							</div>

							{/* ジャンル */}
							<div className="flex flex-col p-2 md:p-3 rounded-lg hover:bg-background/40 transition-colors duration-200">
								<span className="text-xs md:text-sm text-foreground/50 mb-1">ジャンル</span>
								<div className="flex items-center">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-accent/80 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
										<polyline points="2 17 12 22 22 17"></polyline>
										<polyline points="2 12 12 17 22 12"></polyline>
									</svg>
									<span className="text-sm md:text-base font-medium">{game.genre}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</>
		);
	}

	function renderGameDetails(game: Game) {
		return (
			<>
				<div className="mb-8">
					<h3 className="text-xl font-bold mb-1">ルール・コツ</h3>
					<p className="mb-2 text-sm sm:text-base">
						{renderMarkdownText(game.rule)}
					</p>
				</div>
			</>
		);
	}
}