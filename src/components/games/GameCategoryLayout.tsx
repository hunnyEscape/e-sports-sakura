'use client';

import React, { useState, useEffect } from 'react';
import GameSection from './GameSession';
import AudioPermissionModal from './AudioPermissionModal';
import { useAudio } from '@/context/AudioContext';
import {Game} from '../../lib/gameData';
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
			<AudioPermissionModal />
			{gamesWithFullUrls.map((game, index) => (
				<GameSection
					key={game.id}
					game={game}
					isActive={index === activeGameIndex}
					onVisibilityChange={(isVisible) => handleVisibilityChange(index, isVisible)}
					globalAudioEnabled={globalAudioEnabled}
				/>
			))}
		</>
	);
}