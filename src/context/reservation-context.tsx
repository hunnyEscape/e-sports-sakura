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