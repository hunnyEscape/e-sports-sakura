'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

// 登録ステップの型定義
type RegistrationStep = 0 | 1 | 2 | 3;

// コンテキストの型定義に completeRegistration、loading、error を追加
interface RegistrationContextType {
	currentStep: RegistrationStep;
	setCurrentStep: (step: RegistrationStep) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	completeRegistration: () => Promise<void>;
	loading: boolean;
	error: string | null;
}

// デフォルト値を持つコンテキストを作成
const RegistrationContext = createContext<RegistrationContextType>({
	currentStep: 1,
	setCurrentStep: () => { },
	goToNextStep: () => { },
	goToPreviousStep: () => { },
	completeRegistration: async () => { },
	loading: false,
	error: null,
});

// 登録プロセスの各ステップに対応するパス
const stepPaths = {
	0: '/register',
	1: '/register/verification',
	2: '/register/payment',
	3: '/register/complete',
};

// コンテキストプロバイダーコンポーネント
export const RegistrationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { userData } = useAuth();
	const router = useRouter();

	// 初期ステップをユーザーデータから設定（または1に設定）
	const initialStep = (userData?.registrationStep as RegistrationStep) || 1;
	const [currentStep, setCurrentStep] = useState<RegistrationStep>(initialStep);

	// loading と error の状態を追加
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// 次のステップに進む
	const goToNextStep = () => {
		const nextStep = (currentStep + 1) as RegistrationStep;
		// ※ステップの最大値は 3 と仮定（必要に応じて調整してください）
		if (nextStep <= 3) {
			setCurrentStep(nextStep);
			router.push(stepPaths[nextStep]);
		}
	};

	// 前のステップに戻る
	const goToPreviousStep = () => {
		const prevStep = (currentStep - 1) as RegistrationStep;
		if (prevStep >= 1) {
			setCurrentStep(prevStep);
			router.push(stepPaths[prevStep]);
		}
	};

	// 登録完了処理（例として非同期処理＋画面遷移）
	const completeRegistration = async () => {
		setLoading(true);
		try {
			// ここで実際の登録完了処理を行う（例: API コール）
			await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
			// 登録完了後に完了ページへ遷移
			router.push(stepPaths[3]);
		} catch (err) {
			setError('登録完了処理に失敗しました。');
		} finally {
			setLoading(false);
		}
	};

	return (
		<RegistrationContext.Provider
			value={{
				currentStep,
				setCurrentStep,
				goToNextStep,
				goToPreviousStep,
				completeRegistration,
				loading,
				error,
			}}
		>
			{children}
		</RegistrationContext.Provider>
	);
};

// カスタムフックとしてコンテキストを使用
export const useRegistration = () => useContext(RegistrationContext);
