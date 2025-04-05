// src/lib/stripe-service.ts
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';

// 支払い方法のタイプ
export type PaymentMethodType = 'card' | 'google_pay' | 'apple_pay';

// 顧客情報のインターフェース
interface CustomerData {
	userId: string;
	email: string;
	name?: string;
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
			email: email,
			name: name,
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
		const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

		// 支払い処理
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