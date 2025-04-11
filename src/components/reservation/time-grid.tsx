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

export default TimeGrid;