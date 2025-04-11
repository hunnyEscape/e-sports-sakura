// src/components/payment/enhanced-card-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import PaymentMethodSelector from './payment-method-selector';

type PaymentMethodType = 'card' | 'googlePay' | 'applePay';

const cardStyle = {
	style: {
		base: {
			color: '#32325d',
			fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
			fontSmoothing: 'antialiased',
			fontSize: '16px',
			'::placeholder': {
				color: '#aab7c4'
			}
		},
		invalid: {
			color: '#fa755a',
			iconColor: '#fa755a'
		}
	}
};

export default function EnhancedCardForm({ onSuccess }: { onSuccess?: () => void }) {
	const { user } = useAuth();
	const stripe = useStripe();
	const elements = useElements();
	const router = useRouter();

	const [clientSecret, setClientSecret] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [cardComplete, setCardComplete] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [succeeded, setSucceeded] = useState(false);
	const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
	const [paymentRequest, setPaymentRequest] = useState<any>(null);

	// Setup Intentの取得
	useEffect(() => {
		const getSetupIntent = async () => {
			if (!user) return;

			try {
				// まずStripe顧客を作成/取得
				const createCustomerResponse = await fetch('/api/stripe/create-customer', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					}
				});

				if (!createCustomerResponse.ok) {
					throw new Error('Failed to create Stripe customer');
				}

				// Setup Intentを作成
				const setupIntentResponse = await fetch('/api/stripe/create-setup-intent', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					}
				});

				if (!setupIntentResponse.ok) {
					throw new Error('Failed to create Setup Intent');
				}

				const { clientSecret } = await setupIntentResponse.json();
				setClientSecret(clientSecret);

				// PaymentRequestボタンの設定（Google Pay、Apple Pay用）
				if (stripe) {
					const pr = stripe.paymentRequest({
						country: 'JP',
						currency: 'jpy',
						total: {
							label: 'E-Sports Sakura会員登録',
							amount: 0, // Setup Intentのため金額は0
						},
						requestPayerName: true,
						requestPayerEmail: true,
					});

					// PaymentRequestがサポートされているか確認
					const result = await pr.canMakePayment();
					if (result) {
						setPaymentRequest(pr);
					}

					// PaymentRequestのイベントリスナー設定
					pr.on('paymentmethod', async (ev) => {
						if (!clientSecret) return;

						setProcessing(true);

						// PaymentMethodをSetup Intentに付与
						const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
							clientSecret,
							{ payment_method: ev.paymentMethod.id }
						);

						if (confirmError) {
							// エラーがある場合は取引を完了
							ev.complete('fail');
							setError(confirmError.message || 'カード情報の処理中にエラーが発生しました。');
							setProcessing(false);
							return;
						}

						// 成功時
						ev.complete('success');
						if (setupIntent?.status === 'succeeded') {
							await handleSetupSuccess(setupIntent);
						}
					});
				}

			} catch (err) {
				console.error('Error fetching Setup Intent:', err);
				setError('決済情報の初期化中にエラーが発生しました。後でもう一度お試しください。');
			}
		};

		getSetupIntent();
	}, [user, stripe]);

	// カード情報の処理
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!stripe || !elements || !clientSecret) {
			// Stripeがまだロードされていない場合
			return;
		}

		setProcessing(true);
		setError(null);

		try {
			const cardElement = elements.getElement(CardElement);
			if (!cardElement) {
				throw new Error('Card Element not found');
			}

			// カード情報を送信
			const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
				payment_method: {
					card: cardElement,
					billing_details: {
						email: user?.email || '',
					},
				}
			});

			if (stripeError) {
				setError(stripeError.message || 'カード情報の処理中にエラーが発生しました。');
				setProcessing(false);
				return;
			}

			// セットアップ成功時の処理
			if (setupIntent) {
				await handleSetupSuccess(setupIntent);
			}

		} catch (err) {
			console.error('Error processing card:', err);
			setError('カード情報の処理中にエラーが発生しました。もう一度お試しください。');
			setProcessing(false);
		}
	};

	// セットアップ成功時の処理
	const handleSetupSuccess = async (setupIntent: any) => {
		setSucceeded(true);

		// Firestoreに支払い状態を更新
		if (user) {
			try {
				await fetch('/api/stripe/confirm-payment-setup', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					},
					body: JSON.stringify({
						setupIntentId: setupIntent?.id,
						paymentMethodId: setupIntent?.payment_method
					})
				});
			} catch (err) {
				console.error('Error confirming payment setup:', err);
				// ここではエラーを表示せず、成功として扱う
			}
		}

		// 成功コールバック
		setTimeout(() => {
			if (onSuccess) {
				onSuccess();
			} else {
				// 完了ページへリダイレクト
				router.push('/register/complete');
			}
		}, 2000);

		setProcessing(false);
	};

	// カード入力状態の変更ハンドラ
	const handleCardChange = (event: any) => {
		setCardComplete(event.complete);
		setError(event.error ? event.error.message : null);
	};

	// 開発用: 決済処理をモック
	const handleMockPayment = async () => {
		setProcessing(true);

		// 成功をシミュレート
		setTimeout(async () => {
			setSucceeded(true);

			// Firestoreに支払い状態を更新
			if (user) {
				try {
					await fetch('/api/stripe/mock-payment-setup', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${await user.getIdToken()}`
						}
					});
				} catch (err) {
					console.error('Error updating mock payment status:', err);
				}
			}

			// 完了ページへリダイレクト
			setTimeout(() => {
				if (onSuccess) {
					onSuccess();
				} else {
					router.push('/register/complete');
				}
			}, 1500);

			setProcessing(false);
		}, 2000);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* 支払い方法選択 */}
			<PaymentMethodSelector
				onSelect={setSelectedMethod}
				selectedMethod={selectedMethod}
			/>

			{/* 選択された支払い方法に応じたフォーム */}
			<div className="space-y-4">
				{selectedMethod === 'card' && (
					<div className="border border-border rounded-lg bg-background p-4">
						{clientSecret ? (
							<CardElement
								options={cardStyle}
								onChange={handleCardChange}
								className="py-2"
							/>
						) : (
							<div className="flex justify-center py-4">
								<LoadingSpinner size="small" />
								<span className="ml-2 text-foreground/70">カード情報フォームを読み込み中...</span>
							</div>
						)}
					</div>
				)}

				{/* Google Pay / Apple Pay ボタン */}
				{(selectedMethod === 'googlePay' || selectedMethod === 'applePay') && paymentRequest && (
					<div className="py-2">
						<PaymentRequestButtonElement
							options={{
								paymentRequest,
								style: {
									paymentRequestButton: {
										theme: 'dark',
										height: '48px',
									},
								},
							}}
						/>
					</div>
				)}
			</div>

			{/* エラーメッセージ */}
			{error && (
				<div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
					{error}
				</div>
			)}

			{/* 成功メッセージ */}
			{succeeded && (
				<div className="bg-green-500/10 text-green-500 p-3 rounded-lg text-sm">
					カード情報が正常に登録されました。次のステップに進みます...
				</div>
			)}

			{/* 送信ボタン */}
			<div className="flex flex-col">
				{selectedMethod === 'card' && (
					<Button
						disabled={processing || !cardComplete || !stripe || !clientSecret || succeeded}
						className={`w-full ${succeeded ? 'bg-green-600' : ''}`}
					>
						{processing ? (
							<>
								<LoadingSpinner size="small" />
								<span className="ml-2">処理中...</span>
							</>
						) : succeeded ? (
							'登録完了！'
						) : (
							'カード情報を登録する'
						)}
					</Button>
				)}

				{/* 開発環境のみ表示するモックボタン */}
				{process.env.NODE_ENV === 'development' && !succeeded && (
					<Button
						onClick={handleMockPayment}
						disabled={processing || succeeded}
						className="mt-4 bg-gray-500 hover:bg-gray-600"
					>
						{processing ? (
							<>
								<LoadingSpinner size="small" />
								<span className="ml-2">処理中...</span>
							</>
						) : (
							'(開発用) 支払い成功をシミュレート'
						)}
					</Button>
				)}
			</div>

			{/* セキュリティ情報 */}
			<div className="text-center text-sm text-foreground/60">
				<p>
					お客様のカード情報は安全に処理され、当社のサーバーには保存されません。
					<br />
					決済処理は<a href="https://stripe.com/jp" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Stripe</a>によって安全に行われます。
				</p>
			</div>
		</form>
	);
}