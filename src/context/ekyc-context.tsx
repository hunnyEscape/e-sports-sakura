'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';

// eKYCの状態の型
export type EkycStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'expired';

// eKYCのデータ型
interface EkycData {
	status: EkycStatus;
	sessionId?: string;
	verifiedAt?: string;
	lastUpdated?: string;
}

// コンテキストの型
interface EkycContextType {
	ekycData: EkycData | null;
	isLoading: boolean;
	error: string | null;
	resetEkycStatus: () => Promise<void>;
}

// デフォルト値
const defaultEkycData: EkycData = {
	status: 'pending'
};

// コンテキスト作成
const EkycContext = createContext<EkycContextType>({
	ekycData: defaultEkycData,
	isLoading: true,
	error: null,
	resetEkycStatus: async () => { }
});

// プロバイダーコンポーネント
export function EkycProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [ekycData, setEkycData] = useState<EkycData | null>(defaultEkycData);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Firestoreからリアルタイムで状態を監視
	useEffect(() => {
		if (!user) {
			setIsLoading(false);
			return;
		}

		// ユーザーのeKYCデータを監視
		const unsubscribe = onSnapshot(
			doc(db, 'users', user.uid),
			(snapshot) => {
				if (snapshot.exists()) {
					const userData = snapshot.data();
					if (userData.eKYC) {
						setEkycData(userData.eKYC);
					} else {
						setEkycData(defaultEkycData);
					}
				} else {
					setEkycData(defaultEkycData);
				}
				setIsLoading(false);
			},
			(err) => {
				console.error('Error fetching eKYC data:', err);
				setError('eKYCデータの取得中にエラーが発生しました。');
				setIsLoading(false);
			}
		);

		return () => unsubscribe();
	}, [user]);

	// eKYCの状態をリセット
	const resetEkycStatus = async () => {
		if (!user) return;

		try {
			await fetch('/api/veriff/reset-status', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${await user.getIdToken()}`
				}
			});

			// 状態の更新はリスナーが自動的に処理
		} catch (err) {
			console.error('Error resetting eKYC status:', err);
			setError('eKYC状態のリセット中にエラーが発生しました。');
		}
	};

	const value = {
		ekycData,
		isLoading,
		error,
		resetEkycStatus
	};

	return <EkycContext.Provider value={value}>{children}</EkycContext.Provider>;
}

// カスタムフック
export const useEkyc = () => useContext(EkycContext);