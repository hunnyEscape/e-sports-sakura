import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

interface Params {
	params: {
		id: string;
	};
}

export async function GET(req: NextRequest, { params }: Params) {
	const { id } = params;

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

		// Verify token (in production, use proper Firebase Admin SDK verification)
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Get reservation document
		const reservationDoc = await getDoc(doc(db, 'reservations', id));

		if (!reservationDoc.exists()) {
			return NextResponse.json(
				{ error: '予約が見つかりません' },
				{ status: 404 }
			);
		}

		const reservation = {
			id: reservationDoc.id,
			...reservationDoc.data()
		};

		// Check if the user is authorized to access this reservation
		if (reservation.id !== user.uid) {
			return NextResponse.json(
				{ error: 'この予約にアクセスする権限がありません' },
				{ status: 403 }
			);
		}

		return NextResponse.json({ reservation });
	} catch (error) {
		console.error('Error fetching reservation:', error);
		return NextResponse.json(
			{ error: '予約情報の取得に失敗しました' },
			{ status: 500 }
		);
	}
}

export async function PATCH(req: NextRequest, { params }: Params) {
	const { id } = params;

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

		// Verify token (in production, use proper Firebase Admin SDK verification)
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Get reservation document
		const reservationDoc = await getDoc(doc(db, 'reservations', id));

		if (!reservationDoc.exists()) {
			return NextResponse.json(
				{ error: '予約が見つかりません' },
				{ status: 404 }
			);
		}

		const reservation = reservationDoc.data();

		// Check if the user is authorized to modify this reservation
		if (reservation.userId !== user.uid) {
			return NextResponse.json(
				{ error: 'この予約を変更する権限がありません' },
				{ status: 403 }
			);
		}

		// Parse request body
		const updates = await req.json();

		// Only allow specific fields to be updated
		const allowedUpdates = ['notes', 'status'];
		const sanitizedUpdates: Record<string, any> = {};

		for (const key of allowedUpdates) {
			if (key in updates) {
				sanitizedUpdates[key] = updates[key];
			}
		}

		// Add updated timestamp
		sanitizedUpdates.updatedAt = Timestamp.now();

		// Update document
		await updateDoc(doc(db, 'reservations', id), sanitizedUpdates);

		return NextResponse.json({
			id,
			...reservation,
			...sanitizedUpdates,
			message: '予約が更新されました'
		});
	} catch (error) {
		console.error('Error updating reservation:', error);
		return NextResponse.json(
			{ error: '予約の更新に失敗しました' },
			{ status: 500 }
		);
	}
}

export async function DELETE(req: NextRequest, { params }: Params) {
	const { id } = params;

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

		// Verify token (in production, use proper Firebase Admin SDK verification)
		const user = auth.currentUser;
		if (!user) {
			return NextResponse.json(
				{ error: '認証エラー: ユーザーが見つかりません' },
				{ status: 401 }
			);
		}

		// Get reservation document
		const reservationDoc = await getDoc(doc(db, 'reservations', id));

		if (!reservationDoc.exists()) {
			return NextResponse.json(
				{ error: '予約が見つかりません' },
				{ status: 404 }
			);
		}

		const reservation = reservationDoc.data();

		// Check if the user is authorized to delete this reservation
		if (reservation.userId !== user.uid) {
			return NextResponse.json(
				{ error: 'この予約を削除する権限がありません' },
				{ status: 403 }
			);
		}

		// Alternative: Instead of deleting, update status to 'cancelled'
		await updateDoc(doc(db, 'reservations', id), {
			status: 'cancelled',
			updatedAt: Timestamp.now()
		});

		return NextResponse.json({
			message: '予約がキャンセルされました'
		});
	} catch (error) {
		console.error('Error cancelling reservation:', error);
		return NextResponse.json(
			{ error: '予約のキャンセルに失敗しました' },
			{ status: 500 }
		);
	}
}