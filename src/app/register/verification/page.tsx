'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function VerificationPage() {
	const router = useRouter();

	// 本人確認ページは廃止し、決済情報ページへ自動リダイレクト
	useEffect(() => {
		router.push('/register/payment');
	}, [router]);

	return (
		<div className="flex justify-center items-center py-10">
			<LoadingSpinner size="large" />
			<span className="ml-3">決済情報登録ページへリダイレクト中...</span>
		</div>
	);
}