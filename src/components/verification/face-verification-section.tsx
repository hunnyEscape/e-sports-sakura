'use client';

import React, { useState } from 'react';
import FaceVideoCapture from './face-video-capture';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface FaceVerificationSectionProps {
	onComplete: () => void;
}

const FaceVerificationSection: React.FC<FaceVerificationSectionProps> = ({ onComplete }) => {
	const { userData, loading } = useAuth();
	const [showCamera, setShowCamera] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [privacyAgreed, setPrivacyAgreed] = useState<boolean>(false);
	const [isCompleted, setIsCompleted] = useState<boolean>(false);

	// ローディング状態のハンドリング
	if (loading) {
		return (
			<div className="flex justify-center items-center py-6">
				<LoadingSpinner size="medium" />
			</div>
		);
	}

	// 顔認証が既に完了している場合
	if (userData?.faceVideo && userData.faceVideo.storagePath) {
		return (
			<div className="bg-highlight/10 p-6 rounded-xl shadow-soft mb-8">
				<div className="flex flex-col items-center text-center space-y-3">
					<div className="w-12 h-12 bg-highlight/20 text-highlight rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h3 className="text-lg font-medium">顔認証登録済み</h3>
					<p className="text-foreground/70">
						顔認証の登録が完了しています。
						{userData.faceVideo.confirmed === false && (
							<span className="text-red-500 block mt-2">
								※システムによる確認中です。問題があれば後ほどご連絡いたします。
							</span>
						)}
					</p>
					<button
						onClick={onComplete}
						className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
					>
						次へ進む
					</button>
				</div>
			</div>
		);
	}

	// 顔認証の完了処理
	const handleVerificationComplete = (success: boolean) => {
		if (success) {
			setIsCompleted(true);
			// 少し遅延を入れて次のステップに進む
			setTimeout(() => {
				onComplete();
			}, 1500);
		}
	};

	// エラー処理
	const handleError = (errorMessage: string) => {
		setError(errorMessage);
		setShowCamera(false);
	};

	return (
		<div className="bg-border/5 p-6 rounded-xl shadow-soft mb-8">
			<h2 className="text-xl font-medium text-center mb-4">顔認証</h2>

			{isCompleted ? (
				<div className="flex flex-col items-center text-center space-y-3 py-4">
					<div className="w-12 h-12 bg-highlight/20 text-highlight rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h3 className="text-lg font-medium">顔認証登録完了</h3>
					<p className="text-foreground/70">顔認証の登録が完了しました。次の手順に進みます...</p>
					<LoadingSpinner size="small" />
				</div>
			) : showCamera ? (
				<FaceVideoCapture
					onComplete={handleVerificationComplete}
					onError={handleError}
				/>
			) : (
				<div className="flex flex-col items-center space-y-6">
					<div className="text-center">
						<p className="mb-3 text-foreground/80">
							本人確認のため、顔認証を行います。顔動画を撮影して登録してください。
						</p>
						<div className="flex justify-center">
							<img
								src="/images/face-verification-sample.svg"
								alt="顔認証イメージ"
								className="w-48 h-auto opacity-80"
							/>
						</div>
					</div>

					{error && (
						<div className="bg-red-500/10 text-red-500 p-4 rounded-lg w-full max-w-md">
							{error}
						</div>
					)}

					<div className="w-full max-w-md">
						<div className="bg-border/5 p-4 rounded-lg text-sm text-foreground/80">
							<h4 className="font-medium text-foreground">撮影時の注意事項:</h4>
							<ul className="list-disc pl-5 mt-2 space-y-1">
								<li>明るい場所で顔が明確に見えるようにしてください</li>
								<li>録画中は顔を左右にゆっくり動かしてください</li>
								<li>サングラス、マスク、帽子などを着用しないでください</li>
								<li>撮影した顔動画は本人確認の目的でのみ使用されます</li>
							</ul>
						</div>

						<div className="mt-4 flex items-start space-x-2">
							<input
								type="checkbox"
								id="privacy-agreement"
								checked={privacyAgreed}
								onChange={(e) => setPrivacyAgreed(e.target.checked)}
								className="mt-1"
							/>
							<label htmlFor="privacy-agreement" className="text-sm text-foreground/80">
								顔動画の撮影・保存に同意します。この情報は本人確認とトラブル時の照合にのみ使用され、
								<span className="text-accent hover:underline cursor-pointer">プライバシーポリシー</span>
								に則って管理されます。
							</label>
						</div>
					</div>

					<button
						onClick={() => setShowCamera(true)}
						disabled={!privacyAgreed}
						className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						顔認証を開始
					</button>
				</div>
			)}
		</div>
	);
};

export default FaceVerificationSection;