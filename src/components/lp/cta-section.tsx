'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

export default function CtaSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<section
			id="cta"
			className="py-24 relative"
			ref={ref}
		>
			{/* 背景画像 */}
			<div className="absolute inset-0 z-0">
				<Image
					src="/images/lp/cta-bg.jpg"
					alt="ゲーミングスペースの夜景"
					fill
					style={{ objectFit: 'cover' }}
					className="brightness-25"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
			</div>

			<div className="container mx-auto px-4 relative z-10 text-center">
				<motion.div
					className="max-w-2xl mx-auto"
					initial={{ opacity: 0, y: 30 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-4xl md:text-5xl font-bold mb-6">
						今夜、ふらっと立ち寄って<span className="text-accent">みない？</span>
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

						<Link
							href="https://line.me/R/ti/p/@example"
							target="_blank"
							rel="noopener noreferrer"
							className="
                bg-[#06C755] hover:bg-[#06C755]/90
                text-white font-semibold py-4 px-8 
                rounded-2xl shadow-lg 
                transition-all duration-300 hover:translate-y-[-2px]
                flex items-center justify-center gap-2
                text-lg
              "
						>
							<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
								<path d="M12 2C6.4772 2 2 5.6519 2 10.1C2 13.4682 4.2066 16.3507 7.4999 17.5835C7.6518 17.6368 7.8483 17.7352 7.899 17.8889C7.9497 18.0419 7.9168 18.2756 7.8871 18.4238C7.8176 18.7601 7.6465 19.4743 7.6465 19.4743C7.6073 19.6469 7.5157 20.1332 8.0001 20.3904C8.4846 20.6475 8.9199 20.2317 9.2769 19.909C9.6347 19.586 10.3685 18.958 10.8319 18.5752C13.2514 19.4452 16.0002 18.8669 18.2245 17.4077C20.9407 15.6807 22.0001 12.9711 22.0001 10.0999C22.0001 5.6519 17.5229 2 12 2ZM6.8904 12.8297C6.8904 12.9042 6.8022 12.9937 6.6925 12.9937L6.6924 12.9937L5.0523 12.9929C4.9426 12.9929 4.8532 12.9042 4.8532 12.8297L4.8532 12.8296L4.8533 9.55301C4.8533 9.47849 4.9428 9.38899 5.0525 9.38899L5.0526 9.38899L6.6927 9.38969C6.8024 9.38969 6.8906 9.47921 6.8906 9.55373V9.55375L6.8904 12.8297ZM11.2289 12.8297C11.2289 12.9042 11.1407 12.9937 11.0311 12.9937L11.031 12.9937L9.39087 12.9929C9.28121 12.9929 9.19183 12.9042 9.19183 12.8297L9.19182 12.8296L9.19194 9.55302C9.19194 9.4785 9.2814 9.389 9.39107 9.389L9.39109 9.389L11.0312 9.3897C11.1409 9.3897 11.2291 9.47922 11.2291 9.55374V9.55375L11.2289 12.8297ZM17.4679 12.8293C17.4679 12.9039 17.3784 12.9933 17.2688 12.9933L17.2687 12.9933L15.6288 12.9926C15.522 12.9926 15.4357 12.9081 15.4315 12.8356L15.4315 12.8347L15.4306 10.8297L13.6558 13.2862C13.6153 13.3389 13.5628 13.3602 13.5097 13.3602C13.4561 13.3602 13.4035 13.3388 13.3623 13.2861L11.5965 10.8476V12.8347C11.5965 12.9092 11.507 12.9987 11.3973 12.9987L11.3973 12.9987L9.75707 12.9979C9.6474 12.9979 9.55802 12.9092 9.55802 12.8347L9.55802 12.8347L9.55814 9.5581C9.55814 9.50101 9.59586 9.448 9.65622 9.42173C9.71658 9.39523 9.78981 9.39898 9.84669 9.43097L9.8467 9.43098L13.5093 11.7657L17.1765 9.43064C17.2334 9.39866 17.3066 9.39491 17.367 9.4214C17.4274 9.44766 17.4651 9.5007 17.4651 9.55779V9.55781L17.4679 12.8293ZM19.1441 12.8297C19.1441 12.9042 19.0547 12.9937 18.945 12.9937L18.945 12.9937L17.305 12.9929C17.1953 12.9929 17.1059 12.9042 17.1059 12.8297L17.1059 12.8296L17.106 9.55301C17.106 9.47849 17.1955 9.38899 17.3052 9.38899L17.3052 9.38899L18.9453 9.38969C19.055 9.38969 19.1432 9.47921 19.1432 9.55373V9.55375L19.1441 12.8297Z" />
							</svg>
							LINEで登録
						</Link>
					</div>

					<p className="mt-6 text-foreground/60">
						※LINE連携で会員登録すると、<span className="text-highlight">初回1時間無料</span>クーポンをプレゼント
					</p>
				</motion.div>
			</div>
		</section>
	);
}