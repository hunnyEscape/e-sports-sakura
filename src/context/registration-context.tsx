'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

// 登録ステップの型定義
type RegistrationStep = 0 | 1 | 2 | 3;

// コンテキストの型定義
interface RegistrationContextType {
	currentStep: RegistrationStep;
	setCurrentStep: (step: RegistrationStep) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

// デフォルト値を持つコンテキストを作成
const RegistrationContext = createContext<RegistrationContextType>({
	currentStep: 1,
	setCurrentStep: () => { },
	goToNextStep: () => { },
	goToPreviousStep: () => { },
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

	// 次のステップに進む
	const goToNextStep = () => {
		const nextStep = (currentStep + 1) as RegistrationStep;
		if (nextStep <= 4) {
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

	return (
		<RegistrationContext.Provider
			value={{
				currentStep,
				setCurrentStep,
				goToNextStep,
				goToPreviousStep,
			}}
		>
			{children}
		</RegistrationContext.Provider>
	);
};

// カスタムフックとしてコンテキストを使用
export const useRegistration = () => useContext(RegistrationContext);