// src/context/reservation-context.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { SeatDocument, ReservationDocument, BranchDocument } from '@/types/firebase';

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

	// 支店一覧を取得
	const fetchBranches = async (): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			// ここでは仮のデータを使用。実際にはAPIから取得する
			const mockBranches: BranchDocument[] = [
				{
					branchId: 'tachikawa',
					branchCode: 'TACH',
					branchName: '立川店',
					address: '東京都立川市錦町2-1-2 第2ビル 2F',
					phoneNumber: '042-XXX-XXXX',
					email: 'tachikawa@esports-sakura.com',
					businessHours: {
						open: '10:00',
						close: '22:00',
						dayOff: []
					},
					totalSeats: 12,
					description: 'JR立川駅から徒歩4分、アクセス抜群の立地です。高性能PCを12台完備しています。',
					amenities: ['無料ドリンク', 'Wi-Fi', 'パーソナルロッカー'],
					layoutImagePath: '/images/branches/tachikawa-layout.jpg',
					mapImagePath: '/images/branches/tachikawa-map.jpg',
					location: {
						latitude: 35.698353,
						longitude: 139.413526
					},
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					branchId: 'shinjuku',
					branchCode: 'SHIN',
					branchName: '新宿店',
					address: '東京都新宿区歌舞伎町1-X-X XXビル 5F',
					phoneNumber: '03-XXXX-XXXX',
					email: 'shinjuku@esports-sakura.com',
					businessHours: {
						open: '24:00',  // 24時間営業
						close: '24:00',
						dayOff: []
					},
					totalSeats: 20,
					description: '新宿駅東口から徒歩5分。24時間営業の大型店舗です。トーナメント向けのグループエリアも完備。',
					amenities: ['無料ドリンク', 'フード販売', 'シャワールーム', '仮眠スペース'],
					layoutImagePath: '/images/branches/shinjuku-layout.jpg',
					mapImagePath: '/images/branches/shinjuku-map.jpg',
					location: {
						latitude: 35.694664,
						longitude: 139.701287
					},
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					branchId: 'akihabara',
					branchCode: 'AKIB',
					branchName: '秋葉原店',
					address: '東京都千代田区外神田X-X-X 電気街ビル 3F',
					phoneNumber: '03-XXXX-XXXX',
					email: 'akihabara@esports-sakura.com',
					businessHours: {
						open: '10:00',
						close: '23:00',
						dayOff: []
					},
					totalSeats: 16,
					description: '秋葉原駅から徒歩3分。最新ゲーミングデバイスを体験できるショーケースも併設。',
					amenities: ['無料ドリンク', 'デバイス販売', 'コスプレイベントスペース'],
					layoutImagePath: '/images/branches/akihabara-layout.jpg',
					mapImagePath: '/images/branches/akihabara-map.jpg',
					location: {
						latitude: 35.700645,
						longitude: 139.771995
					},
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			];

			setBranches(mockBranches);
		} catch (err) {
			console.error('Error fetching branches:', err);
			setError('支店情報の取得に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	};

	// 座席情報を取得
	const fetchSeats = async (branchId?: string): Promise<void> => {
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
	};

	// 予約情報を取得
	const fetchReservations = async (date?: Date, branchId?: string): Promise<void> => {
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
	};

	// 日付ごとの空き状況を更新
	const updateDateAvailability = (branchId?: string) => {
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
	};

	// 予約を作成
	const createReservation = async (reservation: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
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
	};

	// 予約をキャンセル
	const cancelReservation = async (reservationId: string): Promise<void> => {
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
	};

	// 初期化時に支店一覧を取得
	useEffect(() => {
		fetchBranches();
	}, []);

	// 支店が選択されたら座席一覧を取得
	useEffect(() => {
		if (selectedBranch) {
			fetchSeats(selectedBranch.branchId);
			updateDateAvailability(selectedBranch.branchId);
		}
	}, [selectedBranch]);

	// 日付が選択された時に予約情報を取得
	useEffect(() => {
		if (selectedDate && selectedBranch) {
			fetchReservations(selectedDate, selectedBranch.branchId);
		}
	}, [selectedDate, selectedBranch]);

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