'use client';

import React, { useState,useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { usePayment } from '@/context/payment-context';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { CreditCard, Check, AlertCircle, X } from 'lucide-react';

const PaymentMethodManager: React.FC = () => {
	const { userData } = useAuth();
	const {
		paymentMethod,
		isLoading,
		error,
		isUpdating,
		showUpdateForm,
		setShowUpdateForm,
		fetchPaymentMethod,
		createSetupIntent,
		updatePaymentMethod,
		deletePaymentMethod
	} = usePayment();

	const [cardError, setCardError] = useState<string | null>(null);
	const [cardComplete, setCardComplete] = useState<boolean>(false);
	const [processingCard, setProcessingCard] = useState<boolean>(false);
	const [confirmResult, setConfirmResult] = useState<{ success: boolean; message: string } | null>(null);
	const [isDeletingCard, setIsDeletingCard] = useState<boolean>(false);

	const stripe = useStripe();
	const elements = useElements();

	// カード入力フォームのスタイル設定
	const cardElementOptions = {
		style: {
			base: {
				color: '#fefefe',
				fontFamily: '"Noto Sans JP", sans-serif',
				fontSmoothing: 'antialiased',
				fontSize: '16px',
				'::placeholder': {
					color: '#6b7280',
				},
			},
			invalid: {
				color: '#ef4444',
				iconColor: '#ef4444',
			},
		},
	};
	// payment-method-manager.tsx の修正
	useEffect(() => {
		// フォームがクローズされたときのクリーンアップ
		return () => {
			// コンポーネントのアンマウント時や更新フォームが閉じられたときの処理
			setCardError(null);
			setConfirmResult(null);
			setCardComplete(false);
		};
	}, [showUpdateForm]);

	// カード情報送信ハンドラー
	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!stripe || !elements) {
			return setCardError('Stripeの読み込みに失敗しました。ページを再読み込みしてください。');
		}

		const cardElement = elements.getElement(CardElement);
		if (!cardElement) {
			return setCardError('カード情報の取得に失敗しました。');
		}

		try {
			setProcessingCard(true);
			setCardError(null);
			setConfirmResult(null);

			// SetupIntentの作成
			const { clientSecret } = await createSetupIntent();

			// カード情報の確認
			const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
				payment_method: {
					card: cardElement,
				},
			});

			if (error) {
				// エラー表示の日本語化
				let errorMessage = error.message || 'カード情報の確認に失敗しました。';
				if (error.code === 'card_declined') {
					errorMessage = 'カードが拒否されました。別のカードをお試しください。';
				} else if (error.code === 'expired_card') {
					errorMessage = 'カードの有効期限が切れています。';
				} else if (error.code === 'incorrect_cvc') {
					errorMessage = 'セキュリティコードが正しくありません。';
				}
				setCardError(errorMessage);
				return;
			}

			if (!setupIntent) {
				setCardError('予期せぬエラーが発生しました。もう一度お試しください。');
				return;
			}

			// バックエンドでカード情報を更新
			await updatePaymentMethod(setupIntent.id, setupIntent.payment_method as string);

			// 成功メッセージの表示
			setConfirmResult({
				success: true,
				message: 'カード情報が正常に更新されました。',
			});

			// フォームのリセット
			//cardElement.clear();
			setCardComplete(false);

			// 少し待ってからフォームを閉じる
			setTimeout(() => {
				setShowUpdateForm(false);
				setConfirmResult(null);
				fetchPaymentMethod(); // 最新のカード情報を再取得
			}, 2000);
		} catch (err: any) {
			setCardError(err.message || 'カード情報の処理中にエラーが発生しました。');
			console.error('Card processing error:', err);
		} finally {
			setProcessingCard(false);
		}
	};

	// カード情報削除ハンドラー
	const handleDeleteCard = async () => {
		if (window.confirm('本当にカード情報を削除しますか？この操作は取り消せません。')) {
			try {
				setIsDeletingCard(true);
				await deletePaymentMethod();
				fetchPaymentMethod(); // 最新状態を反映
			} catch (err: any) {
				console.error('Error deleting card:', err);
			} finally {
				setIsDeletingCard(false);
			}
		}
	};

	// ローディング表示
	if (isLoading) {
		return (
			<div className="p-4 text-center">
				<LoadingSpinner />
				<p className="mt-2 text-foreground/70">カード情報を読み込み中...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold mb-4">決済情報管理</h2>

			{/* エラー表示 */}
			{error && (
				<div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg mb-4 flex items-start">
					<AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
					<p>{error}</p>
				</div>
			)}

			{/* 現在のカード情報表示 */}
			{paymentMethod ? (
				<div className="p-4 border border-border/30 rounded-lg">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center">
							<CreditCard className="w-5 h-5 text-accent mr-2" />
							<span className="font-medium">登録済みのカード</span>
						</div>
						<span className="text-xs bg-highlight/10 text-highlight px-2 py-1 rounded-full">
							有効
						</span>
					</div>
					<div className="text-sm text-foreground/70">
						<p>
							{paymentMethod.brand === 'visa' ? 'Visa' :
								paymentMethod.brand === 'mastercard' ? 'Mastercard' :
									paymentMethod.brand === 'amex' ? 'American Express' :
										paymentMethod.brand === 'jcb' ? 'JCB' :
											paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)}
							•••• {paymentMethod.last4}
							{paymentMethod.expiryMonth && paymentMethod.expiryYear &&
								` (有効期限: ${paymentMethod.expiryMonth}/${paymentMethod.expiryYear})`}
						</p>
					</div>
				</div>
			) : userData?.stripe?.paymentSetupCompleted ? (
				<div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg">
					<p>カード情報の取得に失敗しました。管理者にお問い合わせください。</p>
				</div>
			) : (
				<div className="text-center py-8">
					<CreditCard className="w-12 h-12 text-accent/40 mx-auto mb-4" />
					<h3 className="text-lg font-medium mb-2">支払い方法が未登録です</h3>
					<p className="text-foreground/60 mb-6 max-w-md mx-auto">
						サービスをご利用いただくには、クレジットカードまたはデビットカードの登録が必要です。
					</p>
				</div>
			)}

			{/* アクションボタン */}
			{!showUpdateForm && (
				<div className="flex justify-between items-center">
					<Button
						onClick={() => setShowUpdateForm(true)}
						variant="primary"
						disabled={isUpdating}
					>
						{paymentMethod ? 'カード情報を更新' : 'カードを登録する'}
					</Button>

					{paymentMethod && (
						<button
							onClick={handleDeleteCard}
							className="text-sm text-red-400 hover:text-red-300"
							disabled={isDeletingCard}
						>
							{isDeletingCard ? <LoadingSpinner size="small" /> : 'カード情報を削除'}
						</button>
					)}
				</div>
			)}

			{/* カード更新フォーム */}
			{showUpdateForm && (
				<div className="bg-border/5 rounded-xl p-6 border border-border/20 mt-4">
					<div className="flex justify-between items-center mb-4">
						<h3 className="font-medium">
							{paymentMethod ? 'カード情報の更新' : 'カード情報の登録'}
						</h3>
						<button
							onClick={() => {
								setShowUpdateForm(false);
								setCardError(null);
								setConfirmResult(null);
							}}
							className="text-foreground/60 hover:text-foreground"
							disabled={processingCard}
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* 成功メッセージ */}
					{confirmResult?.success && (
						<div className="bg-highlight/10 text-highlight px-4 py-3 rounded-lg mb-4 flex items-center">
							<Check className="w-5 h-5 mr-2" />
							<p>{confirmResult.message}</p>
						</div>
					)}

					{/* エラーメッセージ */}
					{cardError && (
						<div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg mb-4 flex items-start">
							<AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
							<p>{cardError}</p>
						</div>
					)}

					<form onSubmit={handleSubmit}>
						<div className="mb-4">
							<label className="block text-sm font-medium mb-2">
								カード情報
							</label>
							<div className="bg-background border border-border/30 rounded-lg p-3 focus-within:ring-1 focus-within:ring-accent focus-within:border-accent">
								<CardElement
									options={cardElementOptions}
									onChange={(e) => {
										setCardComplete(e.complete);
										if (e.error) {
											setCardError(e.error.message);
										} else {
											setCardError(null);
										}
									}}
								/>
							</div>
							<p className="mt-2 text-xs text-foreground/60">
								カード情報は安全に保存され、Stripe社によって処理されます。
							</p>
						</div>

						<div className="flex justify-end space-x-3 mt-6">
							<Button
								variant="outline"
								onClick={() => {
									setShowUpdateForm(false);
									setCardError(null);
									setConfirmResult(null);
								}}
								disabled={processingCard}
							>
								キャンセル
							</Button>
							<Button
								variant="primary"
								disabled={!cardComplete || processingCard || !stripe || !elements}
							>
								{processingCard ? (
									<LoadingSpinner size="small" />
								) : paymentMethod ? (
									'カード情報を更新'
								) : (
									'カードを登録する'
								)}
							</Button>
						</div>
					</form>
				</div>
			)}

			{/* 請求情報 */}
			{paymentMethod && (
				<div className="mt-6 border-t border-border/20 pt-6">
					<h3 className="text-md font-medium mb-3">請求について</h3>
					<p className="text-sm text-foreground/70 mb-4">
						利用料金は月末にまとめて請求されます。従量課金制のため、実際に利用した分のみの請求となります。
					</p>
					<div className="bg-border/10 p-3 rounded-md text-sm">
						<p className="font-medium">次回請求予定</p>
						<p className="text-foreground/70 mt-1">
							{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('ja-JP')}
						</p>
					</div>
				</div>
			)}

			{/* 注意事項 */}
			<div className="text-xs text-foreground/50 mt-4">
				<p>※ カード情報はお客様のブラウザからStripeの安全な環境に直接送信されます。</p>
				<p>※ 当社のサーバーにカード情報が保存されることはありません。</p>
				<p>※ 請求に関するご質問は、サポートまでお問い合わせください。</p>
			</div>
		</div>
	);
};

// デフォルトエクスポートを明示的に追加
export default PaymentMethodManager;