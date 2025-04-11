'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

// スペック情報
const specs = [
	{
		category: "PC",
		items: [
			{ label: "グラフィックス", value: "NVIDIA RTX 4070" },
			{ label: "CPU", value: "AMD Ryzen 7 7800X3D" },
			{ label: "メモリ", value: "32GB DDR5" },
			{ label: "ストレージ", value: "1TB NVMe SSD" },
			{ label: "モニター", value: "34インチ 湾曲ウルトラワイド WQHD 120Hz" }
		],
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/spec1.webp`,
	},
	{
		category: "周辺機器",
		items: [
			{ label: "ゲーミングチェア", value: "社長椅子 レザーリクライニングチェア" },
			{ label: "キーボード", value: "Logicool K835GPR メカニカルキーボード 赤軸" },
			{ label: "マウス", value: "Xiaomi 72g 6200調節可能DPI" },
			{ label: "ヘッドセット", value: "HyperX Cloud III" },
			{ label: "コントローラー", value: "Xbox / Switch Proコン対応" }
		],
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/spec2.webp`,
	},
	{
		category: "設備・サービス",
		items: [
			{ label: "ネット回線", value: "有線LAN 1Gbps (Ping 6ms以下)" },
			{ label: "ドリンク", value: "フリードリンク (コーヒー、お茶など)" },
			{ label: "スナック", value: "お菓子付き (補充は定期的)" },
		],
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/spec3.webp`,
	}
];

export default function SpecsSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.1 });

	return (
		<section
			id="specs"
			className="py-20 bg-gradient-to-b from-background/90 to-background/70"
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
						<span className="text-accent">本格</span>スペック＆設備
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						ゲームを本気で楽しむために快適な環境をご用意しています。
					</p>
				</motion.div>

				{/* スペック情報 */}
				<div className="space-y-20">
					{specs.map((specGroup, groupIndex) => (
						<motion.div
							key={specGroup.category}
							initial={{ opacity: 0, y: 40 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
							transition={{ duration: 0.6, delay: groupIndex * 0.2 }}
							className="bg-border/5 rounded-3xl overflow-hidden shadow-soft"
						>
							<div className="grid md:grid-cols-2">
								{/* イメージ部分 - 奇数と偶数で順番入れ替え */}
								<div className={`${groupIndex % 2 === 1 ? 'md:order-2' : ''} h-64 md:h-auto relative`}>
									<Image
										src={specGroup.image}
										alt={specGroup.category}
										fill
										style={{ objectFit: 'cover' }}
										className="brightness-90"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent md:bg-gradient-to-r md:from-background/60 md:to-transparent flex items-end p-6">
										<h3 className="text-2xl font-bold text-white">
											{specGroup.category}
										</h3>
									</div>
								</div>

								{/* スペック詳細 */}
								<div className={`${groupIndex % 2 === 1 ? 'md:order-1' : ''} p-6 md:p-8`}>
									<ul className="space-y-4">
										{specGroup.items.map((item, itemIndex) => (
											<motion.li
												key={item.label}
												initial={{ opacity: 0, x: -10 }}
												animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
												transition={{ duration: 0.3, delay: groupIndex * 0.2 + itemIndex * 0.1 }}
												className="flex justify-between items-center border-b border-border pb-3"
											>
												<span className="text-foreground/70">{item.label}</span>
												<span className="font-medium text-accent">{item.value}</span>
											</motion.li>
										))}
									</ul>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}