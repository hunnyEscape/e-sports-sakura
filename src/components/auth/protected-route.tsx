'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
	children: React.ReactNode;
	redirectUrl?: string;
}

export default function ProtectedRoute({
	children,
	redirectUrl = '/login'
}: ProtectedRouteProps) {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.push(redirectUrl);
		}
	}, [user, loading, router, redirectUrl]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return user ? <>{children}</> : null;
}