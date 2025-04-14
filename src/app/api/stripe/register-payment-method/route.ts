import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import * as stripeService from '@/lib/stripe-service';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
	try {
		// ユーザー認証
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: '認証エラー' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		const decodedToken = await auth.verifyIdToken(token);
		const userId = decodedToken.uid;

		// リクエストボディを取得
		const body = await request.json();
		const { paymentMethodId } = body;

		if (!paymentMethodId) {
			return NextResponse.json({ error: '支払い方法IDが必要です' }, { status: 400 });
		}

		// Stripeから支払い方法の詳細を取得
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

		// カード支払いの場合
		if (paymentMethod.type === 'card' && paymentMethod.card) {
			const fingerprint = paymentMethod.card.fingerprint;
			const last4 = paymentMethod.card.last4;
			const brand = paymentMethod.card.brand;

			// 重複チェック
			const existingUserId = await stripeService.checkCardFingerprintDuplicate(fingerprint);

			if (existingUserId && existingUserId !== userId) {
				// 別のユーザーが同じカードを使用している場合
				return NextResponse.json({
					error: 'duplicate_card',
					message: 'この支払い方法は既に別のアカウントで使用されています。ご自身の既存アカウントにログインするか、別の支払い方法をご利用ください。'
				}, { status: 409 });
			}

			// ユーザーにカード情報を保存
			await stripeService.saveCardInfoToUser(userId, paymentMethodId, fingerprint, last4, brand);

			return NextResponse.json({
				success: true,
				paymentMethod: {
					id: paymentMethodId,
					last4,
					brand
				}
			});
		}

		return NextResponse.json({ error: '対応していない支払い方法です' }, { status: 400 });

	} catch (error: any) {
		console.error('Error registering payment method:', error);
		return NextResponse.json({
			error: 'server_error',
			message: 'サーバーエラーが発生しました。時間をおいて再度お試しください。'
		}, { status: 500 });
	}
}