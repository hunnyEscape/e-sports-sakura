'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

// 利用シーンのデータ
const usageScenes = [
	{
		id: 'scene-1',
		title: '夕飯・サシ飯があっさり終了',
		description: '夜街でもうちょっと時間つぶしたい！ノンアルコールで時間を潰せる場所です。ふかふかの椅子でマイホームな時間を。',
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/scene-pair.webp`,
		alt: 'サシ飲み後のペア'
	},
	{
		id: 'scene-2',
		title: '集まったけど、、ゲームだったら楽しめる？',
		description:'共通項がなくてもマルチプレイで盛り上がるタイトルをご用意してます。監事さん思いの場所です。',
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/scene-group.webp`,
		alt: '飲み会帰りのグループ'
	},
	{
		id: 'scene-3',
		title:'久々の自由時間',
		description:'ゲームは好きだけどたまにしかやる時間が取れない！厳選された数多くのタイトルをご用意してます。',
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/scene-solo.webp`,
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
						予約不要、一人でも、友達とでも、思い立った時にすぐ利用できます。
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