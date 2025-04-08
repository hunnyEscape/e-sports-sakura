'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// ゲームカテゴリとタイトル
const gameCategories = [
	{
		id: 'party',
		title: 'ワイワイ系',
		caption: 'コントローラーで2人でも盛り上がれる',
		games: [
			{ name: 'Party Animals', icon: '/images/lp/games/overcooked.png' },
			{ name: 'Fall Guys', icon: '/images/lp/games/fallguys.png' },
			{ name: 'Pummel Party', icon: '/images/lp/games/pummel.png' }
		],
		image: '/images/lp/games/party.jpg',
		alt: 'ワイワイ系ゲーム'
	},
	{
		id: 'competitive',
		title: '競技系',
		caption: '120FPSでぬるぬる動く、プロ仕様',
		games: [
			{ name: 'Counter-Strike 2', icon: '/images/lp/games/valorant.png' },
			{ name: 'PUBG', icon: '/images/lp/games/pubg.png' },
			{ name: 'Apex Legends', icon: '/images/lp/games/apex.png' }
		],
		image: '/images/lp/games/competitive.jpg',
		alt: '競技系ゲーム'
	},
	{
		id: 'immersive',
		title: 'じっくり系',
		caption: '1人でも仲間とでも、',
		games: [
			{ name: 'Operation: Tango', icon: '/images/lp/games/slaythespire.png' },
			{ name: 'Portal 2', icon: '/images/lp/games/cities.png' },
			{ name: 'The Witness', icon: '/images/lp/games/witness.png' }
		],
		image: '/images/lp/games/immersive.jpg',
		alt: 'じっくり系ゲーム'
	}
];

export default function GamesSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="games"
			className="py-20 bg-gradient-to-b from-background/90 to-background"
			ref={ref}
		>
			<div className="container mx-auto px-4">
				{/* セクションタイトル */}
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						気分に合わせて<span className="text-accent">遊べるゲーム</span>
					</h2>
					<p className="text-foreground/70 max-w-4xl mx-auto">
						RTX 4070搭載のPCで、あらゆるゲームを快適に。
						一人でじっくり、友達とワイワイ、あなた好みのプレイスタイルで。
					</p>
				</motion.div>

				{/* ゲームカテゴリ */}
				<div className="space-y-24">
					{gameCategories.map((category, index) => (
						<motion.div
							key={category.id}
							className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12`}
							initial={{ opacity: 0, y: 50 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
							transition={{ duration: 0.6, delay: index * 0.2 }}
						>
							{/* ゲームカテゴリ画像 - 全体をクリック可能に */}
							<div className="md:w-1/2">
								<Link href={`/games/${category.id}`} className="block">
									<div className="relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-soft group cursor-pointer">
										<Image
											src={category.image}
											alt={category.alt}
											fill
											style={{ objectFit: 'cover' }}
											className="transition-transform duration-700 group-hover:scale-105"
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-6">
											<span className="inline-flex items-center text-white font-medium px-4 py-2 rounded-full bg-accent/80 backdrop-blur-sm">
												詳しく見る <ChevronRight className="ml-1 h-4 w-4" />
											</span>
										</div>
									</div>
								</Link>
							</div>

							{/* ゲーム情報 */}
							<div className="md:w-1/2">
								<Link href={`/games/${category.id}`} className="block">
									<h3 className="text-2xl font-bold mb-3 hover:text-accent transition-colors">
										{category.title}
									</h3>
								</Link>
								<p className="text-accent text-lg mb-6">
									{category.caption}
								</p>

								{/* ゲームリスト */}
								<ul className="space-y-4">
									{category.games.map((game, gameIndex) => (
										<motion.li
											key={game.name}
											className="flex items-center gap-3 bg-border/10 p-3 rounded-xl hover:bg-border/20 transition-colors"
											initial={{ opacity: 0, x: -20 }}
											animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
											transition={{ duration: 0.4, delay: index * 0.2 + gameIndex * 0.1 }}
										>
											<div className="w-8 h-8 relative flex-shrink-0">
												<Image
													src={game.icon}
													alt={game.name}
													width={32}
													height={32}
													className="rounded-md"
												/>
											</div>
											<span>{game.name}</span>
										</motion.li>
									))}
								</ul>

								{/* 詳細へのリンク */}
								<Link
									href={`/games/${category.id}`}
									className="mt-6 inline-flex items-center text-accent hover:text-accent/80 font-medium transition-colors"
								>
									すべてのゲームを見る <ChevronRight className="ml-1 h-4 w-4" />
								</Link>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}