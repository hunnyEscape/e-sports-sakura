import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReservation } from '@/context/reservation-context';
import { ArrowRight, Calendar, Clock, AlertCircle, Users, Plus, Minus, Check } from 'lucide-react';

interface TimeGridProps {
	date: Date;
	onTimeSelect?: (reservations: SeatReservation[], people: number) => void;
}

interface TimeSlot {
	time: string;
	formattedTime: string;
}

interface Seat {
	id: string;
	name: string;
	ratePerMinute: number;
}

interface SeatReservation {
	seatId: string;
	startTime: string;
	endTime: string;
}

interface RangeSelection {
	rangeStart: string | null;
	rangeEnd: string | null;
}

const TimeGrid: React.FC<TimeGridProps> = ({ date, onTimeSelect }) => {
	const { seats, reservations, selectedTimeSlots, setSelectedTimeSlots } = useReservation();

	// State for multiple seat selection
	const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
	const [seatRanges, setSeatRanges] = useState<Record<string, RangeSelection>>({});
	const [people, setPeople] = useState<number>(1);

	// Generate time slots for the day (30-minute intervals from 10:00 to 22:00)
	const generateTimeSlots = (): TimeSlot[] => {
		const slots: TimeSlot[] = [];
		const startHour = 10;
		const endHour = 22;

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
		const dateTimeStr = `${dateStr}T${timeSlot}:00`;

		return reservations.some(reservation =>
			reservation.seatId === seatId &&
			new Date(reservation.startTime) <= new Date(dateTimeStr) &&
			new Date(reservation.endTime) > new Date(dateTimeStr)
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

	// Update selected time slots when selections change
	useEffect(() => {
		// Create an array of SeatReservation objects
		const newSelectedTimeSlots: SeatReservation[] = selectedSeatIds
			.filter(seatId => seatRanges[seatId] && seatRanges[seatId].rangeStart)
			.map(seatId => {
				const range = seatRanges[seatId];
				return {
					seatId,
					startTime: range.rangeStart as string,
					endTime: range.rangeEnd
						? calculateEndTime(range.rangeEnd)
						: calculateEndTime(range.rangeStart as string)
				};
			});

		// Update context with multiple seat selections
		if (newSelectedTimeSlots.length > 0) {
			// If there's a setSelectedTimeSlots that expects an array
			// This might require updating the context to support multiple selections
			if (Array.isArray(selectedTimeSlots)) {
				setSelectedTimeSlots(newSelectedTimeSlots);
			} else {
				// Fallback for backward compatibility - just use the first selection
				const firstSelection = newSelectedTimeSlots[0];
				setSelectedTimeSlots(firstSelection);
			}
		} else {
			// Clear selection
			if (Array.isArray(selectedTimeSlots)) {
				setSelectedTimeSlots([]);
			} else {
				setSelectedTimeSlots({ seatId: '', startTime: '', endTime: '' });
			}
		}
	}, [seatRanges, selectedSeatIds, setSelectedTimeSlots]);

	// Handle increase/decrease people count
	const handlePeopleChange = (increment: boolean) => {
		setPeople(prev => {
			if (increment) {
				return prev < 10 ? prev + 1 : prev;
			} else {
				return prev > 1 ? prev - 1 : prev;
			}
		});
	};

	// Handle continue to confirmation
	const handleContinue = () => {
		if (selectedSeatIds.length > 0 && onTimeSelect) {
			const seatReservations = selectedSeatIds
				.filter(seatId => seatRanges[seatId] && seatRanges[seatId].rangeStart)
				.map(seatId => {
					const range = seatRanges[seatId];
					return {
						seatId,
						startTime: range.rangeStart as string,
						endTime: range.rangeEnd
							? calculateEndTime(range.rangeEnd)
							: calculateEndTime(range.rangeStart as string)
					};
				});

			onTimeSelect(seatReservations, people);
		}
	};

	// Reset selection when date changes
	useEffect(() => {
		setSelectedSeatIds([]);
		setSeatRanges({});
		if (Array.isArray(selectedTimeSlots)) {
			setSelectedTimeSlots([]);
		} else {
			setSelectedTimeSlots({ seatId: '', startTime: '', endTime: '' });
		}
	}, [date, setSelectedTimeSlots]);

	// Format date for display
	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

		return `${year}年${month}月${day}日(${dayOfWeek})`;
	};

	// Calculate total duration in minutes across all selections
	const calculateTotalDuration = (): number => {
		return selectedSeatIds.reduce((total, seatId) => {
			const range = seatRanges[seatId];
			if (!range || !range.rangeStart) return total;

			const endTimeForCalc = range.rangeEnd ? range.rangeEnd : range.rangeStart;
			const startParts = range.rangeStart.split(':').map(Number);
			const endParts = endTimeForCalc.split(':').map(Number);

			let startMinutes = startParts[0] * 60 + startParts[1];
			let endMinutes = endParts[0] * 60 + endParts[1];

			// Add 30 minutes to end time for actual duration
			endMinutes += 30;

			return total + (endMinutes - startMinutes);
		}, 0);
	};

	// Get selected seats
	const selectedSeatsInfo = selectedSeatIds
		.filter(id => seatRanges[id] && seatRanges[id].rangeStart)
		.map(id => {
			const seat = seats.find(s => s.id === id);
			const range = seatRanges[id];

			if (!seat || !range || !range.rangeStart) return null;

			const endTime = range.rangeEnd
				? calculateEndTime(range.rangeEnd)
				: calculateEndTime(range.rangeStart);

			const startParts = range.rangeStart.split(':').map(Number);
			const endParts = (range.rangeEnd || range.rangeStart).split(':').map(Number);

			let startMinutes = startParts[0] * 60 + startParts[1];
			let endMinutes = endParts[0] * 60 + endParts[1] + 30; // Add 30 minutes

			const duration = endMinutes - startMinutes;

			return {
				seat,
				startTime: range.rangeStart,
				endTime,
				duration
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
			return total + (info.seat.ratePerMinute * info.duration);
		}, 0);
	};

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

					{/*Seats and time slots grid */}
					{seats.map((seat) => (
						<div
							key={seat.id}
							className="flex border-b border-border/20 hover:bg-background/5"
						>
							{/* Seat name */}
							<div className="w-32 flex-shrink-0 p-2 border-r border-border/20 flex flex-col sticky left-0 bg-background">
								<div className="flex items-center justify-between">
									<span className="font-medium text-foreground">{seat.name}</span>
									{selectedSeatIds.includes(seat.id) && (
										<Check className="h-4 w-4 text-accent"/>
									)}
								</div>
								<span className="text-xs text-foreground/60">¥{seat.ratePerMinute}/分</span>
							</div>

							{/* Time slots */}
							{timeSlots.map((slot) => {
								const isSlotReserved = isReserved(seat.id, slot.time);
								const isSelected = isInSelectedRange(seat.id, slot.time);

								const range = seatRanges[seat.id] || { rangeStart: null, rangeEnd: null };
								const isRangeStart = range.rangeStart === slot.time;
								const isRangeEnd = range.rangeEnd === slot.time;

								return (
									<motion.div
										key={`${seat.id}-${slot.time}`}
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
										onClick={() => !isSlotReserved && handleSlotClick(seat.id, slot.time)}
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
											<div key={info.seat.id} className="p-2 bg-border/10 rounded-md">
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
													予想料金: ¥{(info.seat.ratePerMinute * info.duration).toLocaleString()}
												</div>
											</div>
										);
									})}
								</div>

								<div className="pt-2 mt-2 border-t border-border/20 font-medium text-foreground/80">
									合計予想料金: ¥{calculateTotalCost().toLocaleString()}
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
						希望する座席と開始時間をクリックしてください。複数の座席を同時に予約できます。
					</p>
				</div>
			)}
		</div>
	);
};

export default TimeGrid;