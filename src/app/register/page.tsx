'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function RegisterIndexPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	// src/app/register/page.tsx の変更箇所

	useEffect(() => {
		// 認証とデータのロードが完了したら処理
		if (!loading) {
			if (!user) {
				// 未ログインユーザーはログインページへ
				router.push('/login');
				return;
			}

			if (userData) {
				// 登録状態に応じて適切なページへリダイレクト
				if (userData.registrationCompleted) {
					// 登録済みならダッシュボードへ
					router.push('/dashboard');
				} else if (userData.registrationStep !== undefined) {
					// 登録途中ならその続きのページへ
					const steps = [
						'/register/payment', // verification を削除し、最初のステップを payment に
						'/register/complete'
					];
					router.push(steps[userData.registrationStep] || '/register/payment');
				} else {
					// 登録開始 - 直接 payment ページへ
					router.push('/register/payment');
				}
			} else {
				// userData読込中のエラー - 直接 payment ページへ
				router.push('/register/payment');
			}
		}
	}, [user, userData, loading, router]);

	return (
		<div className="flex items-center justify-center py-12">
			<LoadingSpinner size="large" />
		</div>
	);
}