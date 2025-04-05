'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';

// Veriff情報の型定義
interface VeriffInfo {
	sessionId?: string;
	status: 'pending' | 'completed' | 'failed';
	verifiedAt?: string;
}

// 登録コンテキストの型定義
interface RegistrationContextType {
	currentStep: number;
	setCurrentStep: (step: number) => void;
	veriffInfo: VeriffInfo;
	setVeriffInfo: (info: Partial<VeriffInfo>) => void;
	loading: boolean;
	saveVeriffInfo: () => Promise<void>;
	completeRegistration: () => Promise<void>;
	error: string | null;
}

const defaultVeriffInfo: VeriffInfo = {
	status: 'pending',
};

// コンテキスト作成
const RegistrationContext = createContext<RegistrationContextType>({
	currentStep: 0,
	setCurrentStep: () => { },
	veriffInfo: defaultVeriffInfo,
	setVeriffInfo: () => { },
	loading: true,
	saveVeriffInfo: async () => { },
	completeRegistration: async () => { },
	error: null,
});

// コンテキストプロバイダーコンポーネント
export function RegistrationProvider({ children }: { children: ReactNode }) {
	const { user, userData, loading: authLoading } = useAuth();
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(0);
	const [veriffInfo, setVeriffInfoState] = useState<VeriffInfo>(defaultVeriffInfo);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// ユーザーデータの初期ロード
	useEffect(() => {
		async function loadUserData() {
			if (user && userData) {
				try {
					setLoading(true);

					// 現在のステップを設定
					if (userData.registrationStep !== undefined) {
						setCurrentStep(userData.registrationStep);
					}

					// eKYC情報があれば読み込む
					if (userData.eKYC) {
						setVeriffInfoState({
							status: userData.eKYC.status || 'pending',
							sessionId: userData.eKYC.sessionId,
							verifiedAt: userData.eKYC.verifiedAt,
						});
					}

					setLoading(false);
				} catch (err) {
					console.error('Error loading user registration data:', err);
					setError('登録データの読み込み中にエラーが発生しました。');
					setLoading(false);
				}
			} else if (!authLoading) {
				setLoading(false);
			}
		}

		loadUserData();
	}, [user, userData, authLoading]);

	// Veriff情報の更新
	const setVeriffInfo = (info: Partial<VeriffInfo>) => {
		setVeriffInfoState(prev => ({ ...prev, ...info }));
	};

	// Veriff情報をFirestoreに保存
	const saveVeriffInfo = async () => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			const userDocRef = doc(db, 'users', user.uid);
			await setDoc(userDocRef, {
				eKYC: {
					status: veriffInfo.status,
					sessionId: veriffInfo.sessionId,
					verifiedAt: veriffInfo.verifiedAt || new Date().toISOString(),
				},
				registrationStep: 0, // 本人確認ステップ完了（最初のステップなので0）
			}, { merge: true });

			setCurrentStep(0); // ステップを更新
			setLoading(false);

			// 次のステップへ移動
			router.push('/register/payment');
		} catch (err) {
			console.error('Error saving verification info:', err);
			setError('本人確認情報の保存中にエラーが発生しました。');
			setLoading(false);
		}
	};

	// 登録完了処理
	const completeRegistration = async () => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			const userDocRef = doc(db, 'users', user.uid);
			await setDoc(userDocRef, {
				registrationCompleted: true,
				registrationStep: 1, // 全ステップ完了（最後のステップなので1）
			}, { merge: true });

			setCurrentStep(1); // ステップを更新
			setLoading(false);

			// ダッシュボードへ移動
			router.push('/dashboard');
		} catch (err) {
			console.error('Error completing registration:', err);
			setError('会員登録の完了処理中にエラーが発生しました。');
			setLoading(false);
		}
	};

	const value = {
		currentStep,
		setCurrentStep,
		veriffInfo,
		setVeriffInfo,
		loading,
		saveVeriffInfo,
		completeRegistration,
		error,
	};

	return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

// カスタムフック
export const useRegistration = () => useContext(RegistrationContext);