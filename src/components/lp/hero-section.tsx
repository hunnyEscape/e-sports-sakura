'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function HeroSection() {
	// タイトルを2つのパートに分ける
	const titlePart1 = "疲れたから";
	const titlePart2 = "ゆるゲー気分";
	const [titleChars1, setTitleChars1] = useState<string[]>([]);
	const [titleChars2, setTitleChars2] = useState<string[]>([]);

	useEffect(() => {
		// 文字を個別に分割
		setTitleChars1(titlePart1.split(''));
		setTitleChars2(titlePart2.split(''));
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
					<h1 className="text-5xl md:text-6xl font-bold text-foreground mb-2">
						<div className="flex flex-wrap">
							{/* 「疲れたから」の部分 */}
							<span className="md:inline block w-full">
								{titleChars1.map((char, index) => (
									<motion.span
										key={`part1-${index}`}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.5,
											delay: 0.1 + index * 0.04,
											ease: "easeOut"
										}}
									>
										{char}
									</motion.span>
								))}
							</span>

							{/* スペース（デスクトップのみ表示） - 完全に非表示にして問題を解決 */}
							{/* 必要な場合だけコメントを外してください
							<motion.span
								className="hidden md:inline"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.5, delay: 0.1 + titleChars1.length * 0.04 }}
							>
								{"\u00A0"}
							</motion.span>
							*/}

							{/* 「ゆるゲー気分」の部分 (強調色) */}
							<span className="md:inline text-accent">
								{titleChars2.map((char, index) => (
									<motion.span
										key={`part2-${index}`}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.5,
											delay: 0.1 + (titleChars1.length + index) * 0.04, // 中間スペースの遅延を削除
											ease: "easeOut"
										}}
									>
										{char}
									</motion.span>
								))}
							</span>
						</div>
					</h1>

					<motion.p
						className="text-2xl md:text-3xl text-foreground/90 mb-8"
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.7, delay: 0.5 }}
					>
						ふらっと寄れるゲームカフェ
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
							1分で会員登録完了
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