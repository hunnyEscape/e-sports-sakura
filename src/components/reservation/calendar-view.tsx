// src/components/reservation/calendar-view.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReservation } from '@/context/reservation-context';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

interface CalendarViewProps {
	onDateSelect?: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onDateSelect }) => {
	const {
		selectedDate,
		setSelectedDate,
		dateAvailability,
		updateAvailabilityForMonth,
		selectedBranch,
		isLoading,
		error
	} = useReservation();

	const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
	const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

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

	// Update days when current month changes
	useEffect(() => {
		setDays(getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()));

		// 表示月が変わったらその月の予約状況を取得
		if (selectedBranch) {
			updateAvailabilityForMonth(currentMonth, selectedBranch.branchId);
		}
	}, [currentMonth, selectedBranch, updateAvailabilityForMonth]);

	const goToPreviousMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	};

	const handleDateClick = (day: { date: Date, isCurrentMonth: boolean, isPast: boolean }) => {
		if (day.isPast) return; // Prevent selecting past dates

		// 当月以外の日付は選択しない追加チェック
		if (!day.isCurrentMonth) return;

		setSelectedDate(day.date);
		if (onDateSelect) onDateSelect(day.date);
	};


	const getAvailabilityStatus = (date: Date) => {
		if (!date) return 'unknown';
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const dateString = `${year}-${month}-${day}`;
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

	// Get availability tooltip text
	const getAvailabilityTooltip = (date: Date) => {
		const status = getAvailabilityStatus(date);
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

	// Calculate today's date at midnight for comparison
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	return (
		<div className="w-full pb-5">
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
					<CalendarIcon size={18} className="mr-2" />
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

			{/* Loading indicator */}
			{isLoading && (
				<div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md">
					<div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
				</div>
			)}

			{/* Error message */}
			{error && (
				<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
					<p>{error}</p>
				</div>
			)}

			{/* Calendar grid */}
			<div className="grid grid-cols-7 gap-1 relative">
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

							{/* Tooltip on hover */}
							{hoveredDate && day.date.getTime() === hoveredDate.getTime() && !day.isPast && day.isCurrentMonth && (
								<div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-background text-foreground text-xs rounded border border-border shadow-soft whitespace-nowrap">
									{getAvailabilityTooltip(day.date)}
								</div>
							)}
						</motion.div>
					);
				})}
			</div>

			{/* Info message */}
			<div className="mt-6 flex items-start text-sm text-foreground/70">
				<Info size={16} className="mr-2 flex-shrink-0 mt-0.5" />
				<p>
					カレンダーの日付をクリックすると、その日の予約状況と空き枠を確認できます。
				</p>
			</div>
		</div>
	);
};

export default CalendarView;