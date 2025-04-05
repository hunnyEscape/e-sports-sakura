import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VeriffSession, VeriffStatus } from '@/lib/veriff';

interface UseVeriffReturn {
	status: VeriffStatus;
	sessionId: string | null;
	isLoading: boolean;
	error: string | null;
	startVerification: () => Promise<void>;
	simulateVerification: () => Promise<void>; // 開発用
}

/**
 * Veriff統合のためのカスタムフック
 */
export function useVeriff(): UseVeriffReturn {
	const { user } = useAuth();
	const [status, setStatus] = useState<VeriffStatus>('pending');
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ユーザーのVeriff状態を読み込む
	useEffect(() => {
		const loadVeriffStatus = async () => {
			if (!user) return;

			try {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists() && userDoc.data().eKYC) {
					const eKYC = userDoc.data().eKYC;
					setStatus(eKYC.status || 'pending');
					if (eKYC.sessionId) {
						setSessionId(eKYC.sessionId);
					}
				}
			} catch (err) {
				console.error('Error loading verification status:', err);
				setError('検証状態の取得中にエラーが発生しました。');
			}
		};

		loadVeriffStatus();
	}, [user]);

	// Veriffセッションを開始する
	const startVerification = async () => {
		if (!user || !user.uid) {
			setError('ユーザー情報が取得できません。ログインし直してください。');
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// Firebase IDトークンを取得
			const idToken = await user.getIdToken();

			// APIを呼び出してセッションを作成
			const response = await fetch('/api/veriff/create-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				}
			});

			if (!response.ok) {
				throw new Error('セッション作成に失敗しました');
			}

			const data = await response.json();

			// すでに検証が完了している場合
			if (data.status === 'completed') {
				setStatus('completed');
				setIsLoading(false);
				return;
			}

			// セッションIDを保存
			setSessionId(data.sessionId);

			// Veriffのページにリダイレクト
			window.location.href = data.sessionUrl;

		} catch (err) {
			console.error('Error starting verification:', err);
			setError('検証の開始中にエラーが発生しました。後でもう一度お試しください。');
			setIsLoading(false);
		}
	};

	// 開発用: 検証完了をシミュレート
	const simulateVerification = async () => {
		if (!user) return;

		setIsLoading(true);
		setError(null);

		try {
			// モックセッションID
			const mockSessionId = `mock-session-${Date.now()}`;
			setSessionId(mockSessionId);

			// 検証完了をシミュレート
			setTimeout(async () => {
				setStatus('completed');

				// Firestoreを更新
				await setDoc(doc(db, 'users', user.uid), {
					eKYC: {
						sessionId: mockSessionId,
						status: 'completed',
						verifiedAt: new Date().toISOString()
					},
					registrationStep: 0  // eKYCステップ完了
				}, { merge: true });

				setIsLoading(false);
			}, 2000);
		} catch (err) {
			console.error('Error in mock verification:', err);
			setError('検証のシミュレーション中にエラーが発生しました。');
			setIsLoading(false);
		}
	};

	return {
		status,
		sessionId,
		isLoading,
		error,
		startVerification,
		simulateVerification
	};
}