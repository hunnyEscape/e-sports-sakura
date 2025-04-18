// src/lib/firebase-admin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initAdminApp() {
	if (getApps().length === 0) {
		const serviceAccount = {
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
		};

		// 本番は必ず設定が入っている前提
		if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
			if (process.env.NODE_ENV !== 'development') {
				throw new Error('Firebase Admin 環境変数が不足しています');
			}
			// 開発用ダミー
			initializeApp({ projectId: 'dummy-project' });
		} else {
			initializeApp({ credential: cert(serviceAccount as any) });
		}
	}
}

initAdminApp();                       // ① まず初期化
export const auth = getAuth();        // ② デフォルト App に紐付く Auth インスタンス
export const db = getFirestore();   // ③ ついでに Firestore も

// 好みで以前の関数も残して OK
export { initAdminApp };
