'use client';

import React, { useState, useEffect } from 'react';
import GameSection from './GameSession';
import AudioPermissionModal from './AudioPermissionModal';
import { useAudio } from '@/context/AudioContext';
import { Game } from '../../lib/gameData';
interface GameCategoryLayoutProps {
	games: Game[];
	onActiveIndexChange?: (index: number) => void;
}
export default function GameCategoryLayout({
	games,
	onActiveIndexChange
}: GameCategoryLayoutProps) {
	const [activeGameIndex, setActiveGameIndex] = useState(0);
	const [visibleSections, setVisibleSections] = useState<boolean[]>(Array(games.length).fill(false));
	const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || 'https://d1abhb48aypmuo.cloudfront.net/e-sports-sakura';

	// オーディオコンテキストを使用
	const { globalAudioEnabled } = useAudio();

	// Prepare games with full video URLs
	const gamesWithFullUrls = games.map(game => ({
		...game,
		videoSrc: game.videoSrc.startsWith('http') ? game.videoSrc : `${cloudFrontUrl}${game.videoSrc}`
	}));

	// Notify parent of active index changes
	useEffect(() => {
		if (onActiveIndexChange) {
			onActiveIndexChange(activeGameIndex);
		}
	}, [activeGameIndex, onActiveIndexChange]);

	// 可視状態が変更されたときのハンドラー
	const handleVisibilityChange = (index: number, isVisible: boolean) => {
		setVisibleSections(prev => {
			const newState = [...prev];
			newState[index] = isVisible;
			return newState;
		});
	};

	// 可視セクションが変わったら、activeゲームを更新
	useEffect(() => {
		const visibleIndex = visibleSections.findIndex(isVisible => isVisible);
		if (visibleIndex !== -1 && visibleIndex !== activeGameIndex) {
			setActiveGameIndex(visibleIndex);
		}
	}, [visibleSections, activeGameIndex]);

	return (
		<>
			{gamesWithFullUrls.map((game, index) => (
				<React.Fragment key={game.id}>
					{index === 0 && (
						<div className="h-[50vh] flex items-center justify-center w-full">
							<div className="text-center pb-20">
								<h2 className="text-xl md:text-4xl font-bold mb-4 mx-auto w-full">マルチプレイで笑い飛ばすｗｗ</h2>
								<p className="text-lg text-muted-foreground mx-auto w-full">
									Youtube実況で大人気のワイワイ系タイトル
								</p>
							</div>
						</div>
					)}
					{index === 3 && (
						<div className="h-[50vh] flex items-center justify-center w-full">
							<div className="text-center pb-20">
								<h2 className="text-xl md:text-4xl font-bold mb-4 mx-auto w-full">本格協力プレイ</h2>
								<p className="text-lg text-muted-foreground mx-auto w-full">
									密に協力するディープな達成感
								</p>
							</div>
						</div>
					)}

					<GameSection
						game={game}
						isActive={index === activeGameIndex}
						onVisibilityChange={(isVisible) => handleVisibilityChange(index, isVisible)}
						globalAudioEnabled={globalAudioEnabled}
					/>
				</React.Fragment>
			))}

		</>
	);
}