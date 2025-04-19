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
	durationMinutes: number;
	amount: number;
	pricePerHour: number;
	active: boolean;
	billingId?: string;
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