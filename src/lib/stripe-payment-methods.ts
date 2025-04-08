// src/lib/stripe-payment-methods.ts
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { PaymentMethodType } from '@/types';

// Google Pay関連の定数
export const GOOGLE_PAY_CONFIG = {
	apiVersion: 2,
	apiVersionMinor: 0,
	allowedPaymentMethods: [{
		type: 'CARD',
		parameters: {
			allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
			allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
		},
		tokenizationSpecification: {
			type: 'PAYMENT_GATEWAY',
			parameters: {
				gateway: 'stripe',
				'stripe:version': '2023-10-16',
				'stripe:publishableKey': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
			},
		},
	}],
	merchantInfo: {
		merchantName: 'E-Sports Sakura',
		merchantId: process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID || '',
	},
};

// Apple Pay関連の定数
export const APPLE_PAY_CONFIG = {
	merchantIdentifier: process.env.NEXT_PUBLIC_APPLE_MERCHANT_ID || '',
	merchantCapabilities: ['supports3DS'],
	countryCode: 'JP',
	currencyCode: 'JPY',
	supportedNetworks: ['amex', 'discover', 'jcb', 'masterCard', 'visa'],
};

// 利用可能な支払い方法とその表示に関する設定
export const PAYMENT_METHODS = {
	card: {
		name: 'クレジット/デビットカード',
		icon: '/images/card-icon.svg',
		supportedBrands: ['visa', 'mastercard', 'amex', 'jcb'],
	},
	googlePay: {
		name: 'Google Pay',
		icon: '/images/google-pay-icon.svg',
		isAvailable: false, // 初期値、後で動的に判定
	},
	applePay: {
		name: 'Apple Pay',
		icon: '/images/apple-pay-icon.svg',
		isAvailable: false, // 初期値、後で動的に判定
	},
};

// 利用可能な支払い方法を確認するためのユーティリティ関数
export async function checkAvailablePaymentMethods(stripe: Stripe | null): Promise<Record<string, boolean>> {
	const result = {
		card: true, // カードは常に利用可能
		googlePay: false,
		applePay: false,
	};

	// Google Payの利用可能性をチェック
	if (window?.PaymentRequest) {
		try {
			const request = new PaymentRequest(
				[{ supportedMethods: 'https://google.com/pay' }],
				{ total: { label: 'Test', amount: { currency: 'JPY', value: '0' } } }
			);
			result.googlePay = await request.canMakePayment();
		} catch (e) {
			console.error('Google Pay check failed:', e);
		}
	}

	// Apple Payの利用可能性をチェック
	if (stripe && window?.ApplePaySession && typeof window.ApplePaySession.canMakePayments === 'function') {
		try {
			result.applePay = window.ApplePaySession.canMakePayments();
		} catch (e) {
			console.error('Apple Pay check failed:', e);
		}
	}

	return result;
}

// Stripeを初期化し、支払い方法の利用可能性をチェックするラッパー関数
export async function initializeStripeWithPaymentMethods(): Promise<{
	stripe: Stripe | null;
	availableMethods: Record<string, boolean>;
}> {
	const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
	const availableMethods = await checkAvailablePaymentMethods(stripe);

	return {
		stripe,
		availableMethods,
	};
}