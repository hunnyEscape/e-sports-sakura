// src/app/api/unlockDoor/route.ts

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { aesCmac } from 'node-aes-cmac';
import { db } from '../../../lib/firebase-admin';

export async function POST(req: NextRequest) {
	// リファラーチェック
	const referer = req.headers.get('referer');
	const allowedReferers = [
		'https://your-app.vercel.app',
		'https://your-app-staging.vercel.app'
	];

	// 開発環境では localhost からのアクセスも許可
	if (process.env.NODE_ENV === 'development') {
		allowedReferers.push('http://localhost:3000');
	}

	if (!referer || !allowedReferers.some(allowed => referer.startsWith(allowed))) {
		return NextResponse.json(
			{ success: false, message: 'Unauthorized access' },
			{ status: 403 }
		);
	}

	try {
		// リクエストボディからmemberIDを取得
		const { memberID } = await req.json();

		if (!memberID) {
			return NextResponse.json(
				{ success: false, message: '会員IDが必要です' },
				{ status: 400 }
			);
		}

		// ユーザー検索 - currentMemberIdで検索
		const usersRef = db.collection('users');
		const currentQuery = await usersRef.where('currentMemberId', '==', memberID).limit(1).get();

		// ユーザー情報の取得
		let userDoc = null;
		let userId = null;

		if (!currentQuery.empty) {
			userDoc = currentQuery.docs[0].data();
			userId = currentQuery.docs[0].id;
		} else {
			// previousMemberIdで検索
			const previousQuery = await usersRef.where('previousMemberId', '==', memberID).limit(1).get();

			if (!previousQuery.empty) {
				userDoc = previousQuery.docs[0].data();
				userId = previousQuery.docs[0].id;
			} else {
				return NextResponse.json(
					{ success: false, message: '有効な会員IDが見つかりません' },
					{ status: 404 }
				);
			}
		}

		// 登録完了チェック
		if (!userDoc.registrationCompleted) {
			return NextResponse.json(
				{ success: false, message: '登録が完了していません' },
				{ status: 403 }
			);
		}

		// SESAME解錠
		await unlockSesame(userDoc.email || 'Vercel User');

		// アクセスログ記録
		await logAccess(userId, userDoc.email);

		return NextResponse.json(
			{ success: true, message: 'ドアの解錠に成功しました' },
			{ status: 200 }
		);

	} catch (error: any) {
		console.error('unlockDoor error:', error);
		return NextResponse.json(
			{ success: false, message: error.message },
			{ status: 500 }
		);
	}
}

// SESAME解錠関数
async function unlockSesame(history: string) {
	const cmd = 88; // 解錠コマンド
	const secretKey = process.env.SESAME_DEVICE_SECRET_KEY ?? '';
	const sign = generateSign(secretKey);

	await axios.post(
		`https://app.candyhouse.co/api/sesame2/${process.env.SESAME_DEVICE_UUID}/cmd`,
		{
			cmd,
			history: Buffer.from(history).toString('base64'),
			sign
		},
		{
			headers: { 'x-api-key': process.env.SESAME_API_KEY }
		}
	);
}

// 署名生成関数
function generateSign(secret: string): string {
	const key = Buffer.from(secret, 'hex');
	const time = Math.floor(Date.now() / 1000);
	const buf = Buffer.allocUnsafe(4);
	buf.writeUInt32LE(time);
	return aesCmac(key, buf.slice(1)); // 3 byte
}

// アクセスログ記録関数
async function logAccess(userId: string, email: string) {
	await db.collection('accessLogs').add({
		userId,
		email,
		timestamp: new Date(),
		action: 'unlock'
	});
}