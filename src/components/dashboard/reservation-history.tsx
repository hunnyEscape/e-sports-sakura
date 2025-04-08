import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Loader, Ban, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface Reservation {
	id: string;
	userId: string;
	seatId: string;
	seatName: string;
	date: string;
	startTime: string;
	endTime: string;
	duration: number;
	status: 'confirmed' | 'cancelled' | 'completed';
	createdAt: string;
	updatedAt: string;
}

const ReservationHistory: React.FC = () => {
	const { user } = useAuth();
	const [reservations, setReservations] = useState<Reservation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);

	// Fetch reservations (mock implementation for now)
	useEffect(() => {
		if (!user) return;

		setIsLoading(true);
		setError(null);

		// Simulate API call with setTimeout
		const timer = setTimeout(() => {
			try {
				// This would be an actual API call in production
				const mockReservations: Reservation[] = [
					{
						id: 'res001',
						userId: user.uid,
						seatId: 'pc01',
						seatName: 'Gaming PC #1',
						date: '2025-04-10',
						startTime: '14:00',
						endTime: '16:00',
						duration: 120,
						status: 'completed',
						createdAt: '2025-04-05T10:00:00Z',
						updatedAt: '2025-04-05T10:00:00Z'
					},
					{
						id: 'res002',
						userId: user.uid,
						seatId: 'pc02',
						seatName: 'Gaming PC #2',
						date: '2025-04-15',
						startTime: '18:00',
						endTime: '20:00',
						duration: 120,
						status: 'confirmed',
						createdAt: '2025-04-05T15:30:00Z',
						updatedAt: '2025-04-05T15:30:00Z'
					},
					{
						id: 'res003',
						userId: user.uid,
						seatId: 'pc01',
						seatName: 'Gaming PC #1',
						date: '2025-04-08',
						startTime: '20:00',
						endTime: '22:00',
						duration: 120,
						status: 'cancelled',
						createdAt: '2025-04-04T09:15:00Z',
						updatedAt: '2025-04-04T14:20:00Z'
					},
					{
						id: 'res004',
						userId: user.uid,
						seatId: 'pc03',
						seatName: 'Standard PC #1',
						date: '2025-04-20',
						startTime: '10:00',
						endTime: '12:00',
						duration: 120,
						status: 'confirmed',
						createdAt: '2025-04-06T18:45:00Z',
						updatedAt: '2025-04-06T18:45:00Z'
					}
				];

				// Sort reservations by date (newest first for upcoming, oldest first for past)
				const sortedReservations = mockReservations.sort((a, b) => {
					if (a.status === 'confirmed' && b.status === 'confirmed') {
						return new Date(a.date).getTime() - new Date(b.date).getTime();
					} else if (a.status === 'completed' && b.status === 'completed') {
						return new Date(b.date).getTime() - new Date(a.date).getTime();
					}
					return 0;
				});

				setReservations(sortedReservations);
				setIsLoading(false);
			} catch (err) {
				console.error('Error fetching reservations:', err);
				setError('予約履歴の取得に失敗しました。もう一度お試しください。');
				setIsLoading(false);
			}
		}, 1000);

		return () => clearTimeout(timer);
	}, [user]);

	// Get upcoming reservations
	const upcomingReservations = reservations.filter(
		reservation => reservation.status === 'confirmed'
	);

	// Get past reservations
	const pastReservations = reservations.filter(
		reservation => reservation.status === 'completed' || reservation.status === 'cancelled'
	);

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

		return `${year}年${month}月${day}日(${dayOfWeek})`;
	};

	// Handle cancel reservation
	const handleCancelReservation = (reservationId: string) => {
		if (!confirm('予約をキャンセルしますか？')) return;

		// Update local state immediately for better UX
		setReservations(prevReservations =>
			prevReservations.map(reservation =>
				reservation.id === reservationId
					? { ...reservation, status: 'cancelled' }
					: reservation
			)
		);

		// This would be an API call in production
		console.log(`Cancelling reservation: ${reservationId}`);
	};

	// Reservation card component
	const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
		const isUpcoming = reservation.status === 'confirmed';
		const isPast = reservation.status === 'completed';
		const isCancelled = reservation.status === 'cancelled';

		return (
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className={`
          p-4 mb-4 rounded-lg border transition-colors
          ${isUpcoming ? 'border-accent/30 bg-accent/5' : ''}
          ${isPast ? 'border-border bg-background/5' : ''}
          ${isCancelled ? 'border-border/30 bg-background/5 opacity-70' : ''}
        `}
			>
				{/* Status badge */}
				<div className="flex justify-between items-start mb-3">
					<div
						className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs
              ${isUpcoming ? 'bg-accent/20 text-accent' : ''}
              ${isPast ? 'bg-highlight/20 text-highlight' : ''}
              ${isCancelled ? 'bg-red-400/20 text-red-400' : ''}
            `}
					>
						{isUpcoming && <Clock size={12} className="mr-1" />}
						{isPast && <CheckCircle size={12} className="mr-1" />}
						{isCancelled && <Ban size={12} className="mr-1" />}

						{isUpcoming && '予約済み'}
						{isPast && '利用済み'}
						{isCancelled && 'キャンセル済み'}
					</div>

					{/* Cancel button for upcoming reservations */}
					{isUpcoming && (
						<button
							onClick={() => handleCancelReservation(reservation.id)}
							className="text-xs text-foreground/60 hover:text-red-400 transition-colors"
						>
							キャンセル
						</button>
					)}
				</div>

				{/* Date */}
				<div className="flex items-start mb-2">
					<Calendar className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
					<div className="text-foreground font-medium">
						{formatDate(reservation.date)}
					</div>
				</div>

				{/* Time */}
				<div className="flex items-start mb-2">
					<Clock className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
					<div className="text-foreground">
						{reservation.startTime} - {reservation.endTime}
						<span className="text-foreground/60 text-sm ml-2">
							({reservation.duration}分)
						</span>
					</div>
				</div>

				{/* Seat */}
				<div className="flex items-start">
					<MapPin className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
					<div className="text-foreground">
						{reservation.seatName}
					</div>
				</div>
			</motion.div>
		);
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-10">
				<Loader className="w-8 h-8 text-accent animate-spin mb-4" />
				<p className="text-foreground/70">予約情報を読み込み中...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
				<p className="text-red-500 mb-2">{error}</p>
				<button
					onClick={() => window.location.reload()}
					className="text-sm text-accent hover:underline"
				>
					再読み込み
				</button>
			</div>
		);
	}

	return (
		<div className="reservation-history">
			<h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
				<Calendar className="mr-2" /> 予約履歴
			</h2>

			{reservations.length === 0 ? (
				<div className="p-6 text-center bg-border/10 rounded-lg">
					<p className="text-foreground/70 mb-4">予約情報がありません</p>
					<button
						onClick={() => window.location.href = '/reservation'}
						className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
					>
						新規予約をする
					</button>
				</div>
			) : (
				<>
					{/* Upcoming reservations */}
					{upcomingReservations.length > 0 && (
						<div className="mb-8">
							<h3 className="text-lg font-medium text-foreground mb-4">今後の予約</h3>
							<div>
								{upcomingReservations.map(reservation => (
									<ReservationCard key={reservation.id} reservation={reservation} />
								))}
							</div>
						</div>
					)}

					{/* Past reservations */}
					{pastReservations.length > 0 && (
						<div>
							<h3 className="text-lg font-medium text-foreground mb-4">過去の予約</h3>
							<div>
								{(showAll ? pastReservations : pastReservations.slice(0, 3)).map(reservation => (
									<ReservationCard key={reservation.id} reservation={reservation} />
								))}

								{pastReservations.length > 3 && !showAll && (
									<button
										onClick={() => setShowAll(true)}
										className="w-full py-2 border border-border rounded-md text-foreground/70 hover:bg-border/10 transition-colors text-sm"
									>
										もっと見る（残り{pastReservations.length - 3}件）
									</button>
								)}
							</div>
						</div>
					)}

					{/* New reservation button */}
					<div className="mt-8 text-center">
						<button
							onClick={() => window.location.href = '/reservation'}
							className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
						>
							新規予約をする
						</button>
					</div>
				</>
			)}
		</div>
	);
};

export default ReservationHistory;