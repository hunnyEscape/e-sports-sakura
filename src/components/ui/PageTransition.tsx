'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
	children: React.ReactNode;
}

/**
 * ページトランジションコンポーネント
 * ページ間の遷移にスムーズなアニメーションを提供します
 */
export default function PageTransition({ children }: PageTransitionProps) {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		// マウント時のアニメーション開始のための微小な遅延
		const timer = setTimeout(() => {
			setIsReady(true);
		}, 50);

		return () => clearTimeout(timer);
	}, []);

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key="page-content"
				initial={{ opacity: 0, y: 20 }}
				animate={{
					opacity: isReady ? 1 : 0,
					y: isReady ? 0 : 20
				}}
				exit={{ opacity: 0, y: -20 }}
				transition={{
					duration: 0.4,
					ease: [0.25, 0.1, 0.25, 1.0], // cubic-bezier
				}}
				className="min-h-screen"
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}

// ページコンテナ用カテゴリ別スタイル適用コンポーネント
export function CategoryPageContainer({
	children,
	category
}: {
	children: React.ReactNode,
	category: string
}) {
	return (
		<div className={`min-h-screen landing-page bg-background text-foreground`}>
			<PageTransition>
				{children}
			</PageTransition>
		</div>
	);
}