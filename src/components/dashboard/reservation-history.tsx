// /src/components/dashboard/reservation-history.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Loader, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
// 予約データの型定義
interface Reservation {
	id?: string;
	userId: string;
	userEmail?: string;
	seatId: string;
	seatName?: string;
	branchId?: string;
	branchName?: string;
	date: string;
	startTime: string;
	endTime: string;
	duration: number;
	status: 'confirmed' | 'cancelled' | 'completed';
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

const ReservationHistory: React.FC = () => {
	const { user } = useAuth();
	const [reservations, setReservations] = useState<Reservation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAll, setShowAll] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);

	// Fetch reservations from Firestore
	const fetchReservations = async () => {
		if (!user) return;

		setIsLoading(true);
		setError(null);

		try {
			console.log('Fetching reservations for user:', user.uid);

			// Firestoreからユーザーの予約を取得
			const reservationsRef = collection(db, 'reservations');
			const reservationsQuery = query(
				reservationsRef,
				where('userId', '==', user.uid)
			);

			const querySnapshot = await getDocs(reservationsQuery);

			if (querySnapshot.empty) {
				console.log('No reservations found');
				setReservations([]);
				setIsLoading(false);
				return;
			}

			console.log(`Found ${querySnapshot.size} reservations`);

			// 現在の日付を取得
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const todayStr = today.toISOString().split('T')[0];

			// 予約データを処理
			const reservationsData: Reservation[] = [];
			querySnapshot.forEach((doc) => {
				const data = doc.data() as Omit<Reservation, 'id'>;

				// 基本的な型安全性チェック
				if (!data.date || !data.startTime || !data.endTime || !data.seatId) {
					console.warn('Skipping reservation with missing required fields:', doc.id);
					return;
				}

				const reservation: Reservation = {
					id: doc.id,
					...data,
					// 必須フィールドが欠けている場合のデフォルト値を設定
					status: data.status || 'confirmed',
					duration: data.duration || 0,
					userId: data.userId || user.uid,
					createdAt: data.createdAt || new Date().toISOString(),
					updatedAt: data.updatedAt || new Date().toISOString()
				};

				// 過去の予約で、statusがconfirmedのものは自動的にcompletedに変更
				if (reservation.status === 'confirmed' && reservation.date < todayStr) {
					reservation.status = 'completed';

					// Firestoreの更新は別途非同期で行う（UIブロックを避けるため）
					updateReservationStatus(doc.id, 'completed').catch(console.error);
				}

				reservationsData.push(reservation);
			});

			console.log('Processed reservations:', reservationsData);

			// 未来の予約は日付昇順、過去の予約は日付降順でソート
			const sortedReservations = reservationsData.sort((a, b) => {
				if (a.status === 'confirmed' && b.status === 'confirmed') {
					return new Date(a.date).getTime() - new Date(b.date).getTime();
				} else if ((a.status === 'completed' || a.status === 'cancelled') &&
					(b.status === 'completed' || b.status === 'cancelled')) {
					return new Date(b.date).getTime() - new Date(a.date).getTime();
				}
				return 0;
			});

			setReservations(sortedReservations);
		} catch (err) {
			console.error('Error fetching reservations:', err);
			setError('予約履歴の取得に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	};

	// 予約ステータスを更新する非同期関数
	const updateReservationStatus = async (reservationId: string, status: string) => {
		try {
			const reservationRef = doc(db, 'reservations', reservationId);
			await updateDoc(reservationRef, {
				status,
				updatedAt: new Date().toISOString()
			});
			console.log(`Updated reservation ${reservationId} status to ${status}`);
		} catch (err) {
			console.error(`Failed to update reservation ${reservationId} status:`, err);
		}
	};

	useEffect(() => {
		fetchReservations();
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
	const handleCancelReservation = async (reservationId: string) => {
		if (!reservationId || !confirm('予約をキャンセルしますか？')) return;

		setIsCancelling(true);

		try {
			// Update local state immediately for better UX
			setReservations(prevReservations =>
				prevReservations.map(reservation =>
					reservation.id === reservationId
						? { ...reservation, status: 'cancelled' }
						: reservation
				)
			);

			// Update in Firestore
			const reservationRef = doc(db, 'reservations', reservationId);
			await updateDoc(reservationRef, {
				status: 'cancelled',
				updatedAt: new Date().toISOString()
			});

			console.log(`予約 ${reservationId} をキャンセルしました`);
		} catch (err) {
			console.error('Error cancelling reservation:', err);

			// Revert local state if the operation failed
			setReservations(prevReservations =>
				prevReservations.map(reservation =>
					reservation.id === reservationId && reservation.status === 'cancelled'
						? { ...reservation, status: 'confirmed' }
						: reservation
				)
			);

			alert('予約のキャンセルに失敗しました。もう一度お試しください。');
		} finally {
			setIsCancelling(false);
		}
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
							onClick={() => handleCancelReservation(reservation.id || '')}
							disabled={isCancelling}
							className="text-xs text-foreground/60 hover:text-red-400 transition-colors disabled:opacity-50"
						>
							{isCancelling ? '処理中...' : 'キャンセル'}
						</button>
					)}
				</div>

				{/* Branch name if available */}
				{reservation.branchName && (
					<div className="flex items-start mb-2">
						<MapPin className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
						<div className="text-foreground font-medium">
							{reservation.branchName}支店
						</div>
					</div>
				)}

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
						{reservation.seatName || reservation.seatId}
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
					onClick={fetchReservations}
					className="mt-2 px-4 py-2 inline-flex items-center text-sm bg-accent/10 hover:bg-accent/20 text-accent rounded-md transition-colors"
				>
					<RefreshCw className="w-4 h-4 mr-2" />
					再読み込み
				</button>
			</div>
		);
	}

	return (
		<div className="reservation-history">
			<div className="my-8 flex justify-center">
				<Link
					href="/reservation"
					className="border border-border bg-border/5 hover:bg-border/10 rounded-xl p-6 flex flex-col items-center justify-center transition-colors w-full max-w-xs"
				>
					<Calendar className="w-8 h-8 text-accent mb-2" />
					<span className="font-medium text-foreground">新規予約</span>
					<span className="text-sm text-foreground/60">座席を予約する</span>
				</Link>
			</div>
			<h2 className="text-xl font-bold text-foreground ml-3 mb-6 flex items-center">
				<Calendar className="mr-2" /> 予約履歴
			</h2>

			{reservations.length === 0 ? (
				<div className="p-6 text-center bg-border/10 rounded-lg">
					<p className="text-foreground/70 mb-4">予約情報がありません</p>
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
				</>
			)}
		</div>
	);
};

export default ReservationHistory;