// src/lib/stripe-service.ts
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { PaymentMethodType } from '@/types';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// 顧客情報のインターフェース
interface CustomerData {
	userId: string;
	email: string;
	name?: string;
}

/**
 * カードfingerprintによる重複チェック
 * 既存ユーザーが存在する場合はそのUIDを返す、存在しない場合はnullを返す
 */
export async function checkCardFingerprintDuplicate(fingerprint: string): Promise<string | null> {
	try {
		// fingerprintが一致するユーザーを検索
		const usersRef = collection(db, 'users');
		const q = query(usersRef, where('stripe.cardFingerprint', '==', fingerprint));
		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			// 重複するユーザーがいる場合は最初のユーザーのUIDを返す
			return querySnapshot.docs[0].id;
		}

		return null;
	} catch (error) {
		console.error('Error checking card fingerprint duplicate:', error);
		throw error;
	}
}

/**
 * 支払い方法からカードfingerprintを取得
 */
export async function getCardFingerprint(paymentMethodId: string): Promise<string | null> {
	try {
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

		// カード支払いの場合のみfingerprintが存在
		if (paymentMethod.type === 'card' && paymentMethod.card) {
			const fingerprint = paymentMethod.card.fingerprint;
			return typeof fingerprint === 'string' ? fingerprint : null;
		}

		return null;
	} catch (error) {
		console.error('Error retrieving card fingerprint:', error);
		throw error;
	}
}

/**
 * ユーザーにカード情報を保存
 */
export async function saveCardInfoToUser(
	userId: string,
	paymentMethodId: string,
	fingerprint: string,
	last4?: string,
	brand?: string
): Promise<void> {
	try {
		const userDocRef = doc(db, 'users', userId);

		await setDoc(userDocRef, {
			stripe: {
				paymentMethodId,
				cardFingerprint: fingerprint,
				last4,
				brand,
				paymentSetupCompleted: true
			}
		}, { merge: true });

	} catch (error) {
		console.error('Error saving card info to user:', error);
		throw error;
	}
}

/**
 * Stripe顧客を作成または取得する
 */
export async function getOrCreateCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
	try {
		// 既存の顧客を検索
		const customers = await stripe.customers.list({
			email: email,
			limit: 1,
		});

		if (customers.data.length > 0) {
			// 既存顧客が見つかった場合、metadataを更新
			const customer = customers.data[0];
			await stripe.customers.update(customer.id, {
				metadata: {
					...customer.metadata,
					userId: userId
				}
			});
			return customer;
		}

		// 新規顧客を作成
		const newCustomer = await stripe.customers.create({
			email: email || undefined, // ✅ string or undefined
			name: name || undefined,   // ✅ string or undefined
			metadata: {
				userId: userId,
			},
		});


		return newCustomer;
	} catch (error) {
		console.error('Error in getOrCreateCustomer:', error);
		throw error;
	}
}

// 以下、既存の関数はそのまま...

/**
 * Setup Intentを作成する
 */
export async function createSetupIntent(
	customerId: string,
	paymentMethods: PaymentMethodType[] = ['card']
): Promise<Stripe.SetupIntent> {
	try {
		const setupIntent = await stripe.setupIntents.create({
			customer: customerId,
			payment_method_types: paymentMethods,
		});
		return setupIntent;
	} catch (error) {
		console.error('Error creating Setup Intent:', error);
		throw error;
	}
}

/**
 * 支払い方法をデフォルトとして設定
 */
export async function setDefaultPaymentMethod(
	customerId: string,
	paymentMethodId: string
): Promise<Stripe.Customer> {
	try {
		const customer = await stripe.customers.update(customerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId,
			},
		});
		return customer;
	} catch (error) {
		console.error('Error setting default payment method:', error);
		throw error;
	}
}

/**
 * 利用に基づく請求書を作成
 */
export async function createInvoiceForUsage(
	customerId: string,
	durationMinutes: number,
	description: string = 'E-Sports Sakura利用料金'
): Promise<Stripe.Invoice> {
	try {
		// 10分単位で料金計算（10分あたり120円）
		const units = Math.ceil(durationMinutes / 10);
		const amountYen = units * 120;

		// 請求書の作成
		const invoice = await stripe.invoices.create({
			customer: customerId,
			auto_advance: true, // 自動的に確定・支払い
			description: description,
			metadata: {
				durationMinutes: String(durationMinutes),
				units: String(units),
			},
		});

		// 請求項目の追加
		await stripe.invoiceItems.create({
			customer: customerId,
			amount: amountYen * 100, // 日本円をセントに変換
			currency: 'jpy',
			description: `利用時間: ${durationMinutes}分（${units}単位）`,
			invoice: invoice.id,
		});

		// 請求書の確定
		if (!invoice.id) throw new Error('invoice.id is undefined');
		const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

		// 支払い処理
		if (!finalizedInvoice.id) throw new Error('finalizedInvoice.id is undefined');
		return await stripe.invoices.pay(finalizedInvoice.id);
	} catch (error) {
		console.error('Error creating invoice for usage:', error);
		throw error;
	}
}

/**
 * 顧客の支払い方法一覧を取得
 */
export async function getCustomerPaymentMethods(
	customerId: string
): Promise<Stripe.PaymentMethod[]> {
	try {
		const paymentMethods = await stripe.paymentMethods.list({
			customer: customerId,
			type: 'card',
		});
		return paymentMethods.data;
	} catch (error) {
		console.error('Error getting customer payment methods:', error);
		throw error;
	}
}