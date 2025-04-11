import { Timestamp } from './index';
// src/types/firebase.ts に追加
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
	createdAt: Timestamp | string;
	updatedAt: Timestamp | string;
}

// Firestore User ドキュメントのインターフェース
export interface UserDocument {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
	createdAt: Timestamp | string;
	lastLogin: Timestamp | string;
	registrationCompleted: boolean;
	registrationCompletedAt?: string;
	registrationStep?: number;

	// eKYC情報
	faceVideo?: {
		storagePath: string;      // 例: users/{uid}/face.mp4
		downloadURL?: string;     // 署名付きURLまたは管理者用URL
		confirmed: boolean;       // 判定結果（初期値: true）
		checkedAt?: string;       // 判定実行日（ISO形式）
		rejectionReason?: string; // 拒否理由（"too_dark"|"masked"|"duplicate"など）
		flagged?: boolean;        // 確認要/BAN対象フラグ
		similarityCheckCompleted?: boolean; // 顔照合済みフラグ
	};

	// Stripe情報
	stripe?: {
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
	};
}

// セッション情報
export interface SessionDocument {
	sessionId: string;
	userId: string;
	seatId: string;
	startTime: Timestamp | string;
	endTime: Timestamp | string;
	durationMinutes: number;
	amount: number;
	pricePerHour: number;
	active: boolean;
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
	createdAt: Timestamp | string;
	updatedAt: Timestamp | string;
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
	createdAt: Timestamp | string;
	updatedAt: Timestamp | string;
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
	timestamp: Timestamp | string; // 利用日時
	seatId?: string;        // 座席ID（あれば）
}