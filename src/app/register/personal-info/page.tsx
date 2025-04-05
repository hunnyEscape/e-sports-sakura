'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PersonalInfoRedirectPage() {
	const router = useRouter();

	// 本人確認ページに自動リダイレクト
	useEffect(() => {
		router.push('/register/verification');
	}, [router]);

	return (
		<div className="flex items-center justify-center py-12">
			<LoadingSpinner size="large" />
			<span className="ml-2">リダイレクト中...</span>
		</div>
	);
}