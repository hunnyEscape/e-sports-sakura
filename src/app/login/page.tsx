'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import EmailPasswordForm from '@/components/auth/email-password-form';

export default function LoginPage() {
	const { user, loading, signInWithGoogle, error } = useAuth();
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const router = useRouter();

	useEffect(() => {
		// ユーザーが既にログインしている場合はダッシュボードにリダイレクト
		if (user && !loading) {
			router.push('/dashboard');
		}
	}, [user, loading, router]);

	const handleGoogleSignIn = async () => {
		try {
			setIsLoggingIn(true);
			await signInWithGoogle();
			// 認証成功時は自動的にリダイレクトされるため、ここでは何もしない
		} catch (err) {
			console.error('Login error:', err);
			setIsLoggingIn(false);
		}
	};

	if (loading || (user && !loading)) {
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
						<Link href="/" className="flex items-center">
							<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
						</Link>

					</div>
				</div>
			</header>

			{/* ログインフォーム */}
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="bg-border/5 rounded-2xl shadow-soft p-8 max-w-md w-full">
					<h1 className="text-2xl font-bold text-center mb-8">ログイン / 会員登録</h1>

					{/* メールパスワードによるログイン/登録フォーム */}
					<div className="mb-8">
						<EmailPasswordForm />
					</div>

					{/* または区切り */}
					<div className="relative mb-8">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-background text-foreground/50">または</span>
						</div>
					</div>

					{/* ソーシャルログイン */}
					<div className="space-y-4">
						<button
							onClick={handleGoogleSignIn}
							disabled={isLoggingIn}
							className="
                w-full bg-white text-gray-700 font-medium
                px-4 py-3 rounded-xl border border-gray-300
                flex items-center justify-center space-x-2
                hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent
                disabled:opacity-70 disabled:cursor-not-allowed
                transition-colors duration-200
              "
						>
							{isLoggingIn ? (
								<LoadingSpinner size="small" />
							) : (
								<>
									<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
										<path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
										<path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
										<path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
										<path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
									</svg>
									<span>Googleでログイン</span>
								</>
							)}
						</button>

						<button
							disabled={true}
							className="
                w-full bg-black text-white font-medium
                px-4 py-3 rounded-xl
                flex items-center justify-center space-x-2
                opacity-50 cursor-not-allowed
              "
						>
							<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
								<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
							</svg>
							<span>Apple IDでログイン</span>
							<span className="text-xs ml-1">(準備中)</span>
						</button>
					</div>

					<p className="text-center text-foreground/60 text-sm mt-6">
						ログインすると<Link href="/terms" className="text-accent hover:underline">利用規約</Link>および
						<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>に同意したことになります。
					</p>
				</div>
			</div>
		</div>
	);
}