'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import VerificationStatus from '@/components/verification/verification-status';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function VerificationPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	// ログイン状態確認中
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	// ユーザーがログインしていない場合
	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center">
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4 max-w-md">
					ログインが必要です。会員登録フローを開始するには、まずログインしてください。
				</div>
				<Link
					href="/login"
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					ログインページへ
				</Link>
			</div>
		);
	}

	// 登録フロー全体が完了している場合
	if (userData?.registrationCompleted) {
		router.push('/dashboard');
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
				<span className="ml-3">ダッシュボードへリダイレクト中...</span>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			{/* メインコンテンツ */}
			<VerificationStatus />

			{/* プライバシーポリシーリンク */}
			<div className="mt-6 text-center text-sm text-foreground/60">
				本人確認の実施により、
				<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>
				と
				<Link href="/terms" className="text-accent hover:underline">利用規約</Link>
				に同意したものとみなされます。
			</div>
		</div>
	);
}