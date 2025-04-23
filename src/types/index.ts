// src/types/index.ts
import { SessionDocument } from './firebase' 
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

// 既に定義済みでなければ SessionDisplay も追加
// ← 既存のインターフェース定義群 ……

// 画面表示用に拡張したセッション型
export interface SessionDisplay extends SessionDocument {
	sessionId: string;
	formattedStartTime: string;
	formattedEndTime: string;
	durationText: string;
	seatName: string;
	branchName: string;
	amount: number;
	hourBlocks: number;
	blockchainStatusClass: string;
	blockchainStatusText?: string;
  }
  
// MonthGroupsDisplay で使うクーポン適用情報
export interface AppliedCoupon {
	id: string
	name: string
	code: string
	discountValue: number
}

// 月ごとのグループ
export interface MonthGroup {
	monthKey: string            // "2025-04" など
	displayMonth: string        // "2025年4月" など
	sessions: SessionDisplay[]  // その月のセッション一覧
	totalHourBlocks: number     // 合計時間ブロック数
	totalAmount: number         // 合計金額
	appliedCoupons: AppliedCoupon[]  // 適用済みクーポン
	totalDiscountAmount: number      // 合計割引額
	finalAmount: number              // クーポン適用後の金額
	isPaid: boolean                   // 支払い済みフラグ
}
