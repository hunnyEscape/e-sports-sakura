import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';

// Firebase Admin初期化
initAdminApp();

export async function GET(request: NextRequest) {
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

		// クエリパラメータを取得
		const searchParams = request.nextUrl.searchParams;
		const limit = parseInt(searchParams.get('limit') || '10');
		const page = parseInt(searchParams.get('page') || '1');
		const offset = (page - 1) * limit;

		// Firestoreから利用履歴を取得
		const db = getFirestore();

		// 件数の取得
		const countSnapshot = await db.collection('usageHistory')
			.where('userId', '==', userId)
			.count()
			.get();

		const totalCount = countSnapshot.data().count;

		// 履歴データの取得
		const historySnapshot = await db.collection('usageHistory')
			.where('userId', '==', userId)
			.orderBy('timestamp', 'desc')
			.limit(limit)
			.offset(offset)
			.get();

		const history = historySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data(),
			// Firebaseのタイムスタンプを文字列に変換
			timestamp: doc.data().timestamp instanceof Date
				? doc.data().timestamp.toISOString()
				: doc.data().timestamp
		}));

		return NextResponse.json({
			history,
			pagination: {
				total: totalCount,
				page,
				limit,
				pages: Math.ceil(totalCount / limit)
			}
		});

	} catch (error) {
		console.error('Error fetching billing history:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}