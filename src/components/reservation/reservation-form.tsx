import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReservation } from '@/context/reservation-context';
import { useAuth } from '@/context/auth-context';
import { Calendar, Clock, Info, CreditCard, CheckCircle } from 'lucide-react';

interface ReservationFormProps {
	onSuccess?: () => void;
	onCancel?: () => void;
}

const ReservationForm: React.FC<ReservationFormProps> = ({ onSuccess, onCancel }) => {
	const { user } = useAuth();
	const {
		selectedDate,
		selectedTimeSlots,
		seats,
		createReservation,
		isLoading
	} = useReservation();

	const [notes, setNotes] = useState('');
	const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

	// Get selected seat information
	const selectedSeat = seats.find(seat => seat.id === selectedTimeSlots.seatId);

	// Calculate reservation details
	const calculateDuration = (): number => {
		if (!selectedTimeSlots.startTime || !selectedTimeSlots.endTime) return 0;

		const startParts = selectedTimeSlots.startTime.split(':').map(Number);
		const endParts = selectedTimeSlots.endTime.split(':').map(Number);

		const startMinutes = startParts[0] * 60 + startParts[1];
		const endMinutes = endParts[0] * 60 + endParts[1];

		return endMinutes - startMinutes;
	};

	const duration = calculateDuration();

	const calculateTotalPrice = (): number => {
		if (!selectedSeat) return 0;
		return duration * selectedSeat.ratePerMinute;
	};

	const totalPrice = calculateTotalPrice();

	// Format date for display
	const formatDate = (date: Date | null): string => {
		if (!date) return '';

		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

		return `${year}年${month}月${day}日(${dayOfWeek})`;
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedDate || !selectedTimeSlots.seatId || !selectedTimeSlots.startTime || !selectedTimeSlots.endTime) {
			return;
		}

		try {
			const dateStr = selectedDate.toISOString().split('T')[0];

			await createReservation({
				userId: user?.uid || '',
				seatId: selectedTimeSlots.seatId,
				date: dateStr,
				startTime: selectedTimeSlots.startTime,
				endTime: selectedTimeSlots.endTime,
				duration,
				status: 'confirmed',
				notes
			});

			setSubmitStatus('success');

			// Notify parent component of success
			if (onSuccess) {
				setTimeout(() => {
					onSuccess();
				}, 2000);
			}
		} catch (error) {
			console.error('Reservation failed:', error);
			setSubmitStatus('error');
		}
	};

	// Determine if form is valid for submission
	const isFormValid =
		selectedDate !== null &&
		selectedTimeSlots.seatId !== '' &&
		selectedTimeSlots.startTime !== '' &&
		selectedTimeSlots.endTime !== '' &&
		duration > 0;

	if (submitStatus === 'success') {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="p-6 bg-highlight/10 rounded-lg text-center"
			>
				<div className="flex justify-center mb-4">
					<CheckCircle size={48} className="text-highlight" />
				</div>
				<h2 className="text-xl font-medium text-foreground mb-2">予約が完了しました</h2>
				<p className="text-foreground/70 mb-4">
					予約内容はメールで送信されました。ダッシュボードでも確認できます。
				</p>
				<button
					onClick={onSuccess}
					className="px-4 py-2 bg-highlight text-white rounded-md hover:bg-highlight/90 transition-colors"
				>
					ダッシュボードへ戻る
				</button>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="w-full max-w-2xl mx-auto"
		>
			<h2 className="text-xl font-medium text-foreground mb-4">予約内容の確認</h2>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Reservation Summary */}
				<div className="bg-background/5 p-4 rounded-lg space-y-4">
					{/* Date */}
					<div className="flex items-start">
						<Calendar className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
						<div>
							<div className="font-medium text-foreground">予約日</div>
							<div className="text-foreground/70">
								{formatDate(selectedDate)}
							</div>
						</div>
					</div>

					{/* Time */}
					<div className="flex items-start">
						<Clock className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
						<div>
							<div className="font-medium text-foreground">時間</div>
							<div className="text-foreground/70">
								{selectedTimeSlots.startTime} - {selectedTimeSlots.endTime}
								{duration > 0 && <span className="ml-2">({duration}分間)</span>}
							</div>
						</div>
					</div>

					{/* Seat */}
					<div className="flex items-start">
						<Info className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
						<div>
							<div className="font-medium text-foreground">座席</div>
							<div className="text-foreground/70">
								{selectedSeat?.name}
							</div>
						</div>
					</div>

					{/* Price */}
					<div className="flex items-start">
						<CreditCard className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
						<div>
							<div className="font-medium text-foreground">料金</div>
							<div className="text-foreground/70">
								¥{totalPrice} ({selectedSeat?.ratePerMinute}円 × {duration}分)
							</div>
						</div>
					</div>
				</div>

				{/* Notes */}
				<div>
					<label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
						備考（オプション）
					</label>
					<textarea
						id="notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
						rows={3}
						placeholder="特別なリクエストがあればご記入ください"
					/>
				</div>

				{/* Terms and Conditions */}
				<div className="text-sm text-foreground/70">
					<p>
						予約を確定すると、当施設の
						<a href="#" className="text-accent hover:underline">利用規約</a>
						に同意したものとみなされます。
					</p>
				</div>

				{/* Error message */}
				{submitStatus === 'error' && (
					<div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
						予約の処理中にエラーが発生しました。もう一度お試しください。
					</div>
				)}

				{/* Action buttons */}
				<div className="flex justify-end">
					<button
						type="submit"
						disabled={!isFormValid || isLoading}
						className={`
              px-6 py-2 rounded-md text-white transition-colors
              ${isFormValid ? 'bg-accent hover:bg-accent/90' : 'bg-border/50 cursor-not-allowed'}
            `}
					>
						{isLoading ? '処理中...' : '予約を確定する'}
					</button>
				</div>
			</form>
		</motion.div>
	);
};

export default ReservationForm;