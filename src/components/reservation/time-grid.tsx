import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReservation } from '@/context/reservation-context';

interface TimeGridProps {
	date: Date;
	onTimeSelect?: (seatId: string, startTime: string, endTime: string) => void;
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

const TimeGrid: React.FC<TimeGridProps> = ({ date, onTimeSelect }) => {
	const { seats, reservations, selectedTimeSlots, setSelectedTimeSlots } = useReservation();

	// State for drag selection
	const [dragStart, setDragStart] = useState<{ seatId: string, time: string } | null>(null);
	const [dragEnd, setDragEnd] = useState<{ seatId: string, time: string } | null>(null);
	const [isDragging, setIsDragging] = useState(false);

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

	// Check if a time slot is selected
	const isSelected = (seatId: string, timeSlot: string): boolean => {
		if (!selectedTimeSlots.seatId || selectedTimeSlots.seatId !== seatId) return false;

		const slotTime = new Date(`${date.toISOString().split('T')[0]}T${timeSlot}`);
		const startTime = new Date(`${date.toISOString().split('T')[0]}T${selectedTimeSlots.startTime}`);
		const endTime = new Date(`${date.toISOString().split('T')[0]}T${selectedTimeSlots.endTime}`);

		return slotTime >= startTime && slotTime < endTime;
	};

	// Handle mouse down on a time slot (start dragging)
	const handleMouseDown = (seatId: string, time: string) => {
		if (isReserved(seatId, time)) return;

		setDragStart({ seatId, time });
		setDragEnd({ seatId, time });
		setIsDragging(true);
	};

	// Handle mouse enter on a time slot during dragging
	const handleMouseEnter = (seatId: string, time: string) => {
		if (!isDragging || !dragStart || dragStart.seatId !== seatId || isReserved(seatId, time)) return;

		setDragEnd({ seatId, time });
	};

	// Handle mouse up (end dragging and set selection)
	const handleMouseUp = () => {
		if (!isDragging || !dragStart || !dragEnd) return;

		// Ensure start time is earlier than end time
		let startTime = dragStart.time;
		let endTime = dragEnd.time;

		if (startTime > endTime) {
			[startTime, endTime] = [endTime, startTime];
		}

		// Calculate the end time (30 minutes after the last selected slot)
		const endTimeDate = new Date(`${date.toISOString().split('T')[0]}T${endTime}`);
		endTimeDate.setMinutes(endTimeDate.getMinutes() + 30);
		const adjustedEndTime = `${endTimeDate.getHours().toString().padStart(2, '0')}:${endTimeDate.getMinutes().toString().padStart(2, '0')}`;

		setSelectedTimeSlots({
			seatId: dragStart.seatId,
			startTime,
			endTime: adjustedEndTime
		});

		if (onTimeSelect) {
			onTimeSelect(dragStart.seatId, startTime, adjustedEndTime);
		}

		setIsDragging(false);
		setDragStart(null);
		setDragEnd(null);
	};

	// Handle mouse leave from grid
	const handleMouseLeave = () => {
		if (isDragging) {
			setIsDragging(false);
			setDragStart(null);
			setDragEnd(null);
		}
	};

	// Calculate the selection range for visual indication during dragging
	const getSelectionRange = (seatId: string, time: string) => {
		if (!isDragging || !dragStart || !dragEnd || dragStart.seatId !== seatId) return false;

		const timeValue = time;
		const startValue = dragStart.time < dragEnd.time ? dragStart.time : dragEnd.time;
		const endValue = dragStart.time < dragEnd.time ? dragEnd.time : dragStart.time;

		return timeValue >= startValue && timeValue <= endValue;
	};

	// Reset selection when date changes
	useEffect(() => {
		setSelectedTimeSlots({ seatId: '', startTime: '', endTime: '' });
	}, [date, setSelectedTimeSlots]);

	return (
		<div
			className="w-full overflow-x-auto"
			onMouseLeave={handleMouseLeave}
			onMouseUp={handleMouseUp}
		>
			<div className="min-w-max">
				{/* Time slots header */}
				<div className="flex border-b border-border/30">
					<div className="w-32 flex-shrink-0 p-2 font-medium text-foreground">座席</div>
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
				{seats.map((seat) => (
					<div
						key={seat.id}
						className="flex border-b border-border/20 hover:bg-background/5"
					>
						{/* Seat name */}
						<div className="w-32 flex-shrink-0 p-2 border-r border-border/20 flex flex-col">
							<span className="font-medium text-foreground">{seat.name}</span>
							<span className="text-xs text-foreground/60">¥{seat.ratePerMinute}/分</span>
						</div>

						{/* Time slots */}
						{timeSlots.map((slot) => {
							const isSlotReserved = isReserved(seat.id, slot.time);
							const isSlotSelected = isSelected(seat.id, slot.time);
							const isInDragSelection = getSelectionRange(seat.id, slot.time);

							return (
								<motion.div
									key={`${seat.id}-${slot.time}`}
									className={`
                    w-16 h-16 flex-shrink-0 border-l border-border/20
                    ${isSlotReserved ? 'bg-border/50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSlotSelected ? 'bg-accent/40' : ''}
                    ${isInDragSelection && isDragging ? 'bg-accent/20' : ''}
                    ${!isSlotReserved && !isSlotSelected && !isInDragSelection ? 'hover:bg-background/10' : ''}
                  `}
									whileHover={!isSlotReserved ? { scale: 1.05 } : {}}
									whileTap={!isSlotReserved ? { scale: 0.95 } : {}}
									onMouseDown={() => !isSlotReserved && handleMouseDown(seat.id, slot.time)}
									onMouseEnter={() => handleMouseEnter(seat.id, slot.time)}
								/>
							);
						})}
					</div>
				))}
			</div>

			{/* Selected time slots information */}
			{selectedTimeSlots.seatId && (
				<div className="mt-4 p-3 border border-accent/20 rounded-lg bg-accent/5">
					<h3 className="font-medium text-foreground">選択中の予約枠</h3>
					<p className="text-sm text-foreground/80">
						{seats.find(s => s.id === selectedTimeSlots.seatId)?.name} -
						{selectedTimeSlots.startTime} から {selectedTimeSlots.endTime} まで
					</p>
				</div>
			)}
		</div>
	);
};

export default TimeGrid;