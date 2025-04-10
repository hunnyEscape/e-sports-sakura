-e 
### FILE: ./src/types/firebase.ts

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
}-e 
### FILE: ./src/types/api.ts

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
}-e 
### FILE: ./src/types/auth-context.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
	User,
	GoogleAuthProvider,
	signInWithPopup,
	createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
	signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
	sendPasswordResetEmail,
	signOut as firebaseSignOut,
	onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { UserDocument } from '@/types/firebase';

// コンテキストの型定義
interface AuthContextType {
	user: User | null;
	userData: UserDocument | null;
	loading: boolean;
	signInWithGoogle: () => Promise<void>;
	signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	createUserWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
	error: string | null;
	clearError: () => void;
}

// デフォルト値
const defaultContextValue: AuthContextType = {
	user: null,
	userData: null,
	loading: true,
	signInWithGoogle: async () => { },
	signInWithEmailAndPassword: async () => { },
	createUserWithEmailAndPassword: async () => { },
	resetPassword: async () => { },
	signOut: async () => { },
	error: null,
	clearError: () => { }
};

// コンテキスト作成
const AuthContext = createContext<AuthContextType>(defaultContextValue);

// コンテキストプロバイダーコンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [userData, setUserData] = useState<UserDocument | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// エラーをクリア
	const clearError = () => setError(null);

	// ユーザーの認証状態を監視
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			setUser(user);

			if (user) {
				try {
					// Firestoreからユーザーデータを取得
					const userDocRef = doc(db, 'users', user.uid);
					const userDoc = await getDoc(userDocRef);

					if (userDoc.exists()) {
						// 既存ユーザー - 最終ログイン時間を更新
						const userData = userDoc.data() as UserDocument;
						await setDoc(userDocRef, {
							...userData,
							lastLogin: serverTimestamp()
						}, { merge: true });
						setUserData(userData);
					} else {
						// 新規ユーザー
						const newUserData: UserDocument = {
							uid: user.uid,
							email: user.email,
							displayName: user.displayName,
							photoURL: user.photoURL,
							createdAt: serverTimestamp(),
							lastLogin: serverTimestamp(),
							registrationCompleted: false,
							registrationStep: 0,
							eKYC: {
								status: 'pending'
							}
						};

						await setDoc(userDocRef, newUserData);
						setUserData(newUserData);
					}
				} catch (err) {
					console.error('Error fetching user data:', err);
					setError('ユーザーデータの取得中にエラーが発生しました。');
				}
			} else {
				setUserData(null);
			}

			setLoading(false);
		});

		// クリーンアップ関数
		return () => unsubscribe();
	}, []);

	// Google認証でサインイン
	const signInWithGoogle = async () => {
		try {
			setError(null);
			await signInWithPopup(auth, googleProvider);
		} catch (err: any) {
			console.error('Google sign in error:', err);
			setError('Googleログイン中にエラーが発生しました。もう一度お試しください。');
			throw err;
		}
	};

	// メールパスワードでサインイン
	const signInWithEmailAndPassword = async (email: string, password: string) => {
		try {
			setError(null);
			await firebaseSignInWithEmailAndPassword(auth, email, password);
		} catch (err: any) {
			console.error('Email/password sign in error:', err);

			// エラーメッセージをユーザーフレンドリーに変換
			if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
				setError('メールアドレスまたはパスワードが正しくありません。');
			} else if (err.code === 'auth/too-many-requests') {
				setError('ログイン試行回数が多すぎます。しばらく経ってから再度お試しください。');
			} else {
				setError('ログイン中にエラーが発生しました。もう一度お試しください。');
			}

			throw err;
		}
	};

	// メールパスワードで新規ユーザー作成
	const createUserWithEmailAndPassword = async (email: string, password: string) => {
		try {
			setError(null);
			await firebaseCreateUserWithEmailAndPassword(auth, email, password);
		} catch (err: any) {
			console.error('Create user error:', err);

			// エラーメッセージをユーザーフレンドリーに変換
			if (err.code === 'auth/email-already-in-use') {
				setError('このメールアドレスは既に使用されています。');
			} else if (err.code === 'auth/weak-password') {
				setError('パスワードは6文字以上の強力なものを設定してください。');
			} else {
				setError('アカウント作成中にエラーが発生しました。もう一度お試しください。');
			}

			throw err;
		}
	};

	// パスワードリセットメール送信
	const resetPassword = async (email: string) => {
		try {
			setError(null);
			await sendPasswordResetEmail(auth, email);
		} catch (err: any) {
			console.error('Password reset error:', err);

			if (err.code === 'auth/user-not-found') {
				setError('このメールアドレスに登録されているアカウントが見つかりません。');
			} else {
				setError('パスワードリセットメールの送信中にエラーが発生しました。');
			}

			throw err;
		}
	};

	// サインアウト
	const signOut = async () => {
		try {
			await firebaseSignOut(auth);
		} catch (err) {
			console.error('Sign out error:', err);
			setError('ログアウト中にエラーが発生しました。');
			throw err;
		}
	};

	const value = {
		user,
		userData,
		loading,
		signInWithGoogle,
		signInWithEmailAndPassword,
		createUserWithEmailAndPassword,
		resetPassword,
		signOut,
		error,
		clearError
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// カスタムフック
export const useAuth = () => useContext(AuthContext);-e 
### FILE: ./src/types/index.ts

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
}-e 
### FILE: ./src/lib/stripe-payment-methods.ts

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
}-e 
### FILE: ./src/lib/firebase.ts

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getFirestore, collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc, deleteDoc, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

// Firebaseの設定
// 注: 実際の値は.env.localから取得
export const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
	measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Firebase初期化（既に初期化されていなければ）
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'asia-northeast1'); // 東京リージョン

// 認証プロバイダー
const googleProvider = new GoogleAuthProvider();

export {
	app, auth, db, storage, functions, googleProvider,
	collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc, deleteDoc
  };-e 
### FILE: ./src/lib/firebase-admin.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Adminアプリケーションを初期化
 * サーバーサイドでFirebaseリソースにアクセスするために使用
 */
export function initAdminApp() {
	if (getApps().length === 0) {
		// Firebase Admin SDKの初期化
		const serviceAccount = {
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
		};

		// 環境変数が設定されているか確認
		if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
			console.error('Firebase Admin環境変数が設定されていません');

			// 開発環境の場合は処理を続行（ダミーアプリで初期化）
			if (process.env.NODE_ENV === 'development') {
				console.warn('開発環境: Firebase Adminをダミー設定で初期化します');
				const app = initializeApp({
					projectId: 'dummy-project',
				});
				return app;
			} else {
				// 本番環境では例外をスロー
				throw new Error('Firebase Admin環境変数が設定されていません');
			}
		}

		// 正しい認証情報でアプリを初期化
		return initializeApp({
			credential: cert(serviceAccount as any)
		});
	}

	// 既に初期化されている場合は最初のアプリを返す
	return getApps()[0];
}

/**
 * Firebase Admin Firestoreインスタンスを取得
 */
export function getAdminFirestore() {
	initAdminApp();
	return getFirestore();
}-e 
### FILE: ./src/lib/stripe.ts

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
};-e 
### FILE: ./src/lib/veriff.ts

// src/lib/veriff.ts

import { VeriffSession, VeriffStatus } from '@/types';

/**
 * Veriff API の設定
 * 実際の値は環境変数から取得
 */
const VERIFF_API_URL = 'https://stationapi.veriff.com/v1';
const VERIFF_API_KEY = process.env.NEXT_PUBLIC_VERIFF_API_KEY || '';
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET || '';

/**
 * Veriff セッションを作成する
 * @param userId ユーザーID
 * @param userEmail ユーザーのメールアドレス
 * @returns 作成されたセッション情報
 */
export async function createVeriffSession(userId: string, userEmail: string): Promise<VeriffSession> {
	try {
		// APIリクエストのペイロード
		const payload = {
			verification: {
				callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/veriff/callback`,
				person: {
					firstName: '',
					lastName: '',
					idNumber: userId,
					email: userEmail
				},
				vendorData: userId,
				timestamp: new Date().toISOString()
			}
		};

		// Veriff APIへのリクエスト
		const response = await fetch(`${VERIFF_API_URL}/sessions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-AUTH-CLIENT': VERIFF_API_KEY
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(`Veriff API error: ${errorData.message || response.statusText}`);
		}

		const data = await response.json();
		return {
			sessionId: data.verification.id,
			sessionUrl: data.verification.url,
			status: 'created'
		};
	} catch (error) {
		console.error('Error creating Veriff session:', error);
		throw error;
	}
}

/**
 * Veriffセッションのステータスを確認する
 * @param sessionId セッションID
 * @returns セッションのステータス情報
 */
export async function checkVeriffSessionStatus(sessionId: string): Promise<{
	status: VeriffStatus;
	updatedAt: string;
}> {
	try {
		const response = await fetch(`${VERIFF_API_URL}/sessions/${sessionId}`, {
			method: 'GET',
			headers: {
				'X-AUTH-CLIENT': VERIFF_API_KEY
			}
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(`Veriff API error: ${errorData.message || response.statusText}`);
		}

		const data = await response.json();
		return {
			status: data.verification.status,
			updatedAt: data.verification.updatedAt
		};
	} catch (error) {
		console.error('Error checking Veriff session status:', error);
		throw error;
	}
}

/**
 * Veriffからのコールバックデータを検証する
 * @param signature Veriffから受け取った署名
 * @param payload Veriffから受け取ったデータ
 * @returns 検証結果
 */
export function verifyVeriffCallback(signature: string, payload: any): boolean {
	// 実際の実装では、HMACを使用して署名を検証するコードが必要
	// 今回はモック実装
	return true;
}-e 
### FILE: ./src/lib/stripe-service.ts

// src/lib/stripe-service.ts
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { PaymentMethodType } from '@/types';

// 顧客情報のインターフェース
interface CustomerData {
	userId: string;
	email: string;
	name?: string;
}

/**
 * Stripe顧客を作成または取得する
 */
export async function getOrCreateCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
	try {
		// 既存の顧客を検索
		const customers = await stripe.customers.list({
			email: email,
			limit: 1,
		});

		if (customers.data.length > 0) {
			// 既存顧客が見つかった場合、metadataを更新
			const customer = customers.data[0];
			await stripe.customers.update(customer.id, {
				metadata: {
					...customer.metadata,
					userId: userId
				}
			});
			return customer;
		}

		// 新規顧客を作成
		const newCustomer = await stripe.customers.create({
			email: email,
			name: name,
			metadata: {
				userId: userId,
			},
		});

		return newCustomer;
	} catch (error) {
		console.error('Error in getOrCreateCustomer:', error);
		throw error;
	}
}

/**
 * Setup Intentを作成する
 */
export async function createSetupIntent(
	customerId: string,
	paymentMethods: PaymentMethodType[] = ['card']
): Promise<Stripe.SetupIntent> {
	try {
		const setupIntent = await stripe.setupIntents.create({
			customer: customerId,
			payment_method_types: paymentMethods,
		});
		return setupIntent;
	} catch (error) {
		console.error('Error creating Setup Intent:', error);
		throw error;
	}
}

/**
 * 支払い方法をデフォルトとして設定
 */
export async function setDefaultPaymentMethod(
	customerId: string,
	paymentMethodId: string
): Promise<Stripe.Customer> {
	try {
		const customer = await stripe.customers.update(customerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId,
			},
		});
		return customer;
	} catch (error) {
		console.error('Error setting default payment method:', error);
		throw error;
	}
}

/**
 * 利用に基づく請求書を作成
 */
export async function createInvoiceForUsage(
	customerId: string,
	durationMinutes: number,
	description: string = 'E-Sports Sakura利用料金'
): Promise<Stripe.Invoice> {
	try {
		// 10分単位で料金計算（10分あたり120円）
		const units = Math.ceil(durationMinutes / 10);
		const amountYen = units * 120;

		// 請求書の作成
		const invoice = await stripe.invoices.create({
			customer: customerId,
			auto_advance: true, // 自動的に確定・支払い
			description: description,
			metadata: {
				durationMinutes: String(durationMinutes),
				units: String(units),
			},
		});

		// 請求項目の追加
		await stripe.invoiceItems.create({
			customer: customerId,
			amount: amountYen * 100, // 日本円をセントに変換
			currency: 'jpy',
			description: `利用時間: ${durationMinutes}分（${units}単位）`,
			invoice: invoice.id,
		});

		// 請求書の確定
		const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

		// 支払い処理
		return await stripe.invoices.pay(finalizedInvoice.id);
	} catch (error) {
		console.error('Error creating invoice for usage:', error);
		throw error;
	}
}

/**
 * 顧客の支払い方法一覧を取得
 */
export async function getCustomerPaymentMethods(
	customerId: string
): Promise<Stripe.PaymentMethod[]> {
	try {
		const paymentMethods = await stripe.paymentMethods.list({
			customer: customerId,
			type: 'card',
		});
		return paymentMethods.data;
	} catch (error) {
		console.error('Error getting customer payment methods:', error);
		throw error;
	}
}-e 
### FILE: ./src/lib/gameData.ts

// Define the game categories and their IDs that match the route parameters
export const VALID_CATEGORIES = ['party', 'competitive', 'immersive'];

export interface Game {
	id: string;
	title: string;
	description: string;
	playerCount: string;
	recommendedTime: string;
	difficulty: string;
	videoSrc: string;
	thumbnailSrc: string;
	rule: string;
	genre:string;
}

export interface CategoryData {
	title: string;
	description: string;
	games: Game[];
}
const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

// Game data - in a real application, this would come from a database or API
export const GAME_DATA: Record<string, CategoryData> = {

	party: {
		title: 'ワイワイ系ゲーム',
		description: 'コントローラーで2人でも盛り上がれる',
		games: [
			{
				id: 'party-animals',
				title: 'Party Animals',
				description: `
					可愛い動物たちが戦うカオスな**格闘ゲーム**です。
					ふわふわしたキャラクターで物理演算を利用した操作を楽しめ、予測不能な展開で最高に盛り上がります。
					戦略やタイミングを極めることで勝率を上げられる奥深さもあり、初心者から上級者まで幅広く楽しめるバランスが絶妙に設計されています。
					`,
				playerCount: '2-8人',
				recommendedTime: '30分-2時間',
				difficulty: '初心者向け',
				videoSrc: '/PartyAnimals.mp4',
				thumbnailSrc: `${cloudFrontUrl}/PartyAnimals.webp`,
				rule: `
					ライバルをフィールドから**落とせば勝利**です。
					基本の「パンチ」は、相手を一時的に気絶させるための主要な攻撃手段です。特に顔に当たるように狙うと、より効果的に相手の動きを止めることができます。むやみに連打するのではなく、タイミングよくパンチを当てて、次の動作に繋げることが重要です。
					ジャンプ中に攻撃することで空中キックのような動きになります。これは崖際や接近戦で有効で、相手を弾き飛ばすように使うと、そのままステージ外に落とすことも可能です。
					「掴み」は、『Party Animals』を象徴する動作のひとつです。相手に近づいて掴むと、そのまま持ち上げたり、引きずったりすることができます。特に強力なのが、掴んだ相手をジャンプと同時に投げるようにして場外に放り出すテクニックです。背後から掴めば反撃を受けにくく、飛距離が伸びるので、**安全に投げ落とすことができます**。
					「武器」はマップ上にランダムで出現し、手にしたプレイヤーに大きなアドバンテージをもたらします。バットや棒などの武器は、攻撃範囲と威力が高まり、相手を遠くまでふっ飛ばすことが可能です。クロスボウのような遠距離武器も存在し、状況によって使い分けることで戦況を有利に運ぶことができます。ただし、武器を持っているからといって無敵ではなく、パンチで手から落とされたり、掴まれて無力化されたりする危険もあるため、過信は禁物です。
				`,
				genre:`ワイワイ系`,
			},
			{
				id: 'Witch It',
				title: 'Witch It',
				description: `
					魔法の世界を舞台にしたチーム対戦型の**かくれんぼゲーム**です。プレイヤーは「魔女」チームと「ハンター」チームに分かれて勝利を目指します。
					魔女チームは、マップ内の様々なオブジェクト（リンゴ、椅子、木箱、壺など）に変身して隠れることができます。
					ハンターチームは、魔女が化けているであろうオブジェクトを見つけて攻撃し、捕まえます。
					ステージには多種多様なマップがあり、それぞれに特徴的な地形やオブジェクトが配置されているため、毎試合ごとに異なる戦略が必要になります。
					ゲームの**テンポが良く**、1プレイが短時間で終わるため、何度も繰り返し遊びたくなる中毒性があります。
					見た目は可愛らしく、ファンタジックで親しみやすいデザインですが、ゲームとしての深みや**駆け引き**の面白さは非常に高く、友人同士の対戦や配信・実況などにもぴったりのタイトルです。
					魔女として隠れる楽しさと、ハンターとして暴くスリル――この両方を体験できる、独特の魅力を持った作品と言えるでしょう。
				`,
				playerCount: '2人チーム制　4〜8人程度でも十分楽しめるが多人数ほど盛り上がる。最大16人',
				recommendedTime: '1試合：約5〜10分前後、30分-1時間',
				difficulty: '初心者向け',
				videoSrc: '/WitchIt.mp4',
				thumbnailSrc: `${cloudFrontUrl}/WitchIt.webp`,
				rule: `
					魔女にはいくつかのスキルがあり、煙幕で視界を妨害したり、偽物のオブジェクトを出してハンターを混乱させたり、瞬間移動で逃げることができます。制限時間まで1人でも生き残っていれば、魔女チームの勝利です。
					ハンターは、マップ中のオブジェクトに向かって攻撃することで、魔女が変身していないかどうかを確かめていきます。魔女に直接攻撃が当たると、一定時間で捕獲され、退場させることができます。
					攻撃にはクールダウンがあるため、手当たり次第に攻撃することはできません。また、魔女は素早く移動したり、狭い隙間に隠れたり、変身を繰り返したりするため、ハンターには注意力と推理力が求められます。
					ゲームの時間内にすべての魔女を見つけ出すことができれば、ハンター側の勝利です。
				`,
				genre:`ワイワイ系`,
			},
			{
				id: 'Golf It',
				title: 'Golf It',
				description: `
					マルチプレイヤー向け物理演算ベースの**パターゴルフゲーム**です。
					予測不可能なコースやギミック、そしてプレイヤー同士の妨害や偶然によって、単なるゴルフゲーム以上のドタバタとした楽しさを味わえる作品となっています。
					バリエーション豊富で想像力に富んだミニゴルフコースが用意されています。
					普通の傾斜や坂道はもちろん、ループ、トランポリン、動く足場、回転する障害物、壁のワープ装置など、常識を超えたステージが満載です。
					しかも、ユーザーが自作したコースを公開・プレイすることができるため、コンテンツは常に増え続けており、飽きが来にくいという点も魅力のひとつです。
				`,
				playerCount: '1-4人',
				recommendedTime: '20-40分',
				difficulty: '初心者向け',
				videoSrc: '/GolfIt.mp4',
				thumbnailSrc: `${cloudFrontUrl}/GolfIt.webp`,
				rule: `
					ルールはとてもシンプルで、各プレイヤーが順番にボールを打ち、できるだけ少ない打数でホール（カップ）にボールを入れることを目指します。
					ボールを打つときは、マウスを使って物理的に引っ張って打つ動作を再現するため、強く打ちすぎて大きく飛ばしてしまったり、逆に弱すぎて進まなかったりと、プレイヤーの感覚が試されるのもこのゲームの面白さです。
					**勝ちを狙うと意外なほど奥深いゲーム**です。
					『Golf It!』の打撃は、マウスを後ろに引いてから前に押し出すことで力を調整します。強すぎるとコースアウト、弱すぎると進まない――この微妙な力加減を体に覚えさせることが、まず勝利の第一歩です。
					最初は「少し弱め」を意識すると安定します。打つ前に、マウスを引いたときのパワーメーター（ゲージ）を見る習慣をつけましょう。
					とにかく焦って打つと、ギミックに跳ね返されたり、罠にハマったりします。初見のコースでは、一打目を打つ前に必ずカメラ（右クリック＋ドラッグ）で全体を見て、どのルートが最適かを判断しましょう。
					コースによっては、高いジャンプや強打を使ってショートカットするルートが用意されています。
					難易度は高めですが、成功すれば2〜3打も差がつくため、慣れてきたらチャレンジする価値は大いにあります。
					特にフレンド対戦では、早くゴールした者勝ちの**空気感**があるので、差をつけやすいです。
				`,
				genre:`ワイワイ系`,
			},
			{
				id: 'We Were Here Forever',
				title: 'We Were Here Forever',
				description: `
					二人一組でプレイする**協力型の脱出パズルアドベンチャーゲーム**です。
					プレイヤーは極寒の未知の地に囚われた2人のキャラクターとなり、互いの声だけを頼りに謎を解きながら脱出を目指すという物語が展開されます。
					このゲームは「We Were Here」シリーズの第4作目であり、シリーズ中でも最もスケールが大きく、謎解きのバリエーションやストーリーテリングが進化しています。
					暗号、幾何学的な図形、音楽、視覚的な錯覚、時間制限付きの仕掛けなど、ジャンルの異なる謎解きが連続して登場します。
					しかも、ほとんどのパズルは「片方だけでは絶対に解けない」ように設計されており、**会話力とチームワークが問われるゲームデザインが徹底されています**。
					ストーリーは断片的に語られる形式で、探索を進めながら徐々に真実が明らかになります。
					この世界には「王」「操り人形」「裏切り」「救済」などの重厚なテーマが織り込まれており、ただの脱出ゲームではない物語体験としての魅力も高く評価されています。
					「一緒に乗り越える体験」に特化した、稀有な協力型ゲームです。
					単なる謎解き以上に、相手との意思疎通・信頼・ひらめきが求められるため、**プレイ後には深い絆と達成感が残る作品**となっています。
					「2人でしか体験できない特別なゲーム」を探している方に、心からおすすめできる一本です。
				`,
				playerCount: '2人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/WeWereHereForever.mp4',
				thumbnailSrc: `${cloudFrontUrl}/WeWereHereForever.webp`,
				rule: `
				無線のようなボイスチャットを使ってコミュニケーションを取りながら、片方が見ているシンボルや仕掛けのヒントをもう一方に伝え、それぞれの部屋で謎を解いていきます。
				このゲームで一番重要なのは、「自分が見ている情報をどう伝えるか」です。謎解きの答えは、たいてい「相手の視点」にあるため、適切に説明しなければ解けません。
				伝えられた情報をただ受け取るのではなく、相手の状況や視点を想像して補完する力も大切です。
				パズルに行き詰まったと感じたら、無理に1人で考え込まず、「今こうなってる」「今ここに何がある」ととにかく状況を話すことが重要です。
				相手がヒントに気づいてくれることもあります。**情報を「全部伝えてから考える」**が、We Were Hereシリーズの鉄則です。
				`,
				genre:`じっくり系`,
			},
			{
				id: 'portal-2',
				title: 'Portal 2',
				description: `
				**一人称視点（FPS）の物理パズルゲーム**で2007年に大ヒットした『Portal』の続編です。
				前作の革新的なゲーム性を引き継ぎつつ、より複雑なパズル、魅力的なキャラクター、ユーモアと不気味さが同居するディストピア的な世界観と豊かなストーリー性が特徴です。
				空間を操る感覚を見事に表現し、物語・演出・難易度設計のすべてにおいて**高い評価**を受けています。
				プレイヤーは、「ポータルガン」という特殊な装置を使って空間に二つのポータルを開き、それを活用してステージを突破していくという、独自のゲームプレイを体験します。
				`,
				playerCount: '1-2人',
				recommendedTime: '1-2時間',
				difficulty: '中級者向け',
				videoSrc: '/portal.mp4',
				thumbnailSrc: `${cloudFrontUrl}/portal.webp`,
				rule: `
				プレイヤーは「ポータルガン」と呼ばれる特殊な装置を使って、壁や床などに**入口と出口の2つの穴（ポータル）**を自由に開くことができます。
				ポータルは2つの空間を瞬時につなぐワープホールのようなものです。
				何度でもやり直せるので、まずは試す → 結果を見る →考え直すというプロセスをポジティブに楽しみましょう。
				ポータルの面白さは、ただ移動できるだけでなく、**物理的なエネルギー**（落下速度やジャンプ）を引き継げることです。
				これを利用して、高く跳ぶ、遠くへ飛ばす、タイミングよく飛び込む…など、動きの工夫が求められるステージが多く登場します。
				「高所から落ちた勢いをポータルで前方に転換」など、**慣性利用の基本**は必ず覚えましょう。
				相手に「勢いをつける役」と「ゴールに届く役」を分けて役割分担するのも有効です。
				`,
				genre:`じっくり系`,
			},
			{
				id: 'Operation:Tango',
				title: 'Operation:Tango',
				description: `
				2人専用の**協力型スパイアクション・パズルゲーム**です。
				プレイヤーは「エージェント」と「ハッカー」のいずれかを担当し、ペアで連携を取りながら、世界を脅かすサイバー犯罪に立ち向かう――というスリリングなミッションを遂行していきます。
				エージェントは現場潜入担当で、ハッカーがバックエンドサポートを担います。
				**プレイヤー同士の視界や情報が完全に異なる**ため、自分の状況をどう説明するか、相手の言葉をどう解釈するかがカギになります。
				銀行への潜入、空港でのハッキング、仮想空間への侵入など、スパイ映画のようなミッションが続々と登場します。
				`,
				playerCount: '2人',
				recommendedTime: '4-6時間(役割交代すればもう一周楽しめる)',
				difficulty: '中級者向け',
				videoSrc: '/Tango.mp4',
				thumbnailSrc: `${cloudFrontUrl}/Tango.webp`,
				rule: `
				まず**「自分が今、何を見ているのか」「何をしているのか」を、なるべく具体的に口に出すことがコツ**です。「左下に白いパネルがあって、今赤く点滅している」「数字が3つ表示されていて、上から緑・青・赤の順になっている」といったように、色・位置・順番などを意識して説明することで、相手も的確に反応できるようになります。
				わからない部分はすぐに質問する姿勢も大切です。ゲーム中は複雑な暗号入力や、時間制限のあるミッションも多いため、「焦らず、確認する」「すれ違いがあればすぐ修正する」という冷静さが成功への近道となります。
				さらに、謎解きに詰まったときは、つい自分の目の前の情報だけで解決しようとしてしまいがちですが、『Operation: Tango』では、たいていの場合、**答えのヒントは自分ではなく、相手の画面に存在しています**。「そっちで何か見えてない？」という問いかけをすることが、ミッションを前に進めるうえで重要です。
				このゲームは、繰り返し挑戦することで自然と**「伝え方」「聞き方」「動き方」が上達していく**構造になっています。最初は失敗しても気にせず、会話を楽しみながら、少しずつスムーズに連携できるようになる喜びを味わうのが、この作品の大きな醍醐味です。
				`,
				genre:`じっくり系`,
			},
			{
				id: 'counter-strike-2',
				title: 'Counter-Strike 2',
				description: `
				競技性の高いオンライン対戦型の**一人称視点(FPS)シューティングゲーム**です。これは、2000年代初頭に登場し、世界中で**eスポーツの先駆け的存在**となった『Counter-Strike』シリーズの最新作です。
				テロリストと対テロ部隊という二つの勢力に分かれ対戦します。
				前作と比べてネットワークの応答性が向上したことで、**対戦の公正さや一瞬の撃ち合いの精度**が格段に上がっています。**勝敗を分けるような一瞬の撃ち合い**が忠実に反映されるようになりました。
				敷居が高いと思われがちですが、実際には初心者が少しずつ**上達を実感しやすいゲーム**でもあります。
				このゲームの最大の魅力は、シンプルなルールの中に、プレイヤーの**個性と判断力が強く反映される**ところにあります。走るのか待つのか、正面から撃ち合うのか裏を取るのか、単独行動を選ぶのか仲間と連携するのか。すべての行動が自由で、しかしすべてに意味があり、その積み重ねがチームの勝利へとつながっていきます。
				『Counter-Strike 2』は、世界中のプレイヤーたちにとって、長年の経験がそのまま蓄積される「知のFPS」でありながら、今この瞬間から誰でも始められる、極めてフェアな設計のゲームです。もしあなたが、頭を使いながらチームと連携し、一発一発に意味のある対戦ゲームを探しているなら、このゲームはまさにうってつけだと言えるでしょう。試しに1ラウンドでもプレイしてみれば、きっとその緊張感と達成感に引き込まれるはずです。			
				`,
				playerCount: '5v5',
				recommendedTime: '∞',
				difficulty: '上級者向け',
				videoSrc: '/CS2.mp4',
				thumbnailSrc: `${cloudFrontUrl}/CS2.webp`,
				rule: `
				テロリスト側は爆弾を持ち、特定のエリアに設置して時間内に爆発させることで勝利を目指します。一方、対テロ部隊側は、その爆弾の設置を防ぐか、設置後に制限時間内で解除することが任務です。
				この攻防は「ラウンド制」で進行し、各ラウンドの開始時にプレイヤーは**限られた資金を元に装備を整える必要**があります。
				つまり、プレイヤーたちは毎ラウンドごとに自分の手持ち資金と相談しながら、どの武器を買うか、グレネードを持つか、防具を優先するかなどを考えなければならず、「戦う準備の時点ですでにゲームは始まっている」と言えます。
				プレイヤーが得られるお金は、単に敵を倒すだけではなく、ラウンドに勝利する、爆弾を設置する、あるいは解除するといった**“チームに貢献する行動すべて”**によって変動します。
				つまり、キル数が多いプレイヤーだけが強くなるのではなく、冷静に爆弾を設置し、仲間をカバーし、チームとして勝利することで、次のラウンドに有利な装備が整っていくという設計です。
				ここに、短期的な撃ち合いの強さと、長期的な資金計画とのバランスが求められる理由があります。


				また射撃はただ単に**「敵に向けて撃てば当たる」というようなものではありません**。
				各武器には独自のリコイル（反動）パターンが設定されており、フルオートで撃ち続けると照準が上や左右に大きくブレます。
				これを抑えるためには、リコイルを“覚える”だけでなく、自分のマウス操作で**その反動に逆らうように制御するテクニック**が不可欠です。さらには、撃ち方にも工夫が求められます。
				たとえば、1発1発をタップして正確に当てる、3発ごとに止めながら撃つバーストショットを使う、しゃがんで撃つことで安定させるなど、状況に応じて撃ち方を変える判断力が上達への鍵になります。
				ルールは非常にシンプルである一方で、その中にはプレイヤーの操作スキル、金銭管理、マップ理解、連携力、そして心理戦という多層的なゲーム性が詰まっています。
				「どこで、どう動き、どう伝え、どう勝つか」を常に考え続けることが求められ、そしてそれこそがこのゲームの最大の魅力でもあるのです。
				初心者であっても、1つのラウンドで爆弾を設置できたり、仲間をサポートできたりしたときの充実感は大きく、少しずつ「自分が戦力になっている」という感覚を得られるようになるでしょう。
				`,
				genre:`本格`,
			},
		]
	}
};-e 
### FILE: ./src/app/login/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import EmailPasswordForm from '@/components/auth/email-password-form';

export default function LoginPage() {
	const { user, loading, signInWithGoogle, error } = useAuth();
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const router = useRouter();

	useEffect(() => {
		// ユーザーが既にログインしている場合はダッシュボードにリダイレクト
		if (user && !loading) {
			router.push('/dashboard');
		}
	}, [user, loading, router]);

	const handleGoogleSignIn = async () => {
		try {
			setIsLoggingIn(true);
			await signInWithGoogle();
			// 認証成功時は自動的にリダイレクトされるため、ここでは何もしない
		} catch (err) {
			console.error('Login error:', err);
			setIsLoggingIn(false);
		}
	};

	if (loading || (user && !loading)) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground">
			{/* ヘッダー */}
			<header className="bg-background/80 backdrop-blur-sm border-b border-border">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between h-16">
						<Link href="/" className="flex items-center">
							<Image
								src="/images/logo.svg"
								alt="E-Sports Sakura"
								width={40}
								height={40}
								className="mr-2"
							/>
							<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
						</Link>

						<Link href="/lp" className="text-foreground/70 hover:text-accent">
							サービスについて
						</Link>
					</div>
				</div>
			</header>

			{/* ログインフォーム */}
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="bg-border/5 rounded-2xl shadow-soft p-8 max-w-md w-full">
					<h1 className="text-2xl font-bold text-center mb-8">ログイン / 会員登録</h1>

					{/* メールパスワードによるログイン/登録フォーム */}
					<div className="mb-8">
						<EmailPasswordForm />
					</div>

					{/* または区切り */}
					<div className="relative mb-8">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-background text-foreground/50">または</span>
						</div>
					</div>

					{/* ソーシャルログイン */}
					<div className="space-y-4">
						<button
							onClick={handleGoogleSignIn}
							disabled={isLoggingIn}
							className="
                w-full bg-white text-gray-700 font-medium
                px-4 py-3 rounded-xl border border-gray-300
                flex items-center justify-center space-x-2
                hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent
                disabled:opacity-70 disabled:cursor-not-allowed
                transition-colors duration-200
              "
						>
							{isLoggingIn ? (
								<LoadingSpinner size="small" />
							) : (
								<>
									<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
										<path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
										<path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
										<path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
										<path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
									</svg>
									<span>Googleでログイン</span>
								</>
							)}
						</button>

						<button
							disabled={true}
							className="
                w-full bg-black text-white font-medium
                px-4 py-3 rounded-xl
                flex items-center justify-center space-x-2
                opacity-50 cursor-not-allowed
              "
						>
							<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
								<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
							</svg>
							<span>Apple IDでログイン</span>
							<span className="text-xs ml-1">(準備中)</span>
						</button>
					</div>

					<p className="text-center text-foreground/60 text-sm mt-6">
						ログインすると<Link href="/terms" className="text-accent hover:underline">利用規約</Link>および
						<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>に同意したことになります。
					</p>
				</div>
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/dashboard/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { ReservationProvider } from '@/context/reservation-context';
import ProtectedRoute from '@/components/auth/protected-route';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';
import QrCodeDisplay from '@/components/dashboard/qr-code';
import UsageHistory from '@/components/dashboard/usage-history';
import ReservationHistory from '@/components/dashboard/reservation-history';
import { Calendar, Clock, CreditCard } from 'lucide-react';

export default function DashboardPage() {
	const { user, userData, signOut } = useAuth();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [activeTab, setActiveTab] = useState('qr');
	const router = useRouter();

	const handleSignOut = async () => {
		try {
			setIsLoggingOut(true);
			await signOut();
			router.push('/');
		} catch (error) {
			console.error('Logout error:', error);
			setIsLoggingOut(false);
		}
	};

	return (
		<ProtectedRoute>
			<ReservationProvider>
				<div className="min-h-screen bg-background text-foreground">
					<header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
						<div className="container mx-auto px-4">
							<div className="flex items-center justify-between h-16">
								<Link href="/lp" className="flex items-center">
									<Image
										src="/images/logo.svg"
										alt="E-Sports Sakura"
										width={40}
										height={40}
										className="mr-2"
									/>
									<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
								</Link>

								<div className="flex items-center space-x-4">
									{user?.photoURL && (
										<Image
											src={user.photoURL}
											alt={user.displayName || 'ユーザー'}
											width={32}
											height={32}
											className="rounded-full"
										/>
									)}
									<button
										onClick={handleSignOut}
										disabled={isLoggingOut}
										className="text-foreground/70 hover:text-accent"
									>
										{isLoggingOut ? <LoadingSpinner size="small" /> : 'ログアウト'}
									</button>
								</div>
							</div>
						</div>
					</header>

					{/* メインコンテンツ */}
					<main className="container mx-auto px-4 py-8">
						<h1 className="text-2xl font-bold mb-6">マイダッシュボード</h1>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
							<Link
								href="/reservation"
								className="bg-border/5 hover:bg-border/10 rounded-xl p-4 flex flex-col items-center justify-center transition-colors"
							>
								<Calendar className="w-8 h-8 text-accent mb-2" />
								<span className="font-medium text-foreground">新規予約</span>
								<span className="text-sm text-foreground/60">座席を予約する</span>
							</Link>

						</div>

						{/* 会員登録が完了していない場合は登録フローに誘導 */}
						{userData && !userData.registrationCompleted && (
							<div className="bg-accent/10 border border-accent/20 rounded-xl p-6 mb-8">
								<h2 className="text-lg font-semibold mb-2">会員登録を完了させましょう</h2>
								<p className="mb-4">
									サービスを利用するには、追加情報の入力とeKYC認証が必要です。
									数分で完了します。
								</p>
								<Button
									href="/register/personal-info"
									variant="primary"
								>
									登録を続ける
								</Button>
							</div>
						)}

						{/* 登録完了している場合は会員情報を表示 */}
						{userData && userData.registrationCompleted && (
							<>
								{/* タブナビゲーション */}
								<div className="flex border-b border-border mb-6">
									<button
										onClick={() => setActiveTab('qr')}
										className={`py-2 px-4 font-medium ${activeTab === 'qr'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										会員QRコード
									</button>
									<button
										onClick={() => setActiveTab('reservations')}
										className={`py-2 px-4 font-medium ${activeTab === 'reservations'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										予約情報
									</button>
									<button
										onClick={() => setActiveTab('usage')}
										className={`py-2 px-4 font-medium ${activeTab === 'usage'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										過去の利用
									</button>
									<button
										onClick={() => setActiveTab('payment')}
										className={`py-2 px-4 font-medium ${activeTab === 'payment'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										支払い方法
									</button>
								</div>

								{/* タブコンテンツ */}
								<div className="grid md:grid-cols-1 gap-8">
									{activeTab === 'qr' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-6">
											<h2 className="text-lg font-semibold mb-4">会員QRコード</h2>
											<QrCodeDisplay />
										</div>
									)}

									{activeTab === 'reservations' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-6">
											<ReservationHistory />
										</div>
									)}

									{activeTab === 'usage' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-6">
											<UsageHistory />
										</div>
									)}

									{activeTab === 'payment' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-6">
											<h2 className="text-lg font-semibold mb-4">決済情報管理</h2>
											{userData?.stripe?.paymentMethodId ? (
												<div className="space-y-6">
													<div className="p-4 border border-border/30 rounded-lg">
														<div className="flex items-center justify-between mb-2">
															<div className="flex items-center">
																<CreditCard className="w-5 h-5 text-accent mr-2" />
																<span className="font-medium">登録済みのカード</span>
															</div>
															<span className="text-xs bg-highlight/10 text-highlight px-2 py-1 rounded-full">
																有効
															</span>
														</div>
														<div className="text-sm text-foreground/70">
															<p>••••••••••••{userData.stripe.paymentMethodId.slice(-4)}</p>
															<p className="mt-1">更新日: {new Date(userData.stripe.updatedAt).toLocaleDateString('ja-JP')}</p>
														</div>
													</div>

													<div className="flex justify-between items-center">
														<Button
															href="/payment"
															variant="outline"
														>
															カード情報を更新
														</Button>

														<button
															className="text-sm text-foreground/60 hover:text-accent"
														>
															カード情報について
														</button>
													</div>

													<div className="mt-6 border-t border-border/20 pt-6">
														<h3 className="text-md font-medium mb-3">請求について</h3>
														<p className="text-sm text-foreground/70 mb-4">
															利用料金は月末にまとめて請求されます。従量課金制のため、実際に利用した分のみの請求となります。
														</p>
														<div className="bg-border/10 p-3 rounded-md text-sm">
															<p className="font-medium">次回請求予定</p>
															<p className="text-foreground/70 mt-1">2025年4月30日</p>
														</div>
													</div>
												</div>
											) : (
												<div className="text-center py-8">
													<CreditCard className="w-12 h-12 text-accent/40 mx-auto mb-4" />
													<h3 className="text-lg font-medium mb-2">支払い方法が未登録です</h3>
													<p className="text-foreground/60 mb-6 max-w-md mx-auto">
														サービスをご利用いただくには、クレジットカードまたはデビットカードの登録が必要です。
													</p>
													<Button
														href="/payment"
														variant="primary"
													>
														支払い方法を登録する
													</Button>
												</div>
											)}
										</div>
									)}
								</div>

								{/* クイックアクション */}
							</>
						)}
					</main>
				</div>
			</ReservationProvider>
		</ProtectedRoute>
	);
}-e 
### FILE: ./src/app/reservation/page.tsx

// src/app/reservation/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useReservation, SelectedTimeSlotsItem } from '@/context/reservation-context';
import { ReservationProvider } from '@/context/reservation-context';
import { ChevronLeft } from 'lucide-react';
import { BranchDocument } from '@/types/firebase';
import BranchSelector from '@/components/reservation/branch-selector';
import CalendarView from '@/components/reservation/calendar-view';
import TimeGrid from '@/components/reservation/time-grid';
import ReservationForm from '@/components/reservation/reservation-form';
import LoginPrompt from '@/components/reservation/login-prompt';

enum ReservationStep {
	SELECT_BRANCH,
	SELECT_DATE,
	SELECT_TIME,
	CONFIRM
}

const ReservationPageContent: React.FC = () => {
	const { user, loading } = useAuth();
	const { setSelectedBranch, selectedTimeSlots, clearSelectedTimeSlots } = useReservation();
	const router = useRouter();

	const [currentStep, setCurrentStep] = useState<ReservationStep>(ReservationStep.SELECT_BRANCH);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [showLoginPrompt, setShowLoginPrompt] = useState(false);
	const [pendingTimeSlots, setPendingTimeSlots] = useState<SelectedTimeSlotsItem[]>([]);

	// Check for pending reservation in sessionStorage (after login/register)
	useEffect(() => {
		if (user && !loading) {
			const pendingReservation = sessionStorage.getItem('pendingReservation');
			if (pendingReservation) {
				try {
					const details = JSON.parse(pendingReservation);
					if (Array.isArray(details)) {
						// 複数座席予約に対応
						const timeSlots = details.map((item: any) => ({
							seatId: item.seatId,
							seatName: item.seatName,
							startTime: item.startTime,
							endTime: item.endTime
						}));
						setPendingTimeSlots(timeSlots);
						setSelectedDate(new Date(details[0].date));
						setCurrentStep(ReservationStep.CONFIRM);
					} else {
						// 後方互換性のため、単一座席予約も処理
						const timeSlot = {
							seatId: details.seatId,
							startTime: details.startTime,
							endTime: details.endTime
						};
						setPendingTimeSlots([timeSlot]);
						setSelectedDate(new Date(details.date));
						setCurrentStep(ReservationStep.CONFIRM);
					}

					// Clear the pending reservation
					sessionStorage.removeItem('pendingReservation');
				} catch (error) {
					console.error('Error parsing pending reservation:', error);
				}
			}
		}
	}, [user, loading]);

	// 支店選択ハンドラー
	const handleBranchSelect = (branch: BranchDocument) => {
		setSelectedBranch(branch);
		setCurrentStep(ReservationStep.SELECT_DATE);
	};

	// Handle date selection
	const handleDateSelect = (date: Date) => {
		setSelectedDate(date);
		setCurrentStep(ReservationStep.SELECT_TIME);
	};

	// Handle time selection - 複数座席対応
	const handleTimeSelect = (timeSlots: SelectedTimeSlotsItem[]) => {
		if (!user && !loading) {
			// Show login prompt for non-logged in users
			setPendingTimeSlots(timeSlots);
			setShowLoginPrompt(true);
			return;
		}

		setCurrentStep(ReservationStep.CONFIRM);
	};

	// Handle reservation success
	const handleReservationSuccess = () => {
		router.push('/dashboard');
	};

	// Handle back navigation
	const handleBack = () => {
		if (currentStep === ReservationStep.CONFIRM) {
			setCurrentStep(ReservationStep.SELECT_TIME);
		} else if (currentStep === ReservationStep.SELECT_TIME) {
			setCurrentStep(ReservationStep.SELECT_DATE);
		} else if (currentStep === ReservationStep.SELECT_DATE) {
			clearSelectedTimeSlots();
			setCurrentStep(ReservationStep.SELECT_BRANCH);
		}
	};

	// Render appropriate step
	const renderStep = () => {
		switch (currentStep) {
			case ReservationStep.SELECT_BRANCH:
				return (
					<div className="w-full max-w-3xl mx-auto">
						<BranchSelector onBranchSelect={handleBranchSelect} />
					</div>
				);

			case ReservationStep.SELECT_DATE:
				return (
					<div className="w-full max-w-3xl mx-auto">
						<CalendarView onDateSelect={handleDateSelect} />
					</div>
				);

			case ReservationStep.SELECT_TIME:
				return (
					<div className="w-full max-w-3xl mx-auto">
						{selectedDate && (
							<TimeGrid
								date={selectedDate}
								onTimeSelect={handleTimeSelect}
							/>
						)}
					</div>
				);

			case ReservationStep.CONFIRM:
				return (
					<div className="w-full max-w-3xl mx-auto">
						<ReservationForm
							onSuccess={handleReservationSuccess}
							onCancel={handleBack}
						/>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-background py-12 px-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full"
			>
				{/* Header with back button */}
				<div className="max-w-3xl mx-auto mb-6 flex items-center">
					{currentStep > ReservationStep.SELECT_BRANCH && (
						<button
							onClick={handleBack}
							className="mr-3 p-2 rounded-full bg-border/50 border border-border/20 hover:bg-border/20 transition-colors"
							aria-label="戻る"
						>
							<ChevronLeft size={20} className="text-foreground/70" />
						</button>
					)}
					<h1 className="text-2xl font-bold text-foreground">
						{currentStep === ReservationStep.SELECT_BRANCH && '支店を選択'}
						{currentStep === ReservationStep.SELECT_DATE && '予約日を選択'}
						{currentStep === ReservationStep.SELECT_TIME && '時間と座席を選択'}
						{currentStep === ReservationStep.CONFIRM && '予約の確認'}
					</h1>
				</div>
				{/* Progress steps */}
				<div className="max-w-3xl mx-auto mb-8">
					<div className="flex items-center justify-between">
						<div className="flex flex-col items-center">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= ReservationStep.SELECT_BRANCH
								? 'bg-accent text-white'
								: 'bg-border text-foreground/70'
								}`}>
								1
							</div>
							<span className="text-sm mt-1 text-foreground/70">支店</span>
						</div>

						<div className={`flex-1 h-1 mx-2 ${currentStep > ReservationStep.SELECT_BRANCH
							? 'bg-accent'
							: 'bg-border'
							}`} />

						<div className="flex flex-col items-center">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= ReservationStep.SELECT_DATE
								? 'bg-accent text-white'
								: 'bg-border text-foreground/70'
								}`}>
								2
							</div>
							<span className="text-sm mt-1 text-foreground/70">日付</span>
						</div>

						<div className={`flex-1 h-1 mx-2 ${currentStep > ReservationStep.SELECT_DATE
							? 'bg-accent'
							: 'bg-border'
							}`} />

						<div className="flex flex-col items-center">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= ReservationStep.SELECT_TIME
								? 'bg-accent text-white'
								: 'bg-border text-foreground/70'
								}`}>
								3
							</div>
							<span className="text-sm mt-1 text-foreground/70">時間・座席</span>
						</div>

						<div className={`flex-1 h-1 mx-2 ${currentStep > ReservationStep.SELECT_TIME
							? 'bg-accent'
							: 'bg-border'
							}`} />

						<div className="flex flex-col items-center">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= ReservationStep.CONFIRM
								? 'bg-accent text-white'
								: 'bg-border text-foreground/70'
								}`}>
								4
							</div>
							<span className="text-sm mt-1 text-foreground/70">確認</span>
						</div>
					</div>
				</div>

				{/* Current step content */}
				{renderStep()}

				{/* Login prompt */}
				{showLoginPrompt && selectedDate && pendingTimeSlots.length > 0 && (
					<LoginPrompt
						onClose={() => setShowLoginPrompt(false)}
						reservationDetails={pendingTimeSlots.map(slot => ({
							...slot,
							date: selectedDate.toISOString()
						}))}
					/>
				)}
			</motion.div>
		</div>
	);
};

// ReservationProviderでラップしたコンポーネントを返す
const ReservationPage: React.FC = () => {
	return (
		<ReservationProvider>
			<ReservationPageContent />
		</ReservationProvider>
	);
};

export default ReservationPage;-e 
### FILE: ./src/app/lp/page.tsx

'use client';

import HeroSection from '@/components/lp/hero-section';
import FeaturesSection from '@/components/lp/features-section';
import GamesSection from '@/components/lp/games-section';
import StepsSection from '@/components/lp/steps-section';
import SpecsSection from '@/components/lp/specs-section';
import AvailabilitySection from '@/components/lp/availability-section';
import FaqSection from '@/components/lp/faq-section';
import AccessSection from '@/components/lp/access-section';
import CtaSection from '@/components/lp/cta-section';
import LpHeader from '@/components/lp/lp-header';
import LpFooter from '@/components/lp/lp-footer';
import SeatInitializer from '@/components/ini/create-seat-documents';

export default function LandingPage() {
	return (
		<main className="landing-page bg-background text-foreground">
			<LpHeader />
			<div className="pt-16">
				<HeroSection />
				<SeatInitializer/>
				<FeaturesSection />
				<div className="h-[50vh] flex items-center justify-center mb-12">
					<div className="text-center">
						<h2 className="text-xl md:text-4xl font-bold mb-4 mx-auto w-full">ラインナップ</h2>
						<p className="text-lg text-muted-foreground mx-auto w-full">
							様々なジャンルから選べる人気タイトルをご用意しています
						</p>
					</div>
				</div>
				<GamesSection />
				<StepsSection />

				{/* スペック紹介セクション */}
				<SpecsSection />

				{/* 予約カレンダーセクション (新規追加) */}
				<AvailabilitySection />

				{/* よくある質問セクション */}
				<FaqSection />

				{/* アクセス・料金セクション */}
				<AccessSection />

				{/* 最終CTAセクション */}
				<CtaSection />
			</div>

			{/* LP専用フッター */}
			<LpFooter />
		</main>
	);
}-e 
### FILE: ./src/app/payment/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRegistration } from '@/context/registration-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Stripeのテスト用モジュール（実際はStripe.jsを使用）
const mockStripeSetup = () => {
	return new Promise<boolean>((resolve) => {
		// 支払い成功をシミュレート
		setTimeout(() => resolve(true), 2000);
	});
};

export default function PaymentPage() {
	const { completeRegistration, loading, error } = useRegistration();
	const [isStripeLoaded, setIsStripeLoaded] = useState(false);
	const [stripeError, setStripeError] = useState<string | null>(null);
	const [isPaymentComplete, setIsPaymentComplete] = useState(false);

	// Stripe.jsをロード
	useEffect(() => {
		const loadStripeJS = async () => {
			try {
				// 本来ならStripe.jsをロードするコード
				// 今回はモック実装とします

				// Stripe.jsのロードを模擬
				setTimeout(() => {
					setIsStripeLoaded(true);
				}, 1000);
			} catch (err) {
				console.error('Error loading Stripe.js:', err);
				setStripeError('決済モジュールの読み込みに失敗しました。再読み込みしてください。');
			}
		};

		loadStripeJS();
	}, []);

	// 支払い情報を設定
	const handleSetupPayment = async () => {
		try {
			setStripeError(null);

			// Stripe決済設定を開始（モック）
			const result = await mockStripeSetup();

			if (result) {
				setIsPaymentComplete(true);
			} else {
				setStripeError('決済情報の設定に失敗しました。もう一度お試しください。');
			}

		} catch (err) {
			console.error('Error setting up payment:', err);
			setStripeError('決済処理中にエラーが発生しました。もう一度お試しください。');
		}
	};

	// 登録完了処理
	const handleComplete = async () => {
		await completeRegistration();
	};

	return (
		<div className="bg-border/5 rounded-xl shadow-soft p-6">
			<h2 className="text-xl font-semibold mb-6">決済情報の登録</h2>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{error}
				</div>
			)}

			{stripeError && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{stripeError}
				</div>
			)}

			<div className="space-y-6">
				{isPaymentComplete ? (
					<div className="bg-green-500/10 text-green-500 p-4 rounded-lg mb-6">
						<div className="flex items-center">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="font-medium">決済情報の登録が完了しました。</span>
						</div>
					</div>
				) : (
					<div className="bg-blue-500/10 text-blue-500 p-4 rounded-lg mb-6">
						<p>
							サービスをご利用いただくには、お支払い情報の登録が必要です。<br />
							サービス利用後に自動的に決済されます。
						</p>
					</div>
				)}

				<div className="space-y-4">
					<h3 className="text-lg font-medium">料金プラン</h3>

					<div className="bg-border/10 rounded-lg p-4">
						<div className="flex justify-between items-center mb-2">
							<span className="font-medium">従量課金プラン</span>
							<span className="text-xl font-bold text-accent">¥700 <span className="text-sm font-normal">/時間</span></span>
						</div>
						<ul className="text-sm text-foreground/70 space-y-1">
							<li>• 10分単位での課金（¥120/10分）</li>
							<li>• フリードリンク・お菓子込み</li>
							<li>• 高性能ゲーミングPC利用可能</li>
							<li>• 深夜割増なし（24時間同一料金）</li>
						</ul>
					</div>
				</div>

				<div className="pt-2">
					<div className="flex flex-wrap justify-center gap-2 mb-4">
						<div className="w-10 h-6">
							<Image
								src="/images/visa.svg"
								alt="Visa"
								width={40}
								height={24}
								className="object-contain"
							/>
						</div>
						<div className="w-10 h-6">
							<Image
								src="/images/mastercard.svg"
								alt="MasterCard"
								width={40}
								height={24}
								className="object-contain"
							/>
						</div>
						<div className="w-10 h-6">
							<Image
								src="/images/amex.svg"
								alt="American Express"
								width={40}
								height={24}
								className="object-contain"
							/>
						</div>
						<div className="w-10 h-6">
							<Image
								src="/images/jcb.svg"
								alt="JCB"
								width={40}
								height={24}
								className="object-contain"
							/>
						</div>
					</div>

					{isPaymentComplete ? (
						<Button
							onClick={handleComplete}
							disabled={loading}
							className="w-full"
						>
							{loading ? <LoadingSpinner size="small" /> : '登録を完了する'}
						</Button>
					) : (
						<Button
							onClick={handleSetupPayment}
							disabled={loading || !isStripeLoaded}
							className="w-full"
						>
							{loading || !isStripeLoaded ? <LoadingSpinner size="small" /> : 'カード情報を登録する'}
						</Button>
					)}

					<p className="mt-4 text-sm text-foreground/60 text-center">
						クレジットカード情報は安全に保管され、許可なく請求されることはありません。<br />
						※実際の実装では、Stripeの決済システムを使用します。
					</p>
				</div>
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/layout.tsx

import { AuthProvider } from '@/context/auth-context';
import { EkycProvider } from '@/context/ekyc-context';
import { AudioProvider } from '@/context/AudioContext';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'E-Sports Sakura - コワーキングスペース会員ポータル',
	description: '24時間無人運営、QRコード1つで簡単入室。高性能PCとフリードリンクを完備したゲーミングスペース。',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="ja">
			<body>
				<AudioProvider>
					<AuthProvider>
						<EkycProvider>
							{children}
						</EkycProvider>
					</AuthProvider>
				</AudioProvider>
			</body>
		</html>
	);
}-e 
### FILE: ./src/app/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';

export default function HomePage() {
	const { user, loading } = useAuth();
	const router = useRouter();

	// ログイン済みの場合はダッシュボードにリダイレクト
	useEffect(() => {
		if (user && !loading) {
			router.push('/dashboard');
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground">
			{/* ヘッダー */}
			<header className="bg-background/80 backdrop-blur-sm border-b border-border">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between h-16">
						<Link href="/lp" className="flex items-center">
							<Image
								src="/images/logo.svg"
								alt="E-Sports Sakura"
								width={40}
								height={40}
								className="mr-2"
							/>
							<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
						</Link>

						<div className="flex items-center space-x-4">
							<Link href="/lp" className="text-foreground/70 hover:text-accent">
								サービス詳細
							</Link>
							<Button
								href="/login"
								variant="primary"
							>
								ログイン
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* メインコンテンツ */}
			<main className="flex-1 flex items-center justify-center p-4">
				<div className="text-center max-w-2xl">
					<h1 className="text-4xl font-bold mb-6">E-Sports Sakura</h1>
					<p className="text-xl mb-8">
						24時間営業、QRコード1つで簡単アクセス。<br />
						高性能ゲーミングPCを使った新しいコワーキング体験。
					</p>
					<div className="flex flex-col sm:flex-row justify-center gap-4">
						<Button
							href="/login"
							variant="primary"
							size="lg"
						>
							ログイン / 会員登録
						</Button>
						<Button
							href="/lp"
							variant="outline"
							size="lg"
						>
							サービスについて
						</Button>
					</div>
				</div>
			</main>

			{/* フッター */}
			<footer className="bg-background border-t border-border py-4">
				<div className="container mx-auto px-4 text-center">
					<p className="text-foreground/60 text-sm">
						&copy; {new Date().getFullYear()} E-Sports Sakura. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}-e 
### FILE: ./src/app/api/reservations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase';
import { ReservationDocument } from '@/types/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export async function GET(req: NextRequest) {
	// Check authentication
	const authHeader = req.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: '認証エラー: 有効なトークンが必要です' },
			{ status: 401 }
		);
	}

	try {
		// Extract token from header
		const token = authHeader.split('Bearer ')[1];

		// Verify token and get user ID (in production, use proper Firebase Admin SDK verification)
		// This is a simplified version for the purpose of this example
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Get userId from query parameters (optional filter)
		const url = new URL(req.url);
		const userId = url.searchParams.get('userId') || user.uid;
		const status = url.searchParams.get('status'); // optional status filter
		const dateFrom = url.searchParams.get('dateFrom'); // optional date range filter
		const dateTo = url.searchParams.get('dateTo'); // optional date range filter

		// Build Firestore query
		let reservationsQuery = query(
			collection(db, 'reservations'),
			where('userId', '==', userId),
			orderBy('date', 'desc')
		);

		// Apply additional filters if provided
		if (status) {
			reservationsQuery = query(
				reservationsQuery,
				where('status', '==', status)
			);
		}

		if (dateFrom) {
			reservationsQuery = query(
				reservationsQuery,
				where('date', '>=', dateFrom)
			);
		}

		if (dateTo) {
			reservationsQuery = query(
				reservationsQuery,
				where('date', '<=', dateTo)
			);
		}

		// Execute query
		const querySnapshot = await getDocs(reservationsQuery);

		// Convert snapshot to data array
		const reservations = querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as ReservationDocument[];

		return NextResponse.json({ reservations });
	} catch (error) {
		console.error('Error fetching reservations:', error);
		return NextResponse.json(
			{ error: '予約情報の取得に失敗しました' },
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
	// Check authentication
	const authHeader = req.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: '認証エラー: 有効なトークンが必要です' },
			{ status: 401 }
		);
	}

	try {
		// Extract token from header
		const token = authHeader.split('Bearer ')[1];

		// Verify token and get user ID (in production, use proper Firebase Admin SDK verification)
		// This is a simplified version for the purpose of this example
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Parse request body
		const { seatId, date, startTime, endTime, notes } = await req.json();

		// Validate required fields
		if (!seatId || !date || !startTime || !endTime) {
			return NextResponse.json(
				{ error: '必須項目が不足しています' },
				{ status: 400 }
			);
		}

		// Check if the seat is available for the requested time
		// 1. Get all reservations for the specified seat and date
		const conflictQuery = query(
			collection(db, 'reservations'),
			where('seatId', '==', seatId),
			where('date', '==', date),
			where('status', '==', 'confirmed')
		);

		const conflictSnapshot = await getDocs(conflictQuery);

		// 2. Check for time conflicts
		const requestStart = new Date(`${date}T${startTime}`);
		const requestEnd = new Date(`${date}T${endTime}`);

		const hasConflict = conflictSnapshot.docs.some(doc => {
			const reservation = doc.data();
			const existingStart = new Date(`${reservation.date}T${reservation.startTime}`);
			const existingEnd = new Date(`${reservation.date}T${reservation.endTime}`);

			// Check if there's an overlap
			return (
				(requestStart < existingEnd && requestEnd > existingStart) ||
				(existingStart < requestEnd && existingEnd > requestStart)
			);
		});

		if (hasConflict) {
			return NextResponse.json(
				{ error: '指定した時間に予約が既に存在します' },
				{ status: 409 }
			);
		}

		// Calculate duration in minutes
		const durationMs = requestEnd.getTime() - requestStart.getTime();
		const durationMinutes = Math.round(durationMs / (1000 * 60));

		// Get seat details to include name
		const seatsQuery = query(
			collection(db, 'seats'),
			where('seatId', '==', seatId)
		);

		const seatSnapshot = await getDocs(seatsQuery);
		let seatName = '';

		if (!seatSnapshot.empty) {
			seatName = seatSnapshot.docs[0].data().name || '';
		}

		// Create new reservation
		const newReservation: Omit<ReservationDocument, 'id'> = {
			userId: user.uid,
			userEmail: user.email,
			seatId,
			seatName,
			date,
			startTime,
			endTime,
			duration: durationMinutes,
			status: 'confirmed',
			notes: notes || '',
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		};

		// Add to Firestore
		const docRef = await addDoc(collection(db, 'reservations'), newReservation);

		return NextResponse.json({
			id: docRef.id,
			...newReservation,
			message: '予約が正常に作成されました'
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating reservation:', error);
		return NextResponse.json(
			{ error: '予約の作成に失敗しました' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/reservations/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

interface Params {
	params: {
		id: string;
	};
}

export async function GET(req: NextRequest, { params }: Params) {
	const { id } = params;

	// Check authentication
	const authHeader = req.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: '認証エラー: 有効なトークンが必要です' },
			{ status: 401 }
		);
	}

	try {
		// Extract token from header
		const token = authHeader.split('Bearer ')[1];

		// Verify token (in production, use proper Firebase Admin SDK verification)
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Get reservation document
		const reservationDoc = await getDoc(doc(db, 'reservations', id));

		if (!reservationDoc.exists()) {
			return NextResponse.json(
				{ error: '予約が見つかりません' },
				{ status: 404 }
			);
		}

		const reservation = {
			id: reservationDoc.id,
			...reservationDoc.data()
		};

		// Check if the user is authorized to access this reservation
		if (reservation.userId !== user.uid) {
			return NextResponse.json(
				{ error: 'この予約にアクセスする権限がありません' },
				{ status: 403 }
			);
		}

		return NextResponse.json({ reservation });
	} catch (error) {
		console.error('Error fetching reservation:', error);
		return NextResponse.json(
			{ error: '予約情報の取得に失敗しました' },
			{ status: 500 }
		);
	}
}

export async function PATCH(req: NextRequest, { params }: Params) {
	const { id } = params;

	// Check authentication
	const authHeader = req.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: '認証エラー: 有効なトークンが必要です' },
			{ status: 401 }
		);
	}

	try {
		// Extract token from header
		const token = authHeader.split('Bearer ')[1];

		// Verify token (in production, use proper Firebase Admin SDK verification)
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Get reservation document
		const reservationDoc = await getDoc(doc(db, 'reservations', id));

		if (!reservationDoc.exists()) {
			return NextResponse.json(
				{ error: '予約が見つかりません' },
				{ status: 404 }
			);
		}

		const reservation = reservationDoc.data();

		// Check if the user is authorized to modify this reservation
		if (reservation.userId !== user.uid) {
			return NextResponse.json(
				{ error: 'この予約を変更する権限がありません' },
				{ status: 403 }
			);
		}

		// Parse request body
		const updates = await req.json();

		// Only allow specific fields to be updated
		const allowedUpdates = ['notes', 'status'];
		const sanitizedUpdates: Record<string, any> = {};

		for (const key of allowedUpdates) {
			if (key in updates) {
				sanitizedUpdates[key] = updates[key];
			}
		}

		// Add updated timestamp
		sanitizedUpdates.updatedAt = Timestamp.now();

		// Update document
		await updateDoc(doc(db, 'reservations', id), sanitizedUpdates);

		return NextResponse.json({
			id,
			...reservation,
			...sanitizedUpdates,
			message: '予約が更新されました'
		});
	} catch (error) {
		console.error('Error updating reservation:', error);
		return NextResponse.json(
			{ error: '予約の更新に失敗しました' },
			{ status: 500 }
		);
	}
}

export async function DELETE(req: NextRequest, { params }: Params) {
	const { id } = params;

	// Check authentication
	const authHeader = req.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: '認証エラー: 有効なトークンが必要です' },
			{ status: 401 }
		);
	}

	try {
		// Extract token from header
		const token = authHeader.split('Bearer ')[1];

		// Verify token (in production, use proper Firebase Admin SDK verification)
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Get reservation document
		const reservationDoc = await getDoc(doc(db, 'reservations', id));

		if (!reservationDoc.exists()) {
			return NextResponse.json(
				{ error: '予約が見つかりません' },
				{ status: 404 }
			);
		}

		const reservation = reservationDoc.data();

		// Check if the user is authorized to delete this reservation
		if (reservation.userId !== user.uid) {
			return NextResponse.json(
				{ error: 'この予約を削除する権限がありません' },
				{ status: 403 }
			);
		}

		// Alternative: Instead of deleting, update status to 'cancelled'
		await updateDoc(doc(db, 'reservations', id), {
			status: 'cancelled',
			updatedAt: Timestamp.now()
		});

		return NextResponse.json({
			message: '予約がキャンセルされました'
		});
	} catch (error) {
		console.error('Error cancelling reservation:', error);
		return NextResponse.json(
			{ error: '予約のキャンセルに失敗しました' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/veriff/create-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { VeriffSessionResponse } from '@/types/api';

// Firebase Admin初期化
initAdminApp();

// Veriff API設定
const VERIFF_API_URL = 'https://stationapi.veriff.com/v1';
const VERIFF_API_KEY = process.env.VERIFF_API_KEY || '';
const VERIFF_PRIVATE_KEY = process.env.VERIFF_PRIVATE_KEY || '';

export async function POST(request: NextRequest) {
	try {
		// トークンの取得
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// ユーザーデータの取得
		const userRecord = await getAuth().getUser(userId);
		const email = userRecord.email || '';

		// すでにVeriffセッションが存在するか確認
		const db = getFirestore();
		const userDoc = await db.collection('users').doc(userId).get();

		if (userDoc.exists) {
			const userData = userDoc.data();

			// eKYCが既に完了している場合
			if (userData?.eKYC?.status === 'completed') {
				const response: VeriffSessionResponse = {
					message: 'Verification already completed',
					status: 'completed',
					sessionId: userData.eKYC.sessionId || '',
					sessionUrl: ''
				};
				return NextResponse.json(response);
			}
		}

		// Veriffセッションの作成
		const payload = {
			verification: {
				callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/veriff/callback`,
				person: {
					firstName: '',
					lastName: '',
					idNumber: userId,
					email: email
				},
				vendorData: userId,
				timestamp: new Date().toISOString()
			}
		};

		const response = await fetch(`${VERIFF_API_URL}/sessions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-AUTH-CLIENT': VERIFF_API_KEY
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Veriff API error:', errorData);
			return NextResponse.json(
				{ error: 'Failed to create Veriff session' },
				{ status: response.status }
			);
		}

		const data = await response.json();

		// Firestoreにセッション情報を保存
		await db.collection('users').doc(userId).set({
			eKYC: {
				sessionId: data.verification.id,
				status: 'pending',
				createdAt: new Date().toISOString()
			}
		}, { merge: true });

		const sessionResponse: VeriffSessionResponse = {
			sessionId: data.verification.id,
			sessionUrl: data.verification.url,
			status: 'created'
		};

		return NextResponse.json(sessionResponse);

	} catch (error) {
		console.error('Error creating Veriff session:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/veriff/reset-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';

// Firebase Admin初期化
initAdminApp();

export async function POST(request: NextRequest) {
	try {
		// トークンの検証
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// Firestoreからユーザーデータを取得
		const db = getFirestore();
		const userRef = db.collection('users').doc(userId);
		const userDoc = await userRef.get();

		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// eKYCデータをリセット
		await userRef.update({
			eKYC: {
				status: 'pending',
				resetAt: new Date().toISOString()
			},
			// 登録ステップをeKYCに戻す
			registrationStep: 0
		});

		return NextResponse.json({ success: true, message: 'eKYC status reset successfully' });

	} catch (error) {
		console.error('Error resetting eKYC status:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/veriff/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { verifyVeriffCallback } from '@/lib/veriff';

/**
 * Veriffからのコールバックを処理するAPIルート
 */
export async function POST(request: NextRequest) {
	try {
		// リクエストからデータを取得
		const body = await request.json();
		const signature = request.headers.get('x-callback-signature') || '';

		// シグネチャの検証（本番では必須）
		if (!verifyVeriffCallback(signature, body)) {
			return NextResponse.json(
				{ error: 'Invalid signature' },
				{ status: 401 }
			);
		}

		// コールバックデータを処理
		const { status, vendorData, id: sessionId, code } = body;
		const userId = vendorData; // vendorDataにはユーザーIDを設定している

		if (!userId) {
			return NextResponse.json(
				{ error: 'User ID not found in vendor data' },
				{ status: 400 }
			);
		}

		// ユーザードキュメントを取得
		const userRef = doc(db, 'users', userId);
		const userDoc = await getDoc(userRef);

		if (!userDoc.exists()) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			);
		}

		// eKYC状態を更新
		let eKYCStatus = 'pending';
		if (status === 'approved') {
			eKYCStatus = 'completed';
		} else if (status === 'declined' || status === 'abandoned' || status === 'expired') {
			eKYCStatus = 'failed';
		}

		// Firestoreにデータを更新
		await setDoc(userRef, {
			eKYC: {
				status: eKYCStatus,
				sessionId,
				verificationCode: code,
				verifiedAt: new Date().toISOString(),
				lastUpdated: new Date().toISOString()
			},
			// ステップ完了を記録（eKYCが完了した場合）
			...(eKYCStatus === 'completed' ? { registrationStep: 0 } : {})
		}, { merge: true });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error processing Veriff callback:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/billing/history/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';

// Firebase Admin初期化
initAdminApp();

export async function GET(request: NextRequest) {
	try {
		// トークンの検証
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// クエリパラメータを取得
		const searchParams = request.nextUrl.searchParams;
		const limit = parseInt(searchParams.get('limit') || '10');
		const page = parseInt(searchParams.get('page') || '1');
		const offset = (page - 1) * limit;

		// Firestoreから利用履歴を取得
		const db = getFirestore();

		// 件数の取得
		const countSnapshot = await db.collection('usageHistory')
			.where('userId', '==', userId)
			.count()
			.get();

		const totalCount = countSnapshot.data().count;

		// 履歴データの取得
		const historySnapshot = await db.collection('usageHistory')
			.where('userId', '==', userId)
			.orderBy('timestamp', 'desc')
			.limit(limit)
			.offset(offset)
			.get();

		const history = historySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data(),
			// Firebaseのタイムスタンプを文字列に変換
			timestamp: doc.data().timestamp instanceof Date
				? doc.data().timestamp.toISOString()
				: doc.data().timestamp
		}));

		return NextResponse.json({
			history,
			pagination: {
				total: totalCount,
				page,
				limit,
				pages: Math.ceil(totalCount / limit)
			}
		});

	} catch (error) {
		console.error('Error fetching billing history:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/billing/mock-charge/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

// Firebase Admin初期化
initAdminApp();

/**
 * 開発環境用のモック課金API
 * 実際の環境では入退室管理システムから自動的に課金処理されます
 */
export async function POST(request: NextRequest) {
	// 本番環境では使用不可
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json(
			{ error: 'This endpoint is only available in development mode' },
			{ status: 403 }
		);
	}

	try {
		// トークンの検証
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// リクエストボディを取得
		const body = await request.json();
		const { durationMinutes = 60, description = 'テスト利用' } = body;

		// 料金計算 (10分あたり120円)
		const amountYen = Math.ceil(durationMinutes / 10) * 120;

		// Firestoreからユーザーデータを取得
		const db = getFirestore();
		const userRef = db.collection('users').doc(userId);
		const userDoc = await userRef.get();

		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const userData = userDoc.data();

		// Stripe顧客IDを確認
		if (!userData?.stripe?.customerId) {
			return NextResponse.json(
				{ error: 'Stripe customer not found' },
				{ status: 400 }
			);
		}

		// Stripeで請求書を作成（テスト用）
		const invoice = await stripe.invoices.create({
			customer: userData.stripe.customerId,
			auto_advance: true, // 自動的に確定する
			description: description,
			metadata: {
				userId: userId,
				durationMinutes: String(durationMinutes),
				testMode: 'true'
			}
		});

		// 請求項目を追加
		await stripe.invoiceItems.create({
			customer: userData.stripe.customerId,
			amount: amountYen * 100, // 日本円をセントに変換（100倍）
			currency: 'jpy',
			description: `利用時間: ${durationMinutes}分`,
			invoice: invoice.id,
		});

		// 請求書を確定
		const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

		// 請求書を支払う（テスト用）
		const paidInvoice = await stripe.invoices.pay(invoice.id);

		// 利用履歴に記録
		await db.collection('usageHistory').add({
			userId,
			invoiceId: paidInvoice.id,
			amount: amountYen,
			durationMinutes,
			status: 'paid',
			timestamp: new Date().toISOString(),
			description: description,
			isTest: true
		});

		return NextResponse.json({
			success: true,
			invoiceId: paidInvoice.id,
			amount: amountYen,
			durationMinutes,
			paidAt: new Date().toISOString()
		});

	} catch (error) {
		console.error('Error in mock billing:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/seats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase';
import { SeatDocument, ReservationDocument } from '@/types/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function GET(req: NextRequest) {
	try {
		// Get status filter from query params (if any)
		const url = new URL(req.url);
		const status = url.searchParams.get('status');

		// Build query for seats collection
		let seatsQuery = collection(db, 'seats');

		// If status filter is provided, apply it
		if (status) {
			seatsQuery = query(seatsQuery, where('status', '==', status));
		}

		// Execute query
		const querySnapshot = await getDocs(seatsQuery);

		// Convert snapshot to data array
		const seats = querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as SeatDocument[];

		// Get date param for availability check
		const date = url.searchParams.get('date');

		// If date is provided, fetch reservations for that date to check availability
		if (date) {
			const reservationsQuery = query(
				collection(db, 'reservations'),
				where('date', '==', date),
				where('status', '==', 'confirmed')
			);

			const reservationsSnapshot = await getDocs(reservationsQuery);
			const reservations = reservationsSnapshot.docs.map(doc => doc.data()) as ReservationDocument[];

			// Enhance seats with availability info
			const seatsWithAvailability = seats.map(seat => {
				const seatReservations = reservations.filter(r => r.seatId === seat.seatId);

				// Calculate occupied time slots
				const occupiedTimeSlots = seatReservations.map(reservation => ({
					startTime: reservation.startTime,
					endTime: reservation.endTime
				}));

				return {
					...seat,
					reservations: occupiedTimeSlots,
					isFullyBooked: occupiedTimeSlots.length > 0 &&
						// This is a simplified check - in production, you'd want to check
						// if the entire operating hours are covered by reservations
						occupiedTimeSlots.some(slot => slot.startTime === '10:00' && slot.endTime === '22:00')
				};
			});

			return NextResponse.json({ seats: seatsWithAvailability });
		}

		return NextResponse.json({ seats });
	} catch (error) {
		console.error('Error fetching seats:', error);
		return NextResponse.json(
			{ error: '座席情報の取得に失敗しました' },
			{ status: 500 }
		);
	}
}

// This endpoint can be used to check availability for a specific date and time
export async function POST(req: NextRequest) {
	try {
		const { date, startTime, endTime } = await req.json();

		// Validate required parameters
		if (!date || !startTime || !endTime) {
			return NextResponse.json(
				{ error: '日付と時間の指定が必要です' },
				{ status: 400 }
			);
		}

		// Query seats
		const seatsSnapshot = await getDocs(collection(db, 'seats'));
		const seats = seatsSnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as SeatDocument[];

		// Query reservations for the specified date
		const reservationsQuery = query(
			collection(db, 'reservations'),
			where('date', '==', date),
			where('status', '==', 'confirmed')
		);

		const reservationsSnapshot = await getDocs(reservationsQuery);
		const reservations = reservationsSnapshot.docs.map(doc => doc.data()) as ReservationDocument[];

		// Convert times to Date objects for comparison
		const requestStart = new Date(`${date}T${startTime}`);
		const requestEnd = new Date(`${date}T${endTime}`);

		// Check availability for each seat
		const availability = seats.map(seat => {
			const seatReservations = reservations.filter(r => r.seatId === seat.seatId);

			// Check if there's any conflict with existing reservations
			const hasConflict = seatReservations.some(reservation => {
				const existingStart = new Date(`${reservation.date}T${reservation.startTime}`);
				const existingEnd = new Date(`${reservation.date}T${reservation.endTime}`);

				return (
					(requestStart < existingEnd && requestEnd > existingStart) ||
					(existingStart < requestEnd && existingEnd > requestStart)
				);
			});

			return {
				seatId: seat.seatId,
				name: seat.name,
				isAvailable: !hasConflict && seat.status === 'available',
				ratePerMinute: seat.ratePerMinute || 0
			};
		});

		return NextResponse.json({ availability });
	} catch (error) {
		console.error('Error checking availability:', error);
		return NextResponse.json(
			{ error: '空き状況の確認に失敗しました' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/stripe/create-setup-intent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

// Firebase Admin初期化
initAdminApp();

export async function POST(request: NextRequest) {
	try {
		// トークンの検証
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// Firestoreからユーザーデータを取得
		const db = getFirestore();
		const userRef = db.collection('users').doc(userId);
		const userDoc = await userRef.get();

		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const userData = userDoc.data();

		// Stripe顧客IDを確認
		if (!userData?.stripe?.customerId) {
			// 顧客IDがない場合は顧客作成APIを呼び出すよう促す
			return NextResponse.json(
				{ error: 'Stripe customer not created yet. Call create-customer endpoint first.' },
				{ status: 400 }
			);
		}

		// Setup Intentを作成
		const setupIntent = await stripe.setupIntents.create({
			customer: userData.stripe.customerId,
			payment_method_types: ['card'],
			metadata: {
				userId: userId
			}
		});

		return NextResponse.json({
			clientSecret: setupIntent.client_secret
		});

	} catch (error) {
		console.error('Error creating Setup Intent:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/stripe/confirm-payment-setup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

// Firebase Admin初期化
initAdminApp();

export async function POST(request: NextRequest) {
	try {
		// トークンの検証
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// リクエストボディを取得
		const body = await request.json();
		const { setupIntentId, paymentMethodId } = body;

		if (!setupIntentId || !paymentMethodId) {
			return NextResponse.json(
				{ error: 'Setup Intent ID and Payment Method ID are required' },
				{ status: 400 }
			);
		}

		// Setup Intentを取得して確認
		const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

		if (setupIntent.status !== 'succeeded') {
			return NextResponse.json(
				{ error: 'Setup Intent not succeeded' },
				{ status: 400 }
			);
		}

		// Firestoreからユーザーデータを取得
		const db = getFirestore();
		const userRef = db.collection('users').doc(userId);
		const userDoc = await userRef.get();

		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const userData = userDoc.data();

		// Stripe顧客IDを確認
		if (!userData?.stripe?.customerId) {
			return NextResponse.json(
				{ error: 'Stripe customer not found' },
				{ status: 400 }
			);
		}

		// 支払い方法をデフォルトに設定
		await stripe.customers.update(userData.stripe.customerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId
			}
		});

		// Firestoreにユーザーの支払い状態を更新
		await userRef.update({
			'stripe.paymentMethodId': paymentMethodId,
			'stripe.paymentSetupCompleted': true,
			'stripe.updatedAt': new Date().toISOString(),
			'registrationStep': 1, // 決済情報登録ステップ完了
		});

		return NextResponse.json({ success: true });

	} catch (error) {
		console.error('Error confirming payment setup:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/stripe/mock-payment-setup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';

// Firebase Admin初期化
initAdminApp();

// 開発環境用のモック決済設定API
export async function POST(request: NextRequest) {
	// 本番環境では使用不可
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json(
			{ error: 'This endpoint is only available in development mode' },
			{ status: 403 }
		);
	}

	try {
		// トークンの検証
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// Firestoreからユーザーデータを取得
		const db = getFirestore();
		const userRef = db.collection('users').doc(userId);
		const userDoc = await userRef.get();

		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// モックのStripe顧客データを設定
		await userRef.update({
			'stripe': {
				customerId: `mock_cus_${Date.now()}`,
				paymentMethodId: `mock_pm_${Date.now()}`,
				paymentSetupCompleted: true,
				updatedAt: new Date().toISOString()
			},
			'registrationStep': 1, // 決済情報登録ステップ完了
		});

		return NextResponse.json({
			success: true,
			message: 'Mock payment setup completed'
		});

	} catch (error) {
		console.error('Error in mock payment setup:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/stripe/create-customer/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { getOrCreateCustomer } from '@/lib/stripe';
import { StripeCustomerResponse } from '@/types/api';

// Firebase Admin初期化
initAdminApp();

export async function POST(request: NextRequest) {
	try {
		// トークンの検証
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// ユーザーデータの取得
		const userRecord = await getAuth().getUser(userId);
		const email = userRecord.email || '';

		if (!email) {
			return NextResponse.json({ error: 'User email not found' }, { status: 400 });
		}

		// Stripe顧客の作成または取得
		const customer = await getOrCreateCustomer(userId, email);

		// Firestoreに顧客IDを保存
		const db = getFirestore();
		await db.collection('users').doc(userId).update({
			'stripe': {
				customerId: customer.id,
				createdAt: new Date().toISOString()
			}
		});

		const response: StripeCustomerResponse = {
			customerId: customer.id
		};

		return NextResponse.json(response);

	} catch (error) {
		console.error('Error creating Stripe customer:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}-e 
### FILE: ./src/app/api/stripe/webhook/route.ts

// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { initAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { stripe } from '@/lib/stripe';

// Firebase Admin初期化
initAdminApp();

// Stripeウェブフックシークレット
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
	try {
		// リクエストのRawボディを取得
		const payload = await request.text();
		const headersList = headers();
		const sig = headersList.get('stripe-signature') || '';

		let event;

		// シグネチャの検証
		try {
			event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
		} catch (err) {
			console.error('Webhook signature verification failed:', err);
			return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
		}

		// Firestore参照
		const db = getFirestore();

		// イベントタイプに基づいて処理
		switch (event.type) {
			// 支払い方法が追加された時
			case 'payment_method.attached':
				const paymentMethod = event.data.object;
				// 顧客IDを取得
				const customerId = paymentMethod.customer;

				if (customerId) {
					// 顧客IDに基づいてユーザーを検索
					const usersSnapshot = await db.collection('users')
						.where('stripe.customerId', '==', customerId)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];
						// ユーザーのStripe情報を更新
						await userDoc.ref.update({
							'stripe.paymentMethodId': paymentMethod.id,
							'stripe.updatedAt': new Date().toISOString(),
							'stripe.paymentSetupCompleted': true,
							'stripe.paymentMethodType': paymentMethod.type,
							'stripe.paymentMethodBrand': paymentMethod.card?.brand || '',
							'stripe.paymentMethodLast4': paymentMethod.card?.last4 || '',
						});
					}
				}
				break;

			// 請求書の支払いが成功した時
			case 'invoice.paid':
				const invoice = event.data.object;
				// 利用履歴に記録
				if (invoice.customer) {
					const usersSnapshot = await db.collection('users')
						.where('stripe.customerId', '==', invoice.customer)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];
						const userId = userDoc.id;

						// 利用履歴に追加
						await db.collection('usageHistory').add({
							userId,
							invoiceId: invoice.id,
							amount: invoice.amount_paid / 100, // セントから円に変換
							status: 'paid',
							timestamp: new Date().toISOString(),
							description: invoice.description || '利用料金',
							metadata: invoice.metadata || {},
							paymentMethodType: invoice.default_payment_method
								? await getPaymentMethodType(invoice.default_payment_method)
								: 'unknown',
							durationMinutes: invoice.metadata?.durationMinutes
								? parseInt(invoice.metadata.durationMinutes)
								: undefined
						});

						// ユーザーの請求履歴にも追加
						await userDoc.ref.update({
							'billingHistory': db.FieldValue.arrayUnion({
								invoiceId: invoice.id,
								amount: invoice.amount_paid / 100,
								date: new Date().toISOString(),
								status: 'paid'
							})
						});
					}
				}
				break;

			// 請求書の支払いが失敗した時
			case 'invoice.payment_failed':
				const failedInvoice = event.data.object;
				// 支払い失敗を記録
				if (failedInvoice.customer) {
					const usersSnapshot = await db.collection('users')
						.where('stripe.customerId', '==', failedInvoice.customer)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];
						const userId = userDoc.id;

						// 失敗記録を追加
						await db.collection('paymentFailures').add({
							userId,
							invoiceId: failedInvoice.id,
							amount: failedInvoice.amount_due / 100, // セントから円に変換
							timestamp: new Date().toISOString(),
							reason: failedInvoice.last_payment_error?.message || '不明なエラー'
						});

						// ユーザーの支払い状態を更新
						await userDoc.ref.update({
							'stripe.paymentStatus': 'failed',
							'stripe.lastPaymentError': failedInvoice.last_payment_error?.message,
							'stripe.lastPaymentErrorAt': new Date().toISOString()
						});
					}
				}
				break;

			// その他のイベント
			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error('Error processing webhook:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// 支払い方法のタイプを取得するヘルパー関数
async function getPaymentMethodType(paymentMethodId: string): Promise<string> {
	try {
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
		return paymentMethod.type;
	} catch (error) {
		console.error('Error retrieving payment method:', error);
		return 'unknown';
	}
}-e 
### FILE: ./src/app/register/complete/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function CompletePage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();
	const [completing, setCompleting] = useState(false);
	const [completed, setCompleted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 登録情報を確認し、必要に応じて完了フラグを設定
	useEffect(() => {
		const completeRegistration = async () => {
			if (!user || loading) return;

			// すでに登録完了している場合はダッシュボードにリダイレクト
			if (userData?.registrationCompleted) {
				router.push('/dashboard');
				return;
			}

			// 決済設定が完了している場合のみ、登録完了処理を行う
			if (userData?.stripe?.paymentSetupCompleted ||
				userData?.registrationStep >= 1) {
				try {
					setCompleting(true);

					// 登録完了フラグを設定
					await setDoc(doc(db, 'users', user.uid), {
						registrationCompleted: true,
						registrationCompletedAt: new Date().toISOString()
					}, { merge: true });

					setCompleted(true);

				} catch (err) {
					console.error('Error completing registration:', err);
					setError('登録完了処理中にエラーが発生しました。');
				} finally {
					setCompleting(false);
				}
			} else {
				// 決済設定が完了していない場合は決済ページにリダイレクト
				router.push('/register/payment');
			}
		};

		completeRegistration();
	}, [user, userData, loading, router]);

	const goToDashboard = () => {
		router.push('/dashboard');
	};

	// ローディング表示
	if (loading || completing) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<LoadingSpinner size="large" />
				<p className="mt-4 text-foreground/70">
					{completing ? '登録情報を完了しています...' : '読み込み中...'}
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto text-center">
			<div className="bg-border/5 rounded-xl shadow-soft p-8">
				<div className="mb-8">
					<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" viewBox="0 0 20 20" fill="currentColor">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
						</svg>
					</div>
				</div>

				<h2 className="text-2xl font-semibold mb-4">会員登録が完了しました！</h2>

				<p className="text-foreground/70 mb-8">
					E-Sports Sakuraの会員登録が正常に完了しました。<br />
					ダッシュボードから会員QRコードを確認し、店舗でのサービスをお楽しみください。
				</p>

				{error && (
					<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6 max-w-md mx-auto">
						{error}
						<p className="mt-2 text-sm">
							※エラーが発生しましたが、ダッシュボードから利用を開始できます。
						</p>
					</div>
				)}

				<Button
					onClick={goToDashboard}
					className="w-full max-w-md mx-auto"
				>
					ダッシュボードへ
				</Button>

				<div className="mt-8 p-4 bg-accent/10 rounded-lg max-w-md mx-auto">
					<h3 className="font-medium text-accent mb-2">次のステップ</h3>
					<ul className="text-left text-sm space-y-2">
						<li>• ダッシュボードから会員QRコードを表示</li>
						<li>• 店舗入口のQRリーダーにかざして入室</li>
						<li>• 店内のPCでも同じQRコードを使用</li>
						<li>• 退出時は自動的に料金計算されます</li>
					</ul>
				</div>
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/register/verification/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import VerificationStatus from '@/components/verification/verification-status';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function VerificationPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	// ログイン状態確認中
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	// ユーザーがログインしていない場合
	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-center">
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4 max-w-md">
					ログインが必要です。会員登録フローを開始するには、まずログインしてください。
				</div>
				<Link
					href="/login"
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					ログインページへ
				</Link>
			</div>
		);
	}

	// 登録フロー全体が完了している場合
	if (userData?.registrationCompleted) {
		router.push('/dashboard');
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
				<span className="ml-3">ダッシュボードへリダイレクト中...</span>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			{/* メインコンテンツ */}
			<VerificationStatus />

			{/* FAQ セクション */}
			<div className="mt-8 bg-border/5 rounded-xl p-6 shadow-soft">
				<h3 className="text-lg font-medium mb-4">よくある質問</h3>
				<div className="space-y-4">
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">どんな身分証明書が使えますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							以下の身分証明書が使用できます：
							<ul className="list-disc pl-5 mt-1 space-y-1">
								<li>運転免許証</li>
								<li>パスポート</li>
								<li>マイナンバーカード（写真付き）</li>
								<li>在留カード</li>
							</ul>
							※通知カードや健康保険証など、顔写真がないものは利用できません。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">本人確認に失敗した場合はどうなりますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							再度お試しいただけます。複数回失敗する場合は、以下をご確認ください：
							<ul className="list-disc pl-5 mt-1 space-y-1">
								<li>身分証明書が鮮明に写っているか</li>
								<li>顔写真と身分証明書の本人が一致しているか</li>
								<li>身分証明書の有効期限が切れていないか</li>
								<li>十分な明るさがあるか</li>
							</ul>
							何度も失敗する場合は、お問い合わせフォームからサポートにご連絡ください。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">カメラやマイクへのアクセス許可はなぜ必要ですか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							本人確認プロセスでは、身分証明書の撮影と顔認証のためにカメラアクセスが必要です。これらの許可は本人確認プロセスのみに使用され、安全に管理されます。許可を拒否すると、本人確認プロセスを完了できません。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">本人確認はどのくらいの時間がかかりますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							通常、本人確認プロセス全体は2〜5分程度で完了します。審査結果は通常すぐに表示されますが、場合によっては数分かかることがあります。
						</div>
					</details>
				</div>
			</div>

			{/* プライバシーポリシーリンク */}
			<div className="mt-6 text-center text-sm text-foreground/60">
				本人確認の実施により、
				<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>
				と
				<Link href="/terms" className="text-accent hover:underline">利用規約</Link>
				に同意したものとみなされます。
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/register/personal-info/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function PersonalInfoRedirectPage() {
	const router = useRouter();

	// 本人確認ページに自動リダイレクト
	useEffect(() => {
		router.push('/register/verification');
	}, [router]);

	return (
		<div className="flex items-center justify-center py-12">
			<LoadingSpinner size="large" />
			<span className="ml-2">リダイレクト中...</span>
		</div>
	);
}-e 
### FILE: ./src/app/register/payment/page.tsx

// src/app/register/payment/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/context/auth-context';
import EnhancedCardForm from '@/components/payment/enhanced-card-form';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Stripeの公開キーを使用してStripeをロード
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function PaymentPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	// ユーザーがログインしていない場合はログインページへリダイレクト
	useEffect(() => {
		if (!loading && !user) {
			router.push('/login');
		}
	}, [user, loading, router]);

	// 登録が既に完了している場合はダッシュボードへリダイレクト
	useEffect(() => {
		if (userData?.registrationCompleted) {
			router.push('/dashboard');
		}
	}, [userData, router]);

	// ログイン状態確認中
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			<div className="bg-border/5 rounded-xl shadow-soft p-6">
				<h2 className="text-xl font-semibold mb-6">決済情報の登録</h2>

				<div className="bg-blue-500/10 text-blue-600 p-4 rounded-lg mb-6">
					<p>
						サービスをご利用いただくには、お支払い情報の登録が必要です。<br />
						サービス利用後に自動的に決済されます。
					</p>
				</div>

				<div className="space-y-6 mb-8">
					<div>
						<h3 className="text-lg font-medium mb-3">料金プラン</h3>

						<div className="bg-border/10 rounded-lg p-4">
							<div className="flex justify-between items-center mb-2">
								<span className="font-medium">従量課金プラン</span>
								<span className="text-xl font-bold text-accent">¥700 <span className="text-sm font-normal">/時間</span></span>
							</div>
							<ul className="text-sm text-foreground/70 space-y-1">
								<li>• 10分単位での課金（¥120/10分）</li>
								<li>• フリードリンク・お菓子込み</li>
								<li>• 高性能ゲーミングPC利用可能</li>
								<li>• 深夜割増なし（24時間同一料金）</li>
							</ul>
						</div>
					</div>

					<div>
						<Elements stripe={stripePromise}>
							<EnhancedCardForm />
						</Elements>
					</div>
				</div>

				<div className="text-sm text-foreground/60 border-t border-border pt-4">
					<p>
						ご利用に関する注意事項:
					</p>
					<ul className="list-disc pl-5 mt-2 space-y-1">
						<li>料金は利用終了時に計算され、登録されたカードから自動的に請求されます</li>
						<li>領収書はメールで送信されます</li>
						<li>カード情報の変更はマイページから行えます</li>
					</ul>
				</div>
			</div>

			<div className="mt-6 text-center text-sm text-foreground/60">
				<p>
					決済情報の登録により、
					<Link href="/terms" className="text-accent hover:underline">利用規約</Link>と
					<Link href="/privacy" className="text-accent hover:underline">プライバシーポリシー</Link>に
					同意したものとみなされます。
				</p>
			</div>
		</div>
	);
}-e 
### FILE: ./src/app/register/layout.tsx

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { RegistrationProvider } from '@/context/registration-context';
import ProgressTracker from '@/components/registration/progress-tracker';
import ProtectedRoute from '@/components/auth/protected-route';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function RegisterLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const { user, loading } = useAuth();
	const router = useRouter();

	// 認証中の表示
	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return (
		<ProtectedRoute>
			<RegistrationProvider>
				<div className="min-h-screen flex flex-col bg-background text-foreground">
					{/* ヘッダー */}
					<header className="bg-background/80 backdrop-blur-sm border-b border-border">
						<div className="container mx-auto px-4">
							<div className="flex items-center justify-between h-16">
								<Link href="/" className="flex items-center">
									<Image
										src="/images/logo.svg"
										alt="E-Sports Sakura"
										width={40}
										height={40}
										className="mr-2"
									/>
									<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
								</Link>

								<div className="flex items-center space-x-4">
									<Link href="/dashboard" className="text-foreground/70 hover:text-accent">
										登録をキャンセル
									</Link>
								</div>
							</div>
						</div>
					</header>

					{/* メインコンテンツ */}
					<main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
						<h1 className="text-2xl md:text-3xl font-bold text-center mb-8">会員登録</h1>

						{/* 進行状況トラッカー */}
						<ProgressTracker />

						{/* 各ステップのコンテンツ */}
						{children}
					</main>

					{/* フッター */}
					<footer className="bg-background border-t border-border py-4">
						<div className="container mx-auto px-4 text-center">
							<p className="text-foreground/60 text-sm">
								&copy; {new Date().getFullYear()} E-Sports Sakura. All rights reserved.
							</p>
						</div>
					</footer>
				</div>
			</RegistrationProvider>
		</ProtectedRoute>
	);
}-e 
### FILE: ./src/app/register/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function RegisterIndexPage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// 認証とデータのロードが完了したら処理
		if (!loading) {
			if (!user) {
				// 未ログインユーザーはログインページへ
				router.push('/login');
				return;
			}

			if (userData) {
				// 登録状態に応じて適切なページへリダイレクト
				if (userData.registrationCompleted) {
					// 登録済みならダッシュボードへ
					router.push('/dashboard');
				} else if (userData.registrationStep !== undefined) {
					// 登録途中ならその続きのページへ
					const steps = [
						'/register/verification',
						'/register/payment',
						'/register/complete'
					];
					router.push(steps[userData.registrationStep] || '/register/verification');
				} else {
					// 登録開始
					router.push('/register/verification');
				}
			} else {
				// userData読込中のエラー
				router.push('/register/verification');
			}
		}
	}, [user, userData, loading, router]);

	return (
		<div className="flex items-center justify-center py-12">
			<LoadingSpinner size="large" />
		</div>
	);
}-e 
### FILE: ./src/hooks/use-veriff.ts

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VeriffSession, VeriffStatus } from '@/types';

interface UseVeriffReturn {
	status: VeriffStatus;
	sessionId: string | null;
	isLoading: boolean;
	error: string | null;
	startVerification: () => Promise<void>;
	simulateVerification: () => Promise<void>; // 開発用
}

/**
 * Veriff統合のためのカスタムフック
 */
export function useVeriff(): UseVeriffReturn {
	const { user } = useAuth();
	const [status, setStatus] = useState<VeriffStatus>('pending');
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ユーザーのVeriff状態を読み込む
	useEffect(() => {
		const loadVeriffStatus = async () => {
			if (!user) return;

			try {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists() && userDoc.data().eKYC) {
					const eKYC = userDoc.data().eKYC;
					setStatus(eKYC.status || 'pending');
					if (eKYC.sessionId) {
						setSessionId(eKYC.sessionId);
					}
				}
			} catch (err) {
				console.error('Error loading verification status:', err);
				setError('検証状態の取得中にエラーが発生しました。');
			}
		};

		loadVeriffStatus();
	}, [user]);

	// Veriffセッションを開始する
	const startVerification = async () => {
		if (!user || !user.uid) {
			setError('ユーザー情報が取得できません。ログインし直してください。');
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// Firebase IDトークンを取得
			const idToken = await user.getIdToken();

			// APIを呼び出してセッションを作成
			const response = await fetch('/api/veriff/create-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				}
			});

			if (!response.ok) {
				throw new Error('セッション作成に失敗しました');
			}

			const data = await response.json();

			// すでに検証が完了している場合
			if (data.status === 'completed') {
				setStatus('completed');
				setIsLoading(false);
				return;
			}

			// セッションIDを保存
			setSessionId(data.sessionId);

			// Veriffのページにリダイレクト
			window.location.href = data.sessionUrl;

		} catch (err) {
			console.error('Error starting verification:', err);
			setError('検証の開始中にエラーが発生しました。後でもう一度お試しください。');
			setIsLoading(false);
		}
	};

	// 開発用: 検証完了をシミュレート
	const simulateVerification = async () => {
		if (!user) return;

		setIsLoading(true);
		setError(null);

		try {
			// モックセッションID
			const mockSessionId = `mock-session-${Date.now()}`;
			setSessionId(mockSessionId);

			// 検証完了をシミュレート
			setTimeout(async () => {
				setStatus('completed');

				// Firestoreを更新
				await setDoc(doc(db, 'users', user.uid), {
					eKYC: {
						sessionId: mockSessionId,
						status: 'completed',
						verifiedAt: new Date().toISOString()
					},
					registrationStep: 0  // eKYCステップ完了
				}, { merge: true });

				setIsLoading(false);
			}, 2000);
		} catch (err) {
			console.error('Error in mock verification:', err);
			setError('検証のシミュレーション中にエラーが発生しました。');
			setIsLoading(false);
		}
	};

	return {
		status,
		sessionId,
		isLoading,
		error,
		startVerification,
		simulateVerification
	};
}-e 
### FILE: ./src/components/ini/create-seat-documents.tsx

'use client';
import React, { useState } from 'react';
import { collection, setDoc, getDocs, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SeatDocument, BranchDocument } from '@/types/firebase';

// This is a utility component for initializing seats in Firestore
// It's not part of the main app flow, but can be used for setup
const SeatInitializer: React.FC = () => {
	const [status, setStatus] = useState<string>('');
	const [isInitializing, setIsInitializing] = useState<boolean>(false);
	const [selectedBranchId, setSelectedBranchId] = useState<string>('');
	const [branches, setBranches] = useState<BranchDocument[]>([]);

	// Fetch branches
	const fetchBranches = async () => {
		setStatus('支店情報を取得中...');
		try {
			const branchesCollection = collection(db, 'branch');
			const branchesSnapshot = await getDocs(branchesCollection);

			const branchesData: BranchDocument[] = [];
			branchesSnapshot.forEach((doc) => {
				branchesData.push({
					branchId: doc.id,
					...doc.data()
				} as BranchDocument);
			});

			setBranches(branchesData);
			setStatus(`${branchesData.length}店舗を取得しました`);
		} catch (error) {
			console.error('Error fetching branches:', error);
			setStatus('支店情報の取得に失敗しました');
		}
	};

	// Initialize seats for selected branch
	const initializeSeats = async () => {
		if (!selectedBranchId) {
			setStatus('支店を選択してください');
			return;
		}

		setIsInitializing(true);
		setStatus('座席情報を初期化中...');

		try {
			const targetBranch = branches.find(b => b.branchId === selectedBranchId);
			if (!targetBranch) {
				throw new Error('選択された支店が見つかりません');
			}

			// Check if seats already exist for this branch
			const existingSeatsQuery = query(
				collection(db, 'seats'),
				where('branchCode', '==', targetBranch.branchCode)
			);

			const existingSeatsSnapshot = await getDocs(existingSeatsQuery);
			// Determine seat count based on branch
			const seatCount =
				selectedBranchId === 'tachikawa' ? 8 :
					selectedBranchId === 'shinjuku' ? 20 :
						selectedBranchId === 'akihabara' ? 16 : 10;

			// シートデータを作成して追加
			let createdCount = 0;
			for (let i = 1; i <= seatCount; i++) {
				//const isHighSpec = i <= Math.ceil(seatCount / 2); // 半分は高スペックPCとする

				// カスタムドキュメントID（支店コード-NN形式）を作成
				const seatId = `${targetBranch.branchCode}-${i.toString().padStart(2, '0')}`;

				// ドキュメント参照を取得
				const seatRef = doc(db, 'seats', seatId);

				// データを準備
				const seatData = {
					name: `PC #${i}`,
					branchCode: targetBranch.branchCode,
					branchName: targetBranch.branchName,
					seatType: 'Standard PC',
					seatNumber: i,
					ipAddress: `192.168.${selectedBranchId === 'tachikawa' ? '1' : selectedBranchId === 'shinjuku' ? '2' : '3'}.${i.toString().padStart(3, '0')}`,
					ratePerHour: 400,
					status: 'available',
					// スクリーンショットで確認された構造に合わせて定義
					availableHours: {
						weekday_night: "18:00-23:00",
						weekday_noon: "9:00-17:00",
						weekend: "9:00-23:00"
					},
					maxAdvanceBookingDays: 30,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				};

				// setDocを使ってカスタムIDでドキュメントを作成
				await setDoc(seatRef, seatData);
				createdCount++;
				setStatus(`座席を作成中... (${createdCount}/${seatCount})`);
			}

			setStatus(`${createdCount}席の座席情報を作成しました`);
		} catch (error) {
			console.error('Error initializing seats:', error);
			setStatus('座席情報の初期化に失敗しました: ' + (error as Error).message);
		} finally {
			setIsInitializing(false);
		}
	};

	return (
		<div className="max-w-md mx-auto p-6 bg-background border border-border rounded-lg shadow-sm">
			<h2 className="text-xl font-semibold mb-4">座席データ初期化ツール</h2>
			<p className="text-sm text-foreground/70 mb-4">
				このツールは、各支店の座席データをFirestoreに初期化するためのものです。
				運用開始時に一度だけ実行してください。
			</p>

			<div className="space-y-4">
				<button
					onClick={fetchBranches}
					disabled={isInitializing}
					className="w-full py-2 bg-accent/80 hover:bg-accent text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					支店情報を取得する
				</button>

				{branches.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-foreground mb-1">
							初期化する支店を選択
						</label>
						<select
							value={selectedBranchId}
							onChange={(e) => setSelectedBranchId(e.target.value)}
							disabled={isInitializing}
							className="w-full p-2 border border-border rounded-md bg-background disabled:opacity-50"
						>
							<option value="">支店を選択してください</option>
							{branches.map((branch) => (
								<option key={branch.branchId} value={branch.branchId}>
									{branch.branchName} ({branch.branchCode})
								</option>
							))}
						</select>
					</div>
				)}

				{selectedBranchId && (
					<button
						onClick={initializeSeats}
						disabled={isInitializing || !selectedBranchId}
						className="w-full py-2 bg-highlight hover:bg-highlight/90 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isInitializing ? '処理中...' : '座席データを初期化する'}
					</button>
				)}

				{status && (
					<div className={`p-3 rounded-md ${status.includes('失敗') ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
						{status}
					</div>
				)}
			</div>
		</div>
	);
};

export default SeatInitializer;-e 
### FILE: ./src/components/auth/email-password-form.tsx

'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

type FormMode = 'login' | 'register' | 'forgotPassword';

export default function EmailPasswordForm() {
	const [mode, setMode] = useState<FormMode>('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const {
		signInWithEmailAndPassword,
		createUserWithEmailAndPassword,
		resetPassword,
		error: authError,
		clearError
	} = useAuth();

	// フォームモード切り替え時にエラーとフィールドをリセット
	const switchMode = (newMode: FormMode) => {
		clearError();
		setFormError(null);
		setSuccessMessage(null);
		setMode(newMode);
	};

	// フォーム送信ハンドラ
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// フォームバリデーション
		if (!email) {
			setFormError('メールアドレスを入力してください。');
			return;
		}

		if (mode !== 'forgotPassword' && !password) {
			setFormError('パスワードを入力してください。');
			return;
		}

		if (mode === 'register' && password !== confirmPassword) {
			setFormError('パスワードが一致しません。');
			return;
		}

		setFormError(null);
		clearError();
		setIsSubmitting(true);

		try {
			switch (mode) {
				case 'login':
					await signInWithEmailAndPassword(email, password);
					break;
				case 'register':
					await createUserWithEmailAndPassword(email, password);
					break;
				case 'forgotPassword':
					await resetPassword(email);
					setSuccessMessage('パスワードリセットの手順をメールで送信しました。');
					break;
			}
		} catch (error) {
			// エラーはauthErrorで自動的に設定されるため、ここでは何もしない
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="w-full max-w-md">
			<div className="flex justify-center mb-6">
				<div className="inline-flex rounded-md">
					<button
						onClick={() => switchMode('login')}
						className={`px-4 py-2 text-sm font-medium rounded-l-md ${mode === 'login'
								? 'bg-accent text-white'
								: 'bg-border/10 text-foreground/70 hover:bg-border/20'
							}`}
					>
						ログイン
					</button>
					<button
						onClick={() => switchMode('register')}
						className={`px-4 py-2 text-sm font-medium rounded-r-md ${mode === 'register'
								? 'bg-accent text-white'
								: 'bg-border/10 text-foreground/70 hover:bg-border/20'
							}`}
					>
						新規登録
					</button>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				{/* エラーメッセージ */}
				{(formError || authError) && (
					<div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
						{formError || authError}
					</div>
				)}

				{/* 成功メッセージ */}
				{successMessage && (
					<div className="bg-green-500/10 text-green-500 p-3 rounded-md text-sm">
						{successMessage}
					</div>
				)}

				{/* メールアドレス入力 */}
				<div>
					<label htmlFor="email" className="block text-sm font-medium text-foreground/70 mb-1">
						メールアドレス
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
						disabled={isSubmitting}
					/>
				</div>

				{/* パスワード入力（パスワードリセットモード以外） */}
				{mode !== 'forgotPassword' && (
					<div>
						<label htmlFor="password" className="block text-sm font-medium text-foreground/70 mb-1">
							パスワード
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
							disabled={isSubmitting}
						/>
					</div>
				)}

				{/* パスワード確認（新規登録モードのみ） */}
				{mode === 'register' && (
					<div>
						<label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground/70 mb-1">
							パスワード（確認）
						</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
							disabled={isSubmitting}
						/>
					</div>
				)}

				{/* 送信ボタン */}
				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full bg-accent text-white font-medium py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
				>
					{isSubmitting ? (
						<LoadingSpinner size="small" />
					) : (
						mode === 'login'
							? 'ログイン'
							: mode === 'register'
								? 'アカウント作成'
								: 'パスワードリセット'
					)}
				</button>

				{/* パスワードを忘れた場合のリンク（ログインモードのみ） */}
				{mode === 'login' && (
					<div className="text-center mt-2">
						<button
							type="button"
							onClick={() => switchMode('forgotPassword')}
							className="text-sm text-accent hover:underline"
						>
							パスワードをお忘れですか？
						</button>
					</div>
				)}

				{/* 戻るリンク（パスワードリセットモードのみ） */}
				{mode === 'forgotPassword' && (
					<div className="text-center mt-2">
						<button
							type="button"
							onClick={() => switchMode('login')}
							className="text-sm text-accent hover:underline"
						>
							ログイン画面に戻る
						</button>
					</div>
				)}
			</form>
		</div>
	);
}-e 
### FILE: ./src/components/auth/protected-route.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
	children: React.ReactNode;
	redirectUrl?: string;
}

export default function ProtectedRoute({
	children,
	redirectUrl = '/login'
}: ProtectedRouteProps) {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.push(redirectUrl);
		}
	}, [user, loading, router, redirectUrl]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	return user ? <>{children}</> : null;
}-e 
### FILE: ./src/components/verification/verification-status-v2.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useAuth } from '@/context/auth-context';
import { useEkyc } from '@/context/ekyc-context';
import {
	VerifiedIcon,
	VerificationFailedIcon,
	VerificationPendingIcon,
	VerificationBadge
} from '@/components/icons/verification-icons';
import { createVeriffSession } from '@/lib/veriff';

export default function VerificationStatusV2() {
	const router = useRouter();
	const { user } = useAuth();
	const { ekycData, isLoading, error: ekycError, resetEkycStatus } = useEkyc();
	const [isStartingVerification, setIsStartingVerification] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [countdown, setCountdown] = useState(5);
	const [showHelpSection, setShowHelpSection] = useState(false);

	// 検証完了時の自動リダイレクト
	useEffect(() => {
		if (ekycData?.status === 'completed') {
			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						router.push('/register/payment');
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [ekycData, router]);

	// 本人確認を開始
	const startVerification = async () => {
		if (!user || !user.email) {
			setError('ユーザー情報が取得できません。ログインし直してください。');
			return;
		}

		setIsStartingVerification(true);
		setError(null);

		try {
			// Firebase IDトークンを取得
			const idToken = await user.getIdToken();

			// APIを呼び出してVeriffセッションを作成
			const response = await fetch('/api/veriff/create-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				}
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || '本人確認の開始に失敗しました');
			}

			const data = await response.json();

			// すでに検証が完了している場合
			if (data.status === 'completed') {
				return;
			}

			// Veriffのページにリダイレクト
			window.location.href = data.sessionUrl;

		} catch (err) {
			console.error('Error starting verification:', err);
			setError(`本人確認の開始中にエラーが発生しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
			setIsStartingVerification(false);
		}
	};

	// 開発用: 検証完了をシミュレート
	const simulateVerification = async () => {
		if (!user) return;

		setIsStartingVerification(true);
		setError(null);

		try {
			// 開発環境用のAPIエンドポイント
			const response = await fetch('/api/veriff/simulate-complete', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${await user.getIdToken()}`
				}
			});

			if (!response.ok) {
				throw new Error('シミュレーション失敗');
			}

			// APIレスポンスを待つ必要はなく、Firestoreリスナーが状態を更新
			setTimeout(() => {
				setIsStartingVerification(false);
			}, 1500);

		} catch (err) {
			console.error('Error in simulation:', err);
			setError('シミュレーション中にエラーが発生しました');
			setIsStartingVerification(false);
		}
	};

	// 検証をリセット
	const handleReset = async () => {
		setIsStartingVerification(true);
		try {
			await resetEkycStatus();
			setIsStartingVerification(false);
		} catch (err) {
			setIsStartingVerification(false);
		}
	};

	// ステータスに応じたコンテンツをレンダリング
	const renderStatusContent = () => {
		if (isLoading) {
			return (
				<div className="flex justify-center items-center py-10">
					<LoadingSpinner size="large" />
				</div>
			);
		}

		switch (ekycData?.status) {
			case 'completed':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-green-500/10 text-green-600 p-6 rounded-xl"
					>
						<div className="flex items-center mb-4">
							<div className="bg-green-100 rounded-full p-2 mr-4">
								<VerifiedIcon size={32} />
							</div>
							<div>
								<h3 className="text-lg font-medium">本人確認が完了しました</h3>
								<p className="text-sm opacity-80">
									{ekycData.verifiedAt ?
										`確認日時: ${new Date(ekycData.verifiedAt).toLocaleString('ja-JP')}` :
										'正常に認証されました'}
								</p>
							</div>
						</div>

						<div className="bg-white/50 rounded-lg p-4 mb-4">
							<div className="flex items-center">
								<VerificationBadge className="mr-3" />
								<div>
									<p className="font-medium">E-Sports Sakura 認証済みユーザー</p>
									<p className="text-sm opacity-80">本人確認済みのユーザーとして登録されました</p>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-sm">
								{`${countdown}秒後に決済情報登録へ移動します...`}
							</span>
							<Button
								onClick={() => router.push('/register/payment')}
								className="bg-green-600 hover:bg-green-700 text-white"
							>
								今すぐ次へ
							</Button>
						</div>
					</motion.div>
				);

			case 'failed':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-red-500/10 text-red-600 p-6 rounded-xl"
					>
						<div className="flex items-center mb-4">
							<div className="bg-red-100 rounded-full p-2 mr-4">
								<VerificationFailedIcon size={32} />
							</div>
							<div>
								<h3 className="text-lg font-medium">本人確認に失敗しました</h3>
								<p className="text-sm opacity-80">
									問題が発生したため、本人確認プロセスを完了できませんでした
								</p>
							</div>
						</div>

						<div className="bg-white/50 rounded-lg p-4 mb-4">
							<h4 className="font-medium mb-2">考えられる原因:</h4>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>写真が鮮明でなかった</li>
								<li>身分証明書が有効でなかった</li>
								<li>顔と身分証の写真が一致しなかった</li>
								<li>ネットワーク接続に問題があった</li>
							</ul>
						</div>

						<div className="flex justify-end space-x-4">
							<Button
								onClick={handleReset}
								variant="outline"
								disabled={isStartingVerification}
							>
								初めからやり直す
							</Button>
							<Button
								onClick={startVerification}
								disabled={isStartingVerification}
							>
								{isStartingVerification ? <LoadingSpinner size="small" /> : '再試行する'}
							</Button>
						</div>
					</motion.div>
				);

			case 'pending':
			default:
				return (
					<div className="space-y-6">
						<div className="bg-blue-500/10 text-blue-600 p-6 rounded-xl">
							<div className="flex items-center mb-4">
								<div className="bg-blue-100 rounded-full p-2 mr-4">
									<VerificationPendingIcon size={32} />
								</div>
								<div>
									<h3 className="text-lg font-medium">本人確認を開始しましょう</h3>
									<p className="text-sm opacity-80">
										安全なサービス提供のため、身分証明書による本人確認が必要です
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2h1v1H4v-1h1v-2a1 1 0 011-1h8a1 1 0 011 1z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">身分証撮影</h4>
									<p className="text-xs text-center">
										身分証明書の表面と裏面を撮影します
									</p>
								</div>
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">顔写真撮影</h4>
									<p className="text-xs text-center">
										自撮りで本人確認用の写真を撮影します
									</p>
								</div>
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">自動審査</h4>
									<p className="text-xs text-center">
										AIによる自動審査ですぐに結果が出ます
									</p>
								</div>
							</div>
						</div>

						<AnimatePresence>
							{showHelpSection && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.3 }}
									className="overflow-hidden"
								>
									<div className="bg-border/5 rounded-xl p-6 shadow-soft">
										<h3 className="text-lg font-medium mb-3">本人確認に必要なもの</h3>
										<ul className="list-disc pl-5 space-y-2">
											<li>有効な身分証明書（運転免許証、パスポート、マイナンバーカードなど）</li>
											<li>カメラ付きデバイス（スマートフォン、PC）</li>
											<li>良好な照明環境</li>
										</ul>

										<h4 className="font-medium mt-4 mb-2">準備のポイント</h4>
										<ul className="list-disc pl-5 space-y-1 text-sm">
											<li>身分証明書の情報が鮮明に見えるようにしてください</li>
											<li>反射や影が写り込まないよう注意してください</li>
											<li>顔写真撮影時は、明るい場所で正面から撮影してください</li>
											<li>眼鏡やマスクは外してください</li>
										</ul>
									</div>
								</motion.div>
							)}
						</AnimatePresence>

						<div className="flex flex-col space-y-4">
							<Button
								onClick={() => setShowHelpSection(!showHelpSection)}
								variant="outline"
								className="self-start"
							>
								{showHelpSection ? '準備のポイントを隠す' : '準備のポイントを表示する'}
							</Button>

							<div className="pt-2">
								{process.env.NODE_ENV === 'development' ? (
									<div className="space-y-4">
										<Button
											onClick={startVerification}
											disabled={isStartingVerification}
											className="w-full"
										>
											{isStartingVerification ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
										</Button>
										<Button
											onClick={simulateVerification}
											disabled={isStartingVerification}
											className="w-full bg-gray-500 hover:bg-gray-600"
										>
											{isStartingVerification ? <LoadingSpinner size="small" /> : '(開発用) 検証完了をシミュレート'}
										</Button>
									</div>
								) : (
									<Button
										onClick={startVerification}
										disabled={isStartingVerification}
										className="w-full"
									>
										{isStartingVerification ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
									</Button>
								)}
							</div>
						</div>
					</div>
				);
		}
	};

	return (
		<div className="bg-border/5 rounded-xl shadow-soft p-6">
			<h2 className="text-xl font-semibold mb-6">本人確認 (eKYC)</h2>

			{(error || ekycError) && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{error || ekycError}
				</div>
			)}

			{renderStatusContent()}
		</div>
	);
}-e 
### FILE: ./src/components/verification/veriff-integration.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { createVeriffSession, VeriffSession, VeriffStatus } from '@/lib/veriff';

export default function VeriffIntegration() {
	const { user } = useAuth();
	const router = useRouter();
	const [veriffSession, setVeriffSession] = useState<VeriffSession | null>(null);
	const [status, setStatus] = useState<VeriffStatus>('pending');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ユーザーのVeriff状態を確認
	useEffect(() => {
		const checkVeriffStatus = async () => {
			if (!user) return;

			try {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists() && userDoc.data().eKYC) {
					const eKYC = userDoc.data().eKYC;
					setStatus(eKYC.status || 'pending');

					// すでにセッションがある場合
					if (eKYC.sessionId) {
						setVeriffSession({
							sessionId: eKYC.sessionId,
							sessionUrl: '',  // APIから取得する場合はここで設定
							status: eKYC.status
						});
					}

					// 検証が完了している場合
					if (eKYC.status === 'completed') {
						// 決済情報入力ステップに進む準備ができていることを示す
						setTimeout(() => {
							router.push('/register/payment');
						}, 2000);
					}
				}
			} catch (err) {
				console.error('Error checking verification status:', err);
				setError('検証状態の確認中にエラーが発生しました。');
			}
		};

		checkVeriffStatus();
	}, [user, router]);

	// Veriffセッションを開始
	const startVerification = async () => {
		if (!user || !user.email) {
			setError('ユーザー情報が取得できません。ログインし直してください。');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// Veriffセッションを作成
			const session = await createVeriffSession(user.uid, user.email);

			// セッション情報を保存
			setVeriffSession(session);

			// Firestoreにセッション情報を保存
			await setDoc(doc(db, 'users', user.uid), {
				eKYC: {
					sessionId: session.sessionId,
					status: 'pending',
					createdAt: new Date().toISOString()
				}
			}, { merge: true });

			// Veriffの検証ページにリダイレクト
			window.location.href = session.sessionUrl;
		} catch (err) {
			console.error('Error starting verification:', err);
			setError('検証の開始中にエラーが発生しました。後でもう一度お試しください。');
			setLoading(false);
		}
	};

	// モック実装用の関数（テスト/開発用）
	const simulateVerification = async () => {
		if (!user) return;

		setLoading(true);
		setError(null);

		try {
			// 検証完了をシミュレート
			setTimeout(async () => {
				const newStatus = 'completed';
				setStatus(newStatus);

				// Firestoreを更新
				await setDoc(doc(db, 'users', user.uid), {
					eKYC: {
						sessionId: `mock-session-${Date.now()}`,
						status: newStatus,
						verifiedAt: new Date().toISOString()
					},
					registrationStep: 0  // eKYCステップ完了
				}, { merge: true });

				setLoading(false);

				// 次のステップへ
				setTimeout(() => {
					router.push('/register/payment');
				}, 1500);
			}, 2000);
		} catch (err) {
			console.error('Error in mock verification:', err);
			setError('検証のシミュレーション中にエラーが発生しました。');
			setLoading(false);
		}
	};

	// UI表示
	const renderStatus = () => {
		switch (status) {
			case 'completed':
				return (
					<div className="bg-green-500/10 text-green-500 p-4 rounded-lg mb-6">
						<div className="flex items-center">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="font-medium">本人確認が完了しました。</span>
						</div>
						<p className="mt-2 text-sm">
							決済情報の登録に進みます...
						</p>
					</div>
				);
			case 'failed':
				return (
					<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
						<p className="font-medium">本人確認に失敗しました。</p>
						<p className="mt-2 text-sm">
							もう一度お試しいただくか、サポートにお問い合わせください。
						</p>
						<Button
							onClick={startVerification}
							className="mt-4"
							disabled={loading}
						>
							再試行する
						</Button>
					</div>
				);
			default:
				return (
					<div className="space-y-6">
						<div className="bg-orange-500/10 text-orange-500 p-4 rounded-lg mb-6">
							<p>
								安全なサービスのご提供のため、本人確認を行います。
								有効な身分証明書（運転免許証、パスポート、マイナンバーカードなど）をご用意ください。
							</p>
						</div>

						<div className="space-y-4">
							<h3 className="text-lg font-medium">本人確認の流れ</h3>
							<ol className="list-decimal pl-5 space-y-2">
								<li>有効な身分証明書を用意する</li>
								<li>本人確認を開始ボタンをクリックする</li>
								<li>身分証の撮影（両面）</li>
								<li>顔写真の撮影（本人確認）</li>
								<li>審査完了（自動）</li>
							</ol>
						</div>

						<div className="pt-4">
							{process.env.NODE_ENV === 'development' ? (
								// 開発環境では、モックボタンも表示
								<div className="space-y-4">
									<Button
										onClick={startVerification}
										disabled={loading}
										className="w-full"
									>
										{loading ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
									</Button>
									<Button
										onClick={simulateVerification}
										disabled={loading}
										className="w-full bg-gray-500 hover:bg-gray-600"
									>
										{loading ? <LoadingSpinner size="small" /> : '(開発用) 検証完了をシミュレート'}
									</Button>
								</div>
							) : (
								<Button
									onClick={startVerification}
									disabled={loading}
									className="w-full"
								>
									{loading ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
								</Button>
							)}

							<p className="mt-4 text-sm text-foreground/60 text-center">
								本人確認は安全なシステムで行われ、あなたの個人情報は保護されます。<br />
								Veriffのサービスを使用した本人確認プロセスを通じて、不正アクセスを防止します。
							</p>
						</div>
					</div>
				);
		}
	};

	return (
		<div className="bg-border/5 rounded-xl shadow-soft p-6">
			<h2 className="text-xl font-semibold mb-6">本人確認 (eKYC)</h2>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{error}
				</div>
			)}

			{renderStatus()}
		</div>
	);
}-e 
### FILE: ./src/components/verification/verification-status.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useVeriff } from '@/hooks/use-veriff';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';

export default function VerificationStatus() {
	const router = useRouter();
	const { user } = useAuth();
	const { status, error, isLoading, startVerification, simulateVerification } = useVeriff();
	const [countdown, setCountdown] = useState(5);

	// 検証結果をリアルタイムで監視
	useEffect(() => {
		if (!user) return;

		const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
			if (snapshot.exists()) {
				const data = snapshot.data();
				if (data.eKYC?.status === 'completed') {
					// 自動的に次のステップに進むためのカウントダウン
					const timer = setInterval(() => {
						setCountdown((prev) => {
							if (prev <= 1) {
								clearInterval(timer);
								router.push('/register/payment');
								return 0;
							}
							return prev - 1;
						});
					}, 1000);

					return () => clearInterval(timer);
				}
			}
		});

		// クリーンアップ
		return () => unsubscribe();
	}, [user, router]);

	// UI表示をステータスに応じて切り替え
	const renderContent = () => {
		switch (status) {
			case 'completed':
				return (
					<div className="bg-green-500/10 text-green-500 p-6 rounded-lg mb-6">
						<div className="flex items-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="text-lg font-medium">本人確認が完了しました</span>
						</div>
						<p className="mb-4">
							お客様の本人確認が正常に完了しました。次のステップに進みます。
						</p>
						<div className="flex items-center justify-between">
							<span className="text-sm">
								{countdown}秒後に自動的に次のステップへ移動します...
							</span>
							<Button
								onClick={() => router.push('/register/payment')}
								variant="outline"
								size="sm"
							>
								今すぐ次へ
							</Button>
						</div>
					</div>
				);

			case 'failed':
				return (
					<div className="bg-red-500/10 text-red-500 p-6 rounded-lg mb-6">
						<div className="flex items-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
							</svg>
							<span className="text-lg font-medium">本人確認に失敗しました</span>
						</div>
						<p className="mb-4">
							本人確認に失敗しました。以下の一般的な問題をご確認ください：
							<ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
								<li>身分証明書が鮮明に写っていない</li>
								<li>顔写真と身分証明書の本人が一致していない</li>
								<li>有効期限が切れた身分証明書を使用している</li>
								<li>推奨される身分証明書を使用していない</li>
							</ul>
						</p>
						<Button
							onClick={startVerification}
							className="w-full mt-4"
							disabled={isLoading}
						>
							再試行する
						</Button>
					</div>
				);

			case 'pending':
			default:
				return (
					<div className="space-y-6">
						<div className="bg-blue-500/10 text-blue-500 p-6 rounded-lg">
							<h3 className="font-medium text-lg mb-2">本人確認について</h3>
							<p className="mb-4">
								本人確認は身分証明書と顔写真を使って、ご本人様であることを確認するプロセスです。
								これにより、サービスの安全性と信頼性を高めています。
							</p>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2h1v1H4v-1h1v-2a1 1 0 011-1h8a1 1 0 011 1z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">身分証撮影</h4>
									<p className="text-xs text-center">
										身分証明書の表面と裏面を撮影します
									</p>
								</div>
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">顔写真撮影</h4>
									<p className="text-xs text-center">
										自撮りで本人確認用の写真を撮影します
									</p>
								</div>
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">自動審査</h4>
									<p className="text-xs text-center">
										AIによる自動審査ですぐに結果が出ます
									</p>
								</div>
							</div>
						</div>

						<div>
							<h3 className="text-lg font-medium mb-3">本人確認に必要なもの</h3>
							<ul className="list-disc pl-5 space-y-2">
								<li>有効な身分証明書（運転免許証、パスポート、マイナンバーカードなど）</li>
								<li>カメラ付きデバイス（スマートフォン、PC）</li>
								<li>良好な照明環境</li>
							</ul>
						</div>

						<div className="pt-4">
							{process.env.NODE_ENV === 'development' ? (
								// 開発環境では、本番と開発用のボタンを表示
								<div className="space-y-4">
									<Button
										onClick={startVerification}
										disabled={isLoading}
										className="w-full"
									>
										{isLoading ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
									</Button>
									<Button
										onClick={simulateVerification}
										disabled={isLoading}
										className="w-full bg-gray-500 hover:bg-gray-600"
									>
										{isLoading ? <LoadingSpinner size="small" /> : '(開発用) 検証完了をシミュレート'}
									</Button>
								</div>
							) : (
								<Button
									onClick={startVerification}
									disabled={isLoading}
									className="w-full"
								>
									{isLoading ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
								</Button>
							)}
						</div>
					</div>
				);
		}
	};

	return (
		<div className="bg-border/5 rounded-xl shadow-soft p-6">
			<h2 className="text-xl font-semibold mb-6">本人確認 (eKYC)</h2>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{error}
				</div>
			)}

			{renderContent()}
		</div>
	);
}-e 
### FILE: ./src/components/verification/verification-complete.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Button from '@/components/ui/button';
import { useEkyc } from '@/context/ekyc-context';

interface VerificationCompleteProps {
	onContinue?: () => void;
	autoRedirectDelay?: number; // 秒数
	redirectUrl?: string;
}

export default function VerificationComplete({
	onContinue,
	autoRedirectDelay = 5,
	redirectUrl = '/register/payment'
}: VerificationCompleteProps) {
	const router = useRouter();
	const { ekycData } = useEkyc();
	const [countdown, setCountdown] = useState(autoRedirectDelay);
	const [isRedirecting, setIsRedirecting] = useState(false);

	// 本人確認が完了している場合のみカウントダウン
	useEffect(() => {
		if (ekycData?.status === 'completed' && !isRedirecting) {
			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						handleContinue();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [ekycData, isRedirecting]);

	// 次へ進むハンドラー
	const handleContinue = () => {
		setIsRedirecting(true);

		if (onContinue) {
			onContinue();
		} else {
			router.push(redirectUrl);
		}
	};

	if (ekycData?.status !== 'completed') {
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="bg-green-500/10 text-green-600 p-6 rounded-xl"
		>
			<div className="flex items-center mb-4">
				<div className="bg-green-100 rounded-full p-2 mr-4">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
					</svg>
				</div>
				<div>
					<h3 className="text-lg font-medium">本人確認が完了しました</h3>
					<p className="text-sm opacity-80">
						{ekycData.verifiedAt ?
							`確認日時: ${new Date(ekycData.verifiedAt).toLocaleString('ja-JP')}` :
							'正常に認証されました'}
					</p>
				</div>
			</div>

			<div className="bg-white/50 rounded-lg p-4 mb-4">
				<div className="flex items-center">
					<Image
						src="/images/verification-badge.svg"
						alt="認証済みバッジ"
						width={48}
						height={48}
						className="mr-3"
					/>
					<div>
						<p className="font-medium">E-Sports Sakura 認証済みユーザー</p>
						<p className="text-sm opacity-80">本人確認済みのユーザーとして登録されました</p>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<span className="text-sm">
					{isRedirecting ?
						'次のステップへ移動中...' :
						`${countdown}秒後に自動的に次のステップへ移動します...`}
				</span>
				<Button
					onClick={handleContinue}
					disabled={isRedirecting}
					className="bg-green-600 hover:bg-green-700 text-white"
				>
					今すぐ次へ
				</Button>
			</div>
		</motion.div>
	);
}-e 
### FILE: ./src/components/games/AudioPermissionModal.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

export default function AudioPermissionModal() {
	const { hasUserInteracted, enableAudio, disableAudio } = useAudio();
	const [isVisible, setIsVisible] = useState(false);

	// ユーザーが初めて訪問したときだけモーダルを表示
	useEffect(() => {
		if (!hasUserInteracted) {
			// ページ読み込み後少し遅延させて表示する
			const timer = setTimeout(() => {
				setIsVisible(true);
			}, 1000);

			return () => clearTimeout(timer);
		}
	}, [hasUserInteracted]);

	// モーダル非表示
	const handleClose = (audioEnabled: boolean) => {
		if (audioEnabled) {
			enableAudio();
		} else {
			disableAudio();
		}
		setIsVisible(false);
	};

	if (!isVisible) return null;

	return (
		<div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
			<div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
				<h3 className="text-xl font-bold mb-4">ゲーム映像のオーディオ設定</h3>

				<p className="mb-4">
					より良いゲーム体験のために、音声付きでゲームプレイ映像をご覧いただけます。
					このページでは一度許可すると、すべての動画で音声を楽しめます。
				</p>

				<div className="grid grid-cols-2 gap-4 mb-6">
					<button
						onClick={() => handleClose(false)}
						className="flex flex-col items-center justify-center p-4 border border-border rounded-lg hover:bg-border/10 transition-colors"
					>
						<VolumeX className="h-8 w-8 mb-2 text-foreground/70" />
						<span className="font-medium">音声なし</span>
					</button>

					<button
						onClick={() => handleClose(true)}
						className="flex flex-col items-center justify-center p-4 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
					>
						<Volume2 className="h-8 w-8 mb-2" />
						<span className="font-medium">音声あり</span>
					</button>
				</div>

				<p className="text-xs text-foreground/60 text-center">
					※ この設定はいつでも各動画のコントロールから変更できます
				</p>
			</div>
		</div>
	);
}-e 
### FILE: ./src/components/games/GameSession.tsx

'use client';

import React, { useRef, useEffect, useState } from 'react';
import StickyGameVideo from './StickyGameVideo';
import { Game } from '../../lib/gameData';
interface GameSectionProps {
	game: Game;
	isActive: boolean;
	onVisibilityChange: (isVisible: boolean) => void;
	globalAudioEnabled?: boolean; // 新しいプロップ
}

const COLOR_MAP = {
	primary: 'text-primary-600 dark:text-primary-300',
	secondary: 'text-secondary-600 dark:text-secondary-300',
	accent: 'text-accent-600 dark:text-accent-300',
	foreground: 'text-foreground',
	muted: 'text-foreground/60', // More muted base text
	strong: 'text-foreground/70',
	danger: 'text-red-600 dark:text-red-400',
	warning: 'text-orange-600 dark:text-orange-400',
	success: 'text-green-600 dark:text-green-400',
};

// Custom Markdown-like text renderer
const renderMarkdownText = (text: string, baseMuted = true) => {
	// Split the text into parts
	const parts = text.split(/(\*\*.*?\*\*|__.*?__|<.*?>|\^.*?\^)/g);

	return parts.map((part, index) => {
		// Bold with **
		if (/^\*\*.*\*\*$/.test(part)) {
			return <strong key={index}>{part.slice(2, -2)}</strong>;
		}

		// Bold with __
		if (/^__.*__$/.test(part)) {
			return <strong key={index}>{part.slice(2, -2)}</strong>;
		}

		// Color emphasis with ^color^
		if (/^\^.*\^$/.test(part)) {
			const [, color, text] = part.match(/\^(.*?):(.+)\^/) || [];
			const colorClass = COLOR_MAP[color as keyof typeof COLOR_MAP] || COLOR_MAP.strong;
			return <span key={index} className={colorClass}>{text}</span>;
		}

		// HTML tags (like <em>, <strong>, <mark>)
		if (/^<.*>$/.test(part)) {
			// Remove angle brackets
			const tagContent = part.slice(1, -1);

			// Split tag into type and content
			const matches = tagContent.match(/^(\w+)>(.*)<\/\1$/);
			if (matches) {
				const [, tagType, content] = matches;
				const TagComponent = tagType as keyof JSX.IntrinsicElements;
				return <TagComponent key={index}>{content}</TagComponent>;
			}

			return part;
		}

		// Plain text
		return baseMuted ? <span key={index} className="text-foreground/60">{part}</span> : part;
	});
};

export default function GameSection({
	game,
	isActive,
	onVisibilityChange,
	globalAudioEnabled = false
}: GameSectionProps) {
	const sectionRef = useRef<HTMLDivElement>(null);
	const [audioState, setAudioState] = useState(false);

	// オーディオ状態の変更を追跡
	useEffect(() => {
		if (isActive) {
			// アクティブになったときにグローバルオーディオ設定を適用
			setAudioState(globalAudioEnabled);
		}
	}, [isActive, globalAudioEnabled]);
	//}, []);

	// 可視性を監視
	useEffect(() => {
		if (!sectionRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting) {
					onVisibilityChange(true);
				} else {
					onVisibilityChange(false);
				}
			},
			{ threshold: 0.3 } // 30%見えたら判定
		);

		observer.observe(sectionRef.current);

		return () => {
			if (sectionRef.current) {
				observer.unobserve(sectionRef.current);
			}
		};
	}, [onVisibilityChange]);
	//}, []);

	// 個別の動画のオーディオ状態が変更されたときの処理
	const handleAudioStateChange = (isAudioOn: boolean) => {
		setAudioState(isAudioOn);
	};

	return (
		<div
			ref={sectionRef}
			className={`relative min-h-screen py-0 md:py-0 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50'}`}
		>
			<div className="container mx-auto px-4">
				<div className="md:hidden flex flex-col">
					<div className="sticky top-28 z-10 h-[40vh] mb-8">
						<StickyGameVideo
							videoSrc={game.videoSrc}
							title={game.title}
							thumbnailSrc={game.thumbnailSrc}
							isActive={isActive}
							globalAudioEnabled={globalAudioEnabled}
							onAudioStateChange={handleAudioStateChange}
						/>
					</div>
					<div className="max-w-3xl mx-auto">
						<h2 className="text-3xl font-bold mb-2">{game.title}</h2>
						<p className="mb-8 text-lg">{game.description}</p>
						{renderGameDetails(game)}
					</div>
				</div>
				<div className="hidden md:flex">
					<div className="w-1/2 pr-8">
						<div className="max-w-4xl ml-auto h-screen flex items-center">
							{gameTitleDetails(game)}
						</div>
						<div className="max-w-4xl ml-auto h-screen">
							{renderGameDetails(game)}
						</div>
					</div>
					<div className="w-1/2">
						<div className="sticky top-1/2 -translate-y-1/2 max-w-4xl">
							<StickyGameVideo
								videoSrc={game.videoSrc}
								title={game.title}
								thumbnailSrc={game.thumbnailSrc}
								isActive={isActive}
								globalAudioEnabled={globalAudioEnabled}
								onAudioStateChange={handleAudioStateChange}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	function gameTitleDetails(game: Game) {
		return (
			<>
				<div className="w-full">
					<h2 className="text-3xl font-bold mb-1 ml-2">{game.title}</h2>
					<p className="mb-4 ml-2">{renderMarkdownText(game.description)}</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-border/10 p-6 rounded-2xl">
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">プレイ人数</h4>
							<p className="text-lg text-foreground/60">{game.playerCount}</p>
						</div>
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">推奨プレイ時間</h4>
							<p className="text-lg text-foreground/60">{game.recommendedTime}</p>
						</div>
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">難易度</h4>
							<p className="text-lg text-foreground/60">{game.difficulty}</p>
						</div>
						<div>
							<h4 className="text-foreground/60 font-medium mb-2">ジャンル</h4>
							<p className="text-lg text-foreground/60">{game.genre}</p>
						</div>
					</div>
				</div>
			</>
		);
	}

	function renderGameDetails(game: Game) {
		return (
			<>
				<div className="mb-8">
					<h3 className="text-xl font-bold mb-1">ルール・コツ</h3>
					<p className="mb-2">
						{renderMarkdownText(game.rule)}
					</p>
				</div>
			</>
		);
	}
}-e 
### FILE: ./src/components/games/GameCategoryLayout.tsx

'use client';

import React, { useState, useEffect } from 'react';
import GameSection from './GameSession';
import AudioPermissionModal from './AudioPermissionModal';
import { useAudio } from '@/context/AudioContext';
import {Game} from '../../lib/gameData';
interface GameCategoryLayoutProps {
	games: Game[];
	onActiveIndexChange?: (index: number) => void;
}
export default function GameCategoryLayout({
	games,
	onActiveIndexChange
}: GameCategoryLayoutProps) {
	const [activeGameIndex, setActiveGameIndex] = useState(0);
	const [visibleSections, setVisibleSections] = useState<boolean[]>(Array(games.length).fill(false));
	const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || 'https://d1abhb48aypmuo.cloudfront.net/e-sports-sakura';

	// オーディオコンテキストを使用
	const { globalAudioEnabled } = useAudio();

	// Prepare games with full video URLs
	const gamesWithFullUrls = games.map(game => ({
		...game,
		videoSrc: game.videoSrc.startsWith('http') ? game.videoSrc : `${cloudFrontUrl}${game.videoSrc}`
	}));

	// Notify parent of active index changes
	useEffect(() => {
		if (onActiveIndexChange) {
			onActiveIndexChange(activeGameIndex);
		}
	}, [activeGameIndex, onActiveIndexChange]);

	// 可視状態が変更されたときのハンドラー
	const handleVisibilityChange = (index: number, isVisible: boolean) => {
		setVisibleSections(prev => {
			const newState = [...prev];
			newState[index] = isVisible;
			return newState;
		});
	};

	// 可視セクションが変わったら、activeゲームを更新
	useEffect(() => {
		const visibleIndex = visibleSections.findIndex(isVisible => isVisible);
		if (visibleIndex !== -1 && visibleIndex !== activeGameIndex) {
			setActiveGameIndex(visibleIndex);
		}
	}, [visibleSections, activeGameIndex]);

	return (
		<>
			<AudioPermissionModal />
			{gamesWithFullUrls.map((game, index) => (
				<GameSection
					key={game.id}
					game={game}
					isActive={index === activeGameIndex}
					onVisibilityChange={(isVisible) => handleVisibilityChange(index, isVisible)}
					globalAudioEnabled={globalAudioEnabled}
				/>
			))}
		</>
	);
}-e 
### FILE: ./src/components/games/CategoryHeader.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface CategoryHeaderProps {
	category: string;
	title: string;
	description: string;
}

export default function CategoryHeader({ category, title, description }: CategoryHeaderProps) {
	return (
		<header className="w-full bg-background p-6 md:p-8 shadow-soft mb-6 fixed z-50">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center justify-between">
					<Link
						href="/#games"
						className="flex items-center text-foreground hover:text-accent transition-colors"
					>
						<ArrowLeft className="mr-2 h-5 w-5" />
						<span className="font-medium">ゲーム一覧に戻る</span>
					</Link>

					<div className="text-right">
						<h1 className="text-xl md:text-2xl font-bold animate-fadeIn">{title}</h1>
						<p className="text-accent text-sm md:text-base animate-fadeIn">{description}</p>
					</div>
				</div>
			</div>
		</header>
	);
}-e 
### FILE: ./src/components/games/GameDetailExpansion.tsx

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Users, Clock, Award, CalendarDays, Tag } from 'lucide-react';

interface Game {
	id: string;
	title: string;
	description: string;
	playerCount: string;
	recommendedTime: string;
	difficulty: string;
	similarGames: string[];
}

interface GameDetailExpansionProps {
	game: Game;
	isActive: boolean;
}

export default function GameDetailExpansion({ game, isActive }: GameDetailExpansionProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div
			className={`rounded-xl p-4 mb-4 transition-all duration-300 ${isActive
					? 'bg-border/20 shadow-soft border border-border/30'
					: 'bg-background/70'
				}`}
		>
			<div className="flex justify-between items-start mb-3">
				<div>
					<h3 className="text-xl font-bold">{game.title}</h3>
					<p className="text-sm text-foreground/80 mt-1">{game.description}</p>
				</div>

				<button
					onClick={toggleExpand}
					className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-accent/10 text-accent' : 'bg-border/20 text-foreground/70'
						}`}
					aria-label={isExpanded ? '詳細を閉じる' : '詳細を見る'}
				>
					{isExpanded ? (
						<ChevronUp className="h-5 w-5" />
					) : (
						<ChevronDown className="h-5 w-5" />
					)}
				</button>
			</div>

			<div className="flex flex-wrap gap-3 mb-3">
				<div className="flex items-center bg-border/10 px-3 py-1.5 rounded-full text-sm">
					<Users className="h-4 w-4 mr-1.5 text-foreground/60" />
					<span>{game.playerCount}</span>
				</div>
				<div className="flex items-center bg-border/10 px-3 py-1.5 rounded-full text-sm">
					<Clock className="h-4 w-4 mr-1.5 text-foreground/60" />
					<span>{game.recommendedTime}</span>
				</div>
				<div className="flex items-center bg-border/10 px-3 py-1.5 rounded-full text-sm">
					<Award className="h-4 w-4 mr-1.5 text-foreground/60" />
					<span>{game.difficulty}</span>
				</div>
			</div>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						className="overflow-hidden"
					>
						<div className="border-t border-border/20 pt-3 mt-2">
							<h4 className="text-sm font-medium mb-2 flex items-center">
								<Tag className="h-4 w-4 mr-1.5 text-foreground/60" />
								類似ゲーム
							</h4>

							<div className="flex flex-wrap gap-2 mb-4">
								{game.similarGames.map((similarGame) => (
									<span
										key={similarGame}
										className="bg-border/15 px-3 py-1 rounded-full text-xs"
									>
										{similarGame}
									</span>
								))}
							</div>

							<div className="bg-border/10 rounded-xl p-3 mb-2">
								<h4 className="text-sm font-medium mb-1 flex items-center">
									<CalendarDays className="h-4 w-4 mr-1.5 text-foreground/60" />
									利用可能時間
								</h4>
								<p className="text-xs text-foreground/70">平日: 10:00 〜 22:00</p>
								<p className="text-xs text-foreground/70">土日祝: 9:00 〜 23:00</p>
							</div>

							<p className="text-xs text-foreground/60 italic">
								* 料金は時間帯によって異なります
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<button
				className={`w-full py-2 mt-3 rounded-xl text-sm font-medium transition-colors ${isActive
						? 'bg-accent text-background'
						: 'bg-border/30 hover:bg-border/50 text-foreground'
					}`}
			>
				このゲームで予約する
			</button>
		</div>
	);
}-e 
### FILE: ./src/components/games/VideoPreloader.tsx

'use client';

import React, { useEffect, useRef } from 'react';

interface VideoPreloaderProps {
	videoSrcs: string[];
	currentIndex: number;
}

/**
 * ビデオプリロードコンポーネント
 * 現在表示中の動画の前後の動画をプリロードします
 */
export default function VideoPreloader({ videoSrcs, currentIndex }: VideoPreloaderProps) {
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

	useEffect(() => {
		// 現在のインデックスの前後の動画をプリロード
		const preloadIndices = [
			currentIndex - 1, // 前の動画
			currentIndex + 1, // 次の動画
			currentIndex + 2  // 次の次の動画
		].filter(i => i >= 0 && i < videoSrcs.length);

		// プリロード処理
		preloadIndices.forEach(index => {
			if (!videoRefs.current[index]) return;

			// video要素のpreload属性を設定
			const video = videoRefs.current[index];
			if (video) {
				video.preload = 'auto';

				// 読み込み済みかチェック
				if (video.readyState === 0) {
					// まだ読み込まれていない場合はロード開始
					video.load();
				}
			}
		});
	}, [currentIndex, videoSrcs]);

	// スタイルなしの非表示ビデオ要素を配置
	return (
		<div style={{ display: 'none', visibility: 'hidden', position: 'absolute' }}>
			{videoSrcs.map((src, index) => (
				<video
					key={`preload-${index}`}
					ref={(el) => {
						videoRefs.current[index] = el;
					}}

					src={src}
					muted
					playsInline
				/>
			))}
		</div>
	);
}-e 
### FILE: ./src/components/games/StickyGameVideo.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Play, Pause, Volume2, VolumeX, Eye, Download } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

interface StickyGameVideoProps {
	videoSrc: string;
	title: string;
	isActive: boolean;
	thumbnailSrc?: string;
	onLoaded?: () => void;
	globalAudioEnabled?: boolean;
	onAudioStateChange?: (isAudioOn: boolean) => void;
}

export default function StickyGameVideo({
	videoSrc,
	title,
	isActive,
	thumbnailSrc,
	onLoaded,
	globalAudioEnabled = false,
	onAudioStateChange
}: StickyGameVideoProps) {
	// AudioContextを使用
	const { hasUserInteracted, enableAudio } = useAudio();

	const [isPlaying, setIsPlaying] = useState(false);
	const [isMuted, setIsMuted] = useState(!globalAudioEnabled);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [loadProgress, setLoadProgress] = useState(0);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [videoDuration, setVideoDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [isBuffering, setIsBuffering] = useState(false);
	const [hasLocalUserInteracted, setHasLocalUserInteracted] = useState(false);
	const [wasEverPlayed, setWasEverPlayed] = useState(false); // この動画が一度でも再生されたかを記録
	const [showThumbnail, setShowThumbnail] = useState(true); // サムネイル表示制御用

	// Load state tracking
	useEffect(() => {
		let interval: NodeJS.Timeout;

		if (isLoading && videoRef.current) {
			interval = setInterval(() => {
				if (videoRef.current && videoRef.current.readyState > 2) {
					// More than HAVE_CURRENT_DATA state
					setLoadProgress(Math.min(95, loadProgress + 5)); // Simulate loading progress
				}
			}, 200);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isLoading, loadProgress]);

	// Handle video play/pause - ユーザーインタラクション状態を考慮
	useEffect(() => {
		if (!videoRef.current || hasError) return;

		if (isPlaying) {
			const playPromise = videoRef.current.play();
			if (playPromise !== undefined) {
				playPromise.catch(error => {
					console.error('Video play error:', error);
					setIsPlaying(false);
				});
			}
		} else {
			videoRef.current.pause();
		}
	}, [isPlaying, hasError]);

	// ビデオのアクティブ状態による制御
	useEffect(() => {
		// アクティブになった時の処理
		if (isActive) {
			// 一度でも再生されたことがあり、ユーザーがインタラクションしていれば
			if (wasEverPlayed && hasUserInteracted) {
				// サムネイルを非表示にして動画を表示
				setShowThumbnail(false);
				// 再生開始
				setIsPlaying(true);
			}
		} else {
			// 非アクティブになったときは再生停止
			if (isPlaying) {
				setIsPlaying(false);
			}
		}
	}, [isActive, wasEverPlayed, hasUserInteracted]);

	// グローバル音声設定が変更されたときの処理
	useEffect(() => {
		if (!videoRef.current) return;

		if (isActive && globalAudioEnabled && !hasLocalUserInteracted) {
			// ユーザーがまだ手動で変更していない場合のみグローバル設定を適用
			setIsMuted(!globalAudioEnabled);
		}
	}, [globalAudioEnabled, isActive, hasLocalUserInteracted]);

	// Handle video mute/unmute
	useEffect(() => {
		if (!videoRef.current) return;
		videoRef.current.muted = isMuted;

		// 音声状態が変更されたら親コンポーネントに通知
		if (onAudioStateChange && isActive) {
			onAudioStateChange(!isMuted);
		}
	}, [isMuted, isActive, onAudioStateChange]);

	// Track video time
	useEffect(() => {
		if (!videoRef.current || !isPlaying) return;

		const updateTime = () => {
			if (videoRef.current) {
				setCurrentTime(videoRef.current.currentTime);
				setVideoDuration(videoRef.current.duration || 0);
			}
		};

		const timeInterval = setInterval(updateTime, 1000);
		return () => clearInterval(timeInterval);
	}, [isPlaying]);

	// Handle buffering state
	useEffect(() => {
		if (!videoRef.current) return;

		const handleWaiting = () => setIsBuffering(true);
		const handlePlaying = () => setIsBuffering(false);

		videoRef.current.addEventListener('waiting', handleWaiting);
		videoRef.current.addEventListener('playing', handlePlaying);

		return () => {
			if (videoRef.current) {
				videoRef.current.removeEventListener('waiting', handleWaiting);
				videoRef.current.removeEventListener('playing', handlePlaying);
			}
		};
	}, []);

	// サムネイルをクリックして再生開始
	const handleThumbnailClick = () => {
		if (hasError || isLoading) return;

		// ユーザーインタラクションフラグを設定
		enableAudio();
		setHasLocalUserInteracted(true);

		// 一度でも再生された状態にする
		setWasEverPlayed(true);

		// サムネイルを非表示にして動画を表示
		setShowThumbnail(false);

		// 再生開始
		setIsPlaying(true);

		// 音量設定（グローバル設定に従う）
		setIsMuted(!globalAudioEnabled);
	};

	const togglePlay = () => {
		if (hasError) return;

		// もし初めての再生なら、この動画が再生されたことを記録
		if (!wasEverPlayed) {
			setWasEverPlayed(true);
			enableAudio(); // ユーザーインタラクションを記録
		}

		setIsPlaying(!isPlaying);
		if (showThumbnail) {
			setShowThumbnail(false);
		}
	};

	const toggleMute = () => {
		setHasLocalUserInteracted(true); // ユーザーが手動で変更したことを記録
		setIsMuted(!isMuted);
	};

	const handleVideoLoaded = () => {
		setIsLoading(false);
		setLoadProgress(100);
		if (onLoaded) onLoaded();
	};

	const handleVideoError = () => {
		setIsLoading(false);
		setHasError(true);
		setIsPlaying(false);
		console.error('Video load error for:', videoSrc);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
	};

	return (
		<div className="relative w-full h-full bg-black/40 rounded-xl overflow-hidden">
			{/* Loading indicator */}
			{isLoading && (
				<div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/50">
					<div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
					<div className="w-48 h-2 bg-background/30 rounded-full overflow-hidden">
						<div
							className="h-full bg-accent animate-pulse-subtle"
							style={{ width: `${loadProgress}%` }}
						></div>
					</div>
					<p className="text-xs mt-2 text-foreground/70">読み込み中...</p>
				</div>
			)}

			{/* Buffering indicator */}
			{isBuffering && !isLoading && !hasError && !showThumbnail && (
				<div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
					<div className="w-8 h-8 border-4 border-white/60 border-t-transparent rounded-full animate-spin"></div>
				</div>
			)}

			{/* Error fallback */}
			{hasError && (
				<div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80 p-4 text-center">
					<p className="text-lg mb-2">動画をロードできませんでした</p>
					<p className="text-sm text-foreground/70 mb-4">
						ゲームプレイ映像は現在準備中です。後ほどお試しください。
					</p>

					{thumbnailSrc && (
						<div className="mt-2 relative w-full max-w-md h-32 bg-border/30 rounded overflow-hidden">
							<Image
								src={thumbnailSrc}
								alt={`${title} ゲームプレイ映像`}
								fill
								style={{ objectFit: 'cover' }}
								className="animate-pulse-subtle"
							/>
						</div>
					)}

					<button
						onClick={() => window.location.reload()}
						className="mt-4 px-4 py-2 bg-accent/80 text-white rounded-full text-sm flex items-center hover:bg-accent transition-colors"
					>
						<Download className="h-4 w-4 mr-1" /> 再読み込み
					</button>
				</div>
			)}

			{/* クリック可能なサムネイル（初回表示または非再生時） */}
			{!isLoading && !hasError && showThumbnail && thumbnailSrc && (
				<div
					className="absolute inset-0 z-20 cursor-pointer group"
					onClick={handleThumbnailClick}
				>
					<Image
						src={thumbnailSrc}
						alt={`${title} サムネイル`}
						fill
						style={{ objectFit: 'cover' }}
						className="brightness-75 group-hover:brightness-90 transition-all duration-300"
					/>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<div className="bg-accent/80 rounded-full p-5 shadow-lg transform transition-transform group-hover:scale-110">
							<Play className="h-12 w-12 text-white" />
						</div>
						<p className="mt-4 text-white text-lg font-medium text-shadow shadow-black">
							クリックして再生
						</p>
					</div>
					<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent h-24">
						<div className="absolute bottom-4 left-4">
							<p className="text-white font-medium text-lg">{title}</p>
						</div>
					</div>
				</div>
			)}
			<video
				ref={videoRef}
				className={`w-full h-full object-cover ${isLoading || hasError || showThumbnail ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
				src={videoSrc}
				playsInline
				loop
				muted={isMuted}
				onCanPlay={handleVideoLoaded}
				onError={handleVideoError}
				preload="auto"
			/>
			{!showThumbnail && !isLoading && !hasError && (
				<div className="absolute bottom-0 left-0 right-0 py-2 px-4 bg-gradient-to-t from-black/70 to-transparent flex flex-col">
					{videoDuration > 0 && (
						<div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
							<div
								className="h-full bg-accent"
								style={{ width: `${(currentTime / videoDuration) * 100}%` }}
							></div>
						</div>
					)}

					<div className="flex justify-between items-center">
						<div className="flex-1">
							<div className="flex items-end justify-left text-white font-medium text-lg">
								<span>{title}</span>
								<div className="flex items-center text-white/70 text-xs ml-2 mb-1">
									<span>
										{formatTime(currentTime)} / {formatTime(videoDuration)}
									</span>
								</div>
							</div>

						</div>
						<div className="flex gap-2">
							<button
								onClick={togglePlay}
								className="rounded-full p-2 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors"
								aria-label={isPlaying ? 'Pause video' : 'Play video'}
							>
								{isPlaying ? (
									<Pause className="h-5 w-5 text-white" />
								) : (
									<Play className="h-5 w-5 text-white" />
								)}
							</button>

							<button
								onClick={toggleMute}
								className="rounded-full p-2 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors"
								aria-label={isMuted ? 'Unmute video' : 'Mute video'}
							>
								{isMuted ? (
									<VolumeX className="h-5 w-5 text-white" />
								) : (
									<Volume2 className="h-5 w-5 text-white" />
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}-e 
### FILE: ./src/components/ui/button.tsx

import React from 'react';
import Link from 'next/link';

type ButtonProps = {
	children: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
	size?: 'sm' | 'md' | 'lg';
	disabled?: boolean;
	loading?: boolean;
	href?: string;
	onClick?: () => void;
	className?: string;
};

export default function Button({
	children,
	variant = 'primary',
	size = 'md',
	disabled = false,
	loading = false,
	href,
	onClick,
	className = '',
}: ButtonProps) {
	const baseClasses = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses = {
		primary: 'bg-accent text-white hover:bg-accent/90',
		secondary: 'bg-accent/10 text-accent hover:bg-accent/20',
		outline: 'border border-accent text-accent hover:bg-accent/10',
		ghost: 'text-accent hover:bg-accent/10',
	};

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2',
		lg: 'px-6 py-3 text-lg',
	};

	const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

	// リンクの場合
	if (href) {
		return (
			<Link href={href} className={classes}>
				{loading ? (
					<>
						<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						読み込み中...
					</>
				) : (
					children
				)}
			</Link>
		);
	}

	// ボタンの場合
	return (
		<button
			onClick={onClick}
			disabled={disabled || loading}
			className={classes}
		>
			{loading ? (
				<>
					<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					読み込み中...
				</>
			) : (
				children
			)}
		</button>
	);
}-e 
### FILE: ./src/components/ui/PageTransition.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
	children: React.ReactNode;
}

/**
 * ページトランジションコンポーネント
 * ページ間の遷移にスムーズなアニメーションを提供します
 */
export default function PageTransition({ children }: PageTransitionProps) {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		// マウント時のアニメーション開始のための微小な遅延
		const timer = setTimeout(() => {
			setIsReady(true);
		}, 50);

		return () => clearTimeout(timer);
	}, []);

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key="page-content"
				initial={{ opacity: 0, y: 20 }}
				animate={{
					opacity: isReady ? 1 : 0,
					y: isReady ? 0 : 20
				}}
				exit={{ opacity: 0, y: -20 }}
				transition={{
					duration: 0.4,
					ease: [0.25, 0.1, 0.25, 1.0], // cubic-bezier
				}}
				className="min-h-screen"
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}

// ページコンテナ用カテゴリ別スタイル適用コンポーネント
export function CategoryPageContainer({
	children,
	category
}: {
	children: React.ReactNode,
	category: string
}) {
	return (
		<div className={`bg-background text-foreground`}>
			<PageTransition>
				{children}
			</PageTransition>
		</div>
	);
}-e 
### FILE: ./src/components/ui/loading-spinner.tsx

export default function LoadingSpinner({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
	const sizeClasses = {
		small: 'h-4 w-4 border-2',
		default: 'h-8 w-8 border-2',
		large: 'h-12 w-12 border-3',
	};

	return (
		<div className="flex justify-center items-center">
			<div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-accent border-r-transparent border-b-transparent border-l-transparent`}></div>
			<span className="sr-only">読み込み中...</span>
		</div>
	);
}-e 
### FILE: ./src/components/dashboard/usage-history.tsx

// src/components/dashboard/usage-history.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';

interface HistoryItem {
	id: string;
	amount: number;
	durationMinutes?: number;
	description: string;
	timestamp: string;
	status: string;
	invoiceId: string;
	isTest?: boolean;
}

interface Pagination {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export default function UsageHistory() {
	const { user } = useAuth();
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [pagination, setPagination] = useState<Pagination>({
		total: 0,
		page: 1,
		limit: 5,
		pages: 0
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchHistory = async (page = 1) => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			const idToken = await user.getIdToken();
			const response = await fetch(`/api/billing/history?page=${page}&limit=${pagination.limit}`, {
				headers: {
					'Authorization': `Bearer ${idToken}`
				}
			});

			if (!response.ok) {
				throw new Error('履歴データの取得に失敗しました');
			}

			const data = await response.json();
			setHistory(data.history);
			setPagination(data.pagination);
		} catch (err) {
			console.error('Error fetching history:', err);
			setError(err instanceof Error ? err.message : '履歴の取得中にエラーが発生しました');
		} finally {
			setLoading(false);
		}
	};

	// 初回読み込み
	useEffect(() => {
		if (user) {
			fetchHistory();
		}
	}, [user]);

	// ページネーション
	const handlePageChange = (newPage: number) => {
		if (newPage < 1 || newPage > pagination.pages) return;
		fetchHistory(newPage);
	};

	// テスト決済のシミュレーション (開発環境のみ)
	const simulatePayment = async (minutes: number) => {
		if (!user || process.env.NODE_ENV === 'production') return;

		try {
			setLoading(true);
			const idToken = await user.getIdToken();

			const response = await fetch('/api/billing/mock-charge', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				},
				body: JSON.stringify({
					durationMinutes: minutes,
					description: `テスト利用 (${minutes}分)`
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'テスト決済に失敗しました');
			}

			// 履歴を再読み込み
			await fetchHistory();

		} catch (err) {
			console.error('Error simulating payment:', err);
			setError(err instanceof Error ? err.message : 'テスト決済中にエラーが発生しました');
		} finally {
			setLoading(false);
		}
	};

	// 日付フォーマット
	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return date.toLocaleString('ja-JP', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (e) {
			return dateString;
		}
	};

	// 金額フォーマット
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(amount);
	};

	return (
		<div className="bg-border/5 rounded-2xl shadow-soft p-6">
			<h2 className="text-lg font-semibold mb-4">利用履歴</h2>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4">
					{error}
				</div>
			)}

			{/* テスト決済ボタン (開発環境のみ) */}
			{process.env.NODE_ENV === 'development' && (
				<div className="mb-6 p-4 bg-orange-500/10 text-orange-600 rounded-lg">
					<p className="text-sm mb-2">開発環境: テスト決済をシミュレート</p>
					<div className="flex flex-wrap gap-2">
						<Button
							onClick={() => simulatePayment(30)}
							disabled={loading}
							variant="outline"
							size="sm"
						>
							30分利用 (¥360)
						</Button>
						<Button
							onClick={() => simulatePayment(60)}
							disabled={loading}
							variant="outline"
							size="sm"
						>
							1時間利用 (¥700)
						</Button>
						<Button
							onClick={() => simulatePayment(120)}
							disabled={loading}
							variant="outline"
							size="sm"
						>
							2時間利用 (¥1,400)
						</Button>
					</div>
				</div>
			)}

			{loading ? (
				<div className="flex justify-center items-center py-12">
					<LoadingSpinner size="large" />
				</div>
			) : history.length === 0 ? (
				<div className="text-center py-8 text-foreground/70">
					<p>まだ利用履歴はありません。</p>
				</div>
			) : (
				<>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="text-left text-foreground/70 border-b border-border">
									<th className="pb-2">日時</th>
									<th className="pb-2">内容</th>
									<th className="pb-2 text-right">料金</th>
									<th className="pb-2 text-right">ステータス</th>
								</tr>
							</thead>
							<tbody>
								{history.map((item) => (
									<tr key={item.id} className="border-b border-border/20">
										<td className="py-3">{formatDate(item.timestamp)}</td>
										<td className="py-3">
											{item.description}
											{item.durationMinutes && (
												<span className="text-foreground/60 text-sm block">
													{item.durationMinutes}分間の利用
												</span>
											)}
											{item.isTest && (
												<span className="inline-block bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded">
													テスト
												</span>
											)}
										</td>
										<td className="py-3 text-right font-medium">
											{formatCurrency(item.amount)}
										</td>
										<td className="py-3 text-right">
											{item.status === 'paid' ? (
												<span className="inline-block bg-green-500/10 text-green-500 text-xs px-2 py-0.5 rounded">
													支払済
												</span>
											) : (
												<span className="inline-block bg-red-500/10 text-red-500 text-xs px-2 py-0.5 rounded">
													{item.status}
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* ページネーション */}
					{pagination.pages > 1 && (
						<div className="flex justify-center mt-6">
							<div className="flex space-x-1">
								<Button
									onClick={() => handlePageChange(pagination.page - 1)}
									disabled={pagination.page === 1 || loading}
									variant="outline"
									size="sm"
								>
									前へ
								</Button>

								<div className="flex items-center px-3 py-2 text-sm">
									{pagination.page} / {pagination.pages}
								</div>

								<Button
									onClick={() => handlePageChange(pagination.page + 1)}
									disabled={pagination.page === pagination.pages || loading}
									variant="outline"
									size="sm"
								>
									次へ
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}-e 
### FILE: ./src/components/dashboard/qr-code.tsx

'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';

export default function QrCodeDisplay() {
	const { user } = useAuth();
	const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const generateQrCode = async () => {
			if (!user) return;

			try {
				// ユーザーのUIDをそのままQRコードとして使用
				const dataUrl = await QRCode.toDataURL(user.uid, {
					width: 250,
					margin: 2,
					color: {
						dark: "#000",
						light: "#fff"
					}
				});

				setQrCodeDataUrl(dataUrl);
			} catch (err) {
				setError('QRコードの生成に失敗しました');
			} finally {
				setLoading(false);
			}
		};

		generateQrCode();
	}, [user]);

	if (loading) {
		return (
			<div className="py-12 flex justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
				<p className="mb-4">{error}</p>
				<Button onClick={() => window.location.reload()} size="sm" variant="outline">
					再読み込み
				</Button>
			</div>
		);
	}

	return (
		<div className="text-center">
			{qrCodeDataUrl ? (
				<>
					<div className="bg-white p-4 rounded-lg w-64 h-64 mx-auto mb-4 flex items-center justify-center border-2 border-accent">
						<img
							src={qrCodeDataUrl}
							alt="QRコード"
							className="w-full h-full object-contain"
						/>
					</div>

					<p className="text-sm text-foreground/70 mb-4">
						このQRコードを店舗の入口リーダーにかざして入室できます。
					</p>

					<div className="text-center text-sm">
						<span className="bg-gray-800 text-white p-2 rounded-md">
							{user?.uid}
						</span>
					</div>
				</>
			) : (
				<div className="bg-orange-500/10 text-orange-500 p-4 rounded-lg mb-4">
					<p className="mb-2">QRコードが見つかりません。</p>
				</div>
			)}
		</div>
	);
}-e 
### FILE: ./src/components/dashboard/reservation-history.tsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Loader, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 予約データの型定義
interface Reservation {
	id?: string;
	userId: string;
	userEmail?: string;
	seatId: string;
	seatName?: string;
	branchId?: string;
	branchName?: string;
	date: string;
	startTime: string;
	endTime: string;
	duration: number;
	status: 'confirmed' | 'cancelled' | 'completed';
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

const ReservationHistory: React.FC = () => {
	const { user } = useAuth();
	const [reservations, setReservations] = useState<Reservation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);

	// Fetch reservations from Firestore
	const fetchReservations = async () => {
		if (!user) return;

		setIsLoading(true);
		setError(null);

		try {
			console.log('Fetching reservations for user:', user.uid);

			// Firestoreからユーザーの予約を取得
			const reservationsRef = collection(db, 'reservations');
			const reservationsQuery = query(
				reservationsRef,
				where('userId', '==', user.uid)
			);

			const querySnapshot = await getDocs(reservationsQuery);

			if (querySnapshot.empty) {
				console.log('No reservations found');
				setReservations([]);
				setIsLoading(false);
				return;
			}

			console.log(`Found ${querySnapshot.size} reservations`);

			// 現在の日付を取得
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const todayStr = today.toISOString().split('T')[0];

			// 予約データを処理
			const reservationsData: Reservation[] = [];
			querySnapshot.forEach((doc) => {
				const data = doc.data() as Omit<Reservation, 'id'>;

				// 基本的な型安全性チェック
				if (!data.date || !data.startTime || !data.endTime || !data.seatId) {
					console.warn('Skipping reservation with missing required fields:', doc.id);
					return;
				}

				const reservation: Reservation = {
					id: doc.id,
					...data,
					// 必須フィールドが欠けている場合のデフォルト値を設定
					status: data.status || 'confirmed',
					duration: data.duration || 0,
					userId: data.userId || user.uid,
					createdAt: data.createdAt || new Date().toISOString(),
					updatedAt: data.updatedAt || new Date().toISOString()
				};

				// 過去の予約で、statusがconfirmedのものは自動的にcompletedに変更
				if (reservation.status === 'confirmed' && reservation.date < todayStr) {
					reservation.status = 'completed';

					// Firestoreの更新は別途非同期で行う（UIブロックを避けるため）
					updateReservationStatus(doc.id, 'completed').catch(console.error);
				}

				reservationsData.push(reservation);
			});

			console.log('Processed reservations:', reservationsData);

			// 未来の予約は日付昇順、過去の予約は日付降順でソート
			const sortedReservations = reservationsData.sort((a, b) => {
				if (a.status === 'confirmed' && b.status === 'confirmed') {
					return new Date(a.date).getTime() - new Date(b.date).getTime();
				} else if ((a.status === 'completed' || a.status === 'cancelled') &&
					(b.status === 'completed' || b.status === 'cancelled')) {
					return new Date(b.date).getTime() - new Date(a.date).getTime();
				}
				return 0;
			});

			setReservations(sortedReservations);
		} catch (err) {
			console.error('Error fetching reservations:', err);
			setError('予約履歴の取得に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	};

	// 予約ステータスを更新する非同期関数
	const updateReservationStatus = async (reservationId: string, status: string) => {
		try {
			const reservationRef = doc(db, 'reservations', reservationId);
			await updateDoc(reservationRef, {
				status,
				updatedAt: new Date().toISOString()
			});
			console.log(`Updated reservation ${reservationId} status to ${status}`);
		} catch (err) {
			console.error(`Failed to update reservation ${reservationId} status:`, err);
		}
	};

	useEffect(() => {
		fetchReservations();
	}, [user]);

	// Get upcoming reservations
	const upcomingReservations = reservations.filter(
		reservation => reservation.status === 'confirmed'
	);

	// Get past reservations
	const pastReservations = reservations.filter(
		reservation => reservation.status === 'completed' || reservation.status === 'cancelled'
	);

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

		return `${year}年${month}月${day}日(${dayOfWeek})`;
	};

	// Handle cancel reservation
	const handleCancelReservation = async (reservationId: string) => {
		if (!reservationId || !confirm('予約をキャンセルしますか？')) return;

		setIsCancelling(true);

		try {
			// Update local state immediately for better UX
			setReservations(prevReservations =>
				prevReservations.map(reservation =>
					reservation.id === reservationId
						? { ...reservation, status: 'cancelled' }
						: reservation
				)
			);

			// Update in Firestore
			const reservationRef = doc(db, 'reservations', reservationId);
			await updateDoc(reservationRef, {
				status: 'cancelled',
				updatedAt: new Date().toISOString()
			});

			console.log(`予約 ${reservationId} をキャンセルしました`);
		} catch (err) {
			console.error('Error cancelling reservation:', err);

			// Revert local state if the operation failed
			setReservations(prevReservations =>
				prevReservations.map(reservation =>
					reservation.id === reservationId && reservation.status === 'cancelled'
						? { ...reservation, status: 'confirmed' }
						: reservation
				)
			);

			alert('予約のキャンセルに失敗しました。もう一度お試しください。');
		} finally {
			setIsCancelling(false);
		}
	};

	// Reservation card component
	const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
		const isUpcoming = reservation.status === 'confirmed';
		const isPast = reservation.status === 'completed';
		const isCancelled = reservation.status === 'cancelled';

		return (
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className={`
          p-4 mb-4 rounded-lg border transition-colors
          ${isUpcoming ? 'border-accent/30 bg-accent/5' : ''}
          ${isPast ? 'border-border bg-background/5' : ''}
          ${isCancelled ? 'border-border/30 bg-background/5 opacity-70' : ''}
        `}
			>
				{/* Status badge */}
				<div className="flex justify-between items-start mb-3">
					<div
						className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs
              ${isUpcoming ? 'bg-accent/20 text-accent' : ''}
              ${isPast ? 'bg-highlight/20 text-highlight' : ''}
              ${isCancelled ? 'bg-red-400/20 text-red-400' : ''}
            `}
					>
						{isUpcoming && <Clock size={12} className="mr-1" />}
						{isPast && <CheckCircle size={12} className="mr-1" />}
						{isCancelled && <Ban size={12} className="mr-1" />}

						{isUpcoming && '予約済み'}
						{isPast && '利用済み'}
						{isCancelled && 'キャンセル済み'}
					</div>

					{/* Cancel button for upcoming reservations */}
					{isUpcoming && (
						<button
							onClick={() => handleCancelReservation(reservation.id || '')}
							disabled={isCancelling}
							className="text-xs text-foreground/60 hover:text-red-400 transition-colors disabled:opacity-50"
						>
							{isCancelling ? '処理中...' : 'キャンセル'}
						</button>
					)}
				</div>

				{/* Branch name if available */}
				{reservation.branchName && (
					<div className="flex items-start mb-2">
						<MapPin className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
						<div className="text-foreground font-medium">
							{reservation.branchName}支店
						</div>
					</div>
				)}

				{/* Date */}
				<div className="flex items-start mb-2">
					<Calendar className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
					<div className="text-foreground font-medium">
						{formatDate(reservation.date)}
					</div>
				</div>

				{/* Time */}
				<div className="flex items-start mb-2">
					<Clock className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
					<div className="text-foreground">
						{reservation.startTime} - {reservation.endTime}
						<span className="text-foreground/60 text-sm ml-2">
							({reservation.duration}分)
						</span>
					</div>
				</div>

				{/* Seat */}
				<div className="flex items-start">
					<MapPin className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
					<div className="text-foreground">
						{reservation.seatName || reservation.seatId}
					</div>
				</div>
			</motion.div>
		);
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-10">
				<Loader className="w-8 h-8 text-accent animate-spin mb-4" />
				<p className="text-foreground/70">予約情報を読み込み中...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
				<p className="text-red-500 mb-2">{error}</p>
				<button
					onClick={fetchReservations}
					className="mt-2 px-4 py-2 inline-flex items-center text-sm bg-accent/10 hover:bg-accent/20 text-accent rounded-md transition-colors"
				>
					<RefreshCw className="w-4 h-4 mr-2" />
					再読み込み
				</button>
			</div>
		);
	}

	return (
		<div className="reservation-history">
			<h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
				<Calendar className="mr-2" /> 予約履歴
			</h2>

			{reservations.length === 0 ? (
				<div className="p-6 text-center bg-border/10 rounded-lg">
					<p className="text-foreground/70 mb-4">予約情報がありません</p>
					<button
						onClick={() => window.location.href = '/reservation'}
						className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
					>
						新規予約をする
					</button>
				</div>
			) : (
				<>
					{/* Upcoming reservations */}
					{upcomingReservations.length > 0 && (
						<div className="mb-8">
							<h3 className="text-lg font-medium text-foreground mb-4">今後の予約</h3>
							<div>
								{upcomingReservations.map(reservation => (
									<ReservationCard key={reservation.id} reservation={reservation} />
								))}
							</div>
						</div>
					)}

					{/* Past reservations */}
					{pastReservations.length > 0 && (
						<div>
							<h3 className="text-lg font-medium text-foreground mb-4">過去の予約</h3>
							<div>
								{(showAll ? pastReservations : pastReservations.slice(0, 3)).map(reservation => (
									<ReservationCard key={reservation.id} reservation={reservation} />
								))}

								{pastReservations.length > 3 && !showAll && (
									<button
										onClick={() => setShowAll(true)}
										className="w-full py-2 border border-border rounded-md text-foreground/70 hover:bg-border/10 transition-colors text-sm"
									>
										もっと見る（残り{pastReservations.length - 3}件）
									</button>
								)}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default ReservationHistory;-e 
### FILE: ./src/components/icons/verification-icons.tsx

import React from 'react';

interface IconProps {
	className?: string;
	size?: number;
}

// 検証済みアイコン
export function VerifiedIcon({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
			<polyline points="22 4 12 14.01 9 11.01" />
		</svg>
	);
}

// 検証失敗アイコン
export function VerificationFailedIcon({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<circle cx="12" cy="12" r="10" />
			<line x1="15" y1="9" x2="9" y2="15" />
			<line x1="9" y1="9" x2="15" y2="15" />
		</svg>
	);
}

// 検証中アイコン
export function VerificationPendingIcon({ className = "", size = 24 }: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

// 認証バッジ（SVGが用意できない場合の代替）
export function VerificationBadge({ className = "", size = 48 }: IconProps) {
	return (
		<div className={`relative ${className}`} style={{ width: size, height: size }}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="text-green-600"
			>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(22, 163, 74, 0.2)" />
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={size * 0.5}
					height={size * 0.5}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="text-green-600"
				>
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
			</div>
		</div>
	);
}-e 
### FILE: ./src/components/reservation/reservation-form.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReservation } from '@/context/reservation-context';
import { useAuth } from '@/context/auth-context';
import { Calendar, Clock, Info, CreditCard, CheckCircle, X } from 'lucide-react';

interface ReservationFormProps {
	onSuccess?: () => void;
	onCancel?: () => void;
}

const ReservationForm: React.FC<ReservationFormProps> = ({ onSuccess, onCancel }) => {
	const { user } = useAuth();
	const {
		selectedDate,
		selectedTimeSlots,
		seats,
		createReservation,
		isLoading,
		selectedBranch
	} = useReservation();

	const [notes, setNotes] = useState('');
	const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

	// Format date for display
	const formatDate = (date: Date | null): string => {
		if (!date) return '';

		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

		return `${year}年${month}月${day}日(${dayOfWeek})`;
	};

	// 座席ごとの詳細情報を計算
	const seatDetails = selectedTimeSlots.map(slot => {
		const seat = seats.find(s => s.seatId === slot.seatId);
		if (!seat) return null;

		// 分数の計算
		const startParts = slot.startTime.split(':').map(Number);
		const endParts = slot.endTime.split(':').map(Number);
		const startMinutes = startParts[0] * 60 + startParts[1];
		const endMinutes = endParts[0] * 60 + endParts[1];
		const duration = endMinutes - startMinutes;

		// 料金計算
		const ratePerMinute = seat.ratePerHour / 60;
		const cost = Math.round(ratePerMinute * duration);

		return {
			seat,
			slot,
			duration,
			cost
		};
	}).filter(Boolean);

	// 合計金額の計算
	const totalCost = seatDetails.reduce((sum, detail) => sum + (detail?.cost || 0), 0);

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedDate || selectedTimeSlots.length === 0) {
			return;
		}

		try {
			const dateStr = selectedDate.toISOString().split('T')[0];

			// 複数の予約データを準備
			const reservationsData = selectedTimeSlots.map(slot => ({
				userId: user?.uid || '',
				seatId: slot.seatId,
				seatName: slot.seatName || seats.find(s => s.seatId === slot.seatId)?.name || '',
				date: dateStr,
				startTime: slot.startTime,
				endTime: slot.endTime,
				duration: calculateDuration(slot.startTime, slot.endTime),
				status: 'confirmed',
				notes
			}));

			await createReservation(reservationsData);

			setSubmitStatus('success');

			// Notify parent component of success
			if (onSuccess) {
				setTimeout(() => {
					onSuccess();
				}, 2000);
			}
		} catch (error) {
			console.error('Reservation failed:', error);
			setSubmitStatus('error');
		}
	};

	// 分数を計算するヘルパー関数
	const calculateDuration = (startTime: string, endTime: string): number => {
		const startParts = startTime.split(':').map(Number);
		const endParts = endTime.split(':').map(Number);
		const startMinutes = startParts[0] * 60 + startParts[1];
		const endMinutes = endParts[0] * 60 + endParts[1];
		return endMinutes - startMinutes;
	};

	// Determine if form is valid for submission
	const isFormValid = selectedDate !== null && selectedTimeSlots.length > 0;

	if (submitStatus === 'success') {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="p-6 bg-highlight/10 rounded-lg text-center"
			>
				<div className="flex justify-center mb-4">
					<CheckCircle size={48} className="text-highlight" />
				</div>
				<h2 className="text-xl font-medium text-foreground mb-2">予約が完了しました</h2>
				<p className="text-foreground/70 mb-4">
					予約内容はメールで送信されました。ダッシュボードでも確認できます。
				</p>
				<button
					onClick={onSuccess}
					className="px-4 py-2 bg-highlight text-white rounded-md hover:bg-highlight/90 transition-colors"
				>
					ダッシュボードへ戻る
				</button>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="w-full max-w-3xl mx-auto"
		>
			<h2 className="text-xl font-medium text-foreground mb-4">予約内容の確認</h2>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Reservation Summary */}
				<div className="bg-background/5 p-4 rounded-lg space-y-4">
					{/* Branch */}
					{selectedBranch && (
						<div className="flex items-start">
							<Info className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
							<div>
								<div className="font-medium text-foreground">支店</div>
								<div className="text-foreground/70">
									{selectedBranch.branchName}
								</div>
							</div>
						</div>
					)}

					{/* Date */}
					<div className="flex items-start">
						<Calendar className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
						<div>
							<div className="font-medium text-foreground">予約日</div>
							<div className="text-foreground/70">
								{formatDate(selectedDate)}
							</div>
						</div>
					</div>

					{/* Selected Seats */}
					<div className="mt-4">
						<h3 className="font-medium text-foreground mb-2">選択した座席 ({seatDetails.length}席)</h3>
						<div className="space-y-3">
							{seatDetails.map((detail, index) => (
								<div key={detail?.seat.seatId || index}
									className="p-3 bg-background/30 rounded border border-border/20"
								>
									<div className="flex justify-between items-start">
										<span className="font-medium text-foreground/80">{detail?.seat.name}</span>
										<span className="text-sm bg-accent/10 text-accent px-2 py-0.5 rounded">
											¥{detail?.cost.toLocaleString()}
										</span>
									</div>
									<div className="text-sm text-foreground/70 mt-1">
										{detail?.slot.startTime} - {detail?.slot.endTime} ({detail?.duration}分)
									</div>
									<div className="text-xs text-foreground/50 mt-1">
										単価: ¥{Math.round(detail?.seat.ratePerHour / 60)}円/分 × {detail?.duration}分
									</div>
								</div>
							))}
						</div>

						{/* Total Price */}
						<div className="flex justify-between items-center mt-4 pt-3 border-t border-border/20">
							<span className="font-medium text-foreground/60">合計金額</span>
							<span className="text-xl font-bold text-foreground/80">¥{totalCost.toLocaleString()}</span>
						</div>
					</div>
				</div>

				{/* Terms and Conditions */}
				<div className="text-sm text-foreground/70">
					<p>
						予約を確定すると、当施設の
						<a href="#" className="text-accent hover:underline">利用規約</a>
						に同意したものとみなされます。
					</p>
				</div>

				{submitStatus === 'error' && (
					<div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
						予約の処理中にエラーが発生しました。もう一度お試しください。
					</div>
				)}
				<div className="flex justify-end">
					<button
						type="submit"
						disabled={!isFormValid || isLoading}
						className={`
							px-6 py-2 rounded-md text-white transition-colors
							${isFormValid ? 'bg-accent hover:bg-accent/90' : 'bg-border/50 cursor-not-allowed'}
						`}
					>
						{isLoading ? '処理中...' : '予約を確定する'}
					</button>
				</div>
			</form>
		</motion.div>
	);
};

export default ReservationForm;-e 
### FILE: ./src/components/reservation/calendar-view.tsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReservation } from '@/context/reservation-context';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
	onDateSelect?: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onDateSelect }) => {
	const { selectedDate, setSelectedDate, dateAvailability } = useReservation();
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

	// Calendar grid setup
	const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

	// Generate days for the current month view
	const getDaysInMonth = (year: number, month: number) => {
		const firstDayOfMonth = new Date(year, month, 1);
		const lastDayOfMonth = new Date(year, month + 1, 0);
		const daysArray = [];

		// Add days from previous month to fill the first week
		const firstDayOfWeek = firstDayOfMonth.getDay();
		const prevMonthLastDay = new Date(year, month, 0).getDate();

		for (let i = firstDayOfWeek - 1; i >= 0; i--) {
			daysArray.push({
				date: new Date(year, month - 1, prevMonthLastDay - i),
				isCurrentMonth: false,
				isPast: new Date(year, month - 1, prevMonthLastDay - i) < new Date(new Date().setHours(0, 0, 0, 0))
			});
		}

		// Add days of current month
		for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
			const date = new Date(year, month, i);
			daysArray.push({
				date,
				isCurrentMonth: true,
				isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
				isToday: date.toDateString() === new Date().toDateString()
			});
		}

		// Add days from next month to complete the last week
		const remainingDays = 7 - (daysArray.length % 7 || 7);
		for (let i = 1; i <= remainingDays; i++) {
			daysArray.push({
				date: new Date(year, month + 1, i),
				isCurrentMonth: false,
				isPast: false
			});
		}

		return daysArray;
	};

	const [days, setDays] = useState(getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()));

	useEffect(() => {
		setDays(getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()));
	}, [currentMonth]);

	const goToPreviousMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	const handleDateClick = (day: { date: Date, isCurrentMonth: boolean, isPast: boolean }) => {
		if (day.isPast) return; // Prevent selecting past dates
		setSelectedDate(day.date);
		if (onDateSelect) onDateSelect(day.date);
	};

	// Get availability status for a day
	const getAvailabilityStatus = (date: Date) => {
		const dateString = date.toISOString().split('T')[0];
		return dateAvailability[dateString] || 'unknown';
	};

	// Get color class based on availability
	const getAvailabilityColorClass = (date: Date) => {
		const status = getAvailabilityStatus(date);
		switch (status) {
			case 'available':
				return 'bg-highlight/10 hover:bg-highlight/20';
			case 'limited':
				return 'bg-accent/10 hover:bg-accent/20';
			case 'booked':
				return 'bg-red-400/10 hover:bg-red-400/20';
			default:
				return 'bg-background/5 hover:bg-background/10';
		}
	};

	return (
		<div className="w-full">
			{/* Calendar header */}
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-medium text-foreground">
					{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
				</h2>
				<div className="flex space-x-2">
					<button
						onClick={goToPreviousMonth}
						className="p-2 rounded-full hover:bg-border text-foreground"
						aria-label="前の月"
					>
						<ChevronLeft size={18} />
					</button>
					<button
						onClick={goToNextMonth}
						className="p-2 rounded-full hover:bg-border text-foreground"
						aria-label="次の月"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{/* Calendar grid */}
			<div className="grid grid-cols-7 gap-1">
				{/* Days of week header */}
				{daysOfWeek.map(day => (
					<div key={day} className="text-center py-2 text-sm font-medium text-foreground/70">
						{day}
					</div>
				))}

				{/* Calendar days */}
				{days.map((day, index) => {
					const isSelected = selectedDate &&
						day.date.toDateString() === selectedDate.toDateString();

					return (
						<motion.div
							key={index}
							whileTap={{ scale: day.isPast ? 1 : 0.95 }}
							className={`
                aspect-square relative p-1 border border-border/20 rounded-md 
                ${day.isCurrentMonth ? 'text-foreground' : 'text-foreground/40'}
                ${day.isPast ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${isSelected ? 'ring-2 ring-accent' : ''}
                ${day.isCurrentMonth && !day.isPast ? getAvailabilityColorClass(day.date) : ''}
              `}
							onClick={() => !day.isPast && handleDateClick(day)}
						>
							<div className="absolute top-1 right-1 text-xs">
								{day.date.getDate()}
							</div>

							{/* Today indicator */}
							{day.isToday && (
								<div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent"></div>
							)}

							{/* Availability indicator */}
							{day.isCurrentMonth && !day.isPast && (
								<div className="absolute bottom-1 left-1 flex space-x-0.5">
									{getAvailabilityStatus(day.date) === 'limited' && (
										<div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
									)}
									{getAvailabilityStatus(day.date) === 'available' && (
										<div className="w-1.5 h-1.5 rounded-full bg-highlight"></div>
									)}
									{getAvailabilityStatus(day.date) === 'booked' && (
										<div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
									)}
								</div>
							)}
						</motion.div>
					);
				})}
			</div>
		</div>
	);
};

export default CalendarView;-e 
### FILE: ./src/components/reservation/seat-selector.tsx

// src/components/reservation/seat-selector.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useReservation } from '@/context/reservation-context';
import { SeatDocument } from '@/types/firebase';
import { Loader2 } from 'lucide-react';

interface SeatSelectorProps {
	onSeatSelect: (seat: SeatDocument) => void;
	date: Date;
}

const SeatSelector: React.FC<SeatSelectorProps> = ({ onSeatSelect, date }) => {
	const { selectedBranch } = useReservation();
	const [seats, setSeats] = useState<SeatDocument[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

	useEffect(() => {
		const fetchSeats = async () => {
			if (!selectedBranch) {
				setError('支店が選択されていません');
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				// Query seats collection for seats with matching branchCode
				const seatsQuery = query(
					collection(db, 'seats'),
					where('branchCode', '==', selectedBranch.branchCode),
					where('status', '==', 'available')
				);

				const seatsSnapshot = await getDocs(seatsQuery);
				const seatsData = seatsSnapshot.docs.map(doc => ({
					...doc.data(),
					seatId: doc.id
				})) as SeatDocument[];

				setSeats(seatsData);
				setError(null);
			} catch (err) {
				console.error('Error fetching seats:', err);
				setError('座席データの取得中にエラーが発生しました');
			} finally {
				setLoading(false);
			}
		};

		fetchSeats();
	}, [selectedBranch]);

	const handleSeatSelect = (seat: SeatDocument) => {
		setSelectedSeatId(seat.seatId);
		onSeatSelect(seat);
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-accent" />
				<span className="ml-2">座席情報を読み込んでいます...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-destructive/10 border border-destructive rounded-md text-destructive">
				<p>{error}</p>
			</div>
		);
	}

	if (seats.length === 0) {
		return (
			<div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
				<p>この支店には利用可能な座席がありません。別の支店を選択してください。</p>
			</div>
		);
	}

	return (
		<div className="mt-4">
			<h3 className="text-lg font-medium mb-4">座席を選択してください</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
				{seats.map((seat) => (
					<button
						key={seat.seatId}
						onClick={() => handleSeatSelect(seat)}
						className={`p-4 border rounded-md transition-colors ${selectedSeatId === seat.seatId
								? 'bg-accent text-white border-accent'
								: 'bg-background hover:bg-accent/10 border-border'
							}`}
					>
						<p className="font-medium">{seat.name}</p>
						<p className="text-sm mt-1 text-foreground/70">
							{seat.seatType} - 席番号: {seat.seatNumber}
						</p>
						<p className="text-sm mt-1 text-foreground/70">
							料金: ¥{seat.ratePerHour}/時間
						</p>
					</button>
				))}
			</div>
		</div>
	);
};

export default SeatSelector;-e 
### FILE: ./src/components/reservation/login-prompt.tsx

// src/components/reservation/login-prompt.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SelectedTimeSlotsItem } from '@/context/reservation-context';

interface LoginPromptProps {
	onClose: () => void;
	reservationDetails: (SelectedTimeSlotsItem & { date: string })[];
}

const LoginPrompt: React.FC<LoginPromptProps> = ({ onClose, reservationDetails }) => {
	const router = useRouter();

	// Handle login button
	const handleLogin = () => {
		// Store reservation details in sessionStorage to retrieve after login
		sessionStorage.setItem('pendingReservation', JSON.stringify(reservationDetails));
		router.push('/login');
	};

	// Handle register button
	const handleRegister = () => {
		// Store reservation details in sessionStorage to retrieve after registration
		sessionStorage.setItem('pendingReservation', JSON.stringify(reservationDetails));
		router.push('/register');
	};

	// Calculate total seats
	const totalSeats = reservationDetails.length;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		>
			<motion.div
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.9, opacity: 0 }}
				className="bg-background border border-border/20 rounded-lg shadow-lg p-6 max-w-md w-full"
			>
				<h2 className="text-xl font-bold text-foreground mb-4">アカウントが必要です</h2>
				<p className="text-foreground/70 mb-6">
					予約を完了するには、ログインまたは新規登録が必要です。
				</p>

				<div className="bg-border/5 p-3 rounded-md mb-6">
					<h3 className="font-medium text-foreground mb-2">選択中の予約内容</h3>
					<p className="text-sm text-foreground/70">
						<span className="font-medium">{totalSeats}席</span>の予約
						<span className="block mt-1">
							{new Date(reservationDetails[0].date).toLocaleDateString('ja-JP', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								weekday: 'long'
							})}
						</span>
					</p>

					{/* 予約情報のサマリー */}
					<div className="mt-2 space-y-1 text-sm">
						{reservationDetails.map((item, index) => (
							<div key={index} className="flex justify-between">
								<span>{item.seatName || `座席 #${index + 1}`}</span>
								<span>{item.startTime} - {item.endTime}</span>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col space-y-3">
					<button
						onClick={handleLogin}
						className="flex items-center justify-center px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
					>
						<Lock className="w-4 h-4 mr-2" />
						ログイン
					</button>
					<button
						onClick={handleRegister}
						className="flex items-center justify-center px-4 py-2 border border-accent text-accent bg-accent/5 rounded-md hover:bg-accent/10 transition-colors"
					>
						<UserPlus className="w-4 h-4 mr-2" />
						新規登録
					</button>
					<button
						onClick={onClose}
						className="px-4 py-2 text-foreground/70 hover:text-foreground hover:bg-border/10 rounded-md transition-colors"
					>
						キャンセル
					</button>
				</div>
			</motion.div>
		</motion.div>
	);
};

export default LoginPrompt;-e 
### FILE: ./src/components/reservation/branch-selector.tsx

// src/components/reservation/branch-selector.tsx

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Phone, Info } from 'lucide-react';
import { useReservation } from '@/context/reservation-context';
import { BranchDocument } from '@/types/firebase';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface BranchSelectorProps {
	onBranchSelect: (branch: BranchDocument) => void;
}

export default function BranchSelector({ onBranchSelect }: BranchSelectorProps) {
	const { branches, fetchBranches, isLoading, error } = useReservation();

	useEffect(() => {
		fetchBranches();
	}, [fetchBranches]);

	if (isLoading) {
		return (
			<div className="w-full flex justify-center items-center py-12">
				<LoadingSpinner size="large" />
				<span className="ml-3 text-foreground/70">支店情報を読み込み中...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full bg-red-500/10 text-red-500 p-4 rounded-lg">
				<p className="font-medium">エラーが発生しました</p>
				<p className="mt-1">{error}</p>
				<button
					onClick={() => fetchBranches()}
					className="mt-3 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
				>
					再試行
				</button>
			</div>
		);
	}

	if (branches.length === 0) {
		return (
			<div className="w-full bg-border/10 p-6 rounded-lg text-center">
				<p className="text-foreground/70">支店情報が見つかりませんでした</p>
			</div>
		);
	}

	// 日本の曜日
	const getDayOfWeek = (day: string) => {
		const daysMap: Record<string, string> = {
			'sunday': '日曜日',
			'monday': '月曜日',
			'tuesday': '火曜日',
			'wednesday': '水曜日',
			'thursday': '木曜日',
			'friday': '金曜日',
			'saturday': '土曜日'
		};
		return daysMap[day] || day;
	};

	return (
		<div className="w-full space-y-6">
			<div className="text-center max-w-3xl mx-auto mb-8">
				<p className="text-foreground/70">
					ご利用になる支店を選択してください。各支店ごとに設備や座席数が異なります。
				</p>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
				{branches.map((branch) => (
					<motion.div
						key={branch.branchId}
						className="bg-border/5 border border-border/20 rounded-xl overflow-hidden shadow-soft hover:shadow-lg transition-all cursor-pointer"
						whileHover={{ y: -5 }}
						onClick={() => onBranchSelect(branch)}
					>
						<div className="h-48 w-full relative bg-gradient-to-br from-accent/20 to-highlight/20">
							{branch.layoutImagePath ? (
								<img
									src={branch.layoutImagePath}
									alt={`${branch.branchName}のレイアウト`}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="h-full w-full flex items-center justify-center">
									<div className="text-4xl font-bold text-accent/40">{branch.branchCode}</div>
								</div>
							)}
						</div>
						<div className="p-4">
							<h3 className="text-xl font-bold mb-2 flex items-center">
								<span className="bg-accent/10 text-accent px-2 py-0.5 rounded mr-2">{branch.branchName}</span>
							</h3>

							<div className="space-y-2 mb-4">
								<div className="flex items-start">
									<MapPin className="w-4 h-4 text-accent mr-2 mt-1 flex-shrink-0" />
									<span className="text-sm text-foreground/70">{branch.address}</span>
								</div>

								<div className="flex items-start">
									<Clock className="w-4 h-4 text-accent mr-2 mt-1 flex-shrink-0" />
									<div className="text-sm text-foreground/70">
										<span>
											{branch.businessHours.open === '24:00' && branch.businessHours.close === '24:00'
												? '24時間営業'
												: `${branch.businessHours.open} - ${branch.businessHours.close}`}
										</span>
									</div>
								</div>

								<div className="flex items-start">
									<Users className="w-4 h-4 text-accent mr-2 mt-1 flex-shrink-0" />
									<span className="text-sm text-foreground/70">{branch.totalSeats}席</span>
								</div>

								{branch.phoneNumber && (
									<div className="flex items-start">
										<Phone className="w-4 h-4 text-accent mr-2 mt-1 flex-shrink-0" />
										<span className="text-sm text-foreground/70">{branch.phoneNumber}</span>
									</div>
								)}
							</div>

							{branch.amenities && branch.amenities.length > 0 && (
								<div className="mt-3">
									<div className="flex items-center mb-1">
										<Info className="w-4 h-4 text-accent mr-1" />
										<span className="text-xs text-foreground/70 font-medium">設備</span>
									</div>
									<div className="flex flex-wrap gap-1">
										{branch.amenities.map((amenity, index) => (
											<span
												key={index}
												className="bg-border/10 text-foreground/70 text-xs px-2 py-0.5 rounded"
											>
												{amenity}
											</span>
										))}
									</div>
								</div>
							)}

							<button
								onClick={(e) => {
									e.stopPropagation();
									onBranchSelect(branch);
								}}
								className="w-full mt-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
							>
								この支店を選択
							</button>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
}-e 
### FILE: ./src/components/reservation/time-grid.tsx

// src/components/reservation/time-grid.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReservation } from '@/context/reservation-context';
import { ArrowRight, Calendar, Clock, AlertCircle, Users, Plus, Minus, Check, X } from 'lucide-react';
import { SelectedTimeSlotsItem } from '@/context/reservation-context';

interface TimeGridProps {
	date: Date;
	onTimeSelect: (selectedTimeSlots: SelectedTimeSlotsItem[]) => void;
}

interface TimeSlot {
	time: string;
	formattedTime: string;
}

interface RangeSelection {
	rangeStart: string | null;
	rangeEnd: string | null;
}

const TimeGrid: React.FC<TimeGridProps> = ({ date, onTimeSelect }) => {
	const {
		seats,
		reservations,
		selectedTimeSlots,
		setSelectedTimeSlots,
		addSelectedTimeSlot,
		removeSelectedTimeSlot,
		clearSelectedTimeSlots,
		selectedBranch
	} = useReservation();
	const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
	const [seatRanges, setSeatRanges] = useState<Record<string, RangeSelection>>({});

	// Filter seats by the selected branch
	const filteredSeats = seats.filter(seat =>
		selectedBranch && seat.branchCode === selectedBranch.branchCode
	);

	const generateTimeSlots = (): TimeSlot[] => {
		const slots: TimeSlot[] = [];

		// Use branch business hours if available, otherwise default hours
		const startHour = selectedBranch?.businessHours?.open
			? parseInt(selectedBranch.businessHours.open.split(':')[0])
			: 10;
		const endHour = selectedBranch?.businessHours?.close
			? parseInt(selectedBranch.businessHours.close.split(':')[0])
			: 22;

		for (let hour = startHour; hour <= endHour; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				if (hour === endHour && minute > 0) continue;

				const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
				const formattedTime = `${hour}:${minute === 0 ? '00' : minute}`;

				slots.push({ time, formattedTime });
			}
		}

		return slots;
	};

	const timeSlots = generateTimeSlots();

	// Check if a time slot is already reserved
	const isReserved = (seatId: string, timeSlot: string): boolean => {
		if (!date) return false;

		const dateStr = date.toISOString().split('T')[0];

		return reservations.some(reservation =>
			reservation.seatId === seatId &&
			reservation.date === dateStr &&
			reservation.startTime <= timeSlot &&
			reservation.endTime > timeSlot
		);
	};

	// Handle slot click for range selection
	const handleSlotClick = (seatId: string, time: string) => {
		if (isReserved(seatId, time)) return;

		// Get current range for this seat
		const currentRange = seatRanges[seatId] || { rangeStart: null, rangeEnd: null };

		// Check if seat is already selected
		const isSeatSelected = selectedSeatIds.includes(seatId);

		if (!isSeatSelected) {
			// Add new seat to selection
			setSelectedSeatIds(prev => [...prev, seatId]);
			setSeatRanges(prev => ({
				...prev,
				[seatId]: { rangeStart: time, rangeEnd: null }
			}));
			return;
		}

		// First click sets start time
		if (currentRange.rangeStart === null) {
			setSeatRanges(prev => ({
				...prev,
				[seatId]: { rangeStart: time, rangeEnd: null }
			}));
			return;
		}

		// If clicking on the same slot, deselect it
		if (currentRange.rangeStart === time && currentRange.rangeEnd === null) {
			// If this was the only selected time slot for this seat, remove the seat from selection
			setSeatRanges(prev => {
				const newRanges = { ...prev };
				delete newRanges[seatId];
				return newRanges;
			});
			setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
			return;
		}

		// Second click sets end time
		if (currentRange.rangeEnd === null) {
			// Ensure start is before end
			if (time < currentRange.rangeStart) {
				setSeatRanges(prev => ({
					...prev,
					[seatId]: { rangeStart: time, rangeEnd: currentRange.rangeStart }
				}));
			} else {
				setSeatRanges(prev => ({
					...prev,
					[seatId]: { ...prev[seatId], rangeEnd: time }
				}));
			}
			return;
		}

		// If range is already set, start a new selection
		setSeatRanges(prev => ({
			...prev,
			[seatId]: { rangeStart: time, rangeEnd: null }
		}));
	};

	// Check if a slot is within the selected range
	const isInSelectedRange = (seatId: string, time: string): boolean => {
		if (!selectedSeatIds.includes(seatId)) return false;

		const range = seatRanges[seatId];
		if (!range || !range.rangeStart) return false;

		// If only start is selected, highlight just that slot
		if (!range.rangeEnd) return time === range.rangeStart;

		// Check if time is within range
		return time >= range.rangeStart && time <= range.rangeEnd;
	};

	// Calculate end time (30 minutes after the last slot)
	const calculateEndTime = (time: string): string => {
		if (!time) return '';

		const timeDate = new Date(`${date.toISOString().split('T')[0]}T${time}`);
		timeDate.setMinutes(timeDate.getMinutes() + 30);
		return `${timeDate.getHours().toString().padStart(2, '0')}:${timeDate.getMinutes().toString().padStart(2, '0')}`;
	};

	// Reset selection when date changes
	useEffect(() => {
		setSelectedSeatIds([]);
		setSeatRanges({});
		clearSelectedTimeSlots();
	}, [date, clearSelectedTimeSlots]);

	// Update selected time slots when selections change
	useEffect(() => {
		// 各座席の選択情報をまとめる
		const newSelectedTimeSlots: SelectedTimeSlotsItem[] = [];

		selectedSeatIds.forEach(seatId => {
			const range = seatRanges[seatId];
			const seat = filteredSeats.find(s => s.seatId === seatId);

			if (range && range.rangeStart && seat) {
				newSelectedTimeSlots.push({
					seatId,
					seatName: seat.name,
					startTime: range.rangeStart,
					endTime: range.rangeEnd
						? calculateEndTime(range.rangeEnd)
						: calculateEndTime(range.rangeStart)
				});
			}
		});

		// コンテキストを更新
		setSelectedTimeSlots(newSelectedTimeSlots);
	}, [seatRanges, selectedSeatIds, setSelectedTimeSlots, filteredSeats]);

	// Handle continue to confirmation
	const handleContinue = () => {
		// 全ての選択済み座席情報を渡す
		onTimeSelect(selectedTimeSlots);
	};

	// Format date for display
	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

		return `${year}年${month}月${day}日(${dayOfWeek})`;
	};

	// Calculate total duration in minutes for a seat
	const calculateDuration = (startTime: string, endTime: string): number => {
		const startParts = startTime.split(':').map(Number);
		const endParts = endTime.split(':').map(Number);

		let startMinutes = startParts[0] * 60 + startParts[1];
		let endMinutes = endParts[0] * 60 + endParts[1];

		return endMinutes - startMinutes;
	};

	// Get selected seats
	const selectedSeatsInfo = selectedSeatIds
		.filter(id => seatRanges[id] && seatRanges[id].rangeStart)
		.map(id => {
			const seat = filteredSeats.find(s => s.seatId === id);
			const range = seatRanges[id];

			if (!seat || !range || !range.rangeStart) return null;

			const endTime = range.rangeEnd
				? calculateEndTime(range.rangeEnd)
				: calculateEndTime(range.rangeStart);

			const duration = calculateDuration(range.rangeStart, endTime);

			// Calculate rate per minute from ratePerHour
			const ratePerMinute = seat.ratePerHour ? seat.ratePerHour / 60 : 0;

			return {
				seat,
				startTime: range.rangeStart,
				endTime,
				duration,
				ratePerMinute,
				cost: Math.round(ratePerMinute * duration)
			};
		})
		.filter(Boolean);

	// Check if we have any selection
	const hasSelection = selectedSeatIds.length > 0 && selectedSeatIds.some(id =>
		seatRanges[id] && seatRanges[id].rangeStart
	);

	// Calculate total cost across all seat selections
	const calculateTotalCost = (): number => {
		return selectedSeatsInfo.reduce((total, info) => {
			if (!info) return total;
			return total + info.cost;
		}, 0);
	};

	// Remove seat from selection
	const handleRemoveSeat = (seatId: string) => {
		setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
		setSeatRanges(prev => {
			const newRanges = { ...prev };
			delete newRanges[seatId];
			return newRanges;
		});
		removeSelectedTimeSlot(seatId);
	};

	// Check if branch is selected and there are no available seats
	if (!selectedBranch) {
		return (
			<div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
				<p>支店が選択されていません。戻って支店を選択してください。</p>
			</div>
		);
	}

	if (filteredSeats.length === 0) {
		return (
			<div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
				<p>この支店には利用可能な座席がありません。別の支店を選択してください。</p>
			</div>
		);
	}

	// Check if the branch is closed on the selected date
	if (selectedBranch?.businessHours?.dayOff) {
		const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
		const isDayOff = selectedBranch.businessHours.dayOff.includes(dayOfWeek);

		if (isDayOff) {
			return (
				<div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
					<p>選択された日付は定休日です。別の日を選んでください。</p>
				</div>
			);
		}
	}

	return (
		<div className="space-y-6">
			<div
				className="w-full overflow-x-auto border border-border/20 rounded-lg bg-background/30"
			>
				<div className="min-w-max">
					{/* Time slots header */}
					<div className="flex border-b border-border/30 bg-border/5">
						<div className="w-32 flex-shrink-0 p-2 font-medium text-foreground sticky left-0 bg-border/5">座席</div>
						{timeSlots.map((slot) => (
							<div
								key={slot.time}
								className="w-16 flex-shrink-0 p-2 text-center text-sm border-l border-border/30 text-foreground/70"
							>
								{slot.formattedTime}
							</div>
						))}
					</div>

					{/* Seats and time slots grid */}
					{filteredSeats.map((seat) => (
						<div
							key={seat.seatId}
							className="flex border-b border-border/20 hover:bg-background/5"
						>
							{/* Seat name */}
							<div className="w-32 flex-shrink-0 p-2 border-r border-border/20 flex flex-col sticky left-0 bg-background">
								<div className="flex items-center justify-between">
									<span className="font-medium text-foreground">{seat.name}</span>
									{selectedSeatIds.includes(seat.seatId) && (
										<Check className="h-4 w-4 text-accent" />
									)}
								</div>
								<span className="text-xs text-foreground/60">¥{seat.ratePerHour}/時間</span>
							</div>

							{/* Time slots */}
							{timeSlots.map((slot) => {
								const isSlotReserved = isReserved(seat.seatId, slot.time);
								const isSelected = isInSelectedRange(seat.seatId, slot.time);

								const range = seatRanges[seat.seatId] || { rangeStart: null, rangeEnd: null };
								const isRangeStart = range.rangeStart === slot.time;
								const isRangeEnd = range.rangeEnd === slot.time;

								return (
									<motion.div
										key={`${seat.seatId}-${slot.time}`}
										className={`
                      w-16 h-16 flex-shrink-0 border-l border-border/20
                      ${isSlotReserved ? 'bg-border/50 cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected ? 'bg-accent/40' : ''}
                      ${isRangeStart ? 'bg-accent/70' : ''}
                      ${isRangeEnd ? 'bg-accent/70' : ''}
                      ${!isSlotReserved && !isSelected ? 'hover:bg-background/10' : ''}
                      flex items-center justify-center
                    `}
										whileHover={!isSlotReserved ? { scale: 1.05 } : {}}
										whileTap={!isSlotReserved ? { scale: 0.95 } : {}}
										onClick={() => !isSlotReserved && handleSlotClick(seat.seatId, slot.time)}
									>
										{(isRangeStart || isRangeEnd) && (
											<div className="w-2 h-2 bg-white rounded-full"></div>
										)}
									</motion.div>
								);
							})}
						</div>
					))}
				</div>
			</div>
			{hasSelection ? (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="mt-6 p-4 border border-accent/20 rounded-lg bg-accent/5 space-y-4"
				>
					<h3 className="font-medium text-foreground text-lg">選択中の予約枠</h3>

					<div className="flex flex-col gap-5">
						<div className="space-y-4">
							<div className="space-y-2">
								<div className="flex items-center">
									<Calendar className="w-4 h-4 text-accent mr-2" />
									<span className="text-foreground/80">{formatDate(date)}</span>
								</div>

								{/* Selected seats information */}
								<div className="space-y-3 mt-3">
									{selectedSeatsInfo.map((info, index) => {
										if (!info) return null;
										return (
											<div key={info.seat.seatId} className="p-3 bg-border/10 rounded-md relative">
												<button
													onClick={() => handleRemoveSeat(info.seat.seatId)}
													className="absolute top-2 right-2 text-foreground/50 hover:text-foreground"
													aria-label="選択を削除"
												>
													<X size={16} />
												</button>
												<div className="font-medium text-foreground/80">
													{info.seat.name}
												</div>
												<div className="flex items-center mt-1">
													<Clock className="w-4 h-4 text-accent mr-2" />
													<span className="text-foreground/80">
														{info.startTime} から {info.endTime} まで
														<span className="ml-1 text-sm">({info.duration}分)</span>
													</span>
												</div>
												<div className="text-sm text-foreground/70 mt-1">
													予想料金: ¥{info.cost.toLocaleString()}
												</div>
											</div>
										);
									})}
								</div>

								<div className="pt-3 mt-2 border-t border-border/20">
									<div className="flex justify-between items-center">
										<span className="font-medium text-foreground/80">合計予想料金:</span>
										<span className="font-bold text-lg text-foreground">¥{calculateTotalCost().toLocaleString()}</span>
									</div>
									<div className="text-xs text-foreground/50 mt-1">
										選択中の座席数: {selectedSeatsInfo.length}席
									</div>
								</div>
							</div>
						</div>

						<motion.button
							whileHover={{ scale: 1.03 }}
							whileTap={{ scale: 0.97 }}
							onClick={handleContinue}
							className="px-6 py-3 bg-accent text-white rounded-lg flex items-center justify-center shadow-sm hover:bg-accent/90 transition-colors whitespace-nowrap"
						>
							<span>予約内容を確認</span>
							<ArrowRight className="ml-2" size={18} />
						</motion.button>
					</div>
				</motion.div>
			) : (
				<div className="bg-border/5 p-3 rounded-lg flex items-start">
					<AlertCircle className="text-accent mr-2 mt-0.5 flex-shrink-0" size={18} />
					<p className="text-sm text-foreground/80">
						希望する座席と開始時間をクリックしてください。次に終了時間までクリックすると範囲が指定できます。複数の座席を選択することもできます。
					</p>
				</div>
			)}
		</div>
	);
};

export default TimeGrid;-e 
### FILE: ./src/components/lp/availability-section.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Users, Clock } from 'lucide-react';
import AvailabilityCalendar from './availability-calendar';

const AvailabilitySection: React.FC = () => {
	return (
		<section className="py-20 bg-background/50">
			<div className="container mx-auto px-4">
				{/* Section header */}
				<div className="text-center mb-12">
					<motion.h2
						className="text-3xl md:text-4xl font-bold mb-4 text-foreground"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						空き状況をチェック
					</motion.h2>
					<motion.p
						className="text-foreground/70 max-w-2xl mx-auto"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6, delay: 0.1 }}
					>
						リアルタイムで座席の空き状況を確認できます。
						お好きな日時を選んで、快適なゲーム環境を予約しましょう。
					</motion.p>
				</div>

				<div className="flex flex-col lg:flex-row gap-10 items-center">
					{/* Calendar column */}
					<motion.div
						className="w-full lg:w-2/3 bg-background rounded-2xl shadow-soft p-6 border border-border/20"
						initial={{ opacity: 0, x: -20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						<AvailabilityCalendar />
					</motion.div>

					{/* Info column */}
					<motion.div
						className="w-full lg:w-1/3 space-y-8"
						initial={{ opacity: 0, x: 20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
					>
						{/* Feature 1 */}
						<div className="flex items-start">
							<div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mr-4">
								<CalendarCheck className="w-6 h-6 text-accent" />
							</div>
							<div>
								<h3 className="text-xl font-medium mb-2 text-foreground">事前予約</h3>
								<p className="text-foreground/70">
									最大14日先まで予約可能。お気に入りの座席を確保して、安心してご利用いただけます。
								</p>
							</div>
						</div>

						{/* Feature 2 */}
						<div className="flex items-start">
							<div className="w-12 h-12 rounded-xl bg-highlight/10 flex items-center justify-center flex-shrink-0 mr-4">
								<Clock className="w-6 h-6 text-highlight" />
							</div>
							<div>
								<h3 className="text-xl font-medium mb-2 text-foreground">柔軟な利用時間</h3>
								<p className="text-foreground/70">
									30分単位で予約可能。急な予定変更にも対応できます。キャンセルは予約時間の2時間前まで無料です。
								</p>
							</div>
						</div>

						{/* Feature 3 */}
						<div className="flex items-start">
							<div className="w-12 h-12 rounded-xl bg-border/20 flex items-center justify-center flex-shrink-0 mr-4">
								<Users className="w-6 h-6 text-foreground" />
							</div>
							<div>
								<h3 className="text-xl font-medium mb-2 text-foreground">グループ予約</h3>
								<p className="text-foreground/70">
									友達と一緒に遊びたい場合は、複数席の同時予約も可能。チーム対戦やパーティープレイを楽しめます。
								</p>
							</div>
						</div>

						{/* CTA button */}
						<div className="pt-4">
							<motion.button
								className="w-full py-3 px-6 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => window.location.href = '/reservation'}
							>
								予約画面を開く
							</motion.button>
							<p className="text-xs text-center mt-2 text-foreground/60">
								※予約には会員登録(無料)が必要です
							</p>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
};

export default AvailabilitySection;-e 
### FILE: ./src/components/lp/cta-section.tsx

'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

export default function CtaSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.3 });

	return (
		<section
			id="cta"
			className="py-24 relative"
			ref={ref}
		>
			{/* 背景画像 */}
			<div className="absolute inset-0 z-0">
				<Image
					src="/images/lp/cta-bg.jpg"
					alt="ゲーミングスペースの夜景"
					fill
					style={{ objectFit: 'cover' }}
					className="brightness-25"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
			</div>

			<div className="container mx-auto px-4 relative z-10 text-center">
				<motion.div
					className="max-w-2xl mx-auto"
					initial={{ opacity: 0, y: 30 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
					transition={{ duration: 0.6 }}
				>
					<h2 className="text-4xl md:text-5xl font-bold mb-6">
						今夜、ふらっと立ち寄って<span className="text-accent">みない？</span>
					</h2>

					<p className="text-xl text-foreground/80 mb-10">
						暇な夜も、帰りたくない夜も、終電を逃した夜も。<br />
						あなただけの秘密基地で、特別な時間を過ごしませんか？
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							href="/register"
							className="
                bg-accent hover:bg-accent/90 
                text-white font-semibold py-4 px-8 
                rounded-2xl shadow-lg 
                transition-all duration-300 hover:translate-y-[-2px]
                text-lg
              "
						>
							今すぐ会員登録
						</Link>

						<Link
							href="https://line.me/R/ti/p/@example"
							target="_blank"
							rel="noopener noreferrer"
							className="
                bg-[#06C755] hover:bg-[#06C755]/90
                text-white font-semibold py-4 px-8 
                rounded-2xl shadow-lg 
                transition-all duration-300 hover:translate-y-[-2px]
                flex items-center justify-center gap-2
                text-lg
              "
						>
							<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
								<path d="M12 2C6.4772 2 2 5.6519 2 10.1C2 13.4682 4.2066 16.3507 7.4999 17.5835C7.6518 17.6368 7.8483 17.7352 7.899 17.8889C7.9497 18.0419 7.9168 18.2756 7.8871 18.4238C7.8176 18.7601 7.6465 19.4743 7.6465 19.4743C7.6073 19.6469 7.5157 20.1332 8.0001 20.3904C8.4846 20.6475 8.9199 20.2317 9.2769 19.909C9.6347 19.586 10.3685 18.958 10.8319 18.5752C13.2514 19.4452 16.0002 18.8669 18.2245 17.4077C20.9407 15.6807 22.0001 12.9711 22.0001 10.0999C22.0001 5.6519 17.5229 2 12 2ZM6.8904 12.8297C6.8904 12.9042 6.8022 12.9937 6.6925 12.9937L6.6924 12.9937L5.0523 12.9929C4.9426 12.9929 4.8532 12.9042 4.8532 12.8297L4.8532 12.8296L4.8533 9.55301C4.8533 9.47849 4.9428 9.38899 5.0525 9.38899L5.0526 9.38899L6.6927 9.38969C6.8024 9.38969 6.8906 9.47921 6.8906 9.55373V9.55375L6.8904 12.8297ZM11.2289 12.8297C11.2289 12.9042 11.1407 12.9937 11.0311 12.9937L11.031 12.9937L9.39087 12.9929C9.28121 12.9929 9.19183 12.9042 9.19183 12.8297L9.19182 12.8296L9.19194 9.55302C9.19194 9.4785 9.2814 9.389 9.39107 9.389L9.39109 9.389L11.0312 9.3897C11.1409 9.3897 11.2291 9.47922 11.2291 9.55374V9.55375L11.2289 12.8297ZM17.4679 12.8293C17.4679 12.9039 17.3784 12.9933 17.2688 12.9933L17.2687 12.9933L15.6288 12.9926C15.522 12.9926 15.4357 12.9081 15.4315 12.8356L15.4315 12.8347L15.4306 10.8297L13.6558 13.2862C13.6153 13.3389 13.5628 13.3602 13.5097 13.3602C13.4561 13.3602 13.4035 13.3388 13.3623 13.2861L11.5965 10.8476V12.8347C11.5965 12.9092 11.507 12.9987 11.3973 12.9987L11.3973 12.9987L9.75707 12.9979C9.6474 12.9979 9.55802 12.9092 9.55802 12.8347L9.55802 12.8347L9.55814 9.5581C9.55814 9.50101 9.59586 9.448 9.65622 9.42173C9.71658 9.39523 9.78981 9.39898 9.84669 9.43097L9.8467 9.43098L13.5093 11.7657L17.1765 9.43064C17.2334 9.39866 17.3066 9.39491 17.367 9.4214C17.4274 9.44766 17.4651 9.5007 17.4651 9.55779V9.55781L17.4679 12.8293ZM19.1441 12.8297C19.1441 12.9042 19.0547 12.9937 18.945 12.9937L18.945 12.9937L17.305 12.9929C17.1953 12.9929 17.1059 12.9042 17.1059 12.8297L17.1059 12.8296L17.106 9.55301C17.106 9.47849 17.1955 9.38899 17.3052 9.38899L17.3052 9.38899L18.9453 9.38969C19.055 9.38969 19.1432 9.47921 19.1432 9.55373V9.55375L19.1441 12.8297Z" />
							</svg>
							LINEで登録
						</Link>
					</div>

					<p className="mt-6 text-foreground/60">
						※LINE連携で会員登録すると、<span className="text-highlight">初回1時間無料</span>クーポンをプレゼント
					</p>
				</motion.div>
			</div>
		</section>
	);
}-e 
### FILE: ./src/components/lp/access-section.tsx

'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function AccessSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.1 });

	return (
		<section
			id="access"
			className="py-20 bg-gradient-to-b from-background/90 to-background"
			ref={ref}
		>
			<div className="container mx-auto px-4">
				{/* セクションタイトル */}
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						アクセス<span className="text-accent">・料金</span>
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						便利な立地と分かりやすい料金体系。
						いつでも気軽に立ち寄れます。
					</p>
				</motion.div>

				{/* 料金・アクセス情報 */}
				<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
					{/* 料金カード */}
					<motion.div
						className="bg-border/5 rounded-2xl p-8 shadow-soft"
						initial={{ opacity: 0, x: -30 }}
						animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
						transition={{ duration: 0.5 }}
					>
						<div className="text-accent mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<rect x="2" y="4" width="20" height="16" rx="2"></rect>
								<path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
								<path d="M17.5 14.5c-1.5 1.26-3.6 2-5.5 2-1.9 0-4-.74-5.5-2"></path>
							</svg>
						</div>

						<h3 className="text-2xl font-bold mb-6">料金プラン</h3>

						<div className="space-y-4">
							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">基本料金</span>
								<span className="text-2xl font-bold text-accent">¥700<span className="text-sm font-normal">/時間</span></span>
							</div>

							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">延長料金</span>
								<span>10分ごと ¥120</span>
							</div>

							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">パック料金</span>
								<span>3時間 ¥1,800</span>
							</div>

							<div className="flex justify-between items-center pb-3">
								<span className="text-foreground/70">ドリンク・お菓子</span>
								<span className="text-highlight">無料</span>
							</div>

							<p className="text-sm text-foreground/60 mt-4">
								※料金は自動計算され、登録カードから引き落とされます。<br />
								※深夜帯（22時〜翌8時）は10%割増となります。
							</p>
						</div>
					</motion.div>

					{/* アクセスカード */}
					<motion.div
						className="bg-border/5 rounded-2xl p-8 shadow-soft"
						initial={{ opacity: 0, x: 30 }}
						animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<div className="text-accent mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
								<circle cx="12" cy="10" r="3"></circle>
							</svg>
						</div>

						<h3 className="text-2xl font-bold mb-6">アクセス</h3>

						<div className="space-y-4">
							<div className="flex justify-between items-start border-b border-border pb-3">
								<span className="text-foreground/70">住所</span>
								<span className="text-right">東京都立川市錦町2-1-2<br />第2ビル 2F</span>
							</div>

							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">最寄り駅</span>
								<span className="text-right">JR立川駅 北口から<br />徒歩4分</span>
							</div>

							<div className="flex justify-between items-center border-b border-border pb-3">
								<span className="text-foreground/70">営業時間</span>
								<span className="text-highlight">24時間・年中無休</span>
							</div>

							<div className="flex justify-between items-center pb-3">
								<span className="text-foreground/70">電話</span>
								<span>042-XXX-XXXX</span>
							</div>

							<div className="mt-4 bg-border/10 rounded-xl p-4 text-center">
								<p className="text-foreground/70 mb-2">Google マップで見る</p>
								<a
									href="https://goo.gl/maps/example"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-block bg-accent/90 hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors duration-300"
								>
									地図を開く
								</a>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}-e 
### FILE: ./src/components/lp/faq-section.tsx

'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

// FAQ項目
const faqItems = [
	{
		question: "女性一人でも安心して使える？",
		answer: "はい、安心してご利用いただけます。シェアスペース設計で常に誰かの目があり、また24時間の監視カメラシステムを備えています。店内は明るく開放的な設計で、スタッフも遠隔サポートで対応可能です。"
	},
	{
		question: "予約は必要？",
		answer: "予約は不要です。会員登録（LINE連携）さえ完了していれば、いつでもドアのQRコードリーダーにかざすだけで入店できます。混雑状況はアプリで確認できるので、事前にチェックすることも可能です。"
	},
	{
		question: "夜中でも安全？",
		answer: "24時間体制のセキュリティシステムを導入しており、出入り管理も厳重に行っています。また、緊急時にはヘルプボタンでスタッフとすぐに連絡が取れる体制を整えています。セキュリティ会社とも提携しているため、安心してご利用いただけます。"
	},
	{
		question: "持ち込みは可能？",
		answer: "飲食物の持ち込みは可能です。また、ヘッドセットなど個人の周辺機器の持ち込みも歓迎しています。ただし、大型機材や他のお客様のご迷惑になるものはご遠慮ください。"
	},
	{
		question: "支払い方法は？",
		answer: "会員登録時にクレジットカードを登録いただくと、利用後に自動的に料金が引き落とされます。従量課金制で、1時間700円（税込）からのご利用が可能です。追加料金や隠れた費用はありません。"
	},
	{
		question: "インストールできるゲームは？",
		answer: "基本的な人気ゲームは既にインストール済みです。それ以外にも、お客様自身でSteamやEpic Gamesなどからゲームをインストールすることも可能です。ただし、退出時にはアカウント情報などは消去されますのでご注意ください。"
	}
];

export default function FaqSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.1 });
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	const toggleAccordion = (index: number) => {
		setOpenIndex(openIndex === index ? null : index);
	};

	return (
		<section
			id="faq"
			className="py-20 bg-gradient-to-b from-background to-background/90"
			ref={ref}
		>
			<div className="container mx-auto px-4">
				{/* セクションタイトル */}
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						よくある<span className="text-accent">質問</span>
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						ご不明点があれば、お気軽にお問い合わせください。
						LINEでも直接ご質問いただけます。
					</p>
				</motion.div>

				{/* FAQ アコーディオン */}
				<div className="max-w-3xl mx-auto space-y-4">
					{faqItems.map((item, index) => (
						<motion.div
							key={index}
							className="bg-border/5 rounded-xl overflow-hidden shadow-soft"
							initial={{ opacity: 0, y: 20 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
							transition={{ duration: 0.4, delay: index * 0.1 }}
						>
							{/* 質問部分（クリックで開閉） */}
							<button
								className="w-full px-6 py-4 text-left flex justify-between items-center"
								onClick={() => toggleAccordion(index)}
							>
								<span className="font-medium text-lg">{item.question}</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className={`h-5 w-5 text-accent transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
										clipRule="evenodd"
									/>
								</svg>
							</button>

							{/* 回答部分（アニメーション付き） */}
							<AnimatePresence>
								{openIndex === index && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.3 }}
										className="overflow-hidden"
									>
										<div className="px-6 pb-4 text-foreground/70 border-t border-border/20 pt-3">
											{item.answer}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}-e 
### FILE: ./src/components/lp/lp-footer.tsx

import Link from 'next/link';

export default function LpFooter() {
	return (
		<footer className="bg-background border-t border-border py-8">
			<div className="container mx-auto px-4 text-center">
				<p className="text-foreground/70">
					&copy; {new Date().getFullYear()} E-Sports Sakura. All rights reserved.
				</p>
				<div className="mt-4 flex flex-wrap justify-center gap-6">
					<Link href="/terms" className="text-foreground/50 hover:text-accent">
						利用規約
					</Link>
					<Link href="/privacy" className="text-foreground/50 hover:text-accent">
						プライバシーポリシー
					</Link>
					<Link href="/company" className="text-foreground/50 hover:text-accent">
						運営会社
					</Link>
					<Link href="/contact" className="text-foreground/50 hover:text-accent">
						お問い合わせ
					</Link>
				</div>
			</div>
		</footer>
	);
}-e 
### FILE: ./src/components/lp/features-section.tsx

'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

// 利用シーンのデータ
const usageScenes = [
	{
		id: 'scene-1',
		title: '夕飯・サシ飯があっさり終了',
		description: '夜街でもうちょっと時間つぶしたい！ノンアルコールで時間を潰せる場所です。ふかふかの椅子でマイホームな時間を。',
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/scene-pair.webp`,
		alt: 'サシ飲み後のペア'
	},
	{
		id: 'scene-2',
		title: '集まったけど、、ゲームだったら楽しめる？',
		description:'共通項がなくてもマルチプレイで盛り上がるタイトルをご用意してます。監事さん思いの場所です。',
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/scene-group.webp`,
		alt: '飲み会帰りのグループ'
	},
	{
		id: 'scene-3',
		title:'久々の自由時間',
		description:'ゲームは好きだけどたまにしかやる時間が取れない！厳選された数多くのタイトルをご用意してます。',
		image: `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/scene-solo.webp`,
		alt: 'ソロゲーマー'
	}
];

export default function FeaturesSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	// アニメーション設定
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.3
			}
		}
	};

	const cardVariants = {
		hidden: { opacity: 0, y: 50 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.6,
				ease: "easeOut"
			}
		}
	};

	return (
		<section
			id="features"
			className="py-20 bg-gradient-to-b from-background to-background/90"
			ref={ref}
		>
			<div className="container mx-auto px-4">
				{/* セクションタイトル */}
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						<span className="text-accent">こんな時に</span>、利用されています
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						予約不要、一人でも、友達とでも、思い立った時にすぐ利用できます。
					</p>
				</motion.div>

				{/* 利用シーンカード */}
				<motion.div
					className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
					variants={containerVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
				>
					{usageScenes.map((scene, index) => (
						<motion.div
							key={scene.id}
							className="
                bg-border/10 rounded-2xl overflow-hidden 
                shadow-soft hover:shadow-lg transition-all 
                duration-300 hover:translate-y-[-5px]
              "
							variants={cardVariants}
							custom={index}
						>
							<div className="h-56 relative overflow-hidden">
								<Image
									src={scene.image}
									alt={scene.alt}
									fill
									style={{ objectFit: 'cover' }}
									className="transition-transform duration-500 hover:scale-105"
								/>
							</div>
							<div className="p-6">
								<h3 className="text-xl font-semibold mb-3">{scene.title}</h3>
								<p className="text-foreground/70">{scene.description}</p>
							</div>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
}-e 
### FILE: ./src/components/lp/specs-section.tsx

'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

// スペック情報
const specs = [
	{
		category: "PC",
		items: [
			{ label: "グラフィックス", value: "NVIDIA RTX 4070" },
			{ label: "CPU", value: "AMD Ryzen 7 7800X3D" },
			{ label: "メモリ", value: "32GB DDR5" },
			{ label: "ストレージ", value: "1TB NVMe SSD" },
			{ label: "モニター", value: "34インチ ウルトラワイド 165Hz" }
		],
		image: "/images/lp/specs/pc.jpg"
	},
	{
		category: "周辺機器",
		items: [
			{ label: "ゲーミングチェア", value: "COUGAR Ranger Pro" },
			{ label: "キーボード", value: "Razer BlackWidow V3" },
			{ label: "マウス", value: "Logicool G Pro X Superlight" },
			{ label: "ヘッドセット", value: "HyperX Cloud III" },
			{ label: "コントローラー", value: "Xbox / Switch Proコン対応" }
		],
		image: "/images/lp/specs/peripherals.jpg"
	},
	{
		category: "設備・サービス",
		items: [
			{ label: "ネット回線", value: "有線LAN 1Gbps (Ping 6ms以下)" },
			{ label: "ドリンク", value: "フリードリンク (コーヒー、お茶など)" },
			{ label: "スナック", value: "お菓子付き (補充は定期的)" },
			{ label: "冷蔵庫", value: "フリースペース利用可能" },
			{ label: "空調", value: "個別調整可能" }
		],
		image: "/images/lp/specs/amenities.jpg"
	}
];

export default function SpecsSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.1 });

	return (
		<section
			id="specs"
			className="py-20 bg-gradient-to-b from-background/90 to-background"
			ref={ref}
		>
			<div className="container mx-auto px-4">
				{/* セクションタイトル */}
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						<span className="text-accent">本格</span>スペック＆設備
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						ただのネットカフェじゃない。ゲームを本気で楽しむための
						ハイスペックPCと快適な環境をご用意しています。
					</p>
				</motion.div>

				{/* スペック情報 */}
				<div className="space-y-20">
					{specs.map((specGroup, groupIndex) => (
						<motion.div
							key={specGroup.category}
							initial={{ opacity: 0, y: 40 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
							transition={{ duration: 0.6, delay: groupIndex * 0.2 }}
							className="bg-border/5 rounded-3xl overflow-hidden shadow-soft"
						>
							<div className="grid md:grid-cols-2">
								{/* イメージ部分 - 奇数と偶数で順番入れ替え */}
								<div className={`${groupIndex % 2 === 1 ? 'md:order-2' : ''} h-64 md:h-auto relative`}>
									<Image
										src={specGroup.image}
										alt={specGroup.category}
										fill
										style={{ objectFit: 'cover' }}
										className="brightness-90"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent md:bg-gradient-to-r md:from-background/60 md:to-transparent flex items-end p-6">
										<h3 className="text-2xl font-bold text-white">
											{specGroup.category}
										</h3>
									</div>
								</div>

								{/* スペック詳細 */}
								<div className={`${groupIndex % 2 === 1 ? 'md:order-1' : ''} p-6 md:p-8`}>
									<ul className="space-y-4">
										{specGroup.items.map((item, itemIndex) => (
											<motion.li
												key={item.label}
												initial={{ opacity: 0, x: -10 }}
												animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
												transition={{ duration: 0.3, delay: groupIndex * 0.2 + itemIndex * 0.1 }}
												className="flex justify-between items-center border-b border-border pb-3"
											>
												<span className="text-foreground/70">{item.label}</span>
												<span className="font-medium text-accent">{item.value}</span>
											</motion.li>
										))}
									</ul>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}-e 
### FILE: ./src/components/lp/availability-calendar.tsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar, Info } from 'lucide-react';

interface AvailabilityCalendarProps {
	onDateSelect?: (date: Date) => void;
	className?: string;
}

// Mock availability data - this would come from an API in production
const generateMockAvailabilityData = () => {
	const availability: Record<string, 'available' | 'limited' | 'booked'> = {};
	const now = new Date();

	for (let i = 0; i < 60; i++) {
		const date = new Date(now);
		date.setDate(now.getDate() + i);
		const dateStr = date.toISOString().split('T')[0];

		// Random availability status for demo
		const rand = Math.random();
		if (rand < 0.2) {
			availability[dateStr] = 'booked';
		} else if (rand < 0.5) {
			availability[dateStr] = 'limited';
		} else {
			availability[dateStr] = 'available';
		}
	}

	return availability;
};

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
	onDateSelect,
	className = ''
}) => {
	const router = useRouter();
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
	const [availabilityData, setAvailabilityData] = useState<Record<string, string>>({});
	const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

	// Calendar grid setup
	const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

	// Generate days for the current month view
	const getDaysInMonth = (year: number, month: number) => {
		const firstDayOfMonth = new Date(year, month, 1);
		const lastDayOfMonth = new Date(year, month + 1, 0);
		const daysArray = [];

		// Add days from previous month to fill the first week
		const firstDayOfWeek = firstDayOfMonth.getDay();
		const prevMonthLastDay = new Date(year, month, 0).getDate();

		for (let i = firstDayOfWeek - 1; i >= 0; i--) {
			daysArray.push({
				date: new Date(year, month - 1, prevMonthLastDay - i),
				isCurrentMonth: false,
				isPast: new Date(year, month - 1, prevMonthLastDay - i) < new Date(new Date().setHours(0, 0, 0, 0))
			});
		}

		// Add days of current month
		for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
			const date = new Date(year, month, i);
			daysArray.push({
				date,
				isCurrentMonth: true,
				isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
				isToday: date.toDateString() === new Date().toDateString()
			});
		}

		// Add days from next month to complete the last week
		const remainingDays = 7 - (daysArray.length % 7 || 7);
		for (let i = 1; i <= remainingDays; i++) {
			daysArray.push({
				date: new Date(year, month + 1, i),
				isCurrentMonth: false,
				isPast: false
			});
		}

		return daysArray;
	};

	const [days, setDays] = useState(getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()));

	// Fetch availability data
	useEffect(() => {
		// In production, this would be an API call
		// For now, we're using mock data
		setAvailabilityData(generateMockAvailabilityData());
	}, []);

	// Update days when current month changes
	useEffect(() => {
		setDays(getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()));
	}, [currentMonth]);

	const goToPreviousMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	const handleDateClick = (day: { date: Date, isCurrentMonth: boolean, isPast: boolean }) => {
		if (day.isPast) return; // Prevent selecting past dates

		// If onDateSelect is provided, call it (e.g. for direct selection)
		if (onDateSelect) {
			onDateSelect(day.date);
		} else {
			// Otherwise navigate to reservation page with the date
			const dateParam = day.date.toISOString().split('T')[0];
			router.push(`/reservation?date=${dateParam}`);
		}
	};

	// Get availability status for a day
	const getAvailabilityStatus = (date: Date) => {
		const dateString = date.toISOString().split('T')[0];
		return availabilityData[dateString] || 'unknown';
	};

	// Get color class based on availability
	const getAvailabilityColorClass = (date: Date) => {
		const status = getAvailabilityStatus(date);
		switch (status) {
			case 'available':
				return 'bg-highlight/10 hover:bg-highlight/20';
			case 'limited':
				return 'bg-accent/10 hover:bg-accent/20';
			case 'booked':
				return 'bg-red-400/10 hover:bg-red-400/20';
			default:
				return 'bg-background/5 hover:bg-background/10';
		}
	};

	// Get label for availability tooltip
	const getAvailabilityLabel = (status: string) => {
		switch (status) {
			case 'available':
				return '予約可能';
			case 'limited':
				return '残り僅か';
			case 'booked':
				return '満席';
			default:
				return '不明';
		}
	};

	return (
		<div className={`w-full ${className}`}>
			{/* Calendar Legend */}
			<div className="flex items-center justify-center mb-6 gap-6 text-sm">
				<div className="flex items-center">
					<div className="w-3 h-3 rounded-full bg-highlight mr-2"></div>
					<span className="text-foreground/70">予約可能</span>
				</div>
				<div className="flex items-center">
					<div className="w-3 h-3 rounded-full bg-accent mr-2"></div>
					<span className="text-foreground/70">残り僅か</span>
				</div>
				<div className="flex items-center">
					<div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
					<span className="text-foreground/70">満席</span>
				</div>
			</div>

			{/* Calendar header */}
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-medium text-foreground flex items-center">
					<Calendar size={18} className="mr-2" />
					{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
				</h2>
				<div className="flex space-x-2">
					<button
						onClick={goToPreviousMonth}
						className="p-2 rounded-full hover:bg-border text-foreground"
						aria-label="前の月"
					>
						<ChevronLeft size={18} />
					</button>
					<button
						onClick={goToNextMonth}
						className="p-2 rounded-full hover:bg-border text-foreground"
						aria-label="次の月"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{/* Calendar grid */}
			<div className="grid grid-cols-7 gap-1">
				{/* Days of week header */}
				{daysOfWeek.map(day => (
					<div key={day} className="text-center py-2 text-sm font-medium text-foreground/70">
						{day}
					</div>
				))}

				{/* Calendar days */}
				{days.map((day, index) => {
					const availabilityStatus = day.isCurrentMonth && !day.isPast
						? getAvailabilityStatus(day.date)
						: 'unknown';

					return (
						<motion.div
							key={index}
							whileHover={{ scale: day.isPast ? 1 : 1.05 }}
							whileTap={{ scale: day.isPast ? 1 : 0.95 }}
							className={`
                aspect-square relative p-1 border border-border/20 rounded-md 
                ${day.isCurrentMonth ? 'text-foreground' : 'text-foreground/40'}
                ${day.isPast ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${day.isCurrentMonth && !day.isPast ? getAvailabilityColorClass(day.date) : ''}
              `}
							onClick={() => !day.isPast && handleDateClick(day)}
							onMouseEnter={() => setHoveredDate(day.date)}
							onMouseLeave={() => setHoveredDate(null)}
						>
							<div className="absolute top-1 right-1 text-xs">
								{day.date.getDate()}
							</div>

							{/* Today indicator */}
							{day.isToday && (
								<div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent"></div>
							)}

							{/* Availability indicator */}
							{day.isCurrentMonth && !day.isPast && (
								<div className="absolute bottom-1 left-1 flex space-x-0.5">
									{availabilityStatus === 'limited' && (
										<div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
									)}
									{availabilityStatus === 'available' && (
										<div className="w-1.5 h-1.5 rounded-full bg-highlight"></div>
									)}
									{availabilityStatus === 'booked' && (
										<div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
									)}
								</div>
							)}

							{/* Tooltip on hover */}
							{hoveredDate && day.date.getTime() === hoveredDate.getTime() && !day.isPast && day.isCurrentMonth && (
								<div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-background text-foreground text-xs rounded border border-border shadow-soft whitespace-nowrap">
									{getAvailabilityLabel(availabilityStatus)}
								</div>
							)}
						</motion.div>
					);
				})}
			</div>

			{/* Info message */}
			<div className="mt-6 flex items-start text-sm text-foreground/70">
				<Info size={16} className="mr-2 flex-shrink-0 mt-0.5" />
				<p>
					カレンダーの日付をクリックすると、その日の予約状況と空き枠を確認できます。実際に予約するには会員登録が必要です。
				</p>
			</div>
		</div>
	);
};

export default AvailabilityCalendar;-e 
### FILE: ./src/components/lp/steps-section.tsx

'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// 利用ステップデータ
const usageSteps = [
	{
		number: 1,
		title: "QRコードで入室",
		description: "会員登録後に表示されるQRコードをドアの読み取り機にかざすだけで入室できます。",
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<rect x="7" y="7" width="3" height="3"></rect>
				<rect x="14" y="7" width="3" height="3"></rect>
				<rect x="7" y="14" width="3" height="3"></rect>
				<rect x="14" y="14" width="3" height="3"></rect>
			</svg>
		)
	},
	{
		number: 2,
		title: "好きな席で自由に",
		description: "お好きな席に座り、席のQRコードをスキャンするだけでPCが起動。すぐにゲームが始められます。",
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
				<polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
				<line x1="12" y1="22.08" x2="12" y2="12"></line>
			</svg>
		)
	},
	{
		number: 3,
		title: "そのまま帰るだけ",
		description: "利用終了後は席を立ってそのまま帰るだけ。料金は自動計算され、登録されたカードから引き落とされます。",
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
				<polyline points="16 17 21 12 16 7"></polyline>
				<line x1="21" y1="12" x2="9" y2="12"></line>
			</svg>
		)
	}
];

export default function StepsSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, amount: 0.2 });

	return (
		<section
			id="steps"
			className="py-20 bg-gradient-to-b from-background to-background/90"
			ref={ref}
		>
			<div className="container mx-auto px-4">
				{/* セクションタイトル */}
				<motion.div
					className="text-center mb-16"
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						<span className="text-accent">めちゃ簡単</span>、3ステップで
					</h2>
					<p className="text-foreground/70 max-w-2xl mx-auto">
						面倒な手続きも、スタッフ対応も必要ありません。
						24時間いつでも、スマホ1つで完結します。
					</p>
				</motion.div>

				{/* ステップカード */}
				<div className="flex flex-col md:flex-row gap-8 justify-between max-w-4xl mx-auto">
					{usageSteps.map((step, index) => (
						<motion.div
							key={step.number}
							className="bg-border/10 rounded-2xl p-6 md:p-8 flex-1 relative shadow-soft"
							initial={{ opacity: 0, y: 30 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
							transition={{ duration: 0.5, delay: index * 0.15 }}
						>
							{/* ステップ番号 */}
							<div className="absolute -top-4 -left-4 bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md">
								{step.number}
							</div>

							{/* アイコン */}
							<div className="text-accent mb-4">
								{step.icon}
							</div>

							{/* コンテンツ */}
							<h3 className="text-xl font-semibold mb-3">
								{step.title}
							</h3>
							<p className="text-foreground/70">
								{step.description}
							</p>

							{/* 接続線（最後のアイテムには不要） */}
							{index < usageSteps.length - 1 && (
								<div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-accent transform">
									<div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-accent rotate-45"></div>
								</div>
							)}
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}-e 
### FILE: ./src/components/lp/hero-section.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function HeroSection() {
	const title = "疲れたから「ゆるゲー気分」";
	const [titleChars, setTitleChars] = useState<string[]>([]);

	useEffect(() => {
		setTitleChars(title.split(''));
	}, []);

	return (
		<section className="relative min-h-screen flex items-center overflow-hidden">
			<div className="absolute inset-0 z-0">
				<Image
					src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/hero-bg.webp`}
					alt="深夜のゲーミングスペース"
					fill
					priority
					quality={90}
					style={{ objectFit: 'cover' }}
					className="brightness-50"
				/>
			</div>

			{/* コンテンツオーバーレイ */}
			<div className="container mx-auto px-4 relative z-10">
				<div className="max-w-4xl">
					{/* タイトル文字ごとのアニメーション */}
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 flex flex-wrap">
						{titleChars.map((char, index) => (
							<motion.span
								key={index}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.5,
									delay: 0.1 + index * 0.04,
									ease: "easeOut"
								}}
							>
								{char === " " ? "\u00A0" : char}
							</motion.span>
						))}
					</h1>

					{/* サブキャッチコピー */}
					<motion.p
						className="text-xl md:text-2xl text-foreground/90 mb-8"
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.7, delay: 0.5 }}
					>
						コスパもいいし。～ふらっと寄れるゲームカフェ～
					</motion.p>

					{/* CTAボタン */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.8 }}
					>
						<Link
							href="/register"
							className="
                inline-block bg-accent hover:bg-accent/90 
                text-white font-semibold py-3 px-8 
                rounded-2xl shadow-soft 
                transition-all duration-300 hover:translate-y-[-2px]
              "
						>
							3分で会員登録完了、解錠コードを受け取る
						</Link>
					</motion.div>
				</div>
			</div>

			{/* 下スクロール案内 */}
			<motion.div
				className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1, y: [0, 10, 0] }}
				transition={{
					delay: 1.2,
					duration: 1.5,
					repeat: Infinity,
					repeatType: "loop"
				}}
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-foreground/70"
				>
					<path d="M12 5v14M5 12l7 7 7-7" />
				</svg>
			</motion.div>
		</section>
	);
}-e 
### FILE: ./src/components/lp/games-section.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { GAME_DATA } from '@/lib/gameData';
import GameCategoryLayout from '@/components/games/GameCategoryLayout';
import VideoPreloader from '@/components/games/VideoPreloader';
import { CategoryPageContainer } from '@/components/ui/PageTransition';

export default function GamesSection() {
	// Use 'party' as the default category for the landing page
	const defaultCategory = 'party';
	const [isLoading, setIsLoading] = useState(true);
	const [activeIndex, setActiveIndex] = useState(0);
	const [currentCategory, setCurrentCategory] = useState(defaultCategory);
	const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

	useEffect(() => {
		// Simulate loading data
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 500);

		return () => clearTimeout(timer);
	}, []);

	// Get the category data
	const categoryData = GAME_DATA[currentCategory];

	// Get all video sources for preloading
	const videoSources = categoryData.games.map(game =>
		game.videoSrc.startsWith('http') ? game.videoSrc : `${cloudFrontUrl}${game.videoSrc}`
	);

	return (
		<section id="games" className="py-16">
			<div className="container mx-auto px-4">
				<CategoryPageContainer category={currentCategory}>
					{isLoading ? (
						<div className="flex items-center justify-center min-h-[600px]">
							<div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
						</div>
					) : (
						<div className="min-h-[600px]">
							<GameCategoryLayout
								games={categoryData.games}
								onActiveIndexChange={setActiveIndex}
							/>

							{/* プリロード用の非表示コンポーネント */}
							<VideoPreloader
								videoSrcs={videoSources}
								currentIndex={activeIndex}
							/>
						</div>
					)}
				</CategoryPageContainer>

				{/* Call to Action */}
				<div className="text-center mt-16">
					<p className="text-xl mb-4">これらのゲームをプレイしてみませんか？</p>
					<a
						href="#reservation"
						className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full font-medium text-lg transition-colors"
					>
						今すぐ予約する
					</a>
				</div>
			</div>
		</section>
	);
}-e 
### FILE: ./src/components/lp/lp-header.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LpHeader() {
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// スクロール処理
	const controlHeader = () => {
		const currentScrollY = window.scrollY;

		if (currentScrollY > lastScrollY && currentScrollY > 100) {
			// 下にスクロール中かつ100px以上スクロール済み → 非表示
			setIsVisible(false);
		} else {
			// 上にスクロール中 → 表示
			setIsVisible(true);
		}

		setLastScrollY(currentScrollY);
	};

	useEffect(() => {
		window.addEventListener('scroll', controlHeader);

		return () => {
			window.removeEventListener('scroll', controlHeader);
		};
	}, [lastScrollY]);

	return (
		<motion.header
			className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border transition-transform duration-300`}
			initial={{ translateY: 0 }}
			animate={{ translateY: isVisible ? 0 : '-100%' }}
			transition={{ duration: 0.3 }}
		>
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between h-16">
					<Link href="/" className="flex items-center">
						<Image
							src="/images/logo.svg"
							alt="E-Sports Sakura"
							width={40}
							height={40}
							className="mr-2"
						/>
						<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
					</Link>

					{/* デスクトップナビゲーション */}
					<nav className="hidden md:block">
						<ul className="flex space-x-6">
							<li>
								<Link href="#features" className="text-foreground/70 hover:text-accent transition-colors">
									利用シーン
								</Link>
							</li>
							<li>
								<Link href="#games" className="text-foreground/70 hover:text-accent transition-colors">
									ゲーム
								</Link>
							</li>
							<li>
								<Link href="#steps" className="text-foreground/70 hover:text-accent transition-colors">
									使い方
								</Link>
							</li>
							<li>
								<Link href="#specs" className="text-foreground/70 hover:text-accent transition-colors">
									スペック
								</Link>
							</li>
							<li>
								<Link href="#faq" className="text-foreground/70 hover:text-accent transition-colors">
									FAQ
								</Link>
							</li>
							<li>
								<Link href="#access" className="text-foreground/70 hover:text-accent transition-colors">
									アクセス
								</Link>
							</li>
						</ul>
					</nav>

					{/* モバイルメニューボタン */}
					<div className="md:hidden">
						<button
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							className="text-foreground p-2"
						>
							{isMobileMenuOpen ? (
								<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							) : (
								<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
								</svg>
							)}
						</button>
					</div>

					<Link
						href="/login"
						className="
              hidden md:block
              px-4 py-2 rounded-xl 
              border border-accent text-accent 
              hover:bg-accent hover:text-white 
              transition-colors duration-300
            "
					>
						ログイン
					</Link>
				</div>

				{/* モバイルナビゲーション */}
				{isMobileMenuOpen && (
					<motion.div
						className="md:hidden py-4 border-t border-border/20"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.3 }}
					>
						<ul className="space-y-3">
							<li>
								<Link
									href="#features"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									利用シーン
								</Link>
							</li>
							<li>
								<Link
									href="#games"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									ゲーム
								</Link>
							</li>
							<li>
								<Link
									href="#steps"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									使い方
								</Link>
							</li>
							<li>
								<Link
									href="#specs"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									スペック
								</Link>
							</li>
							<li>
								<Link
									href="#faq"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									FAQ
								</Link>
							</li>
							<li>
								<Link
									href="#access"
									className="block py-2 text-foreground/70 hover:text-accent"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									アクセス
								</Link>
							</li>
							<li className="pt-2">
								<Link
									href="/login"
									className="block py-2 text-accent hover:underline"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									ログイン
								</Link>
							</li>
						</ul>
					</motion.div>
				)}
			</div>
		</motion.header>
	);
}-e 
### FILE: ./src/components/registration/progress-tracker.tsx

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// 登録ステップの定義（個人情報ステップを省略）
const registrationSteps = [
	{
		id: 'verification',
		name: '本人確認',
		path: '/register/verification',
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
				<polyline points="22 4 12 14.01 9 11.01"></polyline>
			</svg>
		)
	},
	{
		id: 'payment',
		name: '決済情報',
		path: '/register/payment',
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
				<line x1="1" y1="10" x2="23" y2="10"></line>
			</svg>
		)
	},
	{
		id: 'complete',
		name: '完了',
		path: '/register/complete',
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
			</svg>
		)
	}
];

export default function ProgressTracker() {
	const pathname = usePathname();
	const [currentStepIndex, setCurrentStepIndex] = useState(0);

	useEffect(() => {
		// パスから現在のステップを特定
		const index = registrationSteps.findIndex(step => pathname?.includes(step.id));
		if (index !== -1) {
			setCurrentStepIndex(index);
		}
	}, [pathname]);

	return (
		<div className="mb-8">
			{/* モバイル表示 */}
			<div className="md:hidden">
				<div className="flex items-center justify-between px-1">
					<span className="text-sm font-medium">
						ステップ {currentStepIndex + 1}/{registrationSteps.length}
					</span>
					<span className="text-sm text-foreground/70">
						{registrationSteps[currentStepIndex].name}
					</span>
				</div>
				<div className="mt-2 h-2 w-full bg-border/30 rounded-full overflow-hidden">
					<div
						className="h-full bg-accent rounded-full"
						style={{ width: `${((currentStepIndex + 1) / registrationSteps.length) * 100}%` }}
					></div>
				</div>
			</div>

			{/* デスクトップ表示 */}
			<ol className="hidden md:flex items-center">
				{registrationSteps.map((step, index) => {
					// ステップの状態判定
					const isActive = index === currentStepIndex;
					const isCompleted = index < currentStepIndex;
					const isPending = index > currentStepIndex;

					return (
						<li key={step.id} className="relative flex-1">
							{index > 0 && (
								<div className="absolute inset-0 flex items-center">
									<div className={`h-0.5 w-full ${isCompleted ? 'bg-accent' : 'bg-border/30'}`}></div>
								</div>
							)}

							<div className="relative flex items-center justify-center">
								{isCompleted ? (
									<Link href={step.path} className="group">
										<span className="h-10 w-10 flex items-center justify-center rounded-full bg-accent text-white transition-colors group-hover:bg-accent/80">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<polyline points="20 6 9 17 4 12"></polyline>
											</svg>
										</span>
										<span className="absolute top-12 left-1/2 -translate-x-1/2 text-sm font-medium text-foreground whitespace-nowrap">
											{step.name}
										</span>
									</Link>
								) : isActive ? (
									<div>
										<span className="h-10 w-10 flex items-center justify-center rounded-full bg-accent text-white">
											{step.icon}
										</span>
										<span className="absolute top-12 left-1/2 -translate-x-1/2 text-sm font-medium text-foreground whitespace-nowrap">
											{step.name}
										</span>
									</div>
								) : (
									<div>
										<span className="h-10 w-10 flex items-center justify-center rounded-full bg-border/20 text-foreground/50">
											{step.icon}
										</span>
										<span className="absolute top-12 left-1/2 -translate-x-1/2 text-sm font-medium text-foreground/50 whitespace-nowrap">
											{step.name}
										</span>
									</div>
								)}
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
}-e 
### FILE: ./src/components/payment/enhanced-card-form.tsx

// src/components/payment/enhanced-card-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import PaymentMethodSelector from './payment-method-selector';

type PaymentMethodType = 'card' | 'googlePay' | 'applePay';

const cardStyle = {
	style: {
		base: {
			color: '#32325d',
			fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
			fontSmoothing: 'antialiased',
			fontSize: '16px',
			'::placeholder': {
				color: '#aab7c4'
			}
		},
		invalid: {
			color: '#fa755a',
			iconColor: '#fa755a'
		}
	}
};

export default function EnhancedCardForm({ onSuccess }: { onSuccess?: () => void }) {
	const { user } = useAuth();
	const stripe = useStripe();
	const elements = useElements();
	const router = useRouter();

	const [clientSecret, setClientSecret] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [cardComplete, setCardComplete] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [succeeded, setSucceeded] = useState(false);
	const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
	const [paymentRequest, setPaymentRequest] = useState<any>(null);

	// Setup Intentの取得
	useEffect(() => {
		const getSetupIntent = async () => {
			if (!user) return;

			try {
				// まずStripe顧客を作成/取得
				const createCustomerResponse = await fetch('/api/stripe/create-customer', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					}
				});

				if (!createCustomerResponse.ok) {
					throw new Error('Failed to create Stripe customer');
				}

				// Setup Intentを作成
				const setupIntentResponse = await fetch('/api/stripe/create-setup-intent', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					}
				});

				if (!setupIntentResponse.ok) {
					throw new Error('Failed to create Setup Intent');
				}

				const { clientSecret } = await setupIntentResponse.json();
				setClientSecret(clientSecret);

				// PaymentRequestボタンの設定（Google Pay、Apple Pay用）
				if (stripe) {
					const pr = stripe.paymentRequest({
						country: 'JP',
						currency: 'jpy',
						total: {
							label: 'E-Sports Sakura会員登録',
							amount: 0, // Setup Intentのため金額は0
						},
						requestPayerName: true,
						requestPayerEmail: true,
					});

					// PaymentRequestがサポートされているか確認
					const result = await pr.canMakePayment();
					if (result) {
						setPaymentRequest(pr);
					}

					// PaymentRequestのイベントリスナー設定
					pr.on('paymentmethod', async (ev) => {
						if (!clientSecret) return;

						setProcessing(true);

						// PaymentMethodをSetup Intentに付与
						const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
							clientSecret,
							{ payment_method: ev.paymentMethod.id }
						);

						if (confirmError) {
							// エラーがある場合は取引を完了
							ev.complete('fail');
							setError(confirmError.message || 'カード情報の処理中にエラーが発生しました。');
							setProcessing(false);
							return;
						}

						// 成功時
						ev.complete('success');
						if (setupIntent?.status === 'succeeded') {
							await handleSetupSuccess(setupIntent);
						}
					});
				}

			} catch (err) {
				console.error('Error fetching Setup Intent:', err);
				setError('決済情報の初期化中にエラーが発生しました。後でもう一度お試しください。');
			}
		};

		getSetupIntent();
	}, [user, stripe]);

	// カード情報の処理
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!stripe || !elements || !clientSecret) {
			// Stripeがまだロードされていない場合
			return;
		}

		setProcessing(true);
		setError(null);

		try {
			const cardElement = elements.getElement(CardElement);
			if (!cardElement) {
				throw new Error('Card Element not found');
			}

			// カード情報を送信
			const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
				payment_method: {
					card: cardElement,
					billing_details: {
						email: user?.email || '',
					},
				}
			});

			if (stripeError) {
				setError(stripeError.message || 'カード情報の処理中にエラーが発生しました。');
				setProcessing(false);
				return;
			}

			// セットアップ成功時の処理
			if (setupIntent) {
				await handleSetupSuccess(setupIntent);
			}

		} catch (err) {
			console.error('Error processing card:', err);
			setError('カード情報の処理中にエラーが発生しました。もう一度お試しください。');
			setProcessing(false);
		}
	};

	// セットアップ成功時の処理
	const handleSetupSuccess = async (setupIntent: any) => {
		setSucceeded(true);

		// Firestoreに支払い状態を更新
		if (user) {
			try {
				await fetch('/api/stripe/confirm-payment-setup', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					},
					body: JSON.stringify({
						setupIntentId: setupIntent?.id,
						paymentMethodId: setupIntent?.payment_method
					})
				});
			} catch (err) {
				console.error('Error confirming payment setup:', err);
				// ここではエラーを表示せず、成功として扱う
			}
		}

		// 成功コールバック
		setTimeout(() => {
			if (onSuccess) {
				onSuccess();
			} else {
				// 完了ページへリダイレクト
				router.push('/register/complete');
			}
		}, 2000);

		setProcessing(false);
	};

	// カード入力状態の変更ハンドラ
	const handleCardChange = (event: any) => {
		setCardComplete(event.complete);
		setError(event.error ? event.error.message : null);
	};

	// 開発用: 決済処理をモック
	const handleMockPayment = async () => {
		setProcessing(true);

		// 成功をシミュレート
		setTimeout(async () => {
			setSucceeded(true);

			// Firestoreに支払い状態を更新
			if (user) {
				try {
					await fetch('/api/stripe/mock-payment-setup', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${await user.getIdToken()}`
						}
					});
				} catch (err) {
					console.error('Error updating mock payment status:', err);
				}
			}

			// 完了ページへリダイレクト
			setTimeout(() => {
				if (onSuccess) {
					onSuccess();
				} else {
					router.push('/register/complete');
				}
			}, 1500);

			setProcessing(false);
		}, 2000);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* 支払い方法選択 */}
			<PaymentMethodSelector
				onSelect={setSelectedMethod}
				selectedMethod={selectedMethod}
			/>

			{/* 選択された支払い方法に応じたフォーム */}
			<div className="space-y-4">
				{selectedMethod === 'card' && (
					<div className="border border-border rounded-lg bg-background p-4">
						{clientSecret ? (
							<CardElement
								options={cardStyle}
								onChange={handleCardChange}
								className="py-2"
							/>
						) : (
							<div className="flex justify-center py-4">
								<LoadingSpinner size="small" />
								<span className="ml-2 text-foreground/70">カード情報フォームを読み込み中...</span>
							</div>
						)}
					</div>
				)}

				{/* Google Pay / Apple Pay ボタン */}
				{(selectedMethod === 'googlePay' || selectedMethod === 'applePay') && paymentRequest && (
					<div className="py-2">
						<PaymentRequestButtonElement
							options={{
								paymentRequest,
								style: {
									paymentRequestButton: {
										theme: 'dark',
										height: '48px',
									},
								},
							}}
						/>
					</div>
				)}
			</div>

			{/* エラーメッセージ */}
			{error && (
				<div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
					{error}
				</div>
			)}

			{/* 成功メッセージ */}
			{succeeded && (
				<div className="bg-green-500/10 text-green-500 p-3 rounded-lg text-sm">
					カード情報が正常に登録されました。次のステップに進みます...
				</div>
			)}

			{/* 送信ボタン */}
			<div className="flex flex-col">
				{selectedMethod === 'card' && (
					<Button
						type="submit"
						disabled={processing || !cardComplete || !stripe || !clientSecret || succeeded}
						className={`w-full ${succeeded ? 'bg-green-600' : ''}`}
					>
						{processing ? (
							<>
								<LoadingSpinner size="small" />
								<span className="ml-2">処理中...</span>
							</>
						) : succeeded ? (
							'登録完了！'
						) : (
							'カード情報を登録する'
						)}
					</Button>
				)}

				{/* 開発環境のみ表示するモックボタン */}
				{process.env.NODE_ENV === 'development' && !succeeded && (
					<Button
						type="button"
						onClick={handleMockPayment}
						disabled={processing || succeeded}
						className="mt-4 bg-gray-500 hover:bg-gray-600"
					>
						{processing ? (
							<>
								<LoadingSpinner size="small" />
								<span className="ml-2">処理中...</span>
							</>
						) : (
							'(開発用) 支払い成功をシミュレート'
						)}
					</Button>
				)}
			</div>

			{/* セキュリティ情報 */}
			<div className="text-center text-sm text-foreground/60">
				<p>
					お客様のカード情報は安全に処理され、当社のサーバーには保存されません。
					<br />
					決済処理は<a href="https://stripe.com/jp" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Stripe</a>によって安全に行われます。
				</p>
			</div>
		</form>
	);
}-e 
### FILE: ./src/components/payment/payment-method-selector.tsx

// src/components/payment/payment-method-selector.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useStripe } from '@stripe/react-stripe-js';
import { PAYMENT_METHODS, checkAvailablePaymentMethods } from '@/lib/stripe-payment-methods';
import LoadingSpinner from '@/components/ui/loading-spinner';

type PaymentMethodType = 'card' | 'googlePay' | 'applePay';

interface PaymentMethodSelectorProps {
	onSelect: (method: PaymentMethodType) => void;
	selectedMethod: PaymentMethodType;
}

export default function PaymentMethodSelector({ onSelect, selectedMethod }: PaymentMethodSelectorProps) {
	const stripe = useStripe();
	const [availableMethods, setAvailableMethods] = useState<Record<string, boolean>>({
		card: true,
		googlePay: false,
		applePay: false
	});
	const [loading, setLoading] = useState(true);

	// 利用可能な支払い方法を確認
	useEffect(() => {
		async function checkMethods() {
			if (stripe) {
				setLoading(true);
				const methods = await checkAvailablePaymentMethods(stripe);
				setAvailableMethods(methods);
				setLoading(false);
			}
		}

		if (stripe) {
			checkMethods();
		}
	}, [stripe]);

	if (loading) {
		return (
			<div className="flex justify-center items-center py-4">
				<LoadingSpinner size="small" />
				<span className="ml-2 text-sm text-foreground/70">利用可能な支払い方法を確認中...</span>
			</div>
		);
	}

	return (
		<div className="mb-6">
			<h3 className="text-lg font-medium mb-3">支払い方法</h3>
			<div className="space-y-2">
				{/* カード支払い */}
				<div
					className={`p-3 border rounded-lg cursor-pointer flex items-center ${selectedMethod === 'card' ? 'border-accent bg-accent/5' : 'border-border'
						}`}
					onClick={() => onSelect('card')}
				>
					<div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
					</div>
					<div className="flex-grow">
						<div className="font-medium">クレジット/デビットカード</div>
						<div className="flex mt-1 space-x-1">
							<span className="text-xs text-foreground/70">Visa, Mastercard, AMEX, JCB</span>
						</div>
					</div>
					<div className="flex-shrink-0 ml-2">
						<div className={`w-4 h-4 rounded-full border ${selectedMethod === 'card' ? 'border-accent' : 'border-border'
							}`}>
							{selectedMethod === 'card' && (
								<div className="w-2 h-2 rounded-full bg-accent m-auto mt-1"></div>
							)}
						</div>
					</div>
				</div>

				{/* Google Pay */}
				{availableMethods.googlePay && (
					<div
						className={`p-3 border rounded-lg cursor-pointer flex items-center ${selectedMethod === 'googlePay' ? 'border-accent bg-accent/5' : 'border-border'
							}`}
						onClick={() => onSelect('googlePay')}
					>
						<div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
								<path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.5 7.5h5v1.5h-5v-1.5zm9 9.5h-12.5v-7.5h12.5v7.5z" />
							</svg>
						</div>
						<div className="flex-grow">
							<div className="font-medium">Google Pay</div>
						</div>
						<div className="flex-shrink-0 ml-2">
							<div className={`w-4 h-4 rounded-full border ${selectedMethod === 'googlePay' ? 'border-accent' : 'border-border'
								}`}>
								{selectedMethod === 'googlePay' && (
									<div className="w-2 h-2 rounded-full bg-accent m-auto mt-1"></div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Apple Pay */}
				{availableMethods.applePay && (
					<div
						className={`p-3 border rounded-lg cursor-pointer flex items-center ${selectedMethod === 'applePay' ? 'border-accent bg-accent/5' : 'border-border'
							}`}
						onClick={() => onSelect('applePay')}
					>
						<div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
								<path d="M19.665 16.811a10.316 10.316 0 0 1-1.021 1.837c-.537.767-.978 1.297-1.316 1.592-.525.482-1.089.73-1.692.744-.432 0-.954-.123-1.562-.373-.61-.249-1.17-.371-1.683-.371-.537 0-1.113.122-1.732.371-.619.25-1.118.381-1.497.396-.577.025-1.154-.229-1.729-.764-.367-.32-.826-.87-1.377-1.648-.59-.829-1.075-1.794-1.455-2.891-.407-1.187-.611-2.335-.611-3.447 0-1.273.275-2.372.826-3.292a4.857 4.857 0 0 1 1.73-1.751 4.65 4.65 0 0 1 2.34-.662c.46 0 1.063.142 1.81.422s1.227.422 1.436.422c.158 0 .689-.167 1.593-.498.853-.307 1.573-.434 2.163-.384 1.6.129 2.801.759 3.6 1.895-1.43.867-2.137 2.08-2.123 3.637.012 1.213.453 2.222 1.317 3.023a4.33 4.33 0 0 0 1.315.863c-.106.307-.218.6-.336.882z" />
							</svg>
						</div>
						<div className="flex-grow">
							<div className="font-medium">Apple Pay</div>
						</div>
						<div className="flex-shrink-0 ml-2">
							<div className={`w-4 h-4 rounded-full border ${selectedMethod === 'applePay' ? 'border-accent' : 'border-border'
								}`}>
								{selectedMethod === 'applePay' && (
									<div className="w-2 h-2 rounded-full bg-accent m-auto mt-1"></div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}-e 
### FILE: ./src/components/payment/card-form.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
	CardElement,
	useStripe,
	useElements,
	Elements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Stripeの公開キーを使用してStripeをロード
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// カード入力スタイル
const cardStyle = {
	style: {
		base: {
			color: '#32325d',
			fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
			fontSmoothing: 'antialiased',
			fontSize: '16px',
			'::placeholder': {
				color: '#aab7c4'
			}
		},
		invalid: {
			color: '#fa755a',
			iconColor: '#fa755a'
		}
	}
};

// カードフォーム内部コンポーネント
const CardFormInner = ({ onSuccess }: { onSuccess?: () => void }) => {
	const { user } = useAuth();
	const stripe = useStripe();
	const elements = useElements();
	const router = useRouter();

	const [clientSecret, setClientSecret] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [cardComplete, setCardComplete] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [succeeded, setSucceeded] = useState(false);

	// Setup Intentの取得
	useEffect(() => {
		const getSetupIntent = async () => {
			if (!user) return;

			try {
				// まずStripe顧客を作成/取得
				const createCustomerResponse = await fetch('/api/stripe/create-customer', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					}
				});

				if (!createCustomerResponse.ok) {
					throw new Error('Failed to create Stripe customer');
				}

				// Setup Intentを作成
				const setupIntentResponse = await fetch('/api/stripe/create-setup-intent', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					}
				});

				if (!setupIntentResponse.ok) {
					throw new Error('Failed to create Setup Intent');
				}

				const { clientSecret } = await setupIntentResponse.json();
				setClientSecret(clientSecret);

			} catch (err) {
				console.error('Error fetching Setup Intent:', err);
				setError('決済情報の初期化中にエラーが発生しました。後でもう一度お試しください。');
			}
		};

		getSetupIntent();
	}, [user]);

	// カード情報の処理
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!stripe || !elements || !clientSecret) {
			// Stripeがまだロードされていない場合
			return;
		}

		setProcessing(true);
		setError(null);

		try {
			const cardElement = elements.getElement(CardElement);
			if (!cardElement) {
				throw new Error('Card Element not found');
			}

			// カード情報を送信
			const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
				payment_method: {
					card: cardElement,
					billing_details: {
						email: user?.email || '',
					},
				}
			});

			if (stripeError) {
				setError(stripeError.message || 'カード情報の処理中にエラーが発生しました。');
				setProcessing(false);
				return;
			}

			// 成功
			setSucceeded(true);

			// Firestoreに支払い状態を更新
			if (user) {
				await fetch('/api/stripe/confirm-payment-setup', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${await user.getIdToken()}`
					},
					body: JSON.stringify({
						setupIntentId: setupIntent?.id,
						paymentMethodId: setupIntent?.payment_method
					})
				});
			}

			// 成功コールバック
			if (onSuccess) {
				onSuccess();
			} else {
				// 完了ページへリダイレクト
				setTimeout(() => {
					router.push('/register/complete');
				}, 2000);
			}

		} catch (err) {
			console.error('Error processing card:', err);
			setError('カード情報の処理中にエラーが発生しました。もう一度お試しください。');
		} finally {
			setProcessing(false);
		}
	};

	// カード入力状態の変更ハンドラ
	const handleCardChange = (event: any) => {
		setCardComplete(event.complete);
		setError(event.error ? event.error.message : null);
	};

	// 開発用: 決済処理をモック
	const handleMockPayment = async () => {
		setProcessing(true);

		// 成功をシミュレート
		setTimeout(async () => {
			setSucceeded(true);

			// Firestoreに支払い状態を更新
			if (user) {
				try {
					await fetch('/api/stripe/mock-payment-setup', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${await user.getIdToken()}`
						}
					});
				} catch (err) {
					console.error('Error updating mock payment status:', err);
				}
			}

			// 完了ページへリダイレクト
			setTimeout(() => {
				if (onSuccess) {
					onSuccess();
				} else {
					router.push('/register/complete');
				}
			}, 1500);

			setProcessing(false);
		}, 2000);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* カード入力フィールド */}
			<div className="space-y-4">
				<div className="border border-border rounded-lg bg-background p-4">
					{clientSecret ? (
						<CardElement
							options={cardStyle}
							onChange={handleCardChange}
							className="py-2"
						/>
					) : (
						<div className="flex justify-center py-4">
							<LoadingSpinner size="small" />
							<span className="ml-2 text-foreground/70">カード情報フォームを読み込み中...</span>
						</div>
					)}
				</div>

				{/* カードブランドの説明 */}
				<div className="flex items-center justify-center space-x-3 text-sm text-foreground/60">
					<span>対応カード:</span>
					<img src="/images/visa.svg" alt="Visa" className="h-6" />
					<img src="/images/mastercard.svg" alt="Mastercard" className="h-6" />
					<img src="/images/amex.svg" alt="American Express" className="h-6" />
					<img src="/images/jcb.svg" alt="JCB" className="h-6" />
				</div>
			</div>

			{/* エラーメッセージ */}
			{error && (
				<div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
					{error}
				</div>
			)}

			{/* 成功メッセージ */}
			{succeeded && (
				<div className="bg-green-500/10 text-green-500 p-3 rounded-lg text-sm">
					カード情報が正常に登録されました。次のステップに進みます...
				</div>
			)}

			{/* 送信ボタン */}
			<div className="flex flex-col">
				<Button
					type="submit"
					disabled={processing || !cardComplete || !stripe || !clientSecret || succeeded}
					className={`w-full ${succeeded ? 'bg-green-600' : ''}`}
				>
					{processing ? (
						<>
							<LoadingSpinner size="small" />
							<span className="ml-2">処理中...</span>
						</>
					) : succeeded ? (
						'登録完了！'
					) : (
						'カード情報を登録する'
					)}
				</Button>

				{/* 開発環境のみ表示するモックボタン */}
				{process.env.NODE_ENV === 'development' && !succeeded && (
					<Button
						type="button"
						onClick={handleMockPayment}
						disabled={processing || succeeded}
						className="mt-4 bg-gray-500 hover:bg-gray-600"
					>
						{processing ? (
							<>
								<LoadingSpinner size="small" />
								<span className="ml-2">処理中...</span>
							</>
						) : (
							'(開発用) 支払い成功をシミュレート'
						)}
					</Button>
				)}
			</div>

			{/* セキュリティ情報 */}
			<div className="text-center text-sm text-foreground/60">
				<p>
					お客様のカード情報は安全に処理され、当社のサーバーには保存されません。
					<br />
					決済処理は<a href="https://stripe.com/jp" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Stripe</a>によって安全に行われます。
				</p>
			</div>
		</form>
	);
};

// 外部向けラッパーコンポーネント
export default function CardForm({ onSuccess }: { onSuccess?: () => void }) {
	return (
		<Elements stripe={stripePromise}>
			<CardFormInner onSuccess={onSuccess} />
		</Elements>
	);
}-e 
### FILE: ./src/context/ekyc-context.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import { EkycData, EkycStatus } from '@/types';

// コンテキストの型
interface EkycContextType {
	ekycData: EkycData | null;
	isLoading: boolean;
	error: string | null;
	resetEkycStatus: () => Promise<void>;
}

// デフォルト値
const defaultEkycData: EkycData = {
	status: 'pending'
};

// コンテキスト作成
const EkycContext = createContext<EkycContextType>({
	ekycData: defaultEkycData,
	isLoading: true,
	error: null,
	resetEkycStatus: async () => { }
});

// プロバイダーコンポーネント
export function EkycProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [ekycData, setEkycData] = useState<EkycData | null>(defaultEkycData);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Firestoreからリアルタイムで状態を監視
	useEffect(() => {
		if (!user) {
			setIsLoading(false);
			return;
		}

		// ユーザーのeKYCデータを監視
		const unsubscribe = onSnapshot(
			doc(db, 'users', user.uid),
			(snapshot) => {
				if (snapshot.exists()) {
					const userData = snapshot.data();
					if (userData.eKYC) {
						setEkycData(userData.eKYC as EkycData);
					} else {
						setEkycData(defaultEkycData);
					}
				} else {
					setEkycData(defaultEkycData);
				}
				setIsLoading(false);
			},
			(err) => {
				console.error('Error fetching eKYC data:', err);
				setError('eKYCデータの取得中にエラーが発生しました。');
				setIsLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user]);

	// eKYCの状態をリセット
	const resetEkycStatus = async () => {
		if (!user) return;

		try {
			await fetch('/api/veriff/reset-status', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${await user.getIdToken()}`
				}
			});

			// 状態の更新はリスナーが自動的に処理
		} catch (err) {
			console.error('Error resetting eKYC status:', err);
			setError('eKYC状態のリセット中にエラーが発生しました。');
		}
	};

	const value = {
		ekycData,
		isLoading,
		error,
		resetEkycStatus
	};

	return <EkycContext.Provider value={value}>{children}</EkycContext.Provider>;
}

// カスタムフック
export const useEkyc = () => useContext(EkycContext);-e 
### FILE: ./src/context/AudioContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AudioContextType {
	globalAudioEnabled: boolean;
	hasUserInteracted: boolean;
	enableAudio: () => void;
	disableAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
	children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
	// ユーザーのオーディオ設定と、インタラクション状態を管理
	const [globalAudioEnabled, setGlobalAudioEnabled] = useState(false);
	const [hasUserInteracted, setHasUserInteracted] = useState(false);

	// ローカルストレージから設定を復元（ページリロード時やセッション間）
	useEffect(() => {
		const storedAudioPref = localStorage.getItem('audioPreference');
		const storedInteraction = localStorage.getItem('userInteracted');

		if (storedAudioPref === 'enabled') {
			setGlobalAudioEnabled(true);
		}

		if (storedInteraction === 'true') {
			setHasUserInteracted(true);
		}
	}, []);

	// オーディオを有効にする関数（ユーザーインタラクション捕捉）
	const enableAudio = () => {
		setGlobalAudioEnabled(true);
		setHasUserInteracted(true);
		localStorage.setItem('audioPreference', 'enabled');
		localStorage.setItem('userInteracted', 'true');
	};

	// オーディオを無効にする関数
	const disableAudio = () => {
		setGlobalAudioEnabled(false);
		localStorage.setItem('audioPreference', 'disabled');
	};

	return (
		<AudioContext.Provider
			value={{
				globalAudioEnabled,
				hasUserInteracted,
				enableAudio,
				disableAudio
			}}
		>
			{children}
		</AudioContext.Provider>
	);
}

// カスタムフック - コンポーネントからオーディオコンテキストにアクセスするために使用
export function useAudio() {
	const context = useContext(AudioContext);
	if (context === undefined) {
		throw new Error('useAudio must be used within an AudioProvider');
	}
	return context;
}-e 
### FILE: ./src/context/reservation-context.tsx

// src/context/reservation-context.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { SeatDocument, ReservationDocument, BranchDocument } from '@/types/firebase';
import { 
	collection, 
	doc, 
	getDocs, 
	query, 
	where, 
	writeBatch
  } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 座席予約の時間枠情報を複数管理できるように修正
export interface SelectedTimeSlotsItem {
	seatId: string;
	startTime: string;
	endTime: string;
	seatName?: string;
}

interface DateAvailability { [date: string]: 'available' | 'limited' | 'booked' | 'unknown'; }

interface ReservationContextType {
	branches: BranchDocument[];
	selectedBranch: BranchDocument | null;
	setSelectedBranch: (branch: BranchDocument | null) => void;
	fetchBranches: () => Promise<void>;
	seats: SeatDocument[];
	reservations: ReservationDocument[];
	selectedDate: Date | null;
	setSelectedDate: (date: Date | null) => void;
	// 複数の座席予約を管理するために配列に変更
	selectedTimeSlots: SelectedTimeSlotsItem[];
	setSelectedTimeSlots: (slots: SelectedTimeSlotsItem[]) => void;
	addSelectedTimeSlot: (slot: SelectedTimeSlotsItem) => void;
	removeSelectedTimeSlot: (seatId: string) => void;
	clearSelectedTimeSlots: () => void;
	dateAvailability: DateAvailability;
	fetchSeats: (branchId?: string) => Promise<void>;
	fetchReservations: (date?: Date, branchId?: string) => Promise<void>;
	createReservation: (reservations: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
	cancelReservation: (reservationId: string) => Promise<void>;
	isLoading: boolean;
	error: string | null;
}

// Create the context
const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

// Provider component
export const ReservationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { user } = useAuth();

	const [branches, setBranches] = useState<BranchDocument[]>([]);
	const [selectedBranch, setSelectedBranch] = useState<BranchDocument | null>(null);
	const [seats, setSeats] = useState<SeatDocument[]>([]);
	const [reservations, setReservations] = useState<ReservationDocument[]>([]);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	// 複数の座席予約を管理するために配列に変更
	const [selectedTimeSlots, setSelectedTimeSlots] = useState<SelectedTimeSlotsItem[]>([]);
	const [dateAvailability, setDateAvailability] = useState<DateAvailability>({});
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [fetchCount, setFetchCount] = useState<number>(0); // APIコール回数を追跡

	// 個別の座席予約を追加するヘルパー関数
	const addSelectedTimeSlot = useCallback((slot: SelectedTimeSlotsItem) => {
		setSelectedTimeSlots(prev => {
			// 既存の同じ座席の予約があれば更新、なければ追加
			const exists = prev.some(item => item.seatId === slot.seatId);
			if (exists) {
				return prev.map(item =>
					item.seatId === slot.seatId ? slot : item
				);
			} else {
				return [...prev, slot];
			}
		});
	}, []);

	// 指定した座席IDの予約を削除するヘルパー関数
	const removeSelectedTimeSlot = useCallback((seatId: string) => {
		setSelectedTimeSlots(prev => prev.filter(item => item.seatId !== seatId));
	}, []);

	// すべての選択をクリアするヘルパー関数
	const clearSelectedTimeSlots = useCallback(() => {
		setSelectedTimeSlots([]);
	}, []);

	// 支店一覧を取得 - useCallbackでメモ化して無限ループを防止
	const fetchBranches = useCallback(async (): Promise<void> => {
		setIsLoading(true);
		setError(null);
		// すでにbranchesがあり、fetchCountが1以上なら再取得しない（無限ループ対策）
		if (branches.length > 0 && fetchCount > 0) {
			setIsLoading(false);
			return;
		}
		try {
			// Firestoreからbranchコレクションのデータを取得
			const branchesCollection = collection(db, 'branch');
			const branchesSnapshot = await getDocs(branchesCollection);
			const branchesData: BranchDocument[] = [];
			branchesSnapshot.forEach((doc) => {
				// ドキュメントのデータとIDを組み合わせて配列に追加
				branchesData.push({
					branchId: doc.id,
					...doc.data()
				} as BranchDocument);
			});

			setBranches(branchesData);
			setFetchCount(prev => prev + 1); // APIコール回数をインクリメント
		} catch (err) {
			console.error('Error fetching branches:', err);
			setError('支店情報の取得に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	}, [branches.length, fetchCount]);

	// 座席情報を取得 - useCallbackでメモ化
	const fetchSeats = useCallback(async (branchId?: string): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			// ターゲットの支店を決定
			const targetBranchId = branchId || selectedBranch?.branchId;
			if (!targetBranchId) {
				throw new Error('支店が選択されていません');
			}

			// 支店情報を取得
			const targetBranch = branches.find(b => b.branchId === targetBranchId);
			if (!targetBranch) {
				throw new Error('支店情報が見つかりません');
			}

			console.log(`支店コード「${targetBranch.branchCode}」の座席情報を取得します`);

			// Firestoreから座席データの取得を試みる
			const seatsQuery = query(
				collection(db, 'seats'),
				where('branchCode', '==', targetBranch.branchCode),
				where('status', '==', 'available')
			);

			const seatsSnapshot = await getDocs(seatsQuery);

			if (seatsSnapshot.empty) {
				console.log(`支店コード「${targetBranch.branchCode}」の座席データが見つかりません。座席データを初期化してください。`);
				setSeats([]);  // 空の配列を設定
			} else {
				// Firestoreから取得した座席データを処理
				const seatsData: SeatDocument[] = [];
				seatsSnapshot.forEach((doc) => {
					seatsData.push({
						seatId: doc.id,
						...doc.data()
					} as SeatDocument);
				});

				console.log(`${seatsData.length}件の座席データを取得しました`);
				setSeats(seatsData);
			}
		} catch (err) {
			console.error('Error fetching seats:', err);
			setError('座席情報の取得に失敗しました。もう一度お試しください。');
			setSeats([]); // エラー時は空の配列を設定
		} finally {
			setIsLoading(false);
		}
	}, [branches, selectedBranch]);

	// 予約情報を取得 - useCallbackでメモ化
	const fetchReservations = useCallback(async (date?: Date, branchId?: string): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			const targetDate = date || selectedDate;
			const targetBranchId = branchId || selectedBranch?.branchId;

			if (!targetDate || !targetBranchId) {
				return;
			}

			const dateStr = targetDate.toISOString().split('T')[0];
			const branchCode = branches.find(b => b.branchId === targetBranchId)?.branchCode || 'UNKNOWN';

			// This will be replaced by an actual API call later
			// For now, we'll use mock data
			const mockReservations: ReservationDocument[] = [
				{
					id: `res-${branchCode}-001`,
					userId: 'user1',
					seatId: `${branchCode}-01`,
					seatName: `Gaming PC #1 (High-Spec)`,
					date: dateStr,
					startTime: '14:00',
					endTime: '16:00',
					duration: 120,
					status: 'confirmed',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					id: `res-${branchCode}-002`,
					userId: 'user2',
					seatId: `${branchCode}-02`,
					seatName: `Gaming PC #2 (High-Spec)`,
					date: dateStr,
					startTime: '18:00',
					endTime: '20:00',
					duration: 120,
					status: 'confirmed',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			];

			setReservations(mockReservations);
			updateDateAvailability(targetBranchId);
		} catch (err) {
			console.error('Error fetching reservations:', err);
			setError('予約情報の取得に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	}, [branches, selectedBranch, selectedDate]);

	// 日付ごとの空き状況を更新 - useCallbackでメモ化
	const updateDateAvailability = useCallback((branchId?: string) => {
		const availability: DateAvailability = {};
		const targetBranchId = branchId || selectedBranch?.branchId;

		if (!targetBranchId) return;

		// 支店によって空き状況のパターンを変える
		const availabilityPattern = targetBranchId === 'tachikawa' ? 0.3 :
			targetBranchId === 'shinjuku' ? 0.2 :
				targetBranchId === 'akihabara' ? 0.4 : 0.3;

		// Get the current date
		const now = new Date();

		// Generate availability data for the next 30 days
		for (let i = 0; i < 30; i++) {
			const date = new Date(now);
			date.setDate(now.getDate() + i);
			const dateStr = date.toISOString().split('T')[0];

			// 支店ごとに異なる空き状況のパターンを生成
			const rand = Math.random();
			if (rand < availabilityPattern) {
				availability[dateStr] = 'booked';
			} else if (rand < availabilityPattern * 2) {
				availability[dateStr] = 'limited';
			} else {
				availability[dateStr] = 'available';
			}
		}

		setDateAvailability(availability);
	}, [selectedBranch]);

	// 予約を作成 - useCallbackでメモ化（複数予約対応＋Firebase書き込み）
	const createReservation = useCallback(async (reservationsData: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			if (!user) {
				throw new Error('予約するにはログインが必要です');
			}

			if (!selectedBranch) {
				throw new Error('支店が選択されていません');
			}

			if (reservationsData.length === 0) {
				throw new Error('予約データがありません');
			}

			// Firestoreに書き込むデータを準備
			const reservationsCollection = collection(db, 'reservations');
			const now = new Date().toISOString();
			const batch = writeBatch(db);

			// 各予約データをバッチ処理で追加
			for (const reservationData of reservationsData) {
				const reservationDocRef = doc(reservationsCollection);
				const completeReservationData = {
					...reservationData,
					userId: user.uid,
					userEmail: user.email || '',
					branchId: selectedBranch.branchId,
					branchName: selectedBranch.branchName,
					createdAt: now,
					updatedAt: now
				};

				batch.set(reservationDocRef, completeReservationData);
			}

			// バッチ処理を実行（全ての予約を一度にコミット）
			await batch.commit();
			console.log(`${reservationsData.length}件の予約をFirestoreに保存しました`);

			setIsLoading(false);
			clearSelectedTimeSlots(); // すべての選択をクリア
			fetchReservations();
		} catch (err) {
			console.error('Error creating reservations:', err);
			setError('予約の作成に失敗しました。もう一度お試しください。');
			setIsLoading(false);
		}
	}, [fetchReservations, selectedBranch, user, clearSelectedTimeSlots]);

	// 予約をキャンセル - useCallbackでメモ化
	const cancelReservation = useCallback(async (reservationId: string): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			if (!user) {
				throw new Error('予約をキャンセルするにはログインが必要です');
			}

			// API呼び出しをシミュレート
			console.log('Cancelling reservation:', reservationId);

			// 成功をシミュレート
			setTimeout(() => {
				setIsLoading(false);
				fetchReservations();
			}, 1000);
		} catch (err) {
			console.error('Error cancelling reservation:', err);
			setError('予約のキャンセルに失敗しました。もう一度お試しください。');
			setIsLoading(false);
		}
	}, [fetchReservations, user]);

	// 初期化時に支店一覧を取得 - 依存配列を修正
	useEffect(() => {
		fetchBranches();
	}, [fetchBranches]); // useCallbackでメモ化したので依存配列にfetchBranchesを含めても問題ない

	// 支店が選択されたら座席一覧を取得
	useEffect(() => {
		if (selectedBranch) {
			fetchSeats(selectedBranch.branchId);
			updateDateAvailability(selectedBranch.branchId);
			// 支店が変わったら選択済みの座席をクリア
			clearSelectedTimeSlots();
		}
	}, [selectedBranch, fetchSeats, updateDateAvailability, clearSelectedTimeSlots]);

	// 日付が選択された時に予約情報を取得
	useEffect(() => {
		if (selectedDate && selectedBranch) {
			fetchReservations(selectedDate, selectedBranch.branchId);
			// 日付が変わったら選択済みの座席をクリア
			clearSelectedTimeSlots();
		}
	}, [selectedDate, selectedBranch, fetchReservations, clearSelectedTimeSlots]);

	const value = {
		branches,
		selectedBranch,
		setSelectedBranch,
		fetchBranches,
		seats,
		reservations,
		selectedDate,
		setSelectedDate,
		selectedTimeSlots,
		setSelectedTimeSlots,
		addSelectedTimeSlot,
		removeSelectedTimeSlot,
		clearSelectedTimeSlots,
		dateAvailability,
		fetchSeats,
		fetchReservations,
		createReservation,
		cancelReservation,
		isLoading,
		error
	};

	return (
		<ReservationContext.Provider value={value}>
			{children}
		</ReservationContext.Provider>
	);
};

// Custom hook for using the reservation context
export const useReservation = (): ReservationContextType => {
	const context = useContext(ReservationContext);
	if (context === undefined) {
		throw new Error('useReservation must be used within a ReservationProvider');
	}
	return context;
};

export default ReservationContext;-e 
### FILE: ./src/context/auth-context.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
	User,
	GoogleAuthProvider,
	signInWithPopup,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
	sendPasswordResetEmail,
	signOut as firebaseSignOut,
	onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

// コンテキストの型定義
interface AuthContextType {
	user: User | null;
	userData: any | null;
	loading: boolean;
	signInWithGoogle: () => Promise<void>;
	signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	createUserWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
	error: string | null;
	clearError: () => void;
}

// デフォルト値
const defaultContextValue: AuthContextType = {
	user: null,
	userData: null,
	loading: true,
	signInWithGoogle: async () => { },
	signInWithEmailAndPassword: async () => { },
	createUserWithEmailAndPassword: async () => { },
	resetPassword: async () => { },
	signOut: async () => { },
	error: null,
	clearError: () => { }
};

// コンテキスト作成
const AuthContext = createContext<AuthContextType>(defaultContextValue);

// コンテキストプロバイダーコンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [userData, setUserData] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// エラーをクリア
	const clearError = () => setError(null);

	// ユーザーの認証状態を監視
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			setUser(user);

			if (user) {
				try {
					// Firestoreからユーザーデータを取得
					const userDocRef = doc(db, 'users', user.uid);
					const userDoc = await getDoc(userDocRef);

					if (userDoc.exists()) {
						// 既存ユーザー - 最終ログイン時間を更新
						const userData = userDoc.data();
						await setDoc(userDocRef, {
							...userData,
							lastLogin: serverTimestamp()
						}, { merge: true });
						setUserData(userData);
					} else {
						// 新規ユーザー
						const newUserData = {
							uid: user.uid,
							email: user.email,
							displayName: user.displayName,
							photoURL: user.photoURL,
							createdAt: serverTimestamp(),
							lastLogin: serverTimestamp(),
							registrationCompleted: false,
							registrationStep: 0,
							eKYC: {
								status: 'pending'
							}
						};

						await setDoc(userDocRef, newUserData);
						setUserData(newUserData);
					}
				} catch (err) {
					console.error('Error fetching user data:', err);
					setError('ユーザーデータの取得中にエラーが発生しました。');
				}
			} else {
				setUserData(null);
			}

			setLoading(false);
		});

		// クリーンアップ関数
		return () => unsubscribe();
	}, []);

	// Google認証でサインイン
	const signInWithGoogle = async () => {
		try {
			setError(null);
			await signInWithPopup(auth, googleProvider);
		} catch (err: any) {
			console.error('Google sign in error:', err);
			setError('Googleログイン中にエラーが発生しました。もう一度お試しください。');
			throw err;
		}
	};

	// メールパスワードでサインイン
	const signInWithEmailAndPassword = async (email: string, password: string) => {
		try {
			setError(null);
			await firebaseSignInWithEmailAndPassword(auth, email, password);
		} catch (err: any) {
			console.error('Email/password sign in error:', err);

			// エラーメッセージをユーザーフレンドリーに変換
			if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
				setError('メールアドレスまたはパスワードが正しくありません。');
			} else if (err.code === 'auth/too-many-requests') {
				setError('ログイン試行回数が多すぎます。しばらく経ってから再度お試しください。');
			} else {
				setError('ログイン中にエラーが発生しました。もう一度お試しください。');
			}

			throw err;
		}
	};

	// メールパスワードで新規ユーザー作成
	const createUserWithEmailAndPassword = async (email: string, password: string) => {
		try {
			setError(null);
			await createUserWithEmailAndPassword(auth, email, password);
		} catch (err: any) {
			console.error('Create user error:', err);

			// エラーメッセージをユーザーフレンドリーに変換
			if (err.code === 'auth/email-already-in-use') {
				setError('このメールアドレスは既に使用されています。');
			} else if (err.code === 'auth/weak-password') {
				setError('パスワードは6文字以上の強力なものを設定してください。');
			} else {
				setError('アカウント作成中にエラーが発生しました。もう一度お試しください。');
			}

			throw err;
		}
	};

	// パスワードリセットメール送信
	const resetPassword = async (email: string) => {
		try {
			setError(null);
			await sendPasswordResetEmail(auth, email);
		} catch (err: any) {
			console.error('Password reset error:', err);

			if (err.code === 'auth/user-not-found') {
				setError('このメールアドレスに登録されているアカウントが見つかりません。');
			} else {
				setError('パスワードリセットメールの送信中にエラーが発生しました。');
			}

			throw err;
		}
	};

	// サインアウト
	const signOut = async () => {
		try {
			await firebaseSignOut(auth);
		} catch (err) {
			console.error('Sign out error:', err);
			setError('ログアウト中にエラーが発生しました。');
			throw err;
		}
	};

	const value = {
		user,
		userData,
		loading,
		signInWithGoogle,
		signInWithEmailAndPassword,
		createUserWithEmailAndPassword,
		resetPassword,
		signOut,
		error,
		clearError
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// カスタムフック
export const useAuth = () => useContext(AuthContext);-e 
### FILE: ./src/context/registration-context.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VeriffSession, VeriffStatus } from '@/types';

interface UseVeriffReturn {
	status: VeriffStatus;
	sessionId: string | null;
	isLoading: boolean;
	error: string | null;
	startVerification: () => Promise<void>;
	simulateVerification: () => Promise<void>; // 開発用
}

/**
 * Veriff統合のためのカスタムフック
 */
export function useVeriff(): UseVeriffReturn {
	const { user } = useAuth();
	const [status, setStatus] = useState<VeriffStatus>('pending');
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ユーザーのVeriff状態を読み込む
	useEffect(() => {
		const loadVeriffStatus = async () => {
			if (!user) return;

			try {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists() && userDoc.data().eKYC) {
					const eKYC = userDoc.data().eKYC;
					setStatus(eKYC.status || 'pending');
					if (eKYC.sessionId) {
						setSessionId(eKYC.sessionId);
					}
				}
			} catch (err) {
				console.error('Error loading verification status:', err);
				setError('検証状態の取得中にエラーが発生しました。');
			}
		};

		loadVeriffStatus();
	}, [user]);

	// Veriffセッションを開始する
	const startVerification = async () => {
		if (!user || !user.uid) {
			setError('ユーザー情報が取得できません。ログインし直してください。');
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// Firebase IDトークンを取得
			const idToken = await user.getIdToken();

			// APIを呼び出してセッションを作成
			const response = await fetch('/api/veriff/create-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				}
			});

			if (!response.ok) {
				throw new Error('セッション作成に失敗しました');
			}

			const data = await response.json();

			// すでに検証が完了している場合
			if (data.status === 'completed') {
				setStatus('completed');
				setIsLoading(false);
				return;
			}

			// セッションIDを保存
			setSessionId(data.sessionId);

			// Veriffのページにリダイレクト
			window.location.href = data.sessionUrl;

		} catch (err) {
			console.error('Error starting verification:', err);
			setError('検証の開始中にエラーが発生しました。後でもう一度お試しください。');
			setIsLoading(false);
		}
	};

	// 開発用: 検証完了をシミュレート
	const simulateVerification = async () => {
		if (!user) return;

		setIsLoading(true);
		setError(null);

		try {
			// モックセッションID
			const mockSessionId = `mock-session-${Date.now()}`;
			setSessionId(mockSessionId);

			// 検証完了をシミュレート
			setTimeout(async () => {
				setStatus('completed');

				// Firestoreを更新
				await setDoc(doc(db, 'users', user.uid), {
					eKYC: {
						sessionId: mockSessionId,
						status: 'completed',
						verifiedAt: new Date().toISOString()
					},
					registrationStep: 0  // eKYCステップ完了
				}, { merge: true });

				setIsLoading(false);
			}, 2000);
		} catch (err) {
			console.error('Error in mock verification:', err);
			setError('検証のシミュレーション中にエラーが発生しました。');
			setIsLoading(false);
		}
	};

	return {
		status,
		sessionId,
		isLoading,
		error,
		startVerification,
		simulateVerification
	};
}-e 
### FILE: ./tailwind.config.js

//tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				// LP用カラーパレット
				background: '#1f1c1a',      // 深めブラウン
				foreground: '#fefefe',      // 優しい白
				accent: '#fb923c',          // orange-400（椅子とマッチ）
				highlight: '#16a34a',       // emerald-600（安心感）
				border: '#3f3f46',          // neutral-700（境界）
			},
			fontFamily: {
				sans: ['Noto Sans JP', 'sans-serif'],
			},
			borderRadius: {
				'2xl': '1rem',
				'3xl': '1.5rem',
			},
			boxShadow: {
				soft: '0 4px 14px 0 rgba(0, 0, 0, 0.1)',
			},
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
	],
}-e 
### FILE: ./postcss.config.js

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
-e 
### FILE: ./next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		domains: [
			'lh3.googleusercontent.com', // Google プロフィール画像用
			'firebasestorage.googleapis.com', // Firebase Storage 用（後で必要になる場合）
			'd1abhb48aypmuo.cloudfront.net'
		],
	},
}

module.exports = nextConfig-e 
### FILE: ./next-env.d.ts

/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
