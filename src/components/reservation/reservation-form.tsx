import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReservation } from '@/context/reservation-context';
import { useAuth } from '@/context/auth-context';
import { Calendar, Clock, Info, CreditCard, CheckCircle, X } from 'lucide-react';

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
		isLoading,
		selectedBranch
	} = useReservation();

	const [notes, setNotes] = useState('');
	const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

	// Format date for display
	const formatDate = (date: Date | null): string => {
		if (!date) return '';

		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

		return `${year}年${month}月${day}日(${dayOfWeek})`;
	};

	// 座席ごとの詳細情報を計算
	const seatDetails = selectedTimeSlots.map(slot => {
		const seat = seats.find(s => s.seatId === slot.seatId);
		if (!seat) return null;

		// 分数の計算
		const startParts = slot.startTime.split(':').map(Number);
		const endParts = slot.endTime.split(':').map(Number);
		const startMinutes = startParts[0] * 60 + startParts[1];
		const endMinutes = endParts[0] * 60 + endParts[1];
		const duration = endMinutes - startMinutes;

		// 料金計算
		const ratePerMinute = seat.ratePerHour / 60;
		const cost = Math.round(ratePerMinute * duration);

		return {
			seat,
			slot,
			duration,
			cost
		};
	}).filter(Boolean);

	// 合計金額の計算
	const totalCost = seatDetails.reduce((sum, detail) => sum + (detail?.cost || 0), 0);

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedDate || selectedTimeSlots.length === 0) {
			return;
		}

		try {
			const dateStr = selectedDate.toISOString().split('T')[0];

			// 複数の予約データを準備
			const reservationsData = selectedTimeSlots.map(slot => ({
				userId: user?.uid || '',
				seatId: slot.seatId,
				seatName: slot.seatName || seats.find(s => s.seatId === slot.seatId)?.name || '',
				date: dateStr,
				startTime: slot.startTime,
				endTime: slot.endTime,
				duration: calculateDuration(slot.startTime, slot.endTime),
				status: 'confirmed',
				notes
			}));

			await createReservation(reservationsData);

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

	// 分数を計算するヘルパー関数
	const calculateDuration = (startTime: string, endTime: string): number => {
		const startParts = startTime.split(':').map(Number);
		const endParts = endTime.split(':').map(Number);
		const startMinutes = startParts[0] * 60 + startParts[1];
		const endMinutes = endParts[0] * 60 + endParts[1];
		return endMinutes - startMinutes;
	};

	// Determine if form is valid for submission
	const isFormValid = selectedDate !== null && selectedTimeSlots.length > 0;

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
			className="w-full max-w-3xl mx-auto"
		>
			<h2 className="text-xl font-medium text-foreground mb-4">予約内容の確認</h2>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Reservation Summary */}
				<div className="bg-background/5 p-4 rounded-lg space-y-4">
					{/* Branch */}
					{selectedBranch && (
						<div className="flex items-start">
							<Info className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
							<div>
								<div className="font-medium text-foreground">支店</div>
								<div className="text-foreground/70">
									{selectedBranch.branchName}
								</div>
							</div>
						</div>
					)}

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

					{/* Selected Seats */}
					<div className="mt-4">
						<h3 className="font-medium text-foreground mb-2">選択した座席 ({seatDetails.length}席)</h3>
						<div className="space-y-3">
							{seatDetails.map((detail, index) => (
								<div key={detail?.seat.seatId || index}
									className="p-3 bg-background/30 rounded border border-border/20"
								>
									<div className="flex justify-between items-start">
										<span className="font-medium text-foreground/80">{detail?.seat.name}</span>
										<span className="text-sm bg-accent/10 text-accent px-2 py-0.5 rounded">
											¥{detail?.cost.toLocaleString()}
										</span>
									</div>
									<div className="text-sm text-foreground/70 mt-1">
										{detail?.slot.startTime} - {detail?.slot.endTime} ({detail?.duration}分)
									</div>
									<div className="text-xs text-foreground/50 mt-1">
										単価: ¥{Math.round(detail?.seat.ratePerHour / 60)}円/分 × {detail?.duration}分
									</div>
								</div>
							))}
						</div>

						{/* Total Price */}
						<div className="flex justify-between items-center mt-4 pt-3 border-t border-border/20">
							<span className="font-medium text-foreground/60">合計金額</span>
							<span className="text-xl font-bold text-foreground/80">¥{totalCost.toLocaleString()}</span>
						</div>
					</div>
				</div>

				{/* Terms and Conditions */}
				<div className="text-sm text-foreground/70">
					<p>
						予約を確定すると、当施設の
						<a href="#" className="text-accent hover:underline">利用規約</a>
						に同意したものとみなされます。
					</p>
				</div>

				{submitStatus === 'error' && (
					<div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
						予約の処理中にエラーが発生しました。もう一度お試しください。
					</div>
				)}
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