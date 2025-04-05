import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';

// Firebase Admin初期化
initAdminApp();

// 開発環境用のモック決済設定API
export async function POST(request: NextRequest) {
	// 本番環境では使用不可
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json(
			{ error: 'This endpoint is only available in development mode' },
			{ status: 403 }
		);
	}

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

		// モックのStripe顧客データを設定
		await userRef.update({
			'stripe': {
				customerId: `mock_cus_${Date.now()}`,
				paymentMethodId: `mock_pm_${Date.now()}`,
				paymentSetupCompleted: true,
				updatedAt: new Date().toISOString()
			},
			'registrationStep': 1, // 決済情報登録ステップ完了
		});

		return NextResponse.json({
			success: true,
			message: 'Mock payment setup completed'
		});

	} catch (error) {
		console.error('Error in mock payment setup:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}