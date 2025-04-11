'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function HeroSection() {
	const title = "疲れたから「ゆるゲー気分」";
	const [titleChars, setTitleChars] = useState<string[]>([]);

	useEffect(() => {
		setTitleChars(title.split(''));
	}, []);

	return (
		<section className="relative min-h-screen flex items-center overflow-hidden">
			<div className="fixed inset-0 z-[-1]">
				<Image
					src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/hero-bg.webp`}
					alt="深夜のゲーミングスペース"
					fill
					priority
					quality={90}
					style={{ objectFit: 'cover' }}
					className="brightness-50"
				/>
			</div>


			{/* コンテンツオーバーレイ */}
			<div className="container mx-auto px-4 relative z-10">
				<div className="max-w-4xl">
					{/* タイトル文字ごとのアニメーション */}
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 flex flex-wrap">
						{titleChars.map((char, index) => (
							<motion.span
								key={index}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.5,
									delay: 0.1 + index * 0.04,
									ease: "easeOut"
								}}
							>
								{char === " " ? "\u00A0" : char}
							</motion.span>
						))}
					</h1>

					{/* サブキャッチコピー */}
					<motion.p
						className="text-xl md:text-2xl text-foreground/90 mb-8"
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.7, delay: 0.5 }}
					>
						コスパもいいし。～ふらっと寄れるゲームカフェ～
					</motion.p>

					{/* CTAボタン */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.8 }}
					>
						<Link
							href="/register"
							className="
                inline-block bg-accent hover:bg-accent/90 
                text-white font-semibold py-3 px-8 
                rounded-2xl shadow-soft 
                transition-all duration-300 hover:translate-y-[-2px]
              "
						>
							3分で会員登録完了
						</Link>
					</motion.div>
				</div>
			</div>

			{/* 下スクロール案内 */}
			<motion.div
				className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1, y: [0, 10, 0] }}
				transition={{
					delay: 1.2,
					duration: 1.5,
					repeat: Infinity,
					repeatType: "loop"
				}}
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-foreground/70"
				>
					<path d="M12 5v14M5 12l7 7 7-7" />
				</svg>
			</motion.div>
		</section>
	);
}