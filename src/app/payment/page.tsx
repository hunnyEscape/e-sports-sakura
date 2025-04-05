'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRegistration } from '@/context/registration-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Stripeのテスト用モジュール（実際はStripe.jsを使用）
const mockStripeSetup = () => {
	return new Promise<boolean>((resolve) => {
		// 支払い成功をシミュレート
		setTimeout(() => resolve(true), 2000);
	});
};

export default function PaymentPage() {
	const { completeRegistration, loading, error } = useRegistration();
	const [isStripeLoaded, setIsStripeLoaded] = useState(false);
	const [stripeError, setStripeError] = useState<string | null>(null);
	const [isPaymentComplete, setIsPaymentComplete] = useState(false);

	// Stripe.jsをロード
	useEffect(() => {
		const loadStripeJS = async () => {
			try {
				// 本来ならStripe.jsをロードするコード
				// 今回はモック実装とします

				// Stripe.jsのロードを模擬
				setTimeout(() => {
					setIsStripeLoaded(true);
				}, 1000);
			} catch (err) {
				console.error('Error loading Stripe.js:', err);
				setStripeError('決済モジュールの読み込みに失敗しました。再読み込みしてください。');
			}
		};

		loadStripeJS();
	}, []);

	// 支払い情報を設定
	const handleSetupPayment = async () => {
		try {
			setStripeError(null);

			// Stripe決済設定を開始（モック）
			const result = await mockStripeSetup();

			if (result) {
				setIsPaymentComplete(true);
			} else {
				setStripeError('決済情報の設定に失敗しました。もう一度お試しください。');
			}

		} catch (err) {
			console.error('Error setting up payment:', err);
			setStripeError('決済処理中にエラーが発生しました。もう一度お試しください。');
		}
	};

	// 登録完了処理
	const handleComplete = async () => {
		await completeRegistration();
	};

	return (
		<div className="bg-border/5 rounded-xl shadow-soft p-6">
			<h2 className="text-xl font-semibold mb-6">決済情報の登録</h2>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{error}
				</div>
			)}

			{stripeError && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{stripeError}
				</div>
			)}

			<div className="space-y-6">
				{isPaymentComplete ? (
					<div className="bg-green-500/10 text-green-500 p-4 rounded-lg mb-6">
						<div className="flex items-center">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="font-medium">決済情報の登録が完了しました。</span>
						</div>
					</div>
				) : (
					<div className="bg-blue-500/10 text-blue-500 p-4 rounded-lg mb-6">
						<p>
							サービスをご利用いただくには、お支払い情報の登録が必要です。<br />
							サービス利用後に自動的に決済されます。
						</p>
					</div>
				)}

				<div className="space-y-4">
					<h3 className="text-lg font-medium">料金プラン</h3>

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

				<div className="pt-2">
					<div className="flex flex-wrap justify-center gap-2 mb-4">
						<div className="w-10 h-6">
							<Image
								src="/images/visa.svg"
								alt="Visa"
								width={40}
								height={24}
								className="object-contain"
							/>
						</div>
						<div className="w-10 h-6">
							<Image
								src="/images/mastercard.svg"
								alt="MasterCard"
								width={40}
								height={24}
								className="object-contain"
							/>
						</div>
						<div className="w-10 h-6">
							<Image
								src="/images/amex.svg"
								alt="American Express"
								width={40}
								height={24}
								className="object-contain"
							/>
						</div>
						<div className="w-10 h-6">
							<Image
								src="/images/jcb.svg"
								alt="JCB"
								width={40}
								height={24}
								className="object-contain"
							/>
						</div>
					</div>

					{isPaymentComplete ? (
						<Button
							onClick={handleComplete}
							disabled={loading}
							className="w-full"
						>
							{loading ? <LoadingSpinner size="small" /> : '登録を完了する'}
						</Button>
					) : (
						<Button
							onClick={handleSetupPayment}
							disabled={loading || !isStripeLoaded}
							className="w-full"
						>
							{loading || !isStripeLoaded ? <LoadingSpinner size="small" /> : 'カード情報を登録する'}
						</Button>
					)}

					<p className="mt-4 text-sm text-foreground/60 text-center">
						クレジットカード情報は安全に保管され、許可なく請求されることはありません。<br />
						※実際の実装では、Stripeの決済システムを使用します。
					</p>
				</div>
			</div>
		</div>
	);
}