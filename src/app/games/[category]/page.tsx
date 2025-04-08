'use client';

import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import GameCategoryLayout from '@/components/games/GameCategoryLayout';
import VideoPreloader from '@/components/games/VideoPreloader';
import { CategoryPageContainer } from '@/components/ui/PageTransition';

// Define the game categories and their IDs that match the route parameters
const VALID_CATEGORIES = ['party', 'competitive', 'immersive'];

// Game data - in a real application, this would come from a database or API
const GAME_DATA = {
	party: {
		title: 'ワイワイ系ゲーム',
		description: 'コントローラーで2人でも盛り上がれる',
		games: [
			{
				id: 'party-animals',
				title: 'Party Animals',
				description: '可愛い動物たちが戦うカオスなパーティーゲーム',
				playerCount: '2-8人',
				recommendedTime: '30分-1時間',
				difficulty: '初心者向け',
				videoSrc: '/videos/party/party-animals.mp4', // Local path for initial development
				thumbnailSrc: '/images/lp/games/overcooked.png',
				similarGames: ['Fall Guys', 'Gang Beasts']
			},
			{
				id: 'fall-guys',
				title: 'Fall Guys',
				description: '障害物競走のバトルロイヤル！最後まで生き残れ',
				playerCount: '1-4人',
				recommendedTime: '20-40分',
				difficulty: '初心者向け',
				videoSrc: '/videos/party/fall-guys.mp4',
				thumbnailSrc: '/images/lp/games/fallguys.png',
				similarGames: ['Party Animals', 'Pummel Party']
			},
			{
				id: 'pummel-party',
				title: 'Pummel Party',
				description: '友情を破壊するミニゲームコレクション',
				playerCount: '4-8人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/videos/party/pummel-party.mp4',
				thumbnailSrc: '/images/lp/games/pummel.png',
				similarGames: ['Mario Party', 'Fall Guys']
			}
		]
	},
	competitive: {
		title: '競技系ゲーム',
		description: '120FPSでぬるぬる動く、プロ仕様',
		games: [
			{
				id: 'counter-strike-2',
				title: 'Counter-Strike 2',
				description: 'タクティカルFPSの金字塔、最新バージョン',
				playerCount: '5v5',
				recommendedTime: '30-90分',
				difficulty: '上級者向け',
				videoSrc: '/videos/competitive/cs2.mp4',
				thumbnailSrc: '/images/lp/games/valorant.png',
				similarGames: ['Valorant', 'Rainbow Six Siege']
			},
			{
				id: 'pubg',
				title: 'PUBG',
				description: 'バトルロイヤルの先駆者、100人での生存競争',
				playerCount: '1-4人',
				recommendedTime: '20-30分',
				difficulty: '中級者向け',
				videoSrc: '/videos/competitive/pubg.mp4',
				thumbnailSrc: '/images/lp/games/pubg.png',
				similarGames: ['Apex Legends', 'Fortnite']
			},
			{
				id: 'apex-legends',
				title: 'Apex Legends',
				description: '高速移動とチームプレイが特徴のヒーローシューター',
				playerCount: '3人チーム',
				recommendedTime: '15-25分',
				difficulty: '中級者向け',
				videoSrc: '/videos/competitive/apex.mp4',
				thumbnailSrc: '/images/lp/games/apex.png',
				similarGames: ['PUBG', 'Valorant']
			}
		]
	},
	immersive: {
		title: 'じっくり系ゲーム',
		description: '1人でも仲間とでも、じっくり楽しめる',
		games: [
			{
				id: 'operation-tango',
				title: 'Operation: Tango',
				description: '2人協力のスパイアドベンチャー、コミュニケーションが鍵',
				playerCount: '2人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/videos/immersive/operation-tango.mp4',
				thumbnailSrc: '/images/lp/games/slaythespire.png',
				similarGames: ['Keep Talking and Nobody Explodes', 'We Were Here']
			},
			{
				id: 'portal-2',
				title: 'Portal 2',
				description: '物理パズルの傑作、協力プレイも可能',
				playerCount: '1-2人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/videos/immersive/portal2.mp4',
				thumbnailSrc: '/images/lp/games/cities.png',
				similarGames: ['The Witness', 'The Talos Principle']
			},
			{
				id: 'the-witness',
				title: 'The Witness',
				description: '美しい島を舞台にした一人称パズルゲーム',
				playerCount: '1人',
				recommendedTime: '2-3時間',
				difficulty: '上級者向け',
				videoSrc: '/videos/immersive/witness.mp4',
				thumbnailSrc: '/images/lp/games/witness.png',
				similarGames: ['Portal 2', 'Braid']
			}
		]
	}
};

type Params = {
	params: {
		category: string;
	};
};

export default function GameCategoryPage({ params }: Params) {
	const { category } = params;
	const [isLoading, setIsLoading] = useState(true);
	const [activeIndex, setActiveIndex] = useState(0);

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
	const videoSources = categoryData.games.map(game => game.videoSrc);

	return (
		<CategoryPageContainer category={category}>
			{isLoading ? (
				<div className="flex items-center justify-center min-h-screen">
					<div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
				</div>
			) : (
				<div className="container mx-auto px-4">
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