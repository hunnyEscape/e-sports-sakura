import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

// Firebase Admin初期化
initAdminApp();

/**
 * 開発環境用のモック課金API
 * 実際の環境では入退室管理システムから自動的に課金処理されます
 */
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

		// リクエストボディを取得
		const body = await request.json();
		const { durationMinutes = 60, description = 'テスト利用' } = body;

		// 料金計算 (10分あたり120円)
		const amountYen = Math.ceil(durationMinutes / 10) * 120;

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

		// Stripeで請求書を作成（テスト用）
		const invoice = await stripe.invoices.create({
			customer: userData.stripe.customerId,
			auto_advance: true, // 自動的に確定する
			description: description,
			metadata: {
				userId: userId,
				durationMinutes: String(durationMinutes),
				testMode: 'true'
			}
		});

		// 請求項目を追加
		await stripe.invoiceItems.create({
			customer: userData.stripe.customerId,
			amount: amountYen * 100, // 日本円をセントに変換（100倍）
			currency: 'jpy',
			description: `利用時間: ${durationMinutes}分`,
			invoice: invoice.id,
		});

		// 請求書を確定
		const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

		// 請求書を支払う（テスト用）
		const paidInvoice = await stripe.invoices.pay(invoice.id);

		// 利用履歴に記録
		await db.collection('usageHistory').add({
			userId,
			invoiceId: paidInvoice.id,
			amount: amountYen,
			durationMinutes,
			status: 'paid',
			timestamp: new Date().toISOString(),
			description: description,
			isTest: true
		});

		return NextResponse.json({
			success: true,
			invoiceId: paidInvoice.id,
			amount: amountYen,
			durationMinutes,
			paidAt: new Date().toISOString()
		});

	} catch (error) {
		console.error('Error in mock billing:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}