'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

// 利用シーンのデータ
const usageScenes = [
	{
		id: 'scene-1',
		title: 'もう少し話そうか、ってなった夜に',
		description: 'サシ飲みの後、別れるには早い。ここで話を続けませんか？居心地の良いスペースで、二人だけの時間を。',
		image: '/images/lp/scene-pair.jpg',
		alt: 'サシ飲み後のペア'
	},
	{
		id: 'scene-2',
		title: 'ちょっとゲームして帰る？',
		description: '飲み会の解散後、そのまま帰るには物足りない。友達と一緒に盛り上がれるワイワイ系ゲームで、夜を締めくくろう。',
		image: '/images/lp/scene-group.jpg',
		alt: '飲み会帰りのグループ'
	},
	{
		id: 'scene-3',
		title: '終電逃しても、ここがある',
		description: '終電を逃してしまっても大丈夫。24時間営業の秘密基地で、朝まで没頭できるゲームの世界が待っています。',
		image: '/images/lp/scene-solo.jpg',
		alt: 'ソロゲーマー'
	}
];

export default function FeaturesSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	// アニメーション設定
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.3
			}
		}
	};

	const cardVariants = {
		hidden: { opacity: 0, y: 50 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.6,
				ease: "easeOut"
			}
		}
	};

	return (
		<section
			id="features"
			className="py-20 bg-gradient-to-b from-background to-background/90"
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
						<span className="text-accent">こんな時に</span>、利用されています
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						予約不要で、ふらっと立ち寄れる秘密基地。
						一人でも、友達とでも、思い立った時にすぐ利用できます。
					</p>
				</motion.div>

				{/* 利用シーンカード */}
				<motion.div
					className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
					variants={containerVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
				>
					{usageScenes.map((scene, index) => (
						<motion.div
							key={scene.id}
							className="
                bg-border/10 rounded-2xl overflow-hidden 
                shadow-soft hover:shadow-lg transition-all 
                duration-300 hover:translate-y-[-5px]
              "
							variants={cardVariants}
							custom={index}
						>
							<div className="h-56 relative overflow-hidden">
								<Image
									src={scene.image}
									alt={scene.alt}
									fill
									style={{ objectFit: 'cover' }}
									className="transition-transform duration-500 hover:scale-105"
								/>
							</div>
							<div className="p-6">
								<h3 className="text-xl font-semibold mb-3">{scene.title}</h3>
								<p className="text-foreground/70">{scene.description}</p>
							</div>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
}