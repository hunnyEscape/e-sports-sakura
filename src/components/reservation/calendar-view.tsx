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

export default CalendarView;