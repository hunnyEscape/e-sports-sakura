// src/types/api.ts

import { ReservationDocument, SeatDocument } from './firebase';

// 認証関連
export interface AuthResponse {
	success: boolean;
	message?: string;
	error?: string;
}

// 予約関連
export interface CreateReservationRequest {
	seatId: string;
	date: string;
	startTime: string;
	endTime: string;
	notes?: string;
}

export interface ReservationResponse {
	reservations: ReservationDocument[];
	pagination?: {
		total: number;
		page: number;
		limit: number;
		pages: number;
	};
}

export interface ReservationAvailabilityRequest {
	date: string;
	startTime: string;
	endTime: string;
}

export interface ReservationAvailabilityResponse {
	availability: Array<{
		seatId: string;
		name: string;
		isAvailable: boolean;
		ratePerMinute: number;
	}>;
}

// 座席関連
export interface SeatResponse {
	seats: (SeatDocument & {
		reservations?: Array<{
			startTime: string;
			endTime: string;
		}>;
		isFullyBooked?: boolean;
	})[];
}

// Stripe関連
export interface StripeSetupIntentResponse {
	clientSecret: string;
}

export interface StripeCustomerResponse {
	customerId: string;
}

export interface StripePaymentSetupRequest {
	setupIntentId: string;
	paymentMethodId: string;
}

export interface MockChargeRequest {
	durationMinutes: number;
	description?: string;
}

export interface BillingHistoryResponse {
	history: Array<{
		id: string;
		userId: string;
		invoiceId: string;
		amount: number;
		durationMinutes?: number;
		status: string;
		timestamp: string;
		description: string;
		isTest?: boolean;
	}>;
	pagination: {
		total: number;
		page: number;
		limit: number;
		pages: number;
	};
}

// Veriff関連
export interface VeriffSessionResponse {
	sessionId: string;
	sessionUrl: string;
	status: string;
}

export interface VeriffCallbackRequest {
	status: string;
	vendorData: string;
	id: string;
	code: string;
}