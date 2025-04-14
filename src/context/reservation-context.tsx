// src/context/reservation-context.tsx
"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { SeatDocument, ReservationDocument, BranchDocument } from '@/types/firebase';
import {
	collection,
	doc,
	getDocs,
	query,
	where,
	writeBatch,
	Timestamp,
	addDoc,
	deleteDoc,
	updateDoc
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

	// 新しく追加するプロパティとメソッド
	timeSlotAvailability: Record<string, Record<string, boolean>>;
	updateDateAvailability: (branchId?: string, forceRefresh?: boolean) => Promise<void>;
	updateAvailabilityForMonth: (date: Date, branchId?: string) => Promise<void>;
	getTimeSlotAvailability: (date: Date, seatId: string) => Promise<Record<string, boolean>>;
	fetchAllSeatsTimeSlotAvailability: (date: Date, branchId?: string) => Promise<Record<string, Record<string, boolean>>>;
	checkReservationOverlap: (newReservation: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
	refreshReservationData: () => Promise<void>;
}

// Create the context
const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

// Provider component
export const ReservationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { user } = useAuth();

	// 基本状態変数
	const [branches, setBranches] = useState<BranchDocument[]>([]);
	const [selectedBranch, setSelectedBranch] = useState<BranchDocument | null>(null);
	const [seats, setSeats] = useState<SeatDocument[]>([]);
	const [reservations, setReservations] = useState<ReservationDocument[]>([]);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTimeSlots, setSelectedTimeSlots] = useState<SelectedTimeSlotsItem[]>([]);
	const [dateAvailability, setDateAvailability] = useState<DateAvailability>({});
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [fetchCount, setFetchCount] = useState<number>(0); // APIコール回数を追跡

	// 新しい状態変数
	const [timeSlotAvailability, setTimeSlotAvailability] = useState<Record<string, Record<string, boolean>>>({});
	const [availabilityCache, setAvailabilityCache] = useState<Record<string, DateAvailability>>({});
	const [lastFetchTime, setLastFetchTime] = useState<Record<string, number>>({});

	// ヘルパー関数

	// キャッシュのキーを生成するヘルパー関数
	const generateCacheKey = (branchId: string, yearMonth: string): string => {
		return `${branchId}-${yearMonth}`;
	};

	// 指定した日付が現在のキャッシュ期間内かチェックするヘルパー関数
	const isDateInCachePeriod = (date: Date, cacheKey: string): boolean => {
		if (!availabilityCache[cacheKey]) return false;

		const [branchId, yearMonth] = cacheKey.split('-');
		const [year, month] = yearMonth.split('-').map(Number);

		const startOfMonth = new Date(year, month - 1, 1);
		const endOfMonth = new Date(year, month, 0);

		return date >= startOfMonth && date <= endOfMonth;
	};

	// キャッシュの有効期限をチェックするヘルパー関数（例: 5分間有効）
	const isCacheValid = (cacheKey: string): boolean => {
		const now = Date.now();
		const lastFetch = lastFetchTime[cacheKey] || 0;

		// 5分（300,000ミリ秒）以内のキャッシュは有効とみなす
		return now - lastFetch < 300000;
	};

	// 日付文字列をYYYY-MM-DD形式に変換するヘルパー関数
	const formatDateToString = (date: Date): string => {
		return date.toISOString().split('T')[0];
	};

	// 時刻文字列を分単位に変換するヘルパー関数
	const timeStringToMinutes = (timeStr: string): number => {
		const [hours, minutes] = timeStr.split(':').map(Number);
		return hours * 60 + minutes;
	};

	// 分単位を時刻文字列に変換するヘルパー関数
	const minutesToTimeString = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
	};

	// 座席選択関連の関数

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

	// データ取得関連の関数

	// 支店一覧を取得
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

	// 座席情報を取得
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
			// 条件を変更: available だけでなく in-use 状態の座席も取得する
			// maintenance 状態の座席は除外する
			const seatsQuery = query(
				collection(db, 'seats'),
				where('branchCode', '==', targetBranch.branchCode),
				where('status', 'in', ['available', 'in-use']) // 修正: in-use も含める
			);

			const seatsSnapshot = await getDocs(seatsQuery);

			if (seatsSnapshot.empty) {
				console.log(`支店コード「${targetBranch.branchCode}」の座席データが見つかりません。座席データを初期化してください。`);
				setSeats([]);  // 空の配列を設定
			} else {
				// Firestoreから取得した座席データを処理
				const seatsData: SeatDocument[] = [];
				seatsSnapshot.forEach((doc) => {
					const seatData = doc.data();
					// デバッグ用にログ出力
					console.log(`座席ID: ${doc.id}, 名前: ${seatData.name}, ステータス: ${seatData.status}`);

					seatsData.push({
						seatId: doc.id,
						...seatData
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

	// 予約情報を取得（Firestoreからの実データ取得を追加）
	const fetchReservations = useCallback(async (date?: Date, branchId?: string): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			const targetDate = date || selectedDate;
			const targetBranchId = branchId || selectedBranch?.branchId;

			if (!targetDate || !targetBranchId) {
				setIsLoading(false);
				return;
			}

			const dateStr = formatDateToString(targetDate);

			// 支店情報を取得
			const targetBranch = branches.find(b => b.branchId === targetBranchId);
			if (!targetBranch) {
				throw new Error('支店情報が見つかりません');
			}

			// Firestoreから実データを取得
			const reservationsQuery = query(
				collection(db, 'reservations'),
				where('branchId', '==', targetBranchId),
				where('date', '==', dateStr),
				where('status', '==', 'confirmed')
			);

			const reservationsSnapshot = await getDocs(reservationsQuery);

			if (reservationsSnapshot.empty) {
				// 予約データがない場合は空配列を設定
				setReservations([]);
			} else {
				// 予約データを処理
				const reservationsData: ReservationDocument[] = [];
				reservationsSnapshot.forEach((doc) => {
					reservationsData.push({
						id: doc.id,
						...doc.data()
					} as ReservationDocument);
				});

				setReservations(reservationsData);
			}
		} catch (err) {
			console.error('Error fetching reservations:', err);
			setError('予約情報の取得に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	}, [branches, selectedBranch, selectedDate]);

	// 予約を作成
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

			// 予約の重複チェック
			for (const reservation of reservationsData) {
				const hasOverlap = await checkReservationOverlap(reservation);
				if (hasOverlap) {
					throw new Error(`座席「${reservation.seatName}」の時間帯「${reservation.startTime}〜${reservation.endTime}」は既に予約されています`);
				}
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

			// 予約データを更新
			await refreshReservationData();

			// 選択をクリア
			clearSelectedTimeSlots();
		} catch (err) {
			console.error('Error creating reservations:', err);
			setError(err instanceof Error ? err.message : '予約の作成に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	}, [user, selectedBranch, clearSelectedTimeSlots]);

	// 予約をキャンセル
	const cancelReservation = useCallback(async (reservationId: string): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			if (!user) {
				throw new Error('予約をキャンセルするにはログインが必要です');
			}

			// 予約ドキュメントの参照を取得
			const reservationRef = doc(db, 'reservations', reservationId);

			// ステータスを 'cancelled' に更新
			await updateDoc(reservationRef, {
				status: 'cancelled',
				updatedAt: new Date().toISOString()
			});

			console.log(`予約 ${reservationId} をキャンセルしました`);

			// 予約データを更新
			await refreshReservationData();
		} catch (err) {
			console.error('Error cancelling reservation:', err);
			setError('予約のキャンセルに失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	}, [user]);

	// 日付ごとの空き状況を更新（Firestoreデータを使用）
	const updateDateAvailability = useCallback(async (branchId?: string, forceRefresh = false) => {
		setIsLoading(true);
		setError(null);

		try {
			const targetBranchId = branchId || selectedBranch?.branchId;

			if (!targetBranchId) {
				setIsLoading(false);
				return;
			}

			// 現在の年月をキーとして使用
			const now = new Date();
			const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
			const cacheKey = generateCacheKey(targetBranchId, yearMonth);

			// キャッシュがあり、強制更新でなければキャッシュを使用
			if (!forceRefresh && isCacheValid(cacheKey) && availabilityCache[cacheKey]) {
				setDateAvailability(availabilityCache[cacheKey]);
				setIsLoading(false);
				return;
			}

			// 支店情報を取得
			const targetBranch = branches.find(b => b.branchId === targetBranchId);
			if (!targetBranch) {
				throw new Error('支店情報が見つかりません');
			}

			// 座席情報取得
			const seatsQuery = query(
				collection(db, 'seats'),
				where('branchCode', '==', targetBranch.branchCode),
				where('status', '==', 'available')
			);

			const seatsSnapshot = await getDocs(seatsQuery);
			const totalSeats = seatsSnapshot.size;

			if (totalSeats === 0) {
				throw new Error('利用可能な座席がありません');
			}

			// 日付範囲の計算
			const startDate = new Date(now);
			startDate.setHours(0, 0, 0, 0);

			const endDate = new Date(startDate);
			endDate.setDate(startDate.getDate() + 30);

			const startDateStr = formatDateToString(startDate);
			const endDateStr = formatDateToString(endDate);

			// 日付範囲の予約をまとめて取得
			const reservationsQuery = query(
				collection(db, 'reservations'),
				where('branchId', '==', targetBranchId),
				where('date', '>=', startDateStr),
				where('date', '<=', endDateStr),
				where('status', '==', 'confirmed')
			);

			const reservationsSnapshot = await getDocs(reservationsQuery);

			// 日付ごとに予約をカウント
			const reservationCountByDate: Record<string, { total: number, uniqueSeats: Set<string> }> = {};

			// 初期化
			for (let i = 0; i < 30; i++) {
				const date = new Date(startDate);
				date.setDate(startDate.getDate() + i);
				const dateStr = formatDateToString(date);
				reservationCountByDate[dateStr] = { total: 0, uniqueSeats: new Set() };
			}

			// 予約を日付ごとに集計
			reservationsSnapshot.forEach(doc => {
				const reservation = doc.data() as ReservationDocument;
				if (reservationCountByDate[reservation.date]) {
					reservationCountByDate[reservation.date].total++;
					reservationCountByDate[reservation.date].uniqueSeats.add(reservation.seatId);
				}
			});

			// 空き状況を計算
			const availability: DateAvailability = {};

			for (const dateStr in reservationCountByDate) {
				const uniqueSeatsBooked = reservationCountByDate[dateStr].uniqueSeats.size;

				// 閾値の設定（調整可能）
				if (uniqueSeatsBooked >= totalSeats * 0.9) {
					availability[dateStr] = 'booked';      // 90%以上予約済み: 満席
				} else if (uniqueSeatsBooked >= totalSeats * 0.6) {
					availability[dateStr] = 'limited';     // 60%以上予約済み: 残りわずか
				} else {
					availability[dateStr] = 'available';   // それ以外: 予約可能
				}
			}

			// キャッシュを更新
			setAvailabilityCache(prev => ({
				...prev,
				[cacheKey]: availability
			}));

			// 最終取得時刻を更新
			setLastFetchTime(prev => ({
				...prev,
				[cacheKey]: Date.now()
			}));

			// 状態を更新
			setDateAvailability(availability);
		} catch (err) {
			console.error('Error updating date availability:', err);
			setError('空き状況の更新に失敗しました');
		} finally {
			setIsLoading(false);
		}
	}, [branches, selectedBranch, availabilityCache, lastFetchTime]);

	// 表示月に基づいて日付範囲の予約状況を更新する関数
	const updateAvailabilityForMonth = useCallback(async (date: Date, branchId?: string) => {
		setIsLoading(true);

		try {
			const targetBranchId = branchId || selectedBranch?.branchId;
			if (!targetBranchId) {
				setIsLoading(false);
				return;
			}

			const year = date.getFullYear();
			const month = date.getMonth() + 1;
			const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
			const cacheKey = generateCacheKey(targetBranchId, yearMonth);

			// キャッシュが有効なら使用
			if (isCacheValid(cacheKey) && availabilityCache[cacheKey]) {
				setDateAvailability(availabilityCache[cacheKey]);
				setIsLoading(false);
				return;
			}

			// 月の最初と最後の日を計算
			const startOfMonth = new Date(year, month - 1, 1);
			const endOfMonth = new Date(year, month, 0);

			// 支店情報を取得
			const targetBranch = branches.find(b => b.branchId === targetBranchId);
			if (!targetBranch) {
				throw new Error('支店情報が見つかりません');
			}

			// 座席情報取得
			const seatsQuery = query(
				collection(db, 'seats'),
				where('branchCode', '==', targetBranch.branchCode),
				where('status', '==', 'available')
			);

			const seatsSnapshot = await getDocs(seatsQuery);
			const totalSeats = seatsSnapshot.size;

			if (totalSeats === 0) {
				throw new Error('利用可能な座席がありません');
			}

			// 日付範囲文字列
			const startDateStr = formatDateToString(startOfMonth);
			const endDateStr = formatDateToString(endOfMonth);

			// 予約データ取得
			const reservationsQuery = query(
				collection(db, 'reservations'),
				where('branchId', '==', targetBranchId),
				where('date', '>=', startDateStr),
				where('date', '<=', endDateStr),
				where('status', '==', 'confirmed')
			);

			const reservationsSnapshot = await getDocs(reservationsQuery);

			// 集計用マップの初期化
			const reservationCountByDate: Record<string, { total: number, uniqueSeats: Set<string> }> = {};

			// 月内の全日付を初期化
			for (let i = 1; i <= endOfMonth.getDate(); i++) {
				const date = new Date(year, month - 1, i);
				const dateStr = formatDateToString(date);
				reservationCountByDate[dateStr] = { total: 0, uniqueSeats: new Set() };
			}

			// 予約を集計
			reservationsSnapshot.forEach(doc => {
				const reservation = doc.data() as ReservationDocument;
				if (reservationCountByDate[reservation.date]) {
					reservationCountByDate[reservation.date].total++;
					reservationCountByDate[reservation.date].uniqueSeats.add(reservation.seatId);
				}
			});

			// 空き状況を計算
			const availability: DateAvailability = {};

			for (const dateStr in reservationCountByDate) {
				const uniqueSeatsBooked = reservationCountByDate[dateStr].uniqueSeats.size;

				if (uniqueSeatsBooked >= totalSeats * 0.9) {
					availability[dateStr] = 'booked';
				} else if (uniqueSeatsBooked >= totalSeats * 0.6) {
					availability[dateStr] = 'limited';
				} else {
					availability[dateStr] = 'available';
				}
			}

			// キャッシュを更新
			setAvailabilityCache(prev => ({
				...prev,
				[cacheKey]: availability
			}));

			// 最終取得時刻を更新
			setLastFetchTime(prev => ({
				...prev,
				[cacheKey]: Date.now()
			}));

			// 状態を更新
			setDateAvailability(availability);
		} catch (err) {
			console.error('Error updating month availability:', err);
			setError('月間予約状況の取得に失敗しました');
		} finally {
			setIsLoading(false);
		}
	}, [branches, selectedBranch, availabilityCache, lastFetchTime]);

	// 特定の日付と座席IDに対する時間枠の予約状況を取得する関数
	const getTimeSlotAvailability = useCallback(async (
		date: Date,
		seatId: string
	): Promise<Record<string, boolean>> => {
		const result: Record<string, boolean> = {};

		if (!date || !seatId) return result;

		try {
			const dateStr = formatDateToString(date);

			// 座席情報の取得
			const seat = seats.find(s => s.seatId === seatId);
			if (!seat) {
				throw new Error('座席情報が見つかりません');
			}

			// 支店情報の取得
			const branch = branches.find(b => b.branchCode === seat.branchCode);
			if (!branch) {
				throw new Error('支店情報が見つかりません');
			}

			// 営業時間の取得（デフォルト値も設定）
			const openTime = branch.businessHours?.open || '10:00';
			const closeTime = branch.businessHours?.close || '22:00';

			// 営業時間を分単位に変換
			const openMinutes = timeStringToMinutes(openTime);
			const closeMinutes = timeStringToMinutes(closeTime);

			// 30分単位で時間枠を生成（デフォルトですべて利用可能と設定）
			for (let minutes = openMinutes; minutes < closeMinutes; minutes += 30) {
				const timeSlot = minutesToTimeString(minutes);
				result[timeSlot] = true; // true = 予約可能
			}

			// 座席の特定の日付の予約を取得
			const reservationsQuery = query(
				collection(db, 'reservations'),
				where('seatId', '==', seatId),
				where('date', '==', dateStr),
				where('status', '==', 'confirmed')
			);

			const reservationsSnapshot = await getDocs(reservationsQuery);

			// 予約済み時間枠を処理
			reservationsSnapshot.forEach(doc => {
				const reservation = doc.data() as ReservationDocument;
				const startMinutes = timeStringToMinutes(reservation.startTime);
				const endMinutes = timeStringToMinutes(reservation.endTime);

				// 予約時間内の各時間枠を予約済みとしてマーク（続き）
				for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
					// 営業時間内の時間枠のみを処理
					if (minutes >= openMinutes && minutes < closeMinutes) {
						const timeSlot = minutesToTimeString(minutes);
						result[timeSlot] = false; // false = 予約済み
					}
				}
			});

			return result;
		} catch (err) {
			console.error('Error getting time slot availability:', err);
			setError('時間枠の予約状況取得に失敗しました');
			return result;
		}
	}, [branches, seats]);

	// 特定の日付の全座席の時間枠予約状況を一括取得する関数
	const fetchAllSeatsTimeSlotAvailability = useCallback(async (
		date: Date,
		branchId?: string
	): Promise<Record<string, Record<string, boolean>>> => {
		if (!date) return {};

		try {
			const targetBranchId = branchId || selectedBranch?.branchId;
			if (!targetBranchId) return {};

			// 座席一覧を取得
			const targetSeats = seats.filter(seat => {
				const seatBranch = branches.find(b => b.branchCode === seat.branchCode);
				return seatBranch && seatBranch.branchId === targetBranchId;
			});

			if (targetSeats.length === 0) return {};

			const dateStr = formatDateToString(date);

			// 支店情報の取得
			const branch = branches.find(b => b.branchId === targetBranchId);
			if (!branch) return {};

			// 営業時間の取得
			const openTime = branch.businessHours?.open || '10:00';
			const closeTime = branch.businessHours?.close || '22:00';

			// 営業時間を分単位に変換
			const openMinutes = timeStringToMinutes(openTime);
			const closeMinutes = timeStringToMinutes(closeTime);

			// 結果格納用オブジェクト（各座席IDをキーとする）
			const result: Record<string, Record<string, boolean>> = {};

			// 各座席の時間枠を初期化（すべて予約可能と設定）
			for (const seat of targetSeats) {
				result[seat.seatId] = {};

				for (let minutes = openMinutes; minutes < closeMinutes; minutes += 30) {
					const timeSlot = minutesToTimeString(minutes);
					result[seat.seatId][timeSlot] = true; // true = 予約可能
				}
			}

			// 指定日付の全予約を一度に取得（より効率的）
			const reservationsQuery = query(
				collection(db, 'reservations'),
				where('branchId', '==', targetBranchId),
				where('date', '==', dateStr),
				where('status', '==', 'confirmed')
			);

			const reservationsSnapshot = await getDocs(reservationsQuery);

			// 各予約に対応する時間枠を予約済みとしてマーク
			reservationsSnapshot.forEach(doc => {
				const reservation = doc.data() as ReservationDocument;
				const { seatId, startTime, endTime } = reservation;

				// 結果オブジェクトに対象の座席があるか確認
				if (result[seatId]) {
					const startMinutes = timeStringToMinutes(startTime);
					const endMinutes = timeStringToMinutes(endTime);

					// 予約時間内の各時間枠を予約済みとしてマーク
					for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
						// 営業時間内の時間枠のみを処理
						if (minutes >= openMinutes && minutes < closeMinutes) {
							const timeSlot = minutesToTimeString(minutes);
							result[seatId][timeSlot] = false; // false = 予約済み
						}
					}
				}
			});

			// 時間枠の可用性データを状態に保存
			setTimeSlotAvailability(result);

			return result;
		} catch (err) {
			console.error('Error fetching all seats time slot availability:', err);
			setError('座席の時間枠予約状況取得に失敗しました');
			return {};
		}
	}, [branches, seats, selectedBranch]);

	// 新規予約が既存の予約と重複するかチェックする関数
	const checkReservationOverlap = useCallback(async (
		newReservation: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<boolean> => {
		try {
			const { seatId, date, startTime, endTime } = newReservation;

			// 既存の予約を取得
			const reservationsQuery = query(
				collection(db, 'reservations'),
				where('seatId', '==', seatId),
				where('date', '==', date),
				where('status', '==', 'confirmed')
			);

			const reservationsSnapshot = await getDocs(reservationsQuery);

			// 予約時間を分に変換
			const newStartMinutes = timeStringToMinutes(startTime);
			const newEndMinutes = timeStringToMinutes(endTime);

			// 各既存予約との重複をチェック
			for (const doc of reservationsSnapshot.docs) {
				const existingReservation = doc.data() as ReservationDocument;
				const existingStartMinutes = timeStringToMinutes(existingReservation.startTime);
				const existingEndMinutes = timeStringToMinutes(existingReservation.endTime);

				// 予約時間の重複チェック
				// 重複条件: 新予約の開始時間が既存予約の終了時間より前 かつ 新予約の終了時間が既存予約の開始時間より後
				if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
					return true; // 重複あり
				}
			}

			return false; // 重複なし
		} catch (err) {
			console.error('Error checking reservation overlap:', err);
			setError('予約の重複チェックに失敗しました');
			return true; // エラー時は安全のため重複ありとして扱う
		}
	}, []);

	// 予約データを更新する関数（カレンダーと時間枠の両方を更新）
	const refreshReservationData = useCallback(async () => {
		if (!selectedBranch || !selectedDate) return;

		// 日付ごとの予約状況を更新
		await updateDateAvailability(selectedBranch.branchId, true);

		// 選択日の時間枠予約状況を更新
		await fetchAllSeatsTimeSlotAvailability(selectedDate, selectedBranch.branchId);

		// 選択日の予約一覧を更新
		await fetchReservations(selectedDate, selectedBranch.branchId);
	}, [selectedBranch, selectedDate, updateDateAvailability, fetchAllSeatsTimeSlotAvailability, fetchReservations]);

	// useEffect関連

	// 初期化時に支店一覧を取得
	useEffect(() => {
		fetchBranches();
	}, [fetchBranches]);

	// 支店が選択されたら座席一覧を取得
	useEffect(() => {
		if (selectedBranch) {
			fetchSeats(selectedBranch.branchId);
			updateDateAvailability(selectedBranch.branchId);
			// 支店が変わったら選択済みの座席をクリア
			clearSelectedTimeSlots();
		}
	}, [selectedBranch, fetchSeats, updateDateAvailability, clearSelectedTimeSlots]);

	// 日付が選択された時に予約情報と時間枠可用性を取得
	useEffect(() => {
		if (selectedDate && selectedBranch) {
			fetchReservations(selectedDate, selectedBranch.branchId);
			fetchAllSeatsTimeSlotAvailability(selectedDate, selectedBranch.branchId);
			// 日付が変わったら選択済みの座席をクリア
			clearSelectedTimeSlots();
		}
	}, [selectedDate, selectedBranch, fetchReservations, fetchAllSeatsTimeSlotAvailability, clearSelectedTimeSlots]);

	const isTimeSlotInPast = useCallback((date: Date, timeSlot: string): boolean => {
		const now = new Date();

		// 日付が過去の場合
		if (date.setHours(0, 0, 0, 0) < now.setHours(0, 0, 0, 0)) {
			return true;
		}

		// 同じ日の場合は時間を比較
		if (date.setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0)) {
			// 現在時刻を取得 (上記のsetHoursでnowの値が変わっているので再取得)
			const currentTime = new Date();
			const [hours, minutes] = timeSlot.split(':').map(Number);

			// 時間枠の終了時刻 (開始から30分後と仮定)
			const timeSlotDate = new Date();
			timeSlotDate.setHours(hours, minutes + 30, 0, 0);

			// 現在時刻が時間枠の終了時刻を過ぎている場合は過去と判定
			return currentTime > timeSlotDate;
		}

		// 未来の日付の場合
		return false;
	}, []);

	// セッション終了時刻を考慮した予約可能判定ヘルパー関数
	const isTimeSlotAvailableForInUseSeat = useCallback((
		date: Date,
		timeSlot: string,
		seatId: string
	): boolean => {
		// 過去の時間枠は予約不可
		if (isTimeSlotInPast(date, timeSlot)) {
			return false;
		}

		// 現在の日付ではない場合は通常の予約ルールを適用
		const now = new Date();
		if (date.setHours(0, 0, 0, 0) !== now.setHours(0, 0, 0, 0)) {
			return true; // 将来の日付ならセッション状態に関わらず予約可能
		}

		// 該当座席のアクティブセッション終了時刻を取得する処理
		// 現時点では簡易的に、現在時刻 + 2時間後を仮の終了時刻とする
		const currentTime = new Date();
		const sessionEndTime = new Date(currentTime);
		sessionEndTime.setHours(sessionEndTime.getHours() + 2);

		// 予約バッファ時間 (30分)
		const bufferTimeMinutes = 30;
		const earliestBookingTime = new Date(sessionEndTime);
		earliestBookingTime.setMinutes(earliestBookingTime.getMinutes() + bufferTimeMinutes);

		// 予約しようとしている時間枠の開始時刻
		const [hours, minutes] = timeSlot.split(':').map(Number);
		const timeSlotStartTime = new Date(date);
		timeSlotStartTime.setHours(hours, minutes, 0, 0);

		// 時間枠の開始時刻がセッション終了時刻+バッファ時間より後なら予約可能
		return timeSlotStartTime >= earliestBookingTime;
	}, [isTimeSlotInPast]);

	// コンテキスト値の作成
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
		error,
		timeSlotAvailability,
		updateDateAvailability,
		updateAvailabilityForMonth,
		getTimeSlotAvailability,
		fetchAllSeatsTimeSlotAvailability,
		checkReservationOverlap,
		refreshReservationData,
		isTimeSlotAvailableForInUseSeat,
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