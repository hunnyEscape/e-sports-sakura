import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Adminアプリケーションを初期化
 * サーバーサイドでFirebaseリソースにアクセスするために使用
 */
export function initAdminApp() {
	if (getApps().length === 0) {
		// Firebase Admin SDKの初期化
		const serviceAccount = {
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
		};

		// 環境変数が設定されているか確認
		if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
			console.error('Firebase Admin環境変数が設定されていません');

			// 開発環境の場合は処理を続行（ダミーアプリで初期化）
			if (process.env.NODE_ENV === 'development') {
				console.warn('開発環境: Firebase Adminをダミー設定で初期化します');
				const app = initializeApp({
					projectId: 'dummy-project',
				});
				return app;
			} else {
				// 本番環境では例外をスロー
				throw new Error('Firebase Admin環境変数が設定されていません');
			}
		}

		// 正しい認証情報でアプリを初期化
		return initializeApp({
			credential: cert(serviceAccount as any)
		});
	}

	// 既に初期化されている場合は最初のアプリを返す
	return getApps()[0];
}

/**
 * Firebase Admin Firestoreインスタンスを取得
 */
export function getAdminFirestore() {
	initAdminApp();
	return getFirestore();
}