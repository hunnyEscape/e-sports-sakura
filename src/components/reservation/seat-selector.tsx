// src/components/reservation/seat-selector.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useReservation } from '@/context/reservation-context';
import { SeatDocument } from '@/types/firebase';
import { Loader2 } from 'lucide-react';

interface SeatSelectorProps {
	onSeatSelect: (seat: SeatDocument) => void;
	date: Date;
}

const SeatSelector: React.FC<SeatSelectorProps> = ({ onSeatSelect, date }) => {
	const { selectedBranch } = useReservation();
	const [seats, setSeats] = useState<SeatDocument[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

	useEffect(() => {
		const fetchSeats = async () => {
			if (!selectedBranch) {
				setError('支店が選択されていません');
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				// Query seats collection for seats with matching branchCode
				const seatsQuery = query(
					collection(db, 'seats'),
					where('branchCode', '==', selectedBranch.branchCode),
					where('status', '==', 'available')
				);

				const seatsSnapshot = await getDocs(seatsQuery);
				const seatsData = seatsSnapshot.docs.map(doc => ({
					...doc.data(),
					seatId: doc.id
				})) as SeatDocument[];

				setSeats(seatsData);
				setError(null);
			} catch (err) {
				console.error('Error fetching seats:', err);
				setError('座席データの取得中にエラーが発生しました');
			} finally {
				setLoading(false);
			}
		};

		fetchSeats();
	}, [selectedBranch]);

	const handleSeatSelect = (seat: SeatDocument) => {
		setSelectedSeatId(seat.seatId);
		onSeatSelect(seat);
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-accent" />
				<span className="ml-2">座席情報を読み込んでいます...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-destructive/10 border border-destructive rounded-md text-destructive">
				<p>{error}</p>
			</div>
		);
	}

	if (seats.length === 0) {
		return (
			<div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
				<p>この支店には利用可能な座席がありません。別の支店を選択してください。</p>
			</div>
		);
	}

	return (
		<div className="mt-4">
			<h3 className="text-lg font-medium mb-4">座席を選択してください</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
				{seats.map((seat) => (
					<button
						key={seat.seatId}
						onClick={() => handleSeatSelect(seat)}
						className={`p-4 border rounded-md transition-colors ${selectedSeatId === seat.seatId
								? 'bg-accent text-white border-accent'
								: 'bg-background hover:bg-accent/10 border-border'
							}`}
					>
						<p className="font-medium">{seat.name}</p>
						<p className="text-sm mt-1 text-foreground/70">
							{seat.seatType} - 席番号: {seat.seatNumber}
						</p>
						<p className="text-sm mt-1 text-foreground/70">
							料金: ¥{seat.ratePerHour}/時間
						</p>
					</button>
				))}
			</div>
		</div>
	);
};

export default SeatSelector;