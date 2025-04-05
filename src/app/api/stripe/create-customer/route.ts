import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { getOrCreateCustomer } from '@/lib/stripe';

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

		// ユーザーデータの取得
		const userRecord = await getAuth().getUser(userId);
		const email = userRecord.email || '';

		if (!email) {
			return NextResponse.json({ error: 'User email not found' }, { status: 400 });
		}

		// Stripe顧客の作成または取得
		const customer = await getOrCreateCustomer(userId, email);

		// Firestoreに顧客IDを保存
		const db = getFirestore();
		await db.collection('users').doc(userId).update({
			'stripe': {
				customerId: customer.id,
				createdAt: new Date().toISOString()
			}
		});

		return NextResponse.json({
			customerId: customer.id
		});

	} catch (error) {
		console.error('Error creating Stripe customer:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}