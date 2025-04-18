'use client';

import React, { useState, useEffect, useRef } from 'react';
import GameSection from './GameSession';
import AudioPermissionModal from './AudioPermissionModal';
import { useAudio } from '@/context/AudioContext';
import { Game } from '../../lib/gameData';

interface GameCategoryLayoutProps {
	games: Game[];
	onActiveIndexChange?: (index: number) => void;
}

export default function GameCategoryLayout({
	games,
	onActiveIndexChange
}: GameCategoryLayoutProps) {
	const [activeGameIndex, setActiveGameIndex] = useState(0);
	const [visibleSections, setVisibleSections] = useState<boolean[]>(Array(games.length).fill(false));
	const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || 'https://d1abhb48aypmuo.cloudfront.net/e-sports-sakura';
	// 型を明示的に定義してrefを初期化
	const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
	const [isMobile, setIsMobile] = useState(false);

	// オーディオコンテキストを使用
	const { globalAudioEnabled } = useAudio();

	// Prepare games with full video URLs
	const gamesWithFullUrls = games.map(game => ({
		...game,
		videoSrc: game.videoSrc.startsWith('http') ? game.videoSrc : `${cloudFrontUrl}${game.videoSrc}`
	}));

	// refs配列を初期化
	useEffect(() => {
		// ゲームの数に合わせて参照配列を初期化
		sectionsRef.current = sectionsRef.current.slice(0, games.length);
		while (sectionsRef.current.length < games.length) {
			sectionsRef.current.push(null);
		}
	}, [games.length]);

	// 画面サイズの検出
	useEffect(() => {
		const checkIfMobile = () => {
			setIsMobile(window.innerWidth < 768); // md breakpoint
		};

		// 初期化時にチェック
		checkIfMobile();

		// リサイズイベントをリッスン
		window.addEventListener('resize', checkIfMobile);

		return () => {
			window.removeEventListener('resize', checkIfMobile);
		};
	}, []);

	// Notify parent of active index changes
	useEffect(() => {
		if (onActiveIndexChange) {
			onActiveIndexChange(activeGameIndex);
		}
	}, [activeGameIndex, onActiveIndexChange]);

	// 可視状態が変更されたときのハンドラー
	const handleVisibilityChange = (index: number, isVisible: boolean) => {
		setVisibleSections(prev => {
			const newState = [...prev];
			newState[index] = isVisible;
			return newState;
		});
	};

	// スクロール位置に基づいてアクティブなインデックスを更新するための関数
	const updateActiveIndexBasedOnScroll = () => {
		// スマホでの特別な処理
		if (isMobile) {
			const scrollPosition = window.scrollY + window.innerHeight / 2;

			// sectionsRefに格納されている要素の位置をチェック
			let closestIndex = 0;
			let closestDistance = Infinity;

			sectionsRef.current.forEach((section, index) => {
				if (section) {
					const rect = section.getBoundingClientRect();
					const sectionMiddle = rect.top + window.scrollY + rect.height / 2;
					const distance = Math.abs(scrollPosition - sectionMiddle);

					if (distance < closestDistance) {
						closestDistance = distance;
						closestIndex = index;
					}
				}
			});

			if (closestIndex !== activeGameIndex) {
				setActiveGameIndex(closestIndex);
			}
		} else {
			// デスクトップでは従来のvisibleSectionsベースの処理
			const visibleIndex = visibleSections.findIndex(isVisible => isVisible);
			if (visibleIndex !== -1 && visibleIndex !== activeGameIndex) {
				setActiveGameIndex(visibleIndex);
			}
		}
	};

	// スクロールイベントとIntersection Observerの両方を使用
	useEffect(() => {
		// スクロールイベントリスナー（特にモバイル向け）
		window.addEventListener('scroll', updateActiveIndexBasedOnScroll);

		return () => {
			window.removeEventListener('scroll', updateActiveIndexBasedOnScroll);
		};
	}, [visibleSections, activeGameIndex, isMobile]);

	// 可視セクションが変わったら、activeゲームを更新（従来の処理も維持）
	useEffect(() => {
		if (!isMobile) {
			const visibleIndex = visibleSections.findIndex(isVisible => isVisible);
			if (visibleIndex !== -1 && visibleIndex !== activeGameIndex) {
				setActiveGameIndex(visibleIndex);
			}
		}
	}, [visibleSections, activeGameIndex, isMobile]);

	// タッチスクリーンでのスワイプやタップの追加サポート
	useEffect(() => {
		if (isMobile) {
			// 最後までスクロールしたかを検出
			const handleScroll = () => {
				const scrollHeight = document.documentElement.scrollHeight;
				const scrollTop = window.scrollY;
				const clientHeight = window.innerHeight;

				// 画面下部に近づいたら最後のGameIndexをアクティブに
				if (scrollTop + clientHeight >= scrollHeight - 150) {
					setActiveGameIndex(games.length - 1);
				}
			};

			window.addEventListener('scroll', handleScroll);
			return () => {
				window.removeEventListener('scroll', handleScroll);
			};
		}
	}, [isMobile, games.length]);

	// 手動でゲームを切り替える関数（UIボタン用）
	const handleManualGameChange = (index: number) => {
		setActiveGameIndex(index);
		// 対応するセクションにスクロール
		if (sectionsRef.current[index]) {
			sectionsRef.current[index]?.scrollIntoView({ behavior: 'smooth' });
		}
	};

	// ref設定用のコールバック
	const setRef = (el: HTMLDivElement | null, index: number) => {
		sectionsRef.current[index] = el;
	};

	return (
		<>
			{gamesWithFullUrls.map((game, index) => (
				<React.Fragment key={game.id}>
					{index === 0 && (
						<div className="h-[50vh] flex items-center justify-center w-full">
							<div className="text-center pb-20">
								<h2 className="text-xl md:text-4xl font-bold mb-4 mx-auto w-full">マルチプレイで笑い飛ばすｗｗ</h2>
								<p className="text-lg text-muted-foreground mx-auto w-full">
									Youtube実況で大人気のワイワイ系タイトル
								</p>
							</div>
						</div>
					)}
					{index === 3 && (
						<div className="h-[50vh] flex items-center justify-center w-full">
							<div className="text-center pb-20">
								<h2 className="text-xl md:text-4xl font-bold mb-4 mx-auto w-full">本格協力プレイ</h2>
								<p className="text-lg text-muted-foreground mx-auto w-full">
									密に協力するディープな達成感
								</p>
							</div>
						</div>
					)}

					<div ref={(el) => setRef(el, index)}>
						<GameSection
							game={game}
							isActive={index === activeGameIndex}
							onVisibilityChange={(isVisible) => handleVisibilityChange(index, isVisible)}
							globalAudioEnabled={globalAudioEnabled}
						/>
					</div>
				</React.Fragment>
			))}
		</>
	);
}