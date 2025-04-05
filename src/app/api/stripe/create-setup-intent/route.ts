import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

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

		const userData = userDoc.data();

		// Stripe顧客IDを確認
		if (!userData?.stripe?.customerId) {
			// 顧客IDがない場合は顧客作成APIを呼び出すよう促す
			return NextResponse.json(
				{ error: 'Stripe customer not created yet. Call create-customer endpoint first.' },
				{ status: 400 }
			);
		}

		// Setup Intentを作成
		const setupIntent = await stripe.setupIntents.create({
			customer: userData.stripe.customerId,
			payment_method_types: ['card'],
			metadata: {
				userId: userId
			}
		});

		return NextResponse.json({
			clientSecret: setupIntent.client_secret
		});

	} catch (error) {
		console.error('Error creating Setup Intent:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}