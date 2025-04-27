'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Stripe公開キーの設定
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentMethod {
	id: string;
	last4: string;
	brand: string;
	expiryMonth?: string;
	expiryYear?: string;
	isDefault: boolean;
}

interface PaymentContextType {
	paymentMethod: PaymentMethod | null;
	isLoading: boolean;
	error: string | null;
	isUpdating: boolean;
	showUpdateForm: boolean;
	setShowUpdateForm: (show: boolean) => void;
	fetchPaymentMethod: () => Promise<void>;
	updatePaymentMethod: (setupIntentId: string, paymentMethodId: string) => Promise<void>;
	createSetupIntent: () => Promise<{ clientSecret: string }>;
	deletePaymentMethod: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const usePayment = () => {
	const context = useContext(PaymentContext);
	if (!context) {
		throw new Error('usePayment must be used within a PaymentProvider');
	}
	return context;
};

interface PaymentProviderProps {
	children: ReactNode;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children }) => {
	const { user, userData } = useAuth();
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState<boolean>(false);
	const [showUpdateForm, setShowUpdateForm] = useState<boolean>(false);

	// 支払い方法の取得
	const fetchPaymentMethod = async () => {
		if (!user) return;
		try {
			setIsLoading(true);
			setError(null);
			// 最新のトークンを取得
			const token = await user.getIdToken(true);
			console.log('Auth token available:', !!token);

			const response = await fetch('/api/stripe/payment-methods', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
			});

			console.log('Response status:', response.status);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: '応答の解析に失敗しました' }));
				throw new Error(errorData.message || 'カード情報の取得に失敗しました');
			}

			const data = await response.json();
			setPaymentMethod(data.paymentMethod);
		} catch (err: any) {
			console.error('Payment method fetch error:', err);
			setError('カード情報の取得に失敗しました。管理者にお問い合わせください。');
		} finally {
			setIsLoading(false);
		}
	};

	// SetupIntentの作成
	const createSetupIntent = async () => {
		if (!user) throw new Error('ログインが必要です');

		try {
			// Firebaseから最新の認証トークンを取得
			const token = await user.getIdToken(true); // forceRefresh=true でトークンを確実に更新

			const response = await fetch('/api/stripe/create-setup-intent', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`, // 認証トークンを追加
				},
			});

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('認証に失敗しました。再ログインしてください。');
				}
				const errorData = await response.json();
				throw new Error(errorData.message || 'SetupIntentの作成に失敗しました');
			}

			const data = await response.json();
			return { clientSecret: data.clientSecret };
		} catch (err: any) {
			console.error('Setup intent creation error:', err);
			// エラー情報をより詳細に出力
			if (err.response) {
				console.error('Error response:', {
					status: err.response.status,
					data: err.response.data,
					headers: err.response.headers,
				});
			}
			setError(err.message || 'カード登録準備中にエラーが発生しました');
			throw err;
		}
	};

	// 支払い方法の更新
	const updatePaymentMethod = async (setupIntentId: string, paymentMethodId: string) => {
		if (!user) throw new Error('ログインが必要です');

		try {
			setIsUpdating(true);
			setError(null);

			// トークン取得
			const token = await user.getIdToken(true);

			const response = await fetch('/api/stripe/payment-methods', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({
					setupIntentId,
					paymentMethodId,
				}),
			});

			// 生のレスポンスを確認するためのデバッグコード
			const responseText = await response.text();
			console.log('Raw API response:', responseText);

			// テキストをJSONに変換しようとする
			let data;
			try {
				data = JSON.parse(responseText);
			} catch (jsonError) {
				console.error('JSON parse error:', jsonError);
				throw new Error(`レスポンスの解析に失敗しました: ${responseText.substring(0, 100)}...`);
			}

			if (!response.ok) {
				throw new Error(data.error || 'カード情報の更新に失敗しました');
			}

			await fetchPaymentMethod();
			setShowUpdateForm(false);
		} catch (err: any) {
			setError(err.message || 'カード情報の更新中にエラーが発生しました');
			console.error('Payment method update error:', err);
			throw err;
		} finally {
			setIsUpdating(false);
		}
	};

	// 支払い方法の削除
	const deletePaymentMethod = async () => {
		if (!user || !paymentMethod) throw new Error('カード情報が存在しません');

		try {
			setIsUpdating(true);
			setError(null);

			const response = await fetch('/api/stripe/payment-methods', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'カード情報の削除に失敗しました');
			}

			setPaymentMethod(null);
		} catch (err: any) {
			setError(err.message || 'カード情報の削除中にエラーが発生しました');
			console.error('Payment method deletion error:', err);
			throw err;
		} finally {
			setIsUpdating(false);
		}
	};

	// 初期データ取得
	useEffect(() => {
		if (userData?.stripe?.paymentMethodId) {
			fetchPaymentMethod();
		} else {
			setIsLoading(false);
		}
	}, [userData]);

	// コンテキスト値の提供
	const contextValue: PaymentContextType = {
		paymentMethod,
		isLoading,
		error,
		isUpdating,
		showUpdateForm,
		setShowUpdateForm,
		fetchPaymentMethod,
		updatePaymentMethod,
		createSetupIntent,
		deletePaymentMethod,
	};

	return (
		<PaymentContext.Provider value={contextValue}>
			<Elements stripe={stripePromise}>
				{children}
			</Elements>
		</PaymentContext.Provider>
	);
};