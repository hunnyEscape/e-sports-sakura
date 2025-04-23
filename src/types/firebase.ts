import { Timestamp, FieldValue } from 'firebase/firestore';

// Custom type to handle both Timestamp and string
export type TimestampOrString = Timestamp | string | FieldValue;

// 支店情報
export interface BranchDocument {
	branchId: string;
	branchCode: string;
	branchName: string;
	address: string;
	phoneNumber?: string;
	email?: string;
	businessHours: {
		open: string;  // "10:00" のような形式
		close: string; // "22:00" のような形式
		dayOff?: string[]; // 定休日（"sunday", "monday" など）
	};
	totalSeats: number;
	description?: string;
	amenities?: string[];
	layoutImagePath?: string;
	mapImagePath?: string;
	location?: {
		latitude: number;
		longitude: number;
	};
	createdAt: TimestampOrString;
	updatedAt: TimestampOrString;
}

// Firestore User ドキュメントのインターフェース
export interface UserDocument {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
	createdAt: TimestampOrString;
	lastLogin: TimestampOrString;
	registrationCompleted: boolean;
	registrationCompletedAt?: string;
	registrationStep?: number;
	stripe?: {
		customerId?: string;
		paymentMethodId?: string;
		cardFingerprint?: string; // 追加: カードの一意識別子
		last4?: string;           // オプション: 下4桁（表示用）
		brand?: string;           // オプション: カードブランド（表示用
		paymentSetupCompleted?: boolean;
	};
}

// セッション情報
export interface SessionDocument {
	sessionId: string;
	userId: string;
	seatId: string;
	startTime: TimestampOrString;
	endTime: TimestampOrString;
	amount: number;
	active: boolean;
	duration: number;
	hourBlocks: number;
	// --- Blockchain 保存ステータス ---
	blockchainStatus: 'pending' | 'confirmed' | 'error';
	blockchainTxId: string | null;        // トランザクションハッシュ
	blockchainBlockNumber: number | null; // ブロック番号
	blockchainConfirmedAt: Timestamp | null; // 確定タイムスタンプ
	blockchainChainId: string | null;     // チェーン ID
	blockchainNetworkId: number | null;   // ネットワーク ID
	blockchainErrorMessage: string | null; // エラー詳細（任意）
}

// 座席情報
export interface SeatDocument {
	seatId: string;
	branchCode: string;
	branchName: string;
	seatType: string;
	seatNumber: number;
	name: string;
	ipAddress?: string;
	ratePerHour: number;
	status: 'available' | 'in-use' | 'maintenance';
	availableHours?: {
		[key: string]: string;
	};
	maxAdvanceBookingDays?: number;
	createdAt: TimestampOrString;
	updatedAt: TimestampOrString;
}

// 予約情報
export interface ReservationDocument {
	id?: string;
	userId: string;
	userEmail?: string;
	seatId: string;
	seatName?: string;
	date: string;
	startTime: string;
	endTime: string;
	duration: number;
	status: 'confirmed' | 'cancelled' | 'completed';
	notes?: string;
	createdAt: TimestampOrString;
	updatedAt: TimestampOrString;
}

// 利用履歴情報
export interface UsageHistoryDocument {
	id?: string;            // ドキュメントID
	userId: string;         // ユーザーID
	amount: number;         // 金額
	description: string;    // 説明（例：「テスト利用 (60分)」）
	durationMinutes: number; // 利用時間（分）
	invoiceId?: string;     // 請求ID
	isTest?: boolean;       // テスト利用フラグ
	status: string;         // 状態（"paid", "pending"など）
	timestamp: TimestampOrString; // 利用日時
	seatId?: string;        // 座席ID（あれば）
}

// クーポン定義（管理者が作成するマスターデータ）
export interface CouponDefinition {
	id: string;
	code: string;              // 管理用コード
	name: string;              // クーポン名
	description: string;       // 説明文
	discountValue: number;     // 割引額
	validityPeriod: number;    // 有効期間（日数）- 発行日からの期間
	isActive: boolean;         // 有効/無効フラグ
}

// ユーザークーポン（ユーザーに発行されたクーポン）
export interface UserCoupon {
	id: string;
	userId: string;
	name: string;              // 表示用
	code: string;              // 表示用
	description: string;       // 表示用
	discountValue: number;
	status: 'available' | 'used';  // 利用可能or使用済み
	issuedAt: TimestampOrString;   // 発行日
	appliedMonthPeriod?: string;   // 適用された月（"2025-04"形式）
}

export interface InvoiceDocument {
	invoiceId: string;
	userId: string;
	userEmail: string;
	periodStart: TimestampOrString;
	periodEnd: TimestampOrString;
	periodString: string; // 'YYYY-MM'形式
	subtotalAmount: number;
	discountAmount: number;
	finalAmount: number;
	sessions: InvoiceSessionItem[];
	appliedCoupons: InvoiceAppliedCoupon[];
	status: 'pending_stripe' | 'pending' | 'paid' | 'failed';
	stripeInvoiceId?: string;
	stripeInvoiceUrl?: string;
	createdAt: TimestampOrString;
	paidAt?: TimestampOrString;
	errorMessage?: string;
}

// 請求書に含まれるセッション項目
export interface InvoiceSessionItem {
	sessionId: string;
	startTime: TimestampOrString;
	endTime: TimestampOrString;
	hourBlocks: number;
	amount: number;
	seatId: string;
	seatName: string;
	branchName: string;
	blockchainTxId?: string;
}

// 適用されたクーポン情報
export interface InvoiceAppliedCoupon {
	couponId: string;
	code: string;
	name: string;
	discountValue: number;
}