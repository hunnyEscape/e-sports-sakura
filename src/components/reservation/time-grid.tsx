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

interface HoveredSlot {
	seatId: string;
	time: string;
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
		selectedBranch,
		timeSlotAvailability,
		fetchAllSeatsTimeSlotAvailability,
		isLoading,
		error
	} = useReservation();

	const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
	const [seatRanges, setSeatRanges] = useState<Record<string, RangeSelection>>({});
	const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

	const [hoveredSlot, setHoveredSlot] = useState<HoveredSlot | null>(null);
	const [activeSessionEndTimes, setActiveSessionEndTimes] = useState<Record<string, Date>>({});

	// コンポーネントが読み込まれた時に現在のセッション情報を取得
	useEffect(() => {
		const fetchActiveSessions = async () => {
			if (!selectedBranch) return;

			try {
				// 通常はFirestoreから現在アクティブなセッション情報を取得
				// ここではモック実装として、使用中の座席には現在から2時間後の終了時刻を設定
				const mockSessionEndTimes: Record<string, Date> = {};

				seats.forEach(seat => {
					if (seat.status === 'in-use') {
						const endTime = new Date();
						endTime.setHours(endTime.getHours() + 2);
						mockSessionEndTimes[seat.seatId] = endTime;
					}
				});

				setActiveSessionEndTimes(mockSessionEndTimes);
			} catch (err) {
				console.error('セッション情報の取得に失敗しました:', err);
			}
		};

		fetchActiveSessions();
	}, [selectedBranch, seats]);

	// スロットのクリックハンドラーを修正
	const handleSlotClick = (seatId: string, time: string) => {
		// 利用できないスロットはクリックを無視
		if (isSlotUnavailable(seatId, time).unavailable) return;

		// 既存のロジックをここに（変更なし）
		const currentRange = seatRanges[seatId] || { rangeStart: null, rangeEnd: null };
		const isSeatSelected = selectedSeatIds.includes(seatId);

		if (!isSeatSelected) {
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
			setSeatRanges(prev => {
				const newRanges = { ...prev };
				delete newRanges[seatId];
				return newRanges;
			});
			setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
			return;
		}

		// 選択範囲内に予約不可の時間枠がないか確認
		if (isValidTimeRange(seatId, currentRange.rangeStart, time)) {
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
		} else {
			alert('選択範囲内に予約できない時間枠が含まれています。別の範囲を選択してください。');
			return;
		}

		// If range is already set, start a new selection
		setSeatRanges(prev => ({
			...prev,
			[seatId]: { rangeStart: time, rangeEnd: null }
		}));
	};

	// 選択範囲の有効性をチェックする関数を更新
	const isValidTimeRange = (seatId: string, startTime: string, endTime: string): boolean => {
		// 時間の順序を調整
		const start = startTime < endTime ? startTime : endTime;
		const end = startTime < endTime ? endTime : startTime;

		// 時間スロットを取得
		const timeSlotsBetween = timeSlots
			.map(slot => slot.time)
			.filter(time => time >= start && time <= end);

		// すべてのスロットが利用可能か確認
		return timeSlotsBetween.every(time => !isSlotUnavailable(seatId, time).unavailable);
	};

	// Filter seats by the selected branch
	const filteredSeats = seats.filter(seat =>
		selectedBranch && seat.branchCode === selectedBranch.branchCode
	);

	// 座席の時間枠データを取得
	useEffect(() => {
		const loadTimeSlotData = async () => {
			if (!date || !selectedBranch) return;

			try {
				await fetchAllSeatsTimeSlotAvailability(date, selectedBranch.branchId);
				setIsDataLoaded(true);
			} catch (err) {
				console.error('Failed to load time slot data:', err);
			}
		};

		loadTimeSlotData();
	}, [date, selectedBranch, fetchAllSeatsTimeSlotAvailability]);

	const generateTimeSlots = (): TimeSlot[] => {
		const slots: TimeSlot[] = [];

		// Use branch business hours if available, otherwise default hours
		const startHour = selectedBranch?.businessHours?.open
			? parseInt(selectedBranch.businessHours.open.split(':')[0])
			: 10;
		let endHour = selectedBranch?.businessHours?.close
			? parseInt(selectedBranch.businessHours.close.split(':')[0])
			: 22;

		// If viewing today, allow slots up through 24:00
		const today = new Date();
		if (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		) {
			endHour = 24;
		}

		for (let hour = startHour; hour <= endHour; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				// Skip invalid “24:30”
				if (hour === 24 && minute > 0) continue;
				// Skip any minute past closing time (except when endHour===24)
				if (hour === endHour && minute > 0 && endHour !== 24) continue;

				const hh = hour.toString().padStart(2, '0');
				const mm = minute.toString().padStart(2, '0');
				const time = `${hh}:${mm}`;
				const formattedTime = `${hour}:${minute === 0 ? '00' : minute}`;

				slots.push({ time, formattedTime });
			}
		}

		return slots;
	};


	const timeSlots = generateTimeSlots();

	// Check if a time slot is already reserved using the timeSlotAvailability data
	// time-grid.tsx 内の isReserved 関数の修正

	// 時間枠が予約済み・過去・利用不可のいずれかであるかチェック
	const isSlotUnavailable = (seatId: string, timeSlot: string): { unavailable: boolean; reason: 'reserved' | 'past' | 'in-use' | null } => {
		// 予約データがない場合
		if (!date || !timeSlotAvailability || !timeSlotAvailability[seatId]) {
			return { unavailable: true, reason: null };
		}

		// 予約済みかチェック (timeSlotAvailability[seatId][timeSlot] が false なら予約済み)
		const isReservedSlot = timeSlotAvailability[seatId][timeSlot] === false;
		if (isReservedSlot) {
			return { unavailable: true, reason: 'reserved' };
		}

		// 過去の時間枠かチェック
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		// 過去の日付の場合
		if (selectedDate < today) {
			return { unavailable: true, reason: 'past' };
		}

		// 同じ日の場合は時間を比較
		if (selectedDate.getTime() === today.getTime()) {
			const [hour, minute] = timeSlot.split(':').map(Number);
			const slotTime = new Date(today);
			slotTime.setHours(hour, minute, 0, 0);

			// 現在時刻より前の時間枠は選択不可
			if (slotTime < now) {
				return { unavailable: true, reason: 'past' };
			}
		}

		// 座席の状態を確認
		const seat = seats.find(s => s.seatId === seatId);
		if (seat?.status === 'in-use') {
			// 使用中の座席に対するチェック
			// 実際には現在のセッション情報を取得して判断する必要があります
			// ここでは簡易的に、使用中の座席は現在から3時間後以降の時間枠のみ予約可能とする
			const [hour, minute] = timeSlot.split(':').map(Number);
			const slotTime = new Date(selectedDate);
			slotTime.setHours(hour, minute, 0, 0);

			const earliestBookableTime = new Date();
			earliestBookableTime.setHours(earliestBookableTime.getHours() + 3);

			if (slotTime < earliestBookableTime) {
				return { unavailable: true, reason: 'in-use' };
			}
		}

		// 利用可能
		return { unavailable: false, reason: null };
	};

	// Check if a slot is within the selected range
	const isInSelectedRange = (seatId: string, time: string): boolean => {
		if (!selectedSeatIds.includes(seatId)) return false;

		const range = seatRanges[seatId];
		if (!range || !range.rangeStart) return false;

		// If only start is selected, highlight just that slot
		if (!range.rangeEnd) return time === range.rangeStart;

		// 時間の大小関係を調整
		const start = range.rangeStart < range.rangeEnd ? range.rangeStart : range.rangeEnd;
		const end = range.rangeStart < range.rangeEnd ? range.rangeEnd : range.rangeStart;

		// Check if time is within range
		return time >= start && time <= end;
	};

	// Calculate end time (30 minutes after the last slot), using local date to avoid TZ shift
	const calculateEndTime = (time: string): string => {
		if (!time) return '';

		// 「HH:mm」を分解
		const [hour, minute] = time.split(':').map(Number);

		// ローカルの日付 (date) をベースに new Date を生成
		const timeDate = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			hour,
			minute,
			0,
			0
		);

		// 30分後をセット
		timeDate.setMinutes(timeDate.getMinutes() + 30);

		// HH:mm フォーマット
		const hh = String(timeDate.getHours()).padStart(2, '0');
		const mm = String(timeDate.getMinutes()).padStart(2, '0');
		return `${hh}:${mm}`;
	};
	// Reset selection when date changes
	useEffect(() => {
		setSelectedSeatIds([]);
		setSeatRanges({});
		clearSelectedTimeSlots();
		setIsDataLoaded(false);
	}, [date, clearSelectedTimeSlots]);

	// Update selected time slots when selections change
	useEffect(() => {
		// 各座席の選択情報をまとめる
		const newSelectedTimeSlots: SelectedTimeSlotsItem[] = [];

		selectedSeatIds.forEach(seatId => {
			const range = seatRanges[seatId];
			const seat = filteredSeats.find(s => s.seatId === seatId);

			if (range && range.rangeStart && seat) {
				// 開始・終了時間の順序を正しく調整
				let startTime = range.rangeStart;
				let endTime = range.rangeEnd
					? range.rangeEnd
					: range.rangeStart;

				// 時間の大小関係を調整
				if (startTime > endTime) {
					[startTime, endTime] = [endTime, startTime];
				}

				// 終了時間は次の30分枠に
				const actualEndTime = calculateEndTime(endTime);

				newSelectedTimeSlots.push({
					seatId,
					seatName: seat.name,
					startTime,
					endTime: actualEndTime
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
		const [sh, sm] = startTime.split(':').map(Number);
		const [eh, em] = endTime.split(':').map(Number);

		let startMinutes = sh * 60 + sm;
		let endMinutes = eh * 60 + em;

		// If end is not strictly after start, assume it wrapped past midnight
		if (endMinutes <= startMinutes) {
			endMinutes += 24 * 60;
		}

		return endMinutes - startMinutes;
	};

	// Get selected seats
	const selectedSeatsInfo = selectedSeatIds
		.filter(id => seatRanges[id] && seatRanges[id].rangeStart)
		.map(id => {
			const seat = filteredSeats.find(s => s.seatId === id);
			const range = seatRanges[id];

			if (!seat || !range || !range.rangeStart) return null;

			// 開始・終了時間の順序を正しく調整
			let startTime = range.rangeStart;
			let endTime = range.rangeEnd
				? range.rangeEnd
				: range.rangeStart;

			// 時間の大小関係を調整
			if (startTime > endTime) {
				[startTime, endTime] = [endTime, startTime];
			}

			// 終了時間は次の30分枠に
			const actualEndTime = calculateEndTime(endTime);

			const duration = calculateDuration(startTime, actualEndTime);

			// Calculate rate per minute from ratePerHour
			const ratePerMinute = seat.ratePerHour ? seat.ratePerHour / 60 : 0;


			return {
				seat,
				startTime,
				endTime: actualEndTime,
				duration,
				ratePerMinute,
				cost: Math.ceil(duration / 60) * 600,
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

	const getSlotStyle = (seatId: string, timeSlot: string) => {
		const result = isSlotUnavailable(seatId, timeSlot);
		const isSelected = isInSelectedRange(seatId, timeSlot);

		// 選択中
		if (isSelected) {
			const range = seatRanges[seatId] || { rangeStart: null, rangeEnd: null };
			const isRangeStart = range.rangeStart === timeSlot;
			const isRangeEnd = range.rangeEnd === timeSlot;

			if (isRangeStart || isRangeEnd) {
				return 'bg-accent/70'; // 選択範囲の開始/終了
			}
			return 'bg-accent/40'; // 選択範囲内
		}

		// 状態に応じたスタイル
		if (result.unavailable) {
			switch (result.reason) {
				case 'reserved':
					return 'bg-border/50 cursor-not-allowed'; // 予約済み
				case 'past':
					return 'bg-gray-300/30 cursor-not-allowed'; // 過去の時間枠
				case 'in-use':
					return 'bg-amber-300/30 cursor-not-allowed'; // 使用中
				default:
					return 'bg-border/30 cursor-not-allowed'; // その他の理由で利用不可
			}
		}

		// 利用可能
		return 'hover:bg-background/10';
	};

	// 時間枠のツールチップメッセージを取得する関数
	const getSlotTooltip = (seatId: string, timeSlot: string) => {
		const result = isSlotUnavailable(seatId, timeSlot);

		if (result.unavailable) {
			switch (result.reason) {
				case 'reserved':
					return '予約済み';
				case 'past':
					return '過去の時間枠は予約できません';
				case 'in-use':
					return '現在使用中です';
				default:
					return '予約できません';
			}
		}

		return '予約可能';
	};

	return (
		<div className="space-y-6 relative">
			{/* Loading overlay */}
			{(isLoading || !isDataLoaded) && (
				<div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10 rounded-lg">
					<div className="flex flex-col items-center">
						<div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
						<p className="mt-2 text-sm text-foreground">時間枠の予約状況を取得中...</p>
					</div>
				</div>
			)}

			{/* Error message */}
			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 mb-4">
					<p>{error}</p>
				</div>
			)}

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
								const slotResult = isSlotUnavailable(seat.seatId, slot.time);
								const isUnavailable = slotResult.unavailable;
								const isSelected = isInSelectedRange(seat.seatId, slot.time);

								const range = seatRanges[seat.seatId] || { rangeStart: null, rangeEnd: null };
								const isRangeStart = range.rangeStart === slot.time;
								const isRangeEnd = range.rangeEnd === slot.time;

								// ホバー時に表示するツールチップのメッセージ
								const tooltipMessage = getSlotTooltip(seat.seatId, slot.time);

								return (
									<motion.div
										key={`${seat.seatId}-${slot.time}`}
										className={`
        w-16 h-16 flex-shrink-0 border-l border-border/20
        ${getSlotStyle(seat.seatId, slot.time)}
        flex items-center justify-center relative
      `}
										whileHover={!isUnavailable ? { scale: 1.05 } : {}}
										whileTap={!isUnavailable ? { scale: 0.95 } : {}}
										onClick={() => !isUnavailable && handleSlotClick(seat.seatId, slot.time)}
										onMouseEnter={() => setHoveredSlot({ seatId: seat.seatId, time: slot.time })}
										onMouseLeave={() => setHoveredSlot(null)}
									>
										{isUnavailable && slotResult.reason === 'reserved' && (
											<div className="w-8 h-1 bg-border rounded-full"></div>
										)}

										{isUnavailable && slotResult.reason === 'past' && (
											<div className="w-8 h-1 bg-gray-400 rounded-full"></div>
										)}

										{isUnavailable && slotResult.reason === 'in-use' && (
											<div className="w-2 h-5 bg-amber-400/70 rounded-full"></div>
										)}

										{(isRangeStart || isRangeEnd) && (
											<div className="w-2 h-2 bg-white rounded-full"></div>
										)}

										{/* ホバー時のツールチップ */}
										{hoveredSlot &&
											hoveredSlot.seatId === seat.seatId &&
											hoveredSlot.time === slot.time && (
												<div className="absolute z-20 bottom-full left-1/2 transform -translate-x-1/2 mb-1 
                        px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
													{tooltipMessage}
												</div>
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
										<span className="font-medium text-foreground/80">合計予想料金 (予約時に料金は発生しません)</span>
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

export default TimeGrid;