'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

export default function CtaSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<section id="cta" className="py-24 relative bg-background/90" ref={ref}>
			<div className="container mx-auto px-4 relative z-10 text-center">
				<motion.div
					className="max-w-5xl mx-auto"
					initial={{ opacity: 0, y: 30 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-5xl md:text-5xl font-bold mb-6">
						ふらっと立ち寄って<span className="text-accent">みませんか？</span>
					</h2>

					<p className="text-xl text-foreground/80 mb-10">
						暇な夜も、帰りたくない夜も、終電を逃した夜も。<br />
						あなただけの秘密基地で、特別な時間を過ごしませんか？
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							href="/register"
							className="
									bg-accent hover:bg-accent/90 
									text-white font-semibold py-4 px-8 
									rounded-2xl shadow-lg 
									transition-all duration-300 hover:translate-y-[-2px]
									text-lg
								"
						>
							今すぐ会員登録
						</Link>
					</div>
				</motion.div>
			</div>
		</section>
	);
}