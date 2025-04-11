'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';

export default function HomePage() {
	const { user, loading } = useAuth();
	const router = useRouter();

	// ログイン済みの場合はダッシュボードにリダイレクト
	useEffect(() => {
		if (user && !loading) {
			router.push('/dashboard');
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground">
			{/* ヘッダー */}
			<header className="bg-background/80 backdrop-blur-sm border-b border-border">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between h-16">
						<Link href="/lp" className="flex items-center">
							<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
						</Link>
					</div>
				</div>
			</header>

			{/* メインコンテンツ */}
			<main className="flex-1 flex items-center justify-center p-4">
				<div className="text-center max-w-2xl">
					<h1 className="text-4xl font-bold mb-6">E-Sports Sakura</h1>
					<p className="text-xl mb-8">
						24時間営業、QRコード1つで簡単アクセス。<br />
						高性能ゲーミングPCを使った新しいコワーキング体験。
					</p>
					<div className="flex flex-col sm:flex-row justify-center gap-4">
						<Button
							href="/login"
							variant="primary"
							size="lg"
						>
							ログイン / 会員登録
						</Button>

					</div>
				</div>
			</main>

			{/* フッター */}
			<footer className="bg-background border-t border-border py-4">
				<div className="container mx-auto px-4 text-center">
					<p className="text-foreground/60 text-sm">
						&copy; {new Date().getFullYear()} E-Sports Sakura. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}