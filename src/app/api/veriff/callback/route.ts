import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { verifyVeriffCallback } from '@/lib/veriff';

/**
 * Veriffからのコールバックを処理するAPIルート
 */
export async function POST(request: NextRequest) {
	try {
		// リクエストからデータを取得
		const body = await request.json();
		const signature = request.headers.get('x-callback-signature') || '';

		// シグネチャの検証（本番では必須）
		if (!verifyVeriffCallback(signature, body)) {
			return NextResponse.json(
				{ error: 'Invalid signature' },
				{ status: 401 }
			);
		}

		// コールバックデータを処理
		const { status, vendorData, id: sessionId, code } = body;
		const userId = vendorData; // vendorDataにはユーザーIDを設定している

		if (!userId) {
			return NextResponse.json(
				{ error: 'User ID not found in vendor data' },
				{ status: 400 }
			);
		}

		// ユーザードキュメントを取得
		const userRef = doc(db, 'users', userId);
		const userDoc = await getDoc(userRef);

		if (!userDoc.exists()) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			);
		}

		// eKYC状態を更新
		let eKYCStatus = 'pending';
		if (status === 'approved') {
			eKYCStatus = 'completed';
		} else if (status === 'declined' || status === 'abandoned' || status === 'expired') {
			eKYCStatus = 'failed';
		}

		// Firestoreにデータを更新
		await setDoc(userRef, {
			eKYC: {
				status: eKYCStatus,
				sessionId,
				verificationCode: code,
				verifiedAt: new Date().toISOString(),
				lastUpdated: new Date().toISOString()
			},
			// ステップ完了を記録（eKYCが完了した場合）
			...(eKYCStatus === 'completed' ? { registrationStep: 0 } : {})
		}, { merge: true });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error processing Veriff callback:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}