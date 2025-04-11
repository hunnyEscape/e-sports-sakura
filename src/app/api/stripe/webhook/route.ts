// src/app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { initAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe'; // ✅ デフォルトインポートで型利用もOK

import { stripe } from '@/lib/stripe'; // これはインスタンス（secretキーで生成済）想定

// Firebase Admin初期化
initAdminApp();

// Stripeウェブフックシークレット
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
	try {
		const payload = await request.text();
		const headersList = headers();
		const sig = headersList.get('stripe-signature') || '';

		let event: Stripe.Event;

		// シグネチャの検証
		try {
			event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
		} catch (err) {
			console.error('Webhook signature verification failed:', err);
			return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
		}

		const db = getFirestore();

		switch (event.type) {
			case 'payment_method.attached': {
				const paymentMethod = event.data.object as Stripe.PaymentMethod;
				const customerId = paymentMethod.customer;

				if (customerId) {
					const usersSnapshot = await db
						.collection('users')
						.where('stripe.customerId', '==', customerId)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];
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
			}

			case 'invoice.paid': {
				const invoice = event.data.object as Stripe.Invoice & { last_payment_error?: any };

				if (invoice.customer) {
					const usersSnapshot = await db
						.collection('users')
						.where('stripe.customerId', '==', invoice.customer)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];

						// default_payment_method の ID 抽出
						let defaultPaymentMethodId = '';
						if (invoice.default_payment_method) {
							defaultPaymentMethodId =
								typeof invoice.default_payment_method === 'string'
									? invoice.default_payment_method
									: invoice.default_payment_method.id;
						}

						await db.collection('usageHistory').add({
							userId: userDoc.id,
							invoiceId: invoice.id,
							amount: invoice.amount_paid / 100,
							status: 'paid',
							timestamp: new Date().toISOString(),
							description: invoice.description || '利用料金',
							metadata: invoice.metadata || {},
							paymentMethodType: defaultPaymentMethodId
								? await getPaymentMethodType(defaultPaymentMethodId)
								: 'unknown',
							durationMinutes: invoice.metadata?.durationMinutes
								? parseInt(invoice.metadata.durationMinutes)
								: undefined,
						});

						await userDoc.ref.update({
							billingHistory: FieldValue.arrayUnion({
								invoiceId: invoice.id,
								amount: invoice.amount_paid / 100,
								date: new Date().toISOString(),
								status: 'paid',
							}),
						});
					}
				}
				break;
			}

			case 'invoice.payment_failed': {
				const failedInvoice = event.data.object as Stripe.Invoice & { last_payment_error?: any };

				if (failedInvoice.customer) {
					const usersSnapshot = await db
						.collection('users')
						.where('stripe.customerId', '==', failedInvoice.customer)
						.limit(1)
						.get();

					if (!usersSnapshot.empty) {
						const userDoc = usersSnapshot.docs[0];
						const errorMessage = (failedInvoice as any).last_payment_error?.message || '不明なエラー';

						await db.collection('paymentFailures').add({
							userId: userDoc.id,
							invoiceId: failedInvoice.id,
							amount: failedInvoice.amount_due / 100,
							timestamp: new Date().toISOString(),
							reason: errorMessage,
						});

						await userDoc.ref.update({
							'stripe.paymentStatus': 'failed',
							'stripe.lastPaymentError': errorMessage,
							'stripe.lastPaymentErrorAt': new Date().toISOString(),
						});
					}
				}
				break;
			}

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
