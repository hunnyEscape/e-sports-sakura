// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { initAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { stripe } from '@/lib/stripe';

// Firebase Admin初期化
initAdminApp();

// Stripeウェブフックシークレット
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
	try {
		// リクエストのRawボディを取得
		const payload = await request.text();
		const headersList = headers();
		const sig = headersList.get('stripe-signature') || '';

		let event;

		// シグネチャの検証
		try {
			event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
		} catch (err) {
			console.error('Webhook signature verification failed:', err);
			return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
		}

		// Firestore参照
		const db = getFirestore();

		// イベントタイプに基づいて処理
		switch (event.type) {
			// 支払い方法が追加された時
			case 'payment_method.attached':
				const paymentMethod = event.data.object;
				// 顧客IDを取得
				const customerId = paymentMethod.customer;

				if (customerId) {
					// 顧客IDに基づいてユーザーを検索
					const usersSnapshot = await db.collection('users')
						.where('stripe.customerId', '==', customerId)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];
						// ユーザーのStripe情報を更新
						await userDoc.ref.update({
							'stripe.paymentMethodId': paymentMethod.id,
							'stripe.updatedAt': new Date().toISOString(),
							'stripe.paymentSetupCompleted': true,
							'stripe.paymentMethodType': paymentMethod.type,
							'stripe.paymentMethodBrand': paymentMethod.card?.brand || '',
							'stripe.paymentMethodLast4': paymentMethod.card?.last4 || '',
						});
					}
				}
				break;

			// 請求書の支払いが成功した時
			case 'invoice.paid':
				const invoice = event.data.object;
				// 利用履歴に記録
				if (invoice.customer) {
					const usersSnapshot = await db.collection('users')
						.where('stripe.customerId', '==', invoice.customer)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];
						const userId = userDoc.id;

						// 利用履歴に追加
						await db.collection('usageHistory').add({
							userId,
							invoiceId: invoice.id,
							amount: invoice.amount_paid / 100, // セントから円に変換
							status: 'paid',
							timestamp: new Date().toISOString(),
							description: invoice.description || '利用料金',
							metadata: invoice.metadata || {},
							paymentMethodType: invoice.default_payment_method
								? await getPaymentMethodType(invoice.default_payment_method)
								: 'unknown',
							durationMinutes: invoice.metadata?.durationMinutes
								? parseInt(invoice.metadata.durationMinutes)
								: undefined
						});

						// ユーザーの請求履歴にも追加
						await userDoc.ref.update({
							'billingHistory': db.FieldValue.arrayUnion({
								invoiceId: invoice.id,
								amount: invoice.amount_paid / 100,
								date: new Date().toISOString(),
								status: 'paid'
							})
						});
					}
				}
				break;

			// 請求書の支払いが失敗した時
			case 'invoice.payment_failed':
				const failedInvoice = event.data.object;
				// 支払い失敗を記録
				if (failedInvoice.customer) {
					const usersSnapshot = await db.collection('users')
						.where('stripe.customerId', '==', failedInvoice.customer)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];
						const userId = userDoc.id;

						// 失敗記録を追加
						await db.collection('paymentFailures').add({
							userId,
							invoiceId: failedInvoice.id,
							amount: failedInvoice.amount_due / 100, // セントから円に変換
							timestamp: new Date().toISOString(),
							reason: failedInvoice.last_payment_error?.message || '不明なエラー'
						});

						// ユーザーの支払い状態を更新
						await userDoc.ref.update({
							'stripe.paymentStatus': 'failed',
							'stripe.lastPaymentError': failedInvoice.last_payment_error?.message,
							'stripe.lastPaymentErrorAt': new Date().toISOString()
						});
					}
				}
				break;

			// その他のイベント
			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error('Error processing webhook:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// 支払い方法のタイプを取得するヘルパー関数
async function getPaymentMethodType(paymentMethodId: string): Promise<string> {
	try {
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
		return paymentMethod.type;
	} catch (error) {
		console.error('Error retrieving payment method:', error);
		return 'unknown';
	}
}