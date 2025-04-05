import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';

// Firebase Admin初期化
initAdminApp();

export async function POST(request: NextRequest) {
	try {
		// トークンの検証
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		if (!token) {
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
		}

		// Firebaseでトークンを検証
		const decodedToken = await getAuth().verifyIdToken(token);
		const userId = decodedToken.uid;

		// Firestoreからユーザーデータを取得
		const db = getFirestore();
		const userRef = db.collection('users').doc(userId);
		const userDoc = await userRef.get();

		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// eKYCデータをリセット
		await userRef.update({
			eKYC: {
				status: 'pending',
				resetAt: new Date().toISOString()
			},
			// 登録ステップをeKYCに戻す
			registrationStep: 0
		});

		return NextResponse.json({ success: true, message: 'eKYC status reset successfully' });

	} catch (error) {
		console.error('Error resetting eKYC status:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}