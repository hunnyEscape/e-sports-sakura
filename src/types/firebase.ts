// src/types/firebase.ts

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
	eKYC?: {
		sessionId?: string;
		status: string;
		verifiedAt?: string;
		lastUpdated?: string;
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
	pricePerMinute: number;
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
	ratePerMinute: number;
	status: 'available' | 'in-use' | 'maintenance';
	availableHours?: {
		[key: string]: string[];
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