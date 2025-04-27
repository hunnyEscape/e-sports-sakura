import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';

// Firebaseの初期化
initAdminApp();
const db = getFirestore();

// Stripeの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
	apiVersion: '2025-03-31.basil',
});

// 認証チェック関数
async function authenticateUser(req: NextRequest) {
	try {
		const authHeader = req.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return { authenticated: false, error: 'Unauthorized' };
		}

		const token = authHeader.split('Bearer ')[1];
		const decodedToken = await auth().verifyIdToken(token);
		return { authenticated: true, uid: decodedToken.uid };
	} catch (error) {
		console.error('Authentication error:', error);
		return { authenticated: false, error: 'Invalid token' };
	}
}

// GET: 支払い方法の取得
export async function GET(req: NextRequest) {
	try {
		// ユーザー認証
		const authResult = await authenticateUser(req);
		if (!authResult.authenticated) {
			return NextResponse.json({ error: authResult.error }, { status: 401 });
		}

		const uid = authResult.uid!;
		// Firestoreからユーザーデータ取得
		const userDoc = await db.collection('users').doc(uid).get();
		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const userData = userDoc.data();
		const stripeCustomerId = userData?.stripe?.customerId;

		if (!stripeCustomerId) {
			return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
		}

		// Stripeから支払い方法の取得
		const paymentMethods = await stripe.paymentMethods.list({
			customer: stripeCustomerId,
			type: 'card',
		});

		if (paymentMethods.data.length === 0) {
			return NextResponse.json({ paymentMethod: null }, { status: 200 });
		}

		// Stripeから顧客情報を取得してデフォルトの支払い方法を確認
		const customer = await stripe.customers.retrieve(stripeCustomerId);

		let defaultPaymentMethodId: string | null = null;
		if (typeof customer !== 'string' && !('deleted' in customer)) {
			defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string | null;
		}


		// 支払い方法のフォーマット
		const formattedPaymentMethods = paymentMethods.data.map(pm => ({
			id: pm.id,
			last4: pm.card?.last4 || '****',
			brand: pm.card?.brand || 'unknown',
			expiryMonth: pm.card?.exp_month?.toString().padStart(2, '0') || undefined,
			expiryYear: pm.card?.exp_year?.toString().slice(-2) || undefined,
			isDefault: pm.id === defaultPaymentMethodId,
		}));

		// 通常は最初の（またはデフォルトの）支払い方法を返す
		const defaultMethod = formattedPaymentMethods.find(pm => pm.isDefault) || formattedPaymentMethods[0];

		return NextResponse.json({ paymentMethod: defaultMethod }, { status: 200 });
	} catch (error: any) {
		console.error('Error fetching payment method:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}

// POST: 支払い方法の更新
export async function POST(req: NextRequest) {
	try {
		// ユーザー認証
		const authResult = await authenticateUser(req);
		if (!authResult.authenticated) {
			return NextResponse.json({ error: authResult.error }, { status: 401 });
		}

		const uid = authResult.uid!;
		// リクエストボディの取得
		const body = await req.json();
		const { setupIntentId, paymentMethodId } = body;

		if (!setupIntentId || !paymentMethodId) {
			return NextResponse.json(
				{ error: 'Setup intent ID and payment method ID are required' },
				{ status: 400 }
			);
		}

		// Firestoreからユーザーデータ取得
		const userDoc = await db.collection('users').doc(uid).get();
		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const userData = userDoc.data();
		const stripeCustomerId = userData?.stripe?.customerId;

		if (!stripeCustomerId) {
			return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
		}

		// SetupIntentの確認
		const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
		if (setupIntent.status !== 'succeeded') {
			return NextResponse.json(
				{ error: 'Setup intent has not been confirmed' },
				{ status: 400 }
			);
		}

		// 古い支払い方法を取得
		const oldPaymentMethodId = userData?.stripe?.paymentMethodId;

		// 新しい支払い方法をカスタマーに紐付け
		await stripe.paymentMethods.attach(paymentMethodId, {
			customer: stripeCustomerId,
		});

		// デフォルトの支払い方法として設定
		await stripe.customers.update(stripeCustomerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId,
			},
		});

		// カード情報の詳細を取得
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

		// Firestoreのユーザー情報を更新
		await db.collection('users').doc(uid).update({
			'stripe.paymentMethodId': paymentMethodId,
			'stripe.last4': paymentMethod.card?.last4 || '****',
			'stripe.brand': paymentMethod.card?.brand || 'unknown',
			'stripe.paymentSetupCompleted': true,
			updatedAt: FieldValue.serverTimestamp(),
		});

		// 古い支払い方法をデタッチ（オプション）
		if (oldPaymentMethodId && oldPaymentMethodId !== paymentMethodId) {
			try {
				await stripe.paymentMethods.detach(oldPaymentMethodId);
			} catch (detachError) {
				console.error('Error detaching old payment method:', detachError);
				// 失敗しても処理を続行
			}
		}

		return NextResponse.json(
			{ success: true, message: '支払い方法が正常に更新されました' },
			{ status: 200 }
		);
	} catch (error: any) {
		console.error('Error updating payment method:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}

// DELETE: 支払い方法の削除
export async function DELETE(req: NextRequest) {
	try {
		// ユーザー認証
		const authResult = await authenticateUser(req);
		if (!authResult.authenticated) {
			return NextResponse.json({ error: authResult.error }, { status: 401 });
		}

		const uid = authResult.uid!;
		// Firestoreからユーザーデータ取得
		const userDoc = await db.collection('users').doc(uid).get();
		if (!userDoc.exists) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const userData = userDoc.data();
		const stripeCustomerId = userData?.stripe?.customerId;
		const paymentMethodId = userData?.stripe?.paymentMethodId;

		if (!stripeCustomerId || !paymentMethodId) {
			return NextResponse.json({ error: 'No payment method found' }, { status: 404 });
		}

		// Stripeから支払い方法をデタッチ
		await stripe.paymentMethods.detach(paymentMethodId);

		// Firestoreのユーザー情報を更新
		await db.collection('users').doc(uid).update({
			'stripe.paymentMethodId': FieldValue.delete(),
			'stripe.last4': FieldValue.delete(),
			'stripe.brand': FieldValue.delete(),
			'stripe.paymentSetupCompleted': false,
			updatedAt: FieldValue.serverTimestamp(),
		});

		return NextResponse.json(
			{ success: true, message: '支払い方法が正常に削除されました' },
			{ status: 200 }
		);
	} catch (error: any) {
		console.error('Error deleting payment method:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}