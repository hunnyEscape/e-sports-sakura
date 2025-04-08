import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { SeatDocument, ReservationDocument } from '@/types/firebase';

// 予約コンテキスト用の追加型
interface SelectedTimeSlots {
	seatId: string;
	startTime: string;
	endTime: string;
}

interface DateAvailability {
	[date: string]: 'available' | 'limited' | 'booked' | 'unknown';
}

interface ReservationContextType {
	seats: SeatDocument[];
	reservations: ReservationDocument[];
	selectedDate: Date | null;
	setSelectedDate: (date: Date | null) => void;
	selectedTimeSlots: SelectedTimeSlots;
	setSelectedTimeSlots: (slots: SelectedTimeSlots) => void;
	dateAvailability: DateAvailability;
	fetchSeats: () => Promise<void>;
	fetchReservations: (date?: Date) => Promise<void>;
	createReservation: (reservation: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
	cancelReservation: (reservationId: string) => Promise<void>;
	isLoading: boolean;
	error: string | null;
}

// Create the context
const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

// Provider component
export const ReservationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { user } = useAuth();

	const [seats, setSeats] = useState<SeatDocument[]>([]);
	const [reservations, setReservations] = useState<ReservationDocument[]>([]);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTimeSlots, setSelectedTimeSlots] = useState<SelectedTimeSlots>({
		seatId: '',
		startTime: '',
		endTime: ''
	});
	const [dateAvailability, setDateAvailability] = useState<DateAvailability>({});
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch seats (mock implementation for now)
	const fetchSeats = async (): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			// This will be replaced by an actual API call later
			// For now, we'll use mock data
			const mockSeats: SeatDocument[] = [
				{
					seatId: 'pc01',
					name: 'Gaming PC #1',
					ipAddress: '192.168.1.101',
					ratePerMinute: 10,
					status: 'available',
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: 1,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					seatId: 'pc02',
					name: 'Gaming PC #2',
					ipAddress: '192.168.1.102',
					ratePerMinute: 10,
					status: 'available',
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: 2,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					seatId: 'pc03',
					name: 'Gaming PC #3',
					ipAddress: '192.168.1.103',
					ratePerMinute: 5,
					status: 'available',
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: 3,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					seatId: 'pc04',
					name: 'Gaming PC #4',
					ipAddress: '192.168.1.104',
					ratePerMinute: 10,
					status: 'available',
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: 4,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					seatId: 'pc05',
					name: 'Gaming PC #5',
					ipAddress: '192.168.1.105',
					ratePerMinute: 10,
					status: 'available',
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: 5,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					seatId: 'pc06',
					name: 'Gaming PC #6',
					ipAddress: '192.168.1.106',
					ratePerMinute: 5,
					status: 'available',
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: 6,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					seatId: 'pc07',
					name: 'Gaming PC #7',
					ipAddress: '192.168.1.107',
					ratePerMinute: 5,
					status: 'available',
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: 7,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					seatId: 'pc08',
					name: 'Gaming PC #8',
					ipAddress: '192.168.1.108',
					ratePerMinute: 5,
					status: 'available',
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: 8,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
			];

			setSeats(mockSeats);
		} catch (err) {
			console.error('Error fetching seats:', err);
			setError('座席情報の取得に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch reservations for a specific date (mock implementation for now)
	const fetchReservations = async (date?: Date): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			const targetDate = date || selectedDate;
			if (!targetDate) return;

			const dateStr = targetDate.toISOString().split('T')[0];

			// This will be replaced by an actual API call later
			// For now, we'll use mock data
			const mockReservations: ReservationDocument[] = [
				{
					id: 'res001',
					userId: 'user1',
					seatId: 'pc01',
					seatName: 'Gaming PC #1',
					date: dateStr,
					startTime: '14:00',
					endTime: '16:00',
					duration: 120,
					status: 'confirmed',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					id: 'res002',
					userId: 'user2',
					seatId: 'pc02',
					seatName: 'Gaming PC #2',
					date: dateStr,
					startTime: '18:00',
					endTime: '20:00',
					duration: 120,
					status: 'confirmed',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			];

			setReservations(mockReservations);

			// Update date availability (this would come from an API)
			updateDateAvailability();
		} catch (err) {
			console.error('Error fetching reservations:', err);
			setError('予約情報の取得に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	};

	// Update the availability status for dates (mock implementation)
	const updateDateAvailability = () => {
		const availability: DateAvailability = {};

		// Get the current date
		const now = new Date();

		// Generate availability data for the next 30 days
		for (let i = 0; i < 30; i++) {
			const date = new Date(now);
			date.setDate(now.getDate() + i);
			const dateStr = date.toISOString().split('T')[0];

			// Randomly assign availability status for demo purposes
			// In real implementation, this would be calculated based on actual reservation data
			const rand = Math.random();
			if (rand < 0.2) {
				availability[dateStr] = 'booked';
			} else if (rand < 0.5) {
				availability[dateStr] = 'limited';
			} else {
				availability[dateStr] = 'available';
			}
		}

		setDateAvailability(availability);
	};

	// Create a new reservation (mock implementation for now)
	const createReservation = async (reservation: Omit<ReservationDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			if (!user) {
				throw new Error('予約するにはログインが必要です');
			}

			// This will be replaced by an actual API call later
			console.log('Creating reservation:', {
				...reservation,
				userId: user.uid
			});

			// Simulate API call success
			setTimeout(() => {
				setIsLoading(false);

				// Reset selection
				setSelectedTimeSlots({
					seatId: '',
					startTime: '',
					endTime: ''
				});

				// Refresh reservations
				fetchReservations();
			}, 1000);
		} catch (err) {
			console.error('Error creating reservation:', err);
			setError('予約の作成に失敗しました。もう一度お試しください。');
			setIsLoading(false);
		}
	};

	// Cancel a reservation (mock implementation for now)
	const cancelReservation = async (reservationId: string): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			if (!user) {
				throw new Error('予約をキャンセルするにはログインが必要です');
			}

			// This will be replaced by an actual API call later
			console.log('Cancelling reservation:', reservationId);

			// Simulate API call success
			setTimeout(() => {
				setIsLoading(false);

				// Refresh reservations
				fetchReservations();
			}, 1000);
		} catch (err) {
			console.error('Error cancelling reservation:', err);
			setError('予約のキャンセルに失敗しました。もう一度お試しください。');
			setIsLoading(false);
		}
	};

	// Initialize seats data when the component mounts
	useEffect(() => {
		fetchSeats();
		// Update availability for demo
		updateDateAvailability();
	}, []);

	// Fetch reservations when selected date changes
	useEffect(() => {
		if (selectedDate) {
			fetchReservations(selectedDate);
		}
	}, [selectedDate]);

	const value = {
		seats,
		reservations,
		selectedDate,
		setSelectedDate,
		selectedTimeSlots,
		setSelectedTimeSlots,
		dateAvailability,
		fetchSeats,
		fetchReservations,
		createReservation,
		cancelReservation,
		isLoading,
		error
	};

	return (
		<ReservationContext.Provider value={value}>
			{children}
		</ReservationContext.Provider>
	);
};

// Custom hook for using the reservation context
export const useReservation = (): ReservationContextType => {
	const context = useContext(ReservationContext);
	if (context === undefined) {
		throw new Error('useReservation must be used within a ReservationProvider');
	}
	return context;
};

export default ReservationContext;