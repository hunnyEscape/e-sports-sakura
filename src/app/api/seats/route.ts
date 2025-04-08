import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase';
import { SeatDocument, ReservationDocument } from '@/types/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function GET(req: NextRequest) {
	try {
		// Get status filter from query params (if any)
		const url = new URL(req.url);
		const status = url.searchParams.get('status');

		// Build query for seats collection
		let seatsQuery = collection(db, 'seats');

		// If status filter is provided, apply it
		if (status) {
			seatsQuery = query(seatsQuery, where('status', '==', status));
		}

		// Execute query
		const querySnapshot = await getDocs(seatsQuery);

		// Convert snapshot to data array
		const seats = querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as SeatDocument[];

		// Get date param for availability check
		const date = url.searchParams.get('date');

		// If date is provided, fetch reservations for that date to check availability
		if (date) {
			const reservationsQuery = query(
				collection(db, 'reservations'),
				where('date', '==', date),
				where('status', '==', 'confirmed')
			);

			const reservationsSnapshot = await getDocs(reservationsQuery);
			const reservations = reservationsSnapshot.docs.map(doc => doc.data()) as ReservationDocument[];

			// Enhance seats with availability info
			const seatsWithAvailability = seats.map(seat => {
				const seatReservations = reservations.filter(r => r.seatId === seat.seatId);

				// Calculate occupied time slots
				const occupiedTimeSlots = seatReservations.map(reservation => ({
					startTime: reservation.startTime,
					endTime: reservation.endTime
				}));

				return {
					...seat,
					reservations: occupiedTimeSlots,
					isFullyBooked: occupiedTimeSlots.length > 0 &&
						// This is a simplified check - in production, you'd want to check
						// if the entire operating hours are covered by reservations
						occupiedTimeSlots.some(slot => slot.startTime === '10:00' && slot.endTime === '22:00')
				};
			});

			return NextResponse.json({ seats: seatsWithAvailability });
		}

		return NextResponse.json({ seats });
	} catch (error) {
		console.error('Error fetching seats:', error);
		return NextResponse.json(
			{ error: '座席情報の取得に失敗しました' },
			{ status: 500 }
		);
	}
}

// This endpoint can be used to check availability for a specific date and time
export async function POST(req: NextRequest) {
	try {
		const { date, startTime, endTime } = await req.json();

		// Validate required parameters
		if (!date || !startTime || !endTime) {
			return NextResponse.json(
				{ error: '日付と時間の指定が必要です' },
				{ status: 400 }
			);
		}

		// Query seats
		const seatsSnapshot = await getDocs(collection(db, 'seats'));
		const seats = seatsSnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as SeatDocument[];

		// Query reservations for the specified date
		const reservationsQuery = query(
			collection(db, 'reservations'),
			where('date', '==', date),
			where('status', '==', 'confirmed')
		);

		const reservationsSnapshot = await getDocs(reservationsQuery);
		const reservations = reservationsSnapshot.docs.map(doc => doc.data()) as ReservationDocument[];

		// Convert times to Date objects for comparison
		const requestStart = new Date(`${date}T${startTime}`);
		const requestEnd = new Date(`${date}T${endTime}`);

		// Check availability for each seat
		const availability = seats.map(seat => {
			const seatReservations = reservations.filter(r => r.seatId === seat.seatId);

			// Check if there's any conflict with existing reservations
			const hasConflict = seatReservations.some(reservation => {
				const existingStart = new Date(`${reservation.date}T${reservation.startTime}`);
				const existingEnd = new Date(`${reservation.date}T${reservation.endTime}`);

				return (
					(requestStart < existingEnd && requestEnd > existingStart) ||
					(existingStart < requestEnd && existingEnd > requestStart)
				);
			});

			return {
				seatId: seat.seatId,
				name: seat.name,
				isAvailable: !hasConflict && seat.status === 'available',
				ratePerMinute: seat.ratePerMinute || 0
			};
		});

		return NextResponse.json({ availability });
	} catch (error) {
		console.error('Error checking availability:', error);
		return NextResponse.json(
			{ error: '空き状況の確認に失敗しました' },
			{ status: 500 }
		);
	}
}