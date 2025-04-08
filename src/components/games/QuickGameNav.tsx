'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface Game {
	id: string;
	title: string;
	thumbnailSrc: string;
}

interface QuickGameNavProps {
	games: Game[];
	activeGameIndex: number;
	onGameSelect: (index: number) => void;
	categoryColor?: string;
}

export default function QuickGameNav({
	games,
	activeGameIndex,
	onGameSelect,
	categoryColor = 'ring-accent'
}: QuickGameNavProps) {
	return (
		<div className="fixed right-8 top-1/2 -translate-y-1/2 z-30 hidden md:block">
			<div className="flex flex-col items-center space-y-4 bg-background/50 backdrop-blur-sm p-2 rounded-full shadow-soft">
				{games.map((game, index) => (
					<motion.button
						key={game.id}
						onClick={() => onGameSelect(index)}
						className={`relative rounded-full overflow-hidden transition-all duration-300 ${activeGameIndex === index
								? 'w-12 h-12 ring-2 ring-offset-2 ring-offset-background ' + categoryColor
								: 'w-10 h-10 opacity-70 hover:opacity-100'
							}`}
						whileHover={{ scale: activeGameIndex === index ? 1 : 1.1 }}
						whileTap={{ scale: 0.95 }}
						title={game.title}
					>
						<Image
							src={game.thumbnailSrc}
							alt={game.title}
							fill
							style={{ objectFit: 'cover' }}
						/>
						{activeGameIndex === index && (
							<div className="absolute inset-0 ring-1 ring-white/30"></div>
						)}
					</motion.button>
				))}
			</div>
		</div>
	);
}