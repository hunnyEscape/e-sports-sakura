-e 
### FILE: ./src/types/firebase.ts

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
	createdAt: Timestamp | string;
	lastLogin: Timestamp | string;
	registrationCompleted: boolean;
	registrationCompletedAt?: string;
	registrationStep?: number;
	stripe?: {
		customerId?: string;
		paymentMethodId?: string;
		cardFingerprint?: string; // 追加: カードの一意識別子
		last4?: string;           // オプション: 下4桁（表示用）
		brand?: string;           // オプション: カードブランド（表示用）
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
							registrationStep: 1,
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
import Link from 'next/link';
import Image from 'next/image';
import LoadingSpinner from '@/components/ui/loading-spinner';
enum ReservationStep {
	SELECT_BRANCH,
	SELECT_DATE,
	SELECT_TIME,
	CONFIRM
}

const ReservationPageContent: React.FC = () => {
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const router = useRouter();
	const { user, loading, signOut } = useAuth();
	const { setSelectedBranch, selectedTimeSlots, clearSelectedTimeSlots } = useReservation();

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
		<div className="min-h-screen bg-background px-4">
			<header className="relative bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10 mb-10">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between h-16">
						<Link href="/lp" className="flex items-center">
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
			userEmail: user.email||'',
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
		if (reservation.id !== user.uid) {
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
				status: 'confirmed' as const,
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
										単価: ¥{Math.round(detail?.seat.ratePerHour||400 / 60)}円/分 × {detail?.duration}分
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
					<div className="mt-2 space-y-1 text-sm text-foreground/70">
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
		//}, [seatRanges, selectedSeatIds, setSelectedTimeSlots, filteredSeats]);
	}, [seatRanges,selectedSeatIds,setSelectedTimeSlots]);

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
		<section className="py-20 bg-background/70">
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

export default ReservationContext;