// src/components/lp/availability-calendar.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar, Info, Building, MapPin } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { BranchDocument, ReservationDocument } from '@/types/firebase';

interface AvailabilityCalendarProps {
	onDateSelect?: (date: Date) => void;
	className?: string;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
	onDateSelect,
	className = ''
}) => {
	const router = useRouter();
	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
	const [availabilityData, setAvailabilityData] = useState<Record<string, 'available' | 'limited' | 'booked' | 'unknown'>>({});
	const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// 支店選択のための状態
	const [branches, setBranches] = useState<BranchDocument[]>([]);
	const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

	// Calendar grid setup
	const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

	// 支店一覧を取得
	useEffect(() => {
		const fetchBranches = async () => {
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

				// 最初の支店を自動選択
				if (branchesData.length > 0 && !selectedBranchId) {
					setSelectedBranchId(branchesData[0].branchId);
				}
			} catch (err) {
				console.error('支店情報の取得に失敗しました:', err);
				setError('支店情報の取得に失敗しました');
			}
		};

		fetchBranches();
	}, []);

	// 日付変換ヘルパー関数
	const formatDateToString = (date: Date): string => {
		return date.toISOString().split('T')[0];
	};

	// Fetch availability data
	useEffect(() => {
		const fetchAvailabilityData = async () => {
			if (!selectedBranchId) return;

			setIsLoading(true);
			setError(null);

			try {
				// 月の最初と最後の日を計算
				const year = currentMonth.getFullYear();
				const month = currentMonth.getMonth() + 1;
				const startOfMonth = new Date(year, month - 1, 1);
				const endOfMonth = new Date(year, month, 0);

				const startDateStr = formatDateToString(startOfMonth);
				const endDateStr = formatDateToString(endOfMonth);

				// 選択中の支店の座席数を取得
				const selectedBranch = branches.find(b => b.branchId === selectedBranchId);
				if (!selectedBranch) {
					throw new Error('選択された支店が見つかりません');
				}

				// 座席情報を取得
				const seatsQuery = query(
					collection(db, 'seats'),
					where('branchCode', '==', selectedBranch.branchCode),
					where('status', '==', 'available')
				);

				const seatsSnapshot = await getDocs(seatsQuery);
				const totalSeats = seatsSnapshot.size;

				if (totalSeats === 0) {
					throw new Error('利用可能な座席がありません');
				}

				try {
					// 予約データを取得（インデックスエラーが発生する可能性があるため try-catch で囲む）
					const reservationsQuery = query(
						collection(db, 'reservations'),
						where('branchId', '==', selectedBranchId),
						where('status', '==', 'confirmed')
					);

					const reservationsSnapshot = await getDocs(reservationsQuery);

					// ① ReservationDocument 型としてキャストして全予約を取得
					const filteredReservations = reservationsSnapshot.docs.map(doc => {
						const data = doc.data() as ReservationDocument;
						return {
							id: doc.id,
							...data
						};
					});

					// 日付ごとに予約をカウント
					const reservationCountByDate: Record<string, { total: number, uniqueSeats: Set<string> }> = {};

					// 月内の全日付を初期化
					for (let i = 1; i <= endOfMonth.getDate(); i++) {
						const date = new Date(year, month - 1, i);
						const dateStr = formatDateToString(date);
						reservationCountByDate[dateStr] = { total: 0, uniqueSeats: new Set() };
					}

					// 予約を集計
					filteredReservations.forEach(reservation => {
						if (reservationCountByDate[reservation.date]) {
							reservationCountByDate[reservation.date].total++;
							reservationCountByDate[reservation.date].uniqueSeats.add(reservation.seatId);
						}
					});

					// 空き状況を計算
					const availability: Record<string, 'available' | 'limited' | 'booked' | 'unknown'> = {};

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

					setAvailabilityData(availability);
				} catch (queryErr) {
					console.error('予約データの取得に失敗しました', queryErr);

					// インデックスエラーかどうかをチェック
					if (queryErr instanceof Error && queryErr.message.includes('requires an index')) {
						console.log('インデックスエラーが発生しました。フォールバックデータを使用します。');
						// フォールバックとしてモックデータを使用
						setAvailabilityData(generateMockAvailabilityData());
					} else {
						setError('予約データの取得に失敗しました');
					}
				}
			} catch (err) {
				console.error('空き状況の取得に失敗しました:', err);
				setError('空き状況の取得に失敗しました');
				// エラー時はモックデータを使用
				setAvailabilityData(generateMockAvailabilityData());
			} finally {
				setIsLoading(false);
			}
		};

		fetchAvailabilityData();
	}, [currentMonth, selectedBranchId, branches]);

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

	// Update days when current month changes
	useEffect(() => {
		setDays(getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()));
	}, [currentMonth]);

	// フォールバック用モックデータ生成関数
	const generateMockAvailabilityData = () => {
		const availability: Record<string, 'available' | 'limited' | 'booked'> = {};
		const now = new Date();

		// 現在の月の最終日を取得
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

		for (let i = 1; i <= lastDay; i++) {
			const date = new Date(now.getFullYear(), now.getMonth(), i);
			const dateStr = formatDateToString(date);

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

	const goToPreviousMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	const handleDateClick = (day: { date: Date, isCurrentMonth: boolean, isPast: boolean }) => {
		if (day.isPast || !day.isCurrentMonth) return; // 過去の日付や当月以外は選択不可

		// If onDateSelect is provided, call it (e.g. for direct selection)
		if (onDateSelect) {
			onDateSelect(day.date);
		} else {
			// Otherwise navigate to reservation page with the date and branch
			const dateParam = formatDateToString(day.date);
			const branchParam = selectedBranchId || '';
			router.push(`/reservation?date=${dateParam}&branch=${branchParam}`);
		}
	};

	// Get availability status for a day
	const getAvailabilityStatus = (date: Date) => {
		const dateString = formatDateToString(date);
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
				return '情報取得中';
		}
	};

	// 選択中の支店情報を取得
	const selectedBranch = branches.find(branch => branch.branchId === selectedBranchId);

	return (
		<div className={`w-full ${className}`}>
			{/* 支店選択 */}
			<div className="mb-6">
				<label htmlFor="branch-selector" className="block mb-2 text-sm font-medium text-foreground">
					<Building size={16} className="inline-block mr-1 mb-1" />
					支店を選択
				</label>
				<select
					id="branch-selector"
					value={selectedBranchId || ''}
					onChange={(e) => setSelectedBranchId(e.target.value || null)}
					className="w-full p-2 border border-border rounded-md bg-background text-foreground"
					disabled={isLoading}
				>
					<option value="" disabled>支店を選択してください</option>
					{branches.map((branch) => (
						<option key={branch.branchId} value={branch.branchId}>
							{branch.branchName}
						</option>
					))}
				</select>

				{/* 選択中の支店情報を表示 */}
				{selectedBranch && (
					<div className="mt-2 text-sm text-foreground/70">
						<div className="flex items-start">
							<MapPin size={14} className="mt-0.5 mr-1 flex-shrink-0" />
							<span>{selectedBranch.address}</span>
						</div>
						{selectedBranch.totalSeats && (
							<div className="mt-1">
								総座席数: {selectedBranch.totalSeats}席
							</div>
						)}
					</div>
				)}
			</div>

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
						disabled={isLoading}
					>
						<ChevronLeft size={18} />
					</button>
					<button
						onClick={goToNextMonth}
						className="p-2 rounded-full hover:bg-border text-foreground"
						aria-label="次の月"
						disabled={isLoading}
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{/* エラー表示 */}
			{error && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
					<p>{error}</p>
				</div>
			)}

			{/* Loading overlay */}
			<div className="relative">
				{isLoading && (
					<div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
						<div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
					</div>
				)}

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
						const availabilityStatus = day.isCurrentMonth && !day.isPast && selectedBranchId
							? getAvailabilityStatus(day.date)
							: 'unknown';

						return (
							<motion.div
								key={index}
								whileHover={{ scale: day.isPast || !day.isCurrentMonth ? 1 : 1.05 }}
								whileTap={{ scale: day.isPast || !day.isCurrentMonth ? 1 : 0.95 }}
								className={`
                  aspect-square relative p-1 border border-border/20 rounded-md 
                  ${day.isCurrentMonth ? 'text-foreground' : 'text-foreground/40'}
                  ${day.isPast || !selectedBranchId ? 'cursor-not-allowed opacity-50' : day.isCurrentMonth ? 'cursor-pointer' : 'cursor-default opacity-50'}
                  ${day.isCurrentMonth && !day.isPast && selectedBranchId ? getAvailabilityColorClass(day.date) : ''}
                `}
								onClick={() => !day.isPast && selectedBranchId && day.isCurrentMonth && handleDateClick(day)}
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
								{day.isCurrentMonth && !day.isPast && selectedBranchId && (
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
								{hoveredDate && day.date.getTime() === hoveredDate.getTime() && !day.isPast && day.isCurrentMonth && selectedBranchId && (
									<div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-background text-foreground text-xs rounded border border-border shadow-soft whitespace-nowrap">
										{getAvailabilityLabel(availabilityStatus)}
									</div>
								)}
							</motion.div>
						);
					})}
				</div>
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

export default AvailabilityCalendar;