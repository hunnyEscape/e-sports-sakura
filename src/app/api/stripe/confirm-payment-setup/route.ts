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

		// リクエストボディを取得
		const body = await request.json();
		const { setupIntentId, paymentMethodId } = body;

		if (!setupIntentId || !paymentMethodId) {
			return NextResponse.json(
				{ error: 'Setup Intent ID and Payment Method ID are required' },
				{ status: 400 }
			);
		}

		// Setup Intentを取得して確認
		const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

		if (setupIntent.status !== 'succeeded') {
			return NextResponse.json(
				{ error: 'Setup Intent not succeeded' },
				{ status: 400 }
			);
		}

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
			return NextResponse.json(
				{ error: 'Stripe customer not found' },
				{ status: 400 }
			);
		}

		// 支払い方法をデフォルトに設定
		await stripe.customers.update(userData.stripe.customerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId
			}
		});

		// Firestoreにユーザーの支払い状態を更新
		await userRef.update({
			'stripe.paymentMethodId': paymentMethodId,
			'stripe.paymentSetupCompleted': true,
			'stripe.updatedAt': new Date().toISOString(),
			'registrationStep': 1, // 決済情報登録ステップ完了
		});

		return NextResponse.json({ success: true });

	} catch (error) {
		console.error('Error confirming payment setup:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}