// src/context/reservation-context.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { SeatDocument, ReservationDocument, BranchDocument } from '@/types/firebase';
import { collection, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// 予約コンテキスト用の追加型
interface SelectedTimeSlots {
	seatId: string;
	startTime: string;
	endTime: string;
}

interface DateAvailability {
	[date: string]: 'available' | 'limited' | 'booked' | 'unknown';
}

interface ReservationContextType {
	branches: BranchDocument[];
	selectedBranch: BranchDocument | null;
	setSelectedBranch: (branch: BranchDocument | null) => void;
	fetchBranches: () => Promise<void>;
	seats: SeatDocument[];
	reservations: ReservationDocument[];
	selectedDate: Date | null;
	setSelectedDate: (date: Date | null) => void;
	selectedTimeSlots: SelectedTimeSlots;
	setSelectedTimeSlots: (slots: SelectedTimeSlots) => void;
	dateAvailability: DateAvailability;
	fetchSeats: (branchId?: string) => Promise<void>;
	fetchReservations: (date?: Date, branchId?: string) => Promise<void>;
	createReservation: (reservation: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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
	const [selectedTimeSlots, setSelectedTimeSlots] = useState<SelectedTimeSlots>({
		seatId: '',
		startTime: '',
		endTime: ''
	});
	const [dateAvailability, setDateAvailability] = useState<DateAvailability>({});
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [fetchCount, setFetchCount] = useState<number>(0); // APIコール回数を追跡

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

			// 支店別の座席情報を模擬的に生成
			const mockSeats: SeatDocument[] = [];
			const branchCode = branches.find(b => b.branchId === targetBranchId)?.branchCode || 'UNKNOWN';

			// 支店によって座席数を変える
			const seatCount = targetBranchId === 'tachikawa' ? 12 :
				targetBranchId === 'shinjuku' ? 20 :
					targetBranchId === 'akihabara' ? 16 : 10;

			for (let i = 1; i <= seatCount; i++) {
				const isHighSpec = i <= Math.ceil(seatCount / 2); // 半分は高スペックPCとする
				mockSeats.push({
					seatId: `${branchCode}-PC-${i.toString().padStart(2, '0')}`,
					name: `Gaming PC #${i}${isHighSpec ? ' (High-Spec)' : ''}`,
					ipAddress: `192.168.${targetBranchId === 'tachikawa' ? '1' : targetBranchId === 'shinjuku' ? '2' : '3'}.${i.toString().padStart(3, '0')}`,
					ratePerMinute: isHighSpec ? 12 : 8, // 高スペックPCは料金が高い
					status: 'available',
					branchCode: branchCode,
					branchName: branches.find(b => b.branchId === targetBranchId)?.branchName || 'Unknown',
					seatType: 'PC',
					seatNumber: i,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				});
			}

			setSeats(mockSeats);
		} catch (err) {
			console.error('Error fetching seats:', err);
			setError('座席情報の取得に失敗しました。もう一度お試しください。');
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
					seatId: `${branchCode}-PC-01`,
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
					seatId: `${branchCode}-PC-02`,
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

	// 予約を作成 - useCallbackでメモ化
	const createReservation = useCallback(async (reservation: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			if (!user) {
				throw new Error('予約するにはログインが必要です');
			}

			if (!selectedBranch) {
				throw new Error('支店が選択されていません');
			}

			// API呼び出しをシミュレート
			console.log('Creating reservation:', {
				...reservation,
				userId: user.uid,
				branchId: selectedBranch.branchId,
				branchName: selectedBranch.branchName
			});

			// 成功をシミュレート
			setTimeout(() => {
				setIsLoading(false);
				setSelectedTimeSlots({
					seatId: '',
					startTime: '',
					endTime: ''
				});
				fetchReservations();
			}, 1000);
		} catch (err) {
			console.error('Error creating reservation:', err);
			setError('予約の作成に失敗しました。もう一度お試しください。');
			setIsLoading(false);
		}
	}, [fetchReservations, selectedBranch, user]);

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
		}
	}, [selectedBranch, fetchSeats, updateDateAvailability]);

	// 日付が選択された時に予約情報を取得
	useEffect(() => {
		if (selectedDate && selectedBranch) {
			fetchReservations(selectedDate, selectedBranch.branchId);
		}
	}, [selectedDate, selectedBranch, fetchReservations]);

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