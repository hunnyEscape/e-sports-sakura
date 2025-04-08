// src/lib/veriff.ts

import { VeriffSession, VeriffStatus } from '@/types';

/**
 * Veriff API の設定
 * 実際の値は環境変数から取得
 */
const VERIFF_API_URL = 'https://stationapi.veriff.com/v1';
const VERIFF_API_KEY = process.env.NEXT_PUBLIC_VERIFF_API_KEY || '';
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET || '';

/**
 * Veriff セッションを作成する
 * @param userId ユーザーID
 * @param userEmail ユーザーのメールアドレス
 * @returns 作成されたセッション情報
 */
export async function createVeriffSession(userId: string, userEmail: string): Promise<VeriffSession> {
	try {
		// APIリクエストのペイロード
		const payload = {
			verification: {
				callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/veriff/callback`,
				person: {
					firstName: '',
					lastName: '',
					idNumber: userId,
					email: userEmail
				},
				vendorData: userId,
				timestamp: new Date().toISOString()
			}
		};

		// Veriff APIへのリクエスト
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
			throw new Error(`Veriff API error: ${errorData.message || response.statusText}`);
		}

		const data = await response.json();
		return {
			sessionId: data.verification.id,
			sessionUrl: data.verification.url,
			status: 'created'
		};
	} catch (error) {
		console.error('Error creating Veriff session:', error);
		throw error;
	}
}

/**
 * Veriffセッションのステータスを確認する
 * @param sessionId セッションID
 * @returns セッションのステータス情報
 */
export async function checkVeriffSessionStatus(sessionId: string): Promise<{
	status: VeriffStatus;
	updatedAt: string;
}> {
	try {
		const response = await fetch(`${VERIFF_API_URL}/sessions/${sessionId}`, {
			method: 'GET',
			headers: {
				'X-AUTH-CLIENT': VERIFF_API_KEY
			}
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(`Veriff API error: ${errorData.message || response.statusText}`);
		}

		const data = await response.json();
		return {
			status: data.verification.status,
			updatedAt: data.verification.updatedAt
		};
	} catch (error) {
		console.error('Error checking Veriff session status:', error);
		throw error;
	}
}

/**
 * Veriffからのコールバックデータを検証する
 * @param signature Veriffから受け取った署名
 * @param payload Veriffから受け取ったデータ
 * @returns 検証結果
 */
export function verifyVeriffCallback(signature: string, payload: any): boolean {
	// 実際の実装では、HMACを使用して署名を検証するコードが必要
	// 今回はモック実装
	return true;
}