'use client';
//src/app/register/layout.tsx
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { RegistrationProvider } from '@/context/registration-context';
import ProgressTracker from '@/components/registration/progress-tracker';
import ProtectedRoute from '@/components/auth/protected-route';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function RegisterLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const { user, loading } = useAuth();
	const router = useRouter();

	// 認証中の表示
	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<ProtectedRoute>
			<RegistrationProvider>
				<div className="min-h-screen flex flex-col bg-background text-foreground">
					{/* ヘッダー */}
					<header className="bg-background/80 backdrop-blur-sm border-b border-border">
						<div className="container mx-auto px-4">
							<div className="flex items-center justify-between h-16">
								<Link href="/lp" className="flex items-center">
									<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
								</Link>

								<div className="flex items-center space-x-4">
									<Link href="/dashboard" className="text-foreground/70 hover:text-accent">
										登録をキャンセル
									</Link>
								</div>
							</div>
						</div>
					</header>

					{/* メインコンテンツ */}
					<main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
						<h1 className="text-2xl md:text-3xl font-bold text-center mb-8">会員登録</h1>

						{/* 進行状況トラッカー */}
						<ProgressTracker />

						{/* 各ステップのコンテンツ */}
						{children}
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
			</RegistrationProvider>
		</ProtectedRoute>
	);
}