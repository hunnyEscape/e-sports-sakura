'use client';

import React, { useRef, useEffect, useState } from 'react';

interface ScrollSnapContainerProps {
	children: React.ReactNode;
	onSectionChange?: (index: number) => void;
	initialIndex?: number;
	className?: string;
}

/**
 * スクロールスナップコンテナ
 * モバイルでのスクロール体験を向上させるためのコンポーネント
 */
export default function ScrollSnapContainer({
	children,
	onSectionChange,
	initialIndex = 0,
	className = ''
}: ScrollSnapContainerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	// 初期位置へのスクロール
	useEffect(() => {
		if (!containerRef.current || initialIndex === 0 || isInitialized) return;

		const childElements = containerRef.current.children;
		if (initialIndex < childElements.length) {
			const targetElement = childElements[initialIndex];
			targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
			setIsInitialized(true);
		}
	}, [initialIndex, isInitialized]);

	// スクロール位置の監視とコールバック
	useEffect(() => {
		if (!containerRef.current || !onSectionChange) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						const index = Array.from(containerRef.current?.children || []).findIndex(
							child => child === entry.target
						);
						if (index !== -1) {
							onSectionChange(index);
						}
					}
				});
			},
			{
				root: containerRef.current,
				threshold: 0.7, // 70%が見えた時に変更と見なす
				rootMargin: '0px'
			}
		);

		// 子要素を監視
		Array.from(containerRef.current.children).forEach(child => {
			observer.observe(child);
		});

		return () => {
			observer.disconnect();
		};
	}, [onSectionChange]);

	return (
		<div
			ref={containerRef}
			className={`scroll-snap-container overflow-y-auto snap-y snap-mandatory ${className}`}
			style={{
				scrollBehavior: 'smooth',
				WebkitOverflowScrolling: 'touch'
			}}
		>
			{children}
		</div>
	);
}

/**
 * スクロールスナップアイテム
 * ScrollSnapContainerの子要素として使用するコンポーネント
 */
export function ScrollSnapItem({
	children,
	className = ''
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`snap-start ${className}`}>
			{children}
		</div>
	);
}