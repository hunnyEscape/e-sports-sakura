'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Button from '@/components/ui/button';
import { useEkyc } from '@/context/ekyc-context';

interface VerificationCompleteProps {
	onContinue?: () => void;
	autoRedirectDelay?: number; // 秒数
	redirectUrl?: string;
}

export default function VerificationComplete({
	onContinue,
	autoRedirectDelay = 5,
	redirectUrl = '/register/payment'
}: VerificationCompleteProps) {
	const router = useRouter();
	const { ekycData } = useEkyc();
	const [countdown, setCountdown] = useState(autoRedirectDelay);
	const [isRedirecting, setIsRedirecting] = useState(false);

	// 本人確認が完了している場合のみカウントダウン
	useEffect(() => {
		if (ekycData?.status === 'completed' && !isRedirecting) {
			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						handleContinue();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [ekycData, isRedirecting]);

	// 次へ進むハンドラー
	const handleContinue = () => {
		setIsRedirecting(true);

		if (onContinue) {
			onContinue();
		} else {
			router.push(redirectUrl);
		}
	};

	if (ekycData?.status !== 'completed') {
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="bg-green-500/10 text-green-600 p-6 rounded-xl"
		>
			<div className="flex items-center mb-4">
				<div className="bg-green-100 rounded-full p-2 mr-4">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
					</svg>
				</div>
				<div>
					<h3 className="text-lg font-medium">本人確認が完了しました</h3>
					<p className="text-sm opacity-80">
						{ekycData.verifiedAt ?
							`確認日時: ${new Date(ekycData.verifiedAt).toLocaleString('ja-JP')}` :
							'正常に認証されました'}
					</p>
				</div>
			</div>

			<div className="bg-white/50 rounded-lg p-4 mb-4">
				<div className="flex items-center">
					<Image
						src="/images/verification-badge.svg"
						alt="認証済みバッジ"
						width={48}
						height={48}
						className="mr-3"
					/>
					<div>
						<p className="font-medium">E-Sports Sakura 認証済みユーザー</p>
						<p className="text-sm opacity-80">本人確認済みのユーザーとして登録されました</p>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<span className="text-sm">
					{isRedirecting ?
						'次のステップへ移動中...' :
						`${countdown}秒後に自動的に次のステップへ移動します...`}
				</span>
				<Button
					onClick={handleContinue}
					disabled={isRedirecting}
					className="bg-green-600 hover:bg-green-700 text-white"
				>
					今すぐ次へ
				</Button>
			</div>
		</motion.div>
	);
}