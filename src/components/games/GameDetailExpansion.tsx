'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Users, Clock, Award, CalendarDays, Tag } from 'lucide-react';

interface Game {
	id: string;
	title: string;
	description: string;
	playerCount: string;
	recommendedTime: string;
	difficulty: string;
	similarGames: string[];
}

interface GameDetailExpansionProps {
	game: Game;
	isActive: boolean;
}

export default function GameDetailExpansion({ game, isActive }: GameDetailExpansionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div
			className={`rounded-xl p-4 mb-4 transition-all duration-300 ${isActive
					? 'bg-border/20 shadow-soft border border-border/30'
					: 'bg-background/70'
				}`}
		>
			<div className="flex justify-between items-start mb-3">
				<div>
					<h3 className="text-xl font-bold">{game.title}</h3>
					<p className="text-sm text-foreground/80 mt-1">{game.description}</p>
				</div>

				<button
					onClick={toggleExpand}
					className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-accent/10 text-accent' : 'bg-border/20 text-foreground/70'
						}`}
					aria-label={isExpanded ? '詳細を閉じる' : '詳細を見る'}
				>
					{isExpanded ? (
						<ChevronUp className="h-5 w-5" />
					) : (
						<ChevronDown className="h-5 w-5" />
					)}
				</button>
			</div>

			<div className="flex flex-wrap gap-3 mb-3">
				<div className="flex items-center bg-border/10 px-3 py-1.5 rounded-full text-sm">
					<Users className="h-4 w-4 mr-1.5 text-foreground/60" />
					<span>{game.playerCount}</span>
				</div>
				<div className="flex items-center bg-border/10 px-3 py-1.5 rounded-full text-sm">
					<Clock className="h-4 w-4 mr-1.5 text-foreground/60" />
					<span>{game.recommendedTime}</span>
				</div>
				<div className="flex items-center bg-border/10 px-3 py-1.5 rounded-full text-sm">
					<Award className="h-4 w-4 mr-1.5 text-foreground/60" />
					<span>{game.difficulty}</span>
				</div>
			</div>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						className="overflow-hidden"
					>
						<div className="border-t border-border/20 pt-3 mt-2">
							<h4 className="text-sm font-medium mb-2 flex items-center">
								<Tag className="h-4 w-4 mr-1.5 text-foreground/60" />
								類似ゲーム
							</h4>

							<div className="flex flex-wrap gap-2 mb-4">
								{game.similarGames.map((similarGame) => (
									<span
										key={similarGame}
										className="bg-border/15 px-3 py-1 rounded-full text-xs"
									>
										{similarGame}
									</span>
								))}
							</div>

							<div className="bg-border/10 rounded-xl p-3 mb-2">
								<h4 className="text-sm font-medium mb-1 flex items-center">
									<CalendarDays className="h-4 w-4 mr-1.5 text-foreground/60" />
									利用可能時間
								</h4>
								<p className="text-xs text-foreground/70">平日: 10:00 〜 22:00</p>
								<p className="text-xs text-foreground/70">土日祝: 9:00 〜 23:00</p>
							</div>

							<p className="text-xs text-foreground/60 italic">
								* 料金は時間帯によって異なります
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<button
				className={`w-full py-2 mt-3 rounded-xl text-sm font-medium transition-colors ${isActive
						? 'bg-accent text-background'
						: 'bg-border/30 hover:bg-border/50 text-foreground'
					}`}
			>
				このゲームで予約する
			</button>
		</div>
	);
}