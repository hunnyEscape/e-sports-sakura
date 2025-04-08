// src/types/index.ts

// 基本型
export type Timestamp = {
	seconds: number;
	nanoseconds: number;
};

// Firebase関連
export * from './firebase';

// API関連
export * from './api';

// eKYC関連
export type EkycStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'expired';

export interface EkycData {
	status: EkycStatus;
	sessionId?: string;
	verifiedAt?: string;
	lastUpdated?: string;
}

// Veriff関連
export type VeriffStatus = 'created' | 'pending' | 'submitted' | 'completed' | 'failed' | 'expired';

export interface VeriffSession {
	sessionId: string;
	sessionUrl: string;
	status: VeriffStatus;
	createdAt?: string;
	updatedAt?: string;
}

// Stripe関連
export type PaymentMethodType = 'card' | 'google_pay' | 'apple_pay';

// 支払い情報
export interface StripeInfo {
	customerId?: string;
	paymentMethodId?: string;
	paymentSetupCompleted?: boolean;
	createdAt?: string;
	updatedAt?: string;
	paymentMethodType?: string;
	paymentMethodBrand?: string;
	paymentMethodLast4?: string;
	paymentStatus?: string;
	lastPaymentError?: string;
	lastPaymentErrorAt?: string;
}