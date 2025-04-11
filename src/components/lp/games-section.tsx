'use client';

import React, { useState, useEffect } from 'react';
import { GAME_DATA } from '@/lib/gameData';
import GameCategoryLayout from '@/components/games/GameCategoryLayout';
import VideoPreloader from '@/components/games/VideoPreloader';
import { CategoryPageContainer } from '@/components/ui/PageTransition';

export default function GamesSection() {
	// Use 'party' as the default category for the landing page
	const defaultCategory = 'party';
	const [isLoading, setIsLoading] = useState(true);
	const [activeIndex, setActiveIndex] = useState(0);
	const [currentCategory, setCurrentCategory] = useState(defaultCategory);
	const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

	useEffect(() => {
		// Simulate loading data
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 500);

		return () => clearTimeout(timer);
	}, []);

	// Get the category data
	const categoryData = GAME_DATA[currentCategory];

	// Get all video sources for preloading
	const videoSources = categoryData.games.map(game =>
		game.videoSrc.startsWith('http') ? game.videoSrc : `${cloudFrontUrl}${game.videoSrc}`
	);

	return (
		<section id="games" className="py-0 bg-background/90">
			<div className="container mx-auto px-4">
				<CategoryPageContainer category={currentCategory}>
					{isLoading ? (
						<div className="flex items-center justify-center min-h-[600px]">
							<div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
						</div>
					) : (
						<div className="min-h-[600px]">
							<GameCategoryLayout
								games={categoryData.games}
								onActiveIndexChange={setActiveIndex}
							/>
						</div>
					)}
				</CategoryPageContainer>
			</div>
		</section>
	);
}