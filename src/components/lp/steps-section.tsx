'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// 利用ステップデータ
const usageSteps = [
	{
		number: 1,
		title: "QRコードで入室",
		description: "会員QRコードを扉の読み取り機にかざして入室できます。",
		icon: <img src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/qrEnter.webp`} alt="QRコードで入室" className="h-100 w-100" />
	},
	{
		number: 2,
		title: "好きな席で自由に",
		description: "会員QRコードを席の読み取り機にかざしてPCを起動します。インストールやログイン不要！すぐにゲームが始まります。",
		icon: <img src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/qrStart.webp`} alt="好きな席で自由に" className="h-100 w-100" />
	},
	{
		number: 3,
		title: "そのまま帰るだけ",
		description: "PCをシャットダウンして、そのまま帰るだけ。料金は自動計算され、登録されたカードにまとめて月末に請求されます。",
		icon: <img src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/exit.webp`} alt="そのまま帰るだけ" className="h-100 w-100" />
	}
];


export default function StepsSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="steps"
			className="pb-20 bg-background/90"
			ref={ref}
		>
			<div className="container mx-auto px-4">
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						利用は<span className="text-accent">めちゃ簡単</span>、3ステップで
					</h2>
					<p className="text-foreground/70 max-w-3xl mx-auto">
						面倒な手続きも、スタッフ対応も必要ありません。
						24時間いつでも、スマホ1つで完結します。
					</p>
				</motion.div>
				<div className="flex flex-col md:flex-row gap-8 justify-between max-w-4xl mx-auto">
					{usageSteps.map((step, index) => (
						<motion.div
							key={step.number}
							className="bg-border/10 rounded-2xl p-4 md:p-8 flex-1 relative shadow-soft"
							initial={{ opacity: 0, y: 30 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
							transition={{ duration: 0.5, delay: index * 0.15 }}
						>
							{/* ステップ番号 */}
							<div className="absolute -top-4 -left-4 border border-accent bg-transparent w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md">
								{step.number}
							</div>

							{/* アイコン */}
							<div className="text-accent mb-4">
								{step.icon}
							</div>

							{/* コンテンツ */}
							<h3 className="text-xl font-semibold mb-3">
								{step.title}
							</h3>
							<p className="text-foreground/70">
								{step.description}
							</p>

							{/* 接続線（最後のアイテムには不要） */}
							{index < usageSteps.length - 1 && (
								<div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-accent transform">
									<div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-accent rotate-45"></div>
								</div>
							)}
						</motion.div>
					))}
				</div>
			</div>
			<motion.div
				className="mt-16 text-center"
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
				transition={{ duration: 0.5, delay: 0.4 }}
			>
				<h3 className="text-2xl font-bold mb-4">
					さっそく体験してみませんか？
				</h3>
				<p className="text-foreground/70 mb-6">
					初回利用で1時間無料キャンペーン中！
				</p>
				<a
					href="/reservation"
					className="inline-block bg-accent text-white px-6 py-3 rounded-full font-semibold shadow-md hover:brightness-110 transition"
				>
					席を予約する
				</a>
			</motion.div>
		</section>
	);
}