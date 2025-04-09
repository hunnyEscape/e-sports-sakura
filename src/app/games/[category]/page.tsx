'use client';

import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import GameCategoryLayout from '@/components/games/GameCategoryLayout';
import VideoPreloader from '@/components/games/VideoPreloader';
import { CategoryPageContainer } from '@/components/ui/PageTransition';
import { VALID_CATEGORIES, GAME_DATA } from '@/lib/gameData';

type Params = {
	params: {
		category: string;
	};
};

export default function GameCategoryPage({ params }: Params) {
	const { category } = params;
	const [isLoading, setIsLoading] = useState(true);
	const [activeIndex, setActiveIndex] = useState(0);
	const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || 'https://d1abhb48aypmuo.cloudfront.net/e-sports-sakura';

	useEffect(() => {
		// Simulate loading data
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 500);

		return () => clearTimeout(timer);
	}, []);

	// Validate that the category exists
	if (!VALID_CATEGORIES.includes(category)) {
		notFound();
	}

	// Get the category data
	const categoryData = GAME_DATA[category as keyof typeof GAME_DATA];

	if (!categoryData) {
		notFound();
	}

	// Get all video sources for preloading
	const videoSources = categoryData.games.map(game => 
		game.videoSrc.startsWith('http') ? game.videoSrc : `${cloudFrontUrl}${game.videoSrc}`
	);

	return (
		<CategoryPageContainer category={category}>
			{isLoading ? (
				<div className="flex items-center justify-center min-h-screen">
					<div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
				</div>
			) : (
				<div className="min-h-screen">
					<GameCategoryLayout
						category={category}
						title={categoryData.title}
						description={categoryData.description}
						games={categoryData.games}
						onActiveIndexChange={setActiveIndex}
					/>

					{/* プリロード用の非表示コンポーネント */}
					<VideoPreloader
						videoSrcs={videoSources}
						currentIndex={activeIndex}
					/>
				</div>
			)}
		</CategoryPageContainer>
	);
}