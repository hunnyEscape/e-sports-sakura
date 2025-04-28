'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function AccessSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.1 });

	return (
		<section
			id="access"
			className="py-20 bg-background/90"
			ref={ref}
		>
			<div className="container mx-auto md:px-4">
				{/* セクションタイトル */}
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-3">
						アクセス<span className="text-accent">・料金</span>
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto p-5">
						便利な立地と分かりやすい料金体系。
						いつでも気軽に立ち寄れます。
					</p>
				</motion.div>

				{/* 料金・アクセス情報 */}
				<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
					{/* 料金カード */}
					<motion.div
						className="bg-border/5 rounded-2xl p-8 shadow-soft"
						initial={{ opacity: 0, x: -30 }}
						animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
						transition={{ duration: 0.5 }}
					>
						<div className="text-accent mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<rect x="2" y="4" width="20" height="16" rx="2"></rect>
								<path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
								<path d="M17.5 14.5c-1.5 1.26-3.6 2-5.5 2-1.9 0-4-.74-5.5-2"></path>
							</svg>
						</div>

						<h3 className="text-2xl font-bold mb-6">料金</h3>

						<div className="space-y-4">
							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">基本</span>
								<span className="text-xl font-bold text-foreground/70">¥600<span className="text-sm font-normal">/時間</span></span>
							</div>
							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">会員登録で</span>
								<span className="text-xl font-bold text-accent">1000円分のクーポン</span>
							</div>
							<div className="flex justify-between items-center pb-3">
								<span className="text-foreground/70">ドリンク・お菓子</span>
								<span className="text-highlight">無料</span>
							</div>
							<p className="text-sm text-foreground/60 mt-4">
								※料金は1分単位で自動計算され、月末にまとめて登録支払い方法から引き落とされます。<br/>
							</p>
						</div>
					</motion.div>

					{/* アクセスカード */}
					<motion.div
						className="bg-border/5 rounded-2xl p-8 shadow-soft"
						initial={{ opacity: 0, x: 30 }}
						animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<div className="text-accent mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
								<circle cx="12" cy="10" r="3"></circle>
							</svg>
						</div>

						<h3 className="text-2xl font-bold mb-6">アクセス</h3>

						<div className="space-y-4">
							<div className="flex justify-between items-start border-b border-border pb-3">
								<span className="text-foreground/70">住所</span>
								<span className="text-right">東京都立川市錦町2-1-2<br />第2ビル 2F</span>
							</div>

							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">最寄り駅</span>
								<span className="text-right">JR立川駅 北口から<br />徒歩4分</span>
							</div>

							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">営業時間</span>
								<span className="text-highlight">24時間・年中無休</span>
							</div>

							<div className="flex justify-between items-center pb-3">
								<span className="text-foreground/70">電話</span>
								<span>042-XXX-XXXX</span>
							</div>

							<div className="mt-4 bg-border/10 rounded-xl p-4 text-center">
								<p className="text-foreground/70 mb-2">Google マップで見る</p>
								<a
									href="https://goo.gl/maps/example"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-block bg-accent/90 hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors duration-300"
								>
									地図を開く
								</a>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}