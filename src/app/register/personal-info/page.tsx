'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PersonalInfoRedirectPage() {
  const router = useRouter();

  // 決済情報ページに自動リダイレクト（本人確認ページではなく）
  useEffect(() => {
    router.push('/register/payment');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="large" />
      <span className="ml-2">決済情報登録ページへリダイレクト中...</span>
    </div>
  );
}