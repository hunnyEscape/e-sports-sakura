// src/app/register/payment/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/context/auth-context';
import EnhancedCardForm from '@/components/payment/enhanced-card-form';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Stripeの公開キーを使用してStripeをロード
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function PaymentPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	// ユーザーがログインしていない場合はログインページへリダイレクト
	useEffect(() => {
		if (!loading && !user) {
			router.push('/login');
		}
	}, [user, loading, router]);

	// 登録が既に完了している場合はダッシュボードへリダイレクト
	useEffect(() => {
		if (userData?.registrationCompleted) {
			router.push('/dashboard');
		}
	}, [userData, router]);

	// ログイン状態確認中
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			<div className="bg-border/5 rounded-xl shadow-soft p-6">
				<h2 className="text-xl font-semibold mb-6">決済情報の登録</h2>

				<div className="bg-blue-500/10 text-blue-600 p-4 rounded-lg mb-6">
					<p>
						サービスをご利用いただくには、お支払い情報の登録が必要です。<br />
						サービス利用後に自動的に決済されます。
					</p>
				</div>

				<div className="space-y-6 mb-8">
					<div>
						<h3 className="text-lg font-medium mb-3">料金プラン</h3>

						<div className="bg-border/10 rounded-lg p-4">
							<div className="flex justify-between items-center mb-2">
								<span className="font-medium">従量課金プラン</span>
								<span className="text-xl font-bold text-accent">¥700 <span className="text-sm font-normal">/時間</span></span>
							</div>
							<ul className="text-sm text-foreground/70 space-y-1">
								<li>• 10分単位での課金（¥120/10分）</li>
								<li>• フリードリンク・お菓子込み</li>
								<li>• 高性能ゲーミングPC利用可能</li>
								<li>• 深夜割増なし（24時間同一料金）</li>
							</ul>
						</div>
					</div>

					<div>
						<Elements stripe={stripePromise}>
							<EnhancedCardForm />
						</Elements>
					</div>
				</div>

				<div className="text-sm text-foreground/60 border-t border-border pt-4">
					<p>
						ご利用に関する注意事項:
					</p>
					<ul className="list-disc pl-5 mt-2 space-y-1">
						<li>料金は利用終了時に計算され、登録されたカードから自動的に請求されます</li>
						<li>領収書はメールで送信されます</li>
						<li>カード情報の変更はマイページから行えます</li>
					</ul>
				</div>
			</div>

			<div className="mt-6 text-center text-sm text-foreground/60">
				<p>
					決済情報の登録により、
					<Link href="/terms" className="text-accent hover:underline">利用規約</Link>と
					<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>に
					同意したものとみなされます。
				</p>
			</div>
		</div>
	);
}