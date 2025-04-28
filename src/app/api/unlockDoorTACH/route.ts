// app/api/unlockDoor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
	try {
		// リクエストボディからmemberIDを取得
		const { memberID } = await request.json();

		if (!memberID) {
			return NextResponse.json(
				{ success: false, message: '会員IDが必要です' },
				{ status: 400 }
			);
		}

		// Cloud Functionにリクエスト
		const response = await axios.post(
			process.env.UNLOCK_DOOR_TACH_URL as string,
			{ memberID },
			{
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': process.env.GCF_API_KEY as string
				}
			}
		);

		// 成功レスポンスを返す
		return NextResponse.json(response.data);
	} catch (error: any) {
		console.error('Door unlock error:', error);

		const status = error.response?.status || 500;
		const message = error.response?.data?.message || 'サーバーエラーが発生しました';

		return NextResponse.json(
			{ success: false, message },
			{ status }
		);
	}
}