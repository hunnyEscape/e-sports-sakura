'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { VerifiedIcon, VerificationPendingIcon } from '@/components/icons/verification-icons';
import LoadingSpinner from '@/components/ui/loading-spinner';
import FaceVideoCapture from './face-video-capture';
import CameraTest from '@/components/verification/camera-test';
const VerificationStatus = () => {
	const { user, userData, loading } = useAuth();
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState<number>(1);
	const [showCamera, setShowCamera] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [privacyAgreed, setPrivacyAgreed] = useState<boolean>(false);
	const [isCompleted, setIsCompleted] = useState<boolean>(false);

	// ユーザーの登録ステップを追跡
	useEffect(() => {
		if (!loading && userData) {
			// faceVideoが存在すれば顔認証ステップは完了
			const faceVideoCompleted = userData.faceVideo && userData.faceVideo.storagePath;

			// 現在のステップを決定
			if (!faceVideoCompleted) {
				setCurrentStep(1); // 顔認証ステップ
			} else {
				setCurrentStep(2); // 完了ステップ
			}
		}
	}, [userData, loading]);

	// ローディング状態
	if (loading) {
		return (
			<div className="flex justify-center items-center py-10">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	// ユーザーがログインしていない場合
	if (!user) {
		return (
			<div className="bg-red-500/10 text-red-500 p-6 rounded-lg max-w-md mx-auto">
				<p className="font-medium">ログインが必要です</p>
				<p className="mt-2">本人確認を行うにはログインしてください。</p>
				<button
					onClick={() => router.push('/login')}
					className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					ログインページへ
				</button>
			</div>
		);
	}

	// 登録ステップの完了処理
	const completeStep = async (step: number) => {
		if (!user) return;

		try {
			const db = getFirestore();
			const userDocRef = doc(db, 'users', user.uid);

			// 現在のステップを更新
			await updateDoc(userDocRef, {
				registrationStep: 3 // 本人確認ステップを完了
			});

			// 次のステップに進む
			router.push('/register/payment');
		} catch (error) {
			console.error('ステップ更新エラー:', error);
			setError('処理中にエラーが発生しました。もう一度お試しください。');
		}
	};

	// 顔認証の完了処理
	const handleVerificationComplete = (success: boolean) => {
		if (success) {
			setIsCompleted(true);
			// 少し遅延を入れて次のステップに進む
			setTimeout(() => {
				completeStep(1);
			}, 1500);
		}
	};

	// エラー処理
	const handleError = (errorMessage: string) => {
		setError(errorMessage);
		setShowCamera(false);
	};

	// 顔認証が既に完了している場合
	if (userData?.faceVideo && userData.faceVideo.storagePath) {
		return (
			<div className="max-w-md mx-auto">
				<div className="bg-highlight/10 p-6 rounded-xl shadow-soft mb-8">
					<div className="flex flex-col items-center text-center space-y-3">
						<div className="w-12 h-12 bg-highlight/20 text-highlight rounded-full flex items-center justify-center">
							<VerifiedIcon size={24} />
						</div>
						<h3 className="text-lg font-medium">顔認証登録済み</h3>
						<p className="text-foreground/70">
							顔認証の登録が完了しています。次のステップに進むことができます。
							{userData.faceVideo.confirmed === false && (
								<span className="text-red-500 block mt-2">
									※システムによる確認中です。問題があれば後ほどご連絡いたします。
								</span>
							)}
						</p>
						<button
							onClick={() => completeStep(1)}
							className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
						>
							次へ進む
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-md mx-auto mt-8">
			<div className="bg-border/5 p-6 rounded-xl shadow-soft mb-8">
				<h2 className="text-xl font-medium text-center mb-4">本人確認</h2>
				{isCompleted ? (
					<div className="flex flex-col items-center text-center space-y-3 py-4">
						<div className="w-12 h-12 bg-highlight/20 text-highlight rounded-full flex items-center justify-center">
							<VerifiedIcon size={24} />
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
								<div className="w-48 h-48 bg-border/10 rounded-full flex items-center justify-center text-foreground/60">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
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
									プライバシーポリシーに則って管理されます。
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
			
			{/* FAQ セクション */}
			<div className="bg-border/5 rounded-xl p-6 shadow-soft">
				<h3 className="text-lg font-medium mb-4">よくある質問</h3>
				<div className="space-y-4">
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">なぜ顔認証が必要なのですか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							カフェ運営上の不正利用防止のために本人確認を行っています。より良いサービス提供のためご協力お願いいたします。
						</div>
					</details>
					
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">撮影した顔動画はどのように管理されますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							撮影した顔動画は暗号化された形で安全に保管され、厳格なアクセス制限のもとで管理されます。会員様ご本人と当社の管理者のみがアクセスでき、本人確認以外の目的では使用いたしません。
						</div>
					</details>
					
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">顔認証に失敗した場合はどうすればいいですか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							顔認証に失敗した場合は、明るい場所で再度撮影をお試しください。何度も失敗する場合は、カスタマーサポートにご連絡いただくか、店舗スタッフにお問い合わせください。
						</div>
					</details>
					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">本人確認に失敗した場合はどうなりますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							再度お試しいただけます。複数回失敗する場合は、以下をご確認ください：
							<ul className="list-disc pl-5 mt-1 space-y-1">
								<li>身分証明書が鮮明に写っているか</li>
								<li>顔写真と身分証明書の本人が一致しているか</li>
								<li>身分証明書の有効期限が切れていないか</li>
								<li>十分な明るさがあるか</li>
							</ul>
							何度も失敗する場合は、お問い合わせフォームからサポートにご連絡ください。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">カメラやマイクへのアクセス許可はなぜ必要ですか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							本人確認プロセスでは、身分証明書の撮影と顔認証のためにカメラアクセスが必要です。これらの許可は本人確認プロセスのみに使用され、安全に管理されます。許可を拒否すると、本人確認プロセスを完了できません。
						</div>
					</details>

					<details className="group">
						<summary className="flex justify-between items-center cursor-pointer list-none">
							<span className="font-medium">本人確認はどのくらいの時間がかかりますか？</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</summary>
						<div className="mt-2 text-sm text-foreground/70 pl-1">
							本人確認プロセス全体は2〜5分程度で完了します。
						</div>
					</details>
				</div>
			</div>
		</div>
	);
};

export default VerificationStatus;