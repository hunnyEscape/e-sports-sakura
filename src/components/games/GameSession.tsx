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
			const colorClass = COLOR_MAP[color] || COLOR_MAP.strong;
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
			className={`relative min-h-screen py-0 md:py-0 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50'}`}
		>
			<div className="container mx-auto px-4">
				<div className="md:hidden flex flex-col">
					<div className="sticky top-28 z-10 h-[40vh] mb-8">
						<StickyGameVideo
							videoSrc={game.videoSrc}
							title={game.title}
							thumbnailSrc={game.thumbnailSrc}
							isActive={isActive}
							globalAudioEnabled={globalAudioEnabled}
							onAudioStateChange={handleAudioStateChange}
						/>
					</div>
					<div className="max-w-3xl mx-auto">
						<h2 className="text-3xl font-bold mb-2">{game.title}</h2>
						<p className="mb-8 text-lg">{game.description}</p>
						{renderGameDetails(game)}
					</div>
				</div>
				<div className="hidden md:flex">
					<div className="w-1/2 pr-8">
						<div className="max-w-xl ml-auto h-screen flex items-center">
							{gameTitleDetails(game)}
						</div>
						<div className="max-w-xl ml-auto h-screen">
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
					<h2 className="text-3xl font-bold mb-1 ml-2">{game.title}</h2>
					<p className="mb-4 ml-2">{renderMarkdownText(game.description)}</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-border/10 p-6 rounded-2xl">
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">プレイ人数</h4>
							<p className="text-lg text-foreground/60">{game.playerCount}</p>
						</div>
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">推奨プレイ時間</h4>
							<p className="text-lg text-foreground/60">{game.recommendedTime}</p>
						</div>
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">難易度</h4>
							<p className="text-lg text-foreground/60">{game.difficulty}</p>
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
					<p className="mb-2">
						{renderMarkdownText(game.rule)}
					</p>
				</div>
			</>
		);
	}
}