'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// 登録ステップの定義（個人情報ステップを省略）
const registrationSteps = [
	{
		id: 'verification',
		name: '本人確認',
		path: '/register/verification',
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
				<polyline points="22 4 12 14.01 9 11.01"></polyline>
			</svg>
		)
	},
	{
		id: 'payment',
		name: '決済情報',
		path: '/register/payment',
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
				<line x1="1" y1="10" x2="23" y2="10"></line>
			</svg>
		)
	},
	{
		id: 'complete',
		name: '完了',
		path: '/register/complete',
		icon: (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
			</svg>
		)
	}
];

export default function ProgressTracker() {
	const pathname = usePathname();
	const [currentStepIndex, setCurrentStepIndex] = useState(0);

	useEffect(() => {
		// パスから現在のステップを特定
		const index = registrationSteps.findIndex(step => pathname?.includes(step.id));
		if (index !== -1) {
			setCurrentStepIndex(index);
		}
	}, [pathname]);

	return (
		<div className="mb-8">
			{/* モバイル表示 */}
			<div className="md:hidden">
				<div className="flex items-center justify-between px-1">
					<span className="text-sm font-medium">
						ステップ {currentStepIndex + 1}/{registrationSteps.length}
					</span>
					<span className="text-sm text-foreground/70">
						{registrationSteps[currentStepIndex].name}
					</span>
				</div>
				<div className="mt-2 h-2 w-full bg-border/30 rounded-full overflow-hidden">
					<div
						className="h-full bg-accent rounded-full"
						style={{ width: `${((currentStepIndex + 1) / registrationSteps.length) * 100}%` }}
					></div>
				</div>
			</div>

			{/* デスクトップ表示 */}
			<ol className="hidden md:flex items-center">
				{registrationSteps.map((step, index) => {
					// ステップの状態判定
					const isActive = index === currentStepIndex;
					const isCompleted = index < currentStepIndex;
					const isPending = index > currentStepIndex;

					return (
						<li key={step.id} className="relative flex-1">
							{index > 0 && (
								<div className="absolute inset-0 flex items-center">
									<div className={`h-0.5 w-full ${isCompleted ? 'bg-accent' : 'bg-border/30'}`}></div>
								</div>
							)}

							<div className="relative flex items-center justify-center">
								{isCompleted ? (
									<Link href={step.path} className="group">
										<span className="h-10 w-10 flex items-center justify-center rounded-full bg-accent text-white transition-colors group-hover:bg-accent/80">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<polyline points="20 6 9 17 4 12"></polyline>
											</svg>
										</span>
										<span className="absolute top-12 left-1/2 -translate-x-1/2 text-sm font-medium text-foreground whitespace-nowrap">
											{step.name}
										</span>
									</Link>
								) : isActive ? (
									<div>
										<span className="h-10 w-10 flex items-center justify-center rounded-full bg-accent text-white">
											{step.icon}
										</span>
										<span className="absolute top-12 left-1/2 -translate-x-1/2 text-sm font-medium text-foreground whitespace-nowrap">
											{step.name}
										</span>
									</div>
								) : (
									<div>
										<span className="h-10 w-10 flex items-center justify-center rounded-full bg-border/20 text-foreground/50">
											{step.icon}
										</span>
										<span className="absolute top-12 left-1/2 -translate-x-1/2 text-sm font-medium text-foreground/50 whitespace-nowrap">
											{step.name}
										</span>
									</div>
								)}
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
}