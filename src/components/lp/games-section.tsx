'use client';

import React, { useState, useEffect } from 'react';
import { VALID_CATEGORIES, GAME_DATA } from '@/lib/gameData';
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

	// Handle category change
	const handleCategoryChange = (category) => {
		if (VALID_CATEGORIES.includes(category)) {
			setCurrentCategory(category);
			setActiveIndex(0);
			setIsLoading(true);

			// Simulate loading when changing categories
			setTimeout(() => {
				setIsLoading(false);
			}, 300);
		}
	};

	// Get the category data
	const categoryData = GAME_DATA[currentCategory];

	// Get all video sources for preloading
	const videoSources = categoryData.games.map(game =>
		game.videoSrc.startsWith('http') ? game.videoSrc : `${cloudFrontUrl}${game.videoSrc}`
	);

	return (
		<section id="games" className="py-16">
			<div className="container mx-auto px-4">
				<CategoryPageContainer category={currentCategory}>
					{isLoading ? (
						<div className="flex items-center justify-center min-h-[600px]">
							<div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
						</div>
					) : (
						<div className="min-h-[600px]">
							<GameCategoryLayout
								category={currentCategory}
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

				{/* Call to Action */}
				<div className="text-center mt-16">
					<p className="text-xl mb-4">これらのゲームをプレイしてみませんか？</p>
					<a
						href="#reservation"
						className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full font-medium text-lg transition-colors"
					>
						今すぐ予約する
					</a>
				</div>
			</div>
		</section>
	);
}