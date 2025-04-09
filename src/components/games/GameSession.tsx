'use client';

import React, { useRef, useEffect, useState } from 'react';
import StickyGameVideo from './StickyGameVideo';

interface Game {
	id: string;
	title: string;
	description: string;
	playerCount: string;
	recommendedTime: string;
	difficulty: string;
	videoSrc: string;
	thumbnailSrc: string;
	similarGames: string[];
}

interface GameSectionProps {
	game: Game;
	isActive: boolean;
	onVisibilityChange: (isVisible: boolean) => void;
	globalAudioEnabled?: boolean; // 新しいプロップ
}

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
						<h2 className="text-3xl font-bold mb-6">{game.title}</h2>
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
					<p className="mb-4 text-lg ml-2">{game.description}</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-border/10 p-6 rounded-2xl">
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">プレイ人数</h4>
							<p className="text-lg font-bold">{game.playerCount}</p>
						</div>
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">推奨プレイ時間</h4>
							<p className="text-lg font-bold">{game.recommendedTime}</p>
						</div>
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">難易度</h4>
							<p className="text-lg font-bold">{game.difficulty}</p>
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
					<h3 className="text-xl font-bold mb-4">ゲーム体験</h3>
					<p className="mb-4">
						当店では、最高の環境でこのゲームをお楽しみいただけます。最新のハードウェアと大画面モニターで、
						臨場感あふれるゲーム体験をご提供します。
					</p>
					<p className="mb-4">
						友達との対戦や協力プレイも可能です。初心者の方にもスタッフがサポートいたします。
					</p>
				</div>

				<div className="mb-8">
					<h3 className="text-xl font-bold mb-4">類似ゲーム</h3>
					<p className="mb-3">このゲームを気に入ったら、こちらもおすすめです：</p>
					<div className="flex flex-wrap gap-2">
						{game.similarGames.map(similarGame => (
							<span
								key={similarGame}
								className="px-4 py-2 bg-border/20 rounded-full text-base"
							>
								{similarGame}
							</span>
						))}
					</div>
				</div>
			</>
		);
	}
}