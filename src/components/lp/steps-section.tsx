'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// 利用ステップデータ
const usageSteps = [
	{
		number: 1,
		title: "QRコードで入室",
		description: "会員登録後に表示されるQRコードをドアの読み取り機にかざすだけで入室できます。",
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<rect x="7" y="7" width="3" height="3"></rect>
				<rect x="14" y="7" width="3" height="3"></rect>
				<rect x="7" y="14" width="3" height="3"></rect>
				<rect x="14" y="14" width="3" height="3"></rect>
			</svg>
		)
	},
	{
		number: 2,
		title: "好きな席で自由に",
		description: "お好きな席に座り、席のQRコードをスキャンするだけでPCが起動。すぐにゲームが始められます。",
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
				<polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
				<line x1="12" y1="22.08" x2="12" y2="12"></line>
			</svg>
		)
	},
	{
		number: 3,
		title: "そのまま帰るだけ",
		description: "利用終了後は席を立ってそのまま帰るだけ。料金は自動計算され、登録されたカードから引き落とされます。",
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
				<polyline points="16 17 21 12 16 7"></polyline>
				<line x1="21" y1="12" x2="9" y2="12"></line>
			</svg>
		)
	}
];

export default function StepsSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="steps"
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
						<span className="text-accent">めちゃ簡単</span>、3ステップで
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						面倒な手続きも、スタッフ対応も必要ありません。
						24時間いつでも、スマホ1つで完結します。
					</p>
				</motion.div>

				{/* ステップカード */}
				<div className="flex flex-col md:flex-row gap-8 justify-between max-w-4xl mx-auto">
					{usageSteps.map((step, index) => (
						<motion.div
							key={step.number}
							className="bg-border/10 rounded-2xl p-6 md:p-8 flex-1 relative shadow-soft"
							initial={{ opacity: 0, y: 30 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
							transition={{ duration: 0.5, delay: index * 0.15 }}
						>
							{/* ステップ番号 */}
							<div className="absolute -top-4 -left-4 bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md">
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
		</section>
	);
}