'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

// FAQ項目
const faqItems = [
	{
		question: "予約は必要？",
		answer: `
			予約は不要です。会員登録さえ完了していれば、いつでもドアのQRコードリーダーにかざすだけで入店できます。
			混雑状況はマイページで確認できるので、事前にチェックすることも可能です。
			確実なご予定がある場合は事前に予約しておくことをオススメいたします。
			`
	},
	{
		question: "夜中でも安全？",
		answer: `
			24時間体制のセキュリティシステムを導入しており、出入り管理も厳重に行っています。
			また、緊急時にはヘルプボタンでスタッフとすぐに連絡が取れる体制を整えています。
			セキュリティ会社とも提携しているため、安心してご利用いただけます。
			`
	},
	{
		question: "持ち込みは可能？",
		answer: `飲食物の持ち込みは不可です。ヘッドセットなど個人の周辺機器の持ち込みは歓迎しています。ただし、大型機材や他のお客様のご迷惑になるものはご遠慮ください。`
	},
	{
		question: "支払い方法は？",
		answer: "会員登録時にクレジットカードを登録いただくと、利用後に自動的に料金が引き落とされます。従量課金制で、1時間400円（税込）からのご利用が可能です。追加料金や会費はありません。"
	},
	{
		question: "インストールできるゲームは？",
		answer: "基本的な人気ゲームは既にインストール済みです。それ以外にも、お客様自身でSteamやEpic Gamesなどからゲームをインストールすることも可能です。ただし、退出時にはアカウント情報などは消去されますのでご注意ください。"
	}
];

export default function FaqSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.1 });
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	const toggleAccordion = (index: number) => {
		setOpenIndex(openIndex === index ? null : index);
	};

	return (
		<section
			id="faq"
			className="py-20 bg-gradient-to-b from-background/70 to-background/90 h-auto min-h-real-screen-80"
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
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						よくある<span className="text-accent">質問</span>
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						ご不明点があれば、お気軽にお問い合わせください。
						LINEでも直接ご質問いただけます。
					</p>
				</motion.div>

				{/* FAQ アコーディオン */}
				<div className="max-w-3xl mx-auto space-y-4">
					{faqItems.map((item, index) => (
						<motion.div
							key={index}
							className="bg-border/5 rounded-xl overflow-hidden shadow-soft"
							initial={{ opacity: 0, y: 20 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
							transition={{ duration: 0.4, delay: index * 0.1 }}
						>
							{/* 質問部分（クリックで開閉） */}
							<button
								className="w-full px-6 py-4 text-left flex justify-between items-center"
								onClick={() => toggleAccordion(index)}
							>
								<span className="font-medium text-lg">{item.question}</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className={`h-5 w-5 text-accent transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
										clipRule="evenodd"
									/>
								</svg>
							</button>

							{/* 回答部分（アニメーション付き） */}
							<AnimatePresence>
								{openIndex === index && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.3 }}
										className="overflow-hidden"
									>
										<div className="px-6 pb-4 text-foreground/70 border-t border-border/20 pt-3">
											{item.answer}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}