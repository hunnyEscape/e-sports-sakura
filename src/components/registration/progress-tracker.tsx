import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

interface ProgressTrackerProps {
	currentStep?: number; // オプショナルに変更
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStep }) => {
	const { userData } = useAuth();
	const router = useRouter();

	// propsからcurrentStepが渡されていなければ、userDataから取得
	const activeStep = currentStep || (userData?.registrationStep || 1);
	const steps = [
		{
			id: 1,
			name: 'アカウント作成',
			description: 'ログイン情報の登録',
			status: 'complete', // 常に完了状態
			href: '/register',
		},
		{
			id: 2,
			name: '決済情報',
			description: 'お支払い方法の登録',
			status: currentStep === 1 ? 'current' : currentStep > 1 ? 'complete' : 'upcoming',
			href: '/register/payment',
		},
		{
			id: 3,
			name: '登録完了',
			description: 'QRコードの発行',
			status: currentStep === 2 ? 'current' : 'upcoming',
			href: '/register/complete',
		},
	];

	return (
		<div className="w-full">
			<div className="flex items-center justify-between">
				{steps.map((step, i) => (
					<React.Fragment key={step.id}>
						{/* ステップの丸い部分 */}
						<div className="relative flex flex-col items-center">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${activeStep >= step.id
									? 'border-highlight bg-highlight text-white'
									: 'border-border bg-background text-foreground/60'
									}`}
							>
								{step.id}
							</div>
							<div className="mt-2 text-xs text-center">
								<p className={activeStep >= step.id ? 'text-foreground' : 'text-foreground/60'}>
									{step.name}
								</p>
							</div>
						</div>

						{/* ステップ間の線 */}
						{i < steps.length - 1 && (
							<div
								className={`flex-1 h-1 ${activeStep > step.id ? 'bg-highlight' : 'bg-border'
									}`}
							></div>
						)}
					</React.Fragment>
				))}
			</div>
		</div>
	);
};

export default ProgressTracker;