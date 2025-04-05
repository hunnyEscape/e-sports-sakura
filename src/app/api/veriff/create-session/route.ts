import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';

// Firebase Admin初期化
initAdminApp();

// Veriff API設定
const VERIFF_API_URL = 'https://stationapi.veriff.com/v1';
const VERIFF_API_KEY = process.env.VERIFF_API_KEY || '';
const VERIFF_PRIVATE_KEY = process.env.VERIFF_PRIVATE_KEY || '';

export async function POST(request: NextRequest) {
	try {
		// トークンの取得
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

		// ユーザーデータの取得
		const userRecord = await getAuth().getUser(userId);
		const email = userRecord.email || '';

		// すでにVeriffセッションが存在するか確認
		const db = getFirestore();
		const userDoc = await db.collection('users').doc(userId).get();

		if (userDoc.exists) {
			const userData = userDoc.data();

			// eKYCが既に完了している場合
			if (userData?.eKYC?.status === 'completed') {
				return NextResponse.json({
					message: 'Verification already completed',
					status: 'completed'
				});
			}
		}

		// Veriffセッションの作成
		const payload = {
			verification: {
				callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/veriff/callback`,
				person: {
					firstName: '',
					lastName: '',
					idNumber: userId,
					email: email
				},
				vendorData: userId,
				timestamp: new Date().toISOString()
			}
		};

		const response = await fetch(`${VERIFF_API_URL}/sessions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-AUTH-CLIENT': VERIFF_API_KEY
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Veriff API error:', errorData);
			return NextResponse.json(
				{ error: 'Failed to create Veriff session' },
				{ status: response.status }
			);
		}

		const data = await response.json();

		// Firestoreにセッション情報を保存
		await db.collection('users').doc(userId).set({
			eKYC: {
				sessionId: data.verification.id,
				status: 'pending',
				createdAt: new Date().toISOString()
			}
		}, { merge: true });

		return NextResponse.json({
			sessionId: data.verification.id,
			sessionUrl: data.verification.url,
			status: 'created'
		});

	} catch (error) {
		console.error('Error creating Veriff session:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}