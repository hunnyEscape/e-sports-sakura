'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import StickyGameVideo from './StickyGameVideo';
import QuickGameNav from './QuickGameNav';
import CategoryHeader from './CategoryHeader';
import GameDetailExpansion from './GameDetailExpansion';
import { ScrollSnapItem } from './ScrollSnapContainer';

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

interface GameCategoryLayoutProps {
	category: string;
	title: string;
	description: string;
	games: Game[];
	onActiveIndexChange?: (index: number) => void;
}

export default function GameCategoryLayout({
	category,
	title,
	description,
	games,
	onActiveIndexChange
}: GameCategoryLayoutProps) {
	const [activeGameIndex, setActiveGameIndex] = useState(0);
	const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
	const gameRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [isMobile, setIsMobile] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Observer for scrolling effects
	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth < 768);
		};

		// Call once to set initial state
		handleResize();

		// Add event listener
		window.addEventListener('resize', handleResize);

		// Remove event listener on cleanup
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Notify parent of active index changes
	useEffect(() => {
		if (onActiveIndexChange) {
			onActiveIndexChange(activeGameIndex);
		}
	}, [activeGameIndex, onActiveIndexChange]);

	// Scroll to the selected game on desktop
	useEffect(() => {
		if (isMobile || !gameRefs.current[activeGameIndex]) return;

		const targetElement = gameRefs.current[activeGameIndex];
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}, [activeGameIndex, isMobile]);

	useEffect(() => {
		if (!isMobile) return;

		// Set up IntersectionObserver to detect which game is in view
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						const index = gameRefs.current.findIndex(ref => ref === entry.target);
						if (index !== -1 && index !== activeGameIndex) {
							setActiveGameIndex(index);
						}
					}
				});
			},
			{ threshold: 0.6, rootMargin: "-20% 0px" } // Trigger when 60% of the element is visible with margin
		);

		// Observe all game sections
		gameRefs.current.forEach(ref => {
			if (ref) observer.observe(ref);
		});

		// Cleanup
		return () => {
			gameRefs.current.forEach(ref => {
				if (ref) observer.unobserve(ref);
			});
		};
	}, [activeGameIndex, isMobile]);

	// Get category-specific accent for quick nav
	const getCategoryColorClass = () => {
		return 'ring-accent';
	};

	// Get category-specific button style
	const getCategoryButtonStyle = () => {
		return 'bg-accent text-background font-medium';
	};

	const toggleGameDetails = (gameId: string) => {
		if (expandedDetails === gameId) {
			setExpandedDetails(null);
		} else {
			setExpandedDetails(gameId);
		}
	};

	return (
		<div className="relative">
			{/* 固定ヘッダー */}
			<CategoryHeader
				category={category}
				title={title}
				description={description}
			/>

			{/* Quick game navigation for desktop */}
			<QuickGameNav
				games={games}
				activeGameIndex={activeGameIndex}
				onGameSelect={setActiveGameIndex}
				categoryColor={getCategoryColorClass()}
			/>

			{/* Desktop layout */}
			{!isMobile && (
				<div className="hidden md:flex max-w-7xl mx-auto pt-6" ref={containerRef}>
					{/* Game info column */}
					<div className="w-1/2 p-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-8 scrollbar-thin">
						{games.map((game, index) => (
							<div
								key={game.id}
								ref={el => gameRefs.current[index] = el}
								className={`mb-8 p-6 rounded-2xl transition-all duration-300 cursor-pointer ${index === activeGameIndex
										? 'bg-border/20 shadow-soft scale-100 animate-fadeIn'
										: 'bg-transparent scale-95 opacity-70 hover:opacity-90 hover:bg-border/10'
									}`}
								onClick={() => setActiveGameIndex(index)}
							>
								<h2 className="text-2xl font-bold mb-2">{game.title}</h2>
								<p className="mb-4">{game.description}</p>

								<div className="grid grid-cols-2 gap-4 mb-4">
									<div>
										<p className="text-foreground/60 text-sm">プレイ人数</p>
										<p className="font-medium">{game.playerCount}</p>
									</div>
									<div>
										<p className="text-foreground/60 text-sm">推奨プレイ時間</p>
										<p className="font-medium">{game.recommendedTime}</p>
									</div>
									<div>
										<p className="text-foreground/60 text-sm">難易度</p>
										<p className="font-medium">{game.difficulty}</p>
									</div>
								</div>

								<div>
									<p className="text-foreground/60 text-sm mb-1">類似ゲーム</p>
									<div className="flex flex-wrap gap-2">
										{game.similarGames.map(similarGame => (
											<span
												key={similarGame}
												className="px-3 py-1 bg-border/30 rounded-full text-sm"
											>
												{similarGame}
											</span>
										))}
									</div>
								</div>

								<button
									className={`mt-4 w-full py-2 rounded-xl transition-colors ${index === activeGameIndex
											? getCategoryButtonStyle()
											: 'bg-border/30 hover:bg-border/50'
										}`}
								>
									予約する
								</button>
							</div>
						))}
					</div>

					{/* Sticky video column */}
					<div className="w-1/2 sticky top-28 self-start h-[calc(100vh-180px)]">
						<StickyGameVideo
							videoSrc={games[activeGameIndex].videoSrc}
							title={games[activeGameIndex].title}
							thumbnailSrc={games[activeGameIndex].thumbnailSrc}
							isActive={true}
						/>
					</div>
				</div>
			)}

			{/* Mobile layout */}
			{isMobile && (
				<div className="md:hidden">
					{/* Sticky video at top */}
					<div className="sticky top-28 z-10 w-full h-64 bg-background">
						<StickyGameVideo
							videoSrc={games[activeGameIndex].videoSrc}
							title={games[activeGameIndex].title}
							thumbnailSrc={games[activeGameIndex].thumbnailSrc}
							isActive={true}
						/>
					</div>

					{/* Scrollable game details */}
					<div className="px-4 pt-4 pb-20 snap-mandatory snap-y">
						{games.map((game, index) => (
							<div
								key={game.id}
								ref={el => gameRefs.current[index] = el}
								className="snap-start"
							>
								<GameDetailExpansion
									game={game}
									isActive={index === activeGameIndex}
								/>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}