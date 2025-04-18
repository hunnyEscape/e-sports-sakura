import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import * as stripeService from '@/lib/stripe-service';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
	try {
		/* ────────── 1. 認証 ────────── */
		const authHeader = request.headers.get('authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			return NextResponse.json({ error: '認証エラー' }, { status: 401 });
		}

		const token = authHeader.split('Bearer ')[1];
		const decodedToken = await auth.verifyIdToken(token);
		const userId = decodedToken.uid;

		/* ────────── 2. リクエスト解析 ────────── */
		const { paymentMethodId } = await request.json();
		if (!paymentMethodId) {
			return NextResponse.json({ error: '支払い方法IDが必要です' }, { status: 400 });
		}

		/* ────────── 3. PaymentMethod 取得 ────────── */
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

		/* ────────── 4. カードの場合のみ処理 ────────── */
		if (paymentMethod.type === 'card' && paymentMethod.card) {
			const { fingerprint, last4, brand } = paymentMethod.card;

			/* === ガード節：fingerprint が無いカードを拒否 === */
			if (!fingerprint) {
				return NextResponse.json(
					{
						error: 'fingerprint_unavailable',
						message:
							'このカードは識別用フィンガープリントを取得できません。別のカードをご利用ください。'
					},
					{ status: 400 }
				);
			}

			/* ─────── 5. 重複チェック ─────── */
			const existingUserId = await stripeService.checkCardFingerprintDuplicate(fingerprint);

			if (existingUserId && existingUserId !== userId) {
				return NextResponse.json(
					{
						error: 'duplicate_card',
						message:
							'この支払い方法は既に別のアカウントで使用されています。ご自身の既存アカウントにログインするか、別の支払い方法をご利用ください。'
					},
					{ status: 409 }
				);
			}

			/* ─────── 6. カード情報を保存 ─────── */
			await stripeService.saveCardInfoToUser(userId, paymentMethodId, fingerprint, last4, brand);

			return NextResponse.json({
				success: true,
				paymentMethod: { id: paymentMethodId, last4, brand }
			});
		}

		/* ────────── 7. 非対応タイプ ────────── */
		return NextResponse.json({ error: '対応していない支払い方法です' }, { status: 400 });
	} catch (error) {
		console.error('Error registering payment method:', error);
		return NextResponse.json(
			{
				error: 'server_error',
				message: 'サーバーエラーが発生しました。時間をおいて再度お試しください。'
			},
			{ status: 500 }
		);
	}
}
