import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase';
import { ReservationDocument } from '@/types/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export async function GET(req: NextRequest) {
	// Check authentication
	const authHeader = req.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: '認証エラー: 有効なトークンが必要です' },
			{ status: 401 }
		);
	}

	try {
		// Extract token from header
		const token = authHeader.split('Bearer ')[1];

		// Verify token and get user ID (in production, use proper Firebase Admin SDK verification)
		// This is a simplified version for the purpose of this example
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Get userId from query parameters (optional filter)
		const url = new URL(req.url);
		const userId = url.searchParams.get('userId') || user.uid;
		const status = url.searchParams.get('status'); // optional status filter
		const dateFrom = url.searchParams.get('dateFrom'); // optional date range filter
		const dateTo = url.searchParams.get('dateTo'); // optional date range filter

		// Build Firestore query
		let reservationsQuery = query(
			collection(db, 'reservations'),
			where('userId', '==', userId),
			orderBy('date', 'desc')
		);

		// Apply additional filters if provided
		if (status) {
			reservationsQuery = query(
				reservationsQuery,
				where('status', '==', status)
			);
		}

		if (dateFrom) {
			reservationsQuery = query(
				reservationsQuery,
				where('date', '>=', dateFrom)
			);
		}

		if (dateTo) {
			reservationsQuery = query(
				reservationsQuery,
				where('date', '<=', dateTo)
			);
		}

		// Execute query
		const querySnapshot = await getDocs(reservationsQuery);

		// Convert snapshot to data array
		const reservations = querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as ReservationDocument[];

		return NextResponse.json({ reservations });
	} catch (error) {
		console.error('Error fetching reservations:', error);
		return NextResponse.json(
			{ error: '予約情報の取得に失敗しました' },
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
	// Check authentication
	const authHeader = req.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: '認証エラー: 有効なトークンが必要です' },
			{ status: 401 }
		);
	}

	try {
		// Extract token from header
		const token = authHeader.split('Bearer ')[1];

		// Verify token and get user ID (in production, use proper Firebase Admin SDK verification)
		// This is a simplified version for the purpose of this example
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Parse request body
		const { seatId, date, startTime, endTime, notes } = await req.json();

		// Validate required fields
		if (!seatId || !date || !startTime || !endTime) {
			return NextResponse.json(
				{ error: '必須項目が不足しています' },
				{ status: 400 }
			);
		}

		// Check if the seat is available for the requested time
		// 1. Get all reservations for the specified seat and date
		const conflictQuery = query(
			collection(db, 'reservations'),
			where('seatId', '==', seatId),
			where('date', '==', date),
			where('status', '==', 'confirmed')
		);

		const conflictSnapshot = await getDocs(conflictQuery);

		// 2. Check for time conflicts
		const requestStart = new Date(`${date}T${startTime}`);
		const requestEnd = new Date(`${date}T${endTime}`);

		const hasConflict = conflictSnapshot.docs.some(doc => {
			const reservation = doc.data();
			const existingStart = new Date(`${reservation.date}T${reservation.startTime}`);
			const existingEnd = new Date(`${reservation.date}T${reservation.endTime}`);

			// Check if there's an overlap
			return (
				(requestStart < existingEnd && requestEnd > existingStart) ||
				(existingStart < requestEnd && existingEnd > requestStart)
			);
		});

		if (hasConflict) {
			return NextResponse.json(
				{ error: '指定した時間に予約が既に存在します' },
				{ status: 409 }
			);
		}

		// Calculate duration in minutes
		const durationMs = requestEnd.getTime() - requestStart.getTime();
		const durationMinutes = Math.round(durationMs / (1000 * 60));

		// Get seat details to include name
		const seatsQuery = query(
			collection(db, 'seats'),
			where('seatId', '==', seatId)
		);

		const seatSnapshot = await getDocs(seatsQuery);
		let seatName = '';

		if (!seatSnapshot.empty) {
			seatName = seatSnapshot.docs[0].data().name || '';
		}

		// Create new reservation
		const newReservation: Omit<ReservationDocument, 'id'> = {
			userId: user.uid,
			userEmail: user.email,
			seatId,
			seatName,
			date,
			startTime,
			endTime,
			duration: durationMinutes,
			status: 'confirmed',
			notes: notes || '',
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		};

		// Add to Firestore
		const docRef = await addDoc(collection(db, 'reservations'), newReservation);

		return NextResponse.json({
			id: docRef.id,
			...newReservation,
			message: '予約が正常に作成されました'
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating reservation:', error);
		return NextResponse.json(
			{ error: '予約の作成に失敗しました' },
			{ status: 500 }
		);
	}
}