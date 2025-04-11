'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/auth-context';

export default function LpHeader() {
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	
	// 認証状態を取得
	const { user, userData } = useAuth();
	
	// スクロール処理
	const controlHeader = () => {
		const currentScrollY = window.scrollY;

		if (currentScrollY > lastScrollY && currentScrollY > 100) {
			// 下にスクロール中かつ100px以上スクロール済み → 非表
			setIsVisible(false);
		} else {
			// 上にスクロール中 → 表示
			setIsVisible(true);
		}

		setLastScrollY(currentScrollY);
	};

	/*
	useEffect(() => {
		window.addEventListener('scroll', controlHeader);

		return () => {
			window.removeEventListener('scroll', controlHeader);
		};
	}, [lastScrollY]);
*/
	return (
		<motion.header
			className={`relative top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border transition-transform duration-300`}
			initial={{ translateY: 0 }}
			animate={{ translateY: isVisible ? 0 : '-100%' }}
			transition={{ duration: 0.3 }}
		>
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between h-16">
					<Link href="/" className="flex items-center">
						<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
					</Link>

					{/* デスクトップナビゲーション */}
					<nav className="hidden md:block">
						<ul className="flex space-x-6">
							<li>
								<Link href="#features" className="text-foreground/70 hover:text-accent transition-colors">
									利用シーン
								</Link>
							</li>
							<li>
								<Link href="#games" className="text-foreground/70 hover:text-accent transition-colors">
									ゲーム
								</Link>
							</li>
							<li>
								<Link href="#steps" className="text-foreground/70 hover:text-accent transition-colors">
									使い方
								</Link>
							</li>
							<li>
								<Link href="#specs" className="text-foreground/70 hover:text-accent transition-colors">
									スペック
								</Link>
							</li>
							<li>
								<Link href="#faq" className="text-foreground/70 hover:text-accent transition-colors">
									FAQ
								</Link>
							</li>
							<li>
								<Link href="#access" className="text-foreground/70 hover:text-accent transition-colors">
									アクセス
								</Link>
							</li>
						</ul>
					</nav>

					{/* モバイルメニューボタン */}
					<div className="md:hidden">
						<button
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							className="text-foreground p-2"
						>
							{isMobileMenuOpen ? (
								<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							) : (
								<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
								</svg>
							)}
						</button>
					</div>

					{/* ログイン状態に応じてボタンを表示 */}
					{user ? (
						<Link
							href="/dashboard"
							className="
								hidden md:block
								px-4 py-2 rounded-xl 
								border border-accent text-accent 
								hover:bg-accent hover:text-white 
								transition-colors duration-300
							"
						>
							マイページ
						</Link>
					) : (
						<Link
							href="/login"
							className="
								hidden md:block
								px-4 py-2 rounded-xl 
								border border-accent text-accent 
								hover:bg-accent hover:text-white 
								transition-colors duration-300
							"
						>
							ログイン
						</Link>
					)}
				</div>

				{/* モバイルナビゲーション */}
				{isMobileMenuOpen && (
					<motion.div
						className="md:hidden py-4 border-t border-border/20"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.3 }}
					>
						<ul className="space-y-3">
							<li>
								<Link
									href="#features"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									利用シーン
								</Link>
							</li>
							<li>
								<Link
									href="#games"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									ゲーム
								</Link>
							</li>
							<li>
								<Link
									href="#steps"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									使い方
								</Link>
							</li>
							<li>
								<Link
									href="#specs"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									スペック
								</Link>
							</li>
							<li>
								<Link
									href="#faq"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									FAQ
								</Link>
							</li>
							<li>
								<Link
									href="#access"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									アクセス
								</Link>
							</li>
							<li className="pt-2">
								{/* モバイルメニューでもログイン状態に応じて表示変更 */}
								{user ? (
									<Link
										href="/dashboard"
										className="block py-2 text-accent hover:underline"
										onClick={() => setIsMobileMenuOpen(false)}
									>
										マイページ
									</Link>
								) : (
									<Link
										href="/login"
										className="block py-2 text-accent hover:underline"
										onClick={() => setIsMobileMenuOpen(false)}
									>
										ログイン
									</Link>
								)}
							</li>
						</ul>
					</motion.div>
				)}
			</div>
		</motion.header>
	);
}