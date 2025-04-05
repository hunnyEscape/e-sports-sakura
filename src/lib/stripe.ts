// Stripe統合用のユーティリティ
import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

// フロントエンド用のStripe Promise
export const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

// バックエンド用のStripeインスタンス（API Routes内で使用）
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe = new Stripe(stripeSecretKey, {
	apiVersion: '2023-10-16', // Stripeの最新APIバージョンに適宜更新
});

// StripeのSetup Intentを作成する関数
export async function createSetupIntent(customerId: string) {
	try {
		const setupIntent = await stripe.setupIntents.create({
			customer: customerId,
			payment_method_types: ['card'],
		});
		return setupIntent;
	} catch (error) {
		console.error('Setup Intent creation failed:', error);
		throw error;
	}
}

// Stripeの顧客を作成または取得する関数
export async function getOrCreateCustomer(userId: string, email: string) {
	try {
		// 既存の顧客を検索
		const customers = await stripe.customers.list({
			email: email,
			limit: 1,
		});

		if (customers.data.length > 0) {
			return customers.data[0];
		}

		// 新規顧客を作成
		const newCustomer = await stripe.customers.create({
			email: email,
			metadata: {
				userId: userId,
			},
		});

		return newCustomer;
	} catch (error) {
		console.error('Customer creation failed:', error);
		throw error;
	}
}

// テスト用のカード情報（開発用）
export const testCards = {
	success: '4242424242424242', // 常に成功するカード
	failure: '4000000000000002', // 常に失敗するカード
	requires3dSecure: '4000000000003220', // 3Dセキュア認証が必要なカード
};