'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useAuth } from '@/context/auth-context';
import { useEkyc } from '@/context/ekyc-context';
import {
	VerifiedIcon,
	VerificationFailedIcon,
	VerificationPendingIcon,
	VerificationBadge
} from '@/components/icons/verification-icons';
import { createVeriffSession } from '@/lib/veriff';

export default function VerificationStatusV2() {
	const router = useRouter();
	const { user } = useAuth();
	const { ekycData, isLoading, error: ekycError, resetEkycStatus } = useEkyc();
	const [isStartingVerification, setIsStartingVerification] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [countdown, setCountdown] = useState(5);
	const [showHelpSection, setShowHelpSection] = useState(false);

	// 検証完了時の自動リダイレクト
	useEffect(() => {
		if (ekycData?.status === 'completed') {
			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						router.push('/register/payment');
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [ekycData, router]);

	// 本人確認を開始
	const startVerification = async () => {
		if (!user || !user.email) {
			setError('ユーザー情報が取得できません。ログインし直してください。');
			return;
		}

		setIsStartingVerification(true);
		setError(null);

		try {
			// Firebase IDトークンを取得
			const idToken = await user.getIdToken();

			// APIを呼び出してVeriffセッションを作成
			const response = await fetch('/api/veriff/create-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				}
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || '本人確認の開始に失敗しました');
			}

			const data = await response.json();

			// すでに検証が完了している場合
			if (data.status === 'completed') {
				return;
			}

			// Veriffのページにリダイレクト
			window.location.href = data.sessionUrl;

		} catch (err) {
			console.error('Error starting verification:', err);
			setError(`本人確認の開始中にエラーが発生しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
			setIsStartingVerification(false);
		}
	};

	// 開発用: 検証完了をシミュレート
	const simulateVerification = async () => {
		if (!user) return;

		setIsStartingVerification(true);
		setError(null);

		try {
			// 開発環境用のAPIエンドポイント
			const response = await fetch('/api/veriff/simulate-complete', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${await user.getIdToken()}`
				}
			});

			if (!response.ok) {
				throw new Error('シミュレーション失敗');
			}

			// APIレスポンスを待つ必要はなく、Firestoreリスナーが状態を更新
			setTimeout(() => {
				setIsStartingVerification(false);
			}, 1500);

		} catch (err) {
			console.error('Error in simulation:', err);
			setError('シミュレーション中にエラーが発生しました');
			setIsStartingVerification(false);
		}
	};

	// 検証をリセット
	const handleReset = async () => {
		setIsStartingVerification(true);
		try {
			await resetEkycStatus();
			setIsStartingVerification(false);
		} catch (err) {
			setIsStartingVerification(false);
		}
	};

	// ステータスに応じたコンテンツをレンダリング
	const renderStatusContent = () => {
		if (isLoading) {
			return (
				<div className="flex justify-center items-center py-10">
					<LoadingSpinner size="large" />
				</div>
			);
		}

		switch (ekycData?.status) {
			case 'completed':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-green-500/10 text-green-600 p-6 rounded-xl"
					>
						<div className="flex items-center mb-4">
							<div className="bg-green-100 rounded-full p-2 mr-4">
								<VerifiedIcon size={32} />
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
								<VerificationBadge className="mr-3" />
								<div>
									<p className="font-medium">E-Sports Sakura 認証済みユーザー</p>
									<p className="text-sm opacity-80">本人確認済みのユーザーとして登録されました</p>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-sm">
								{`${countdown}秒後に決済情報登録へ移動します...`}
							</span>
							<Button
								onClick={() => router.push('/register/payment')}
								className="bg-green-600 hover:bg-green-700 text-white"
							>
								今すぐ次へ
							</Button>
						</div>
					</motion.div>
				);

			case 'failed':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-red-500/10 text-red-600 p-6 rounded-xl"
					>
						<div className="flex items-center mb-4">
							<div className="bg-red-100 rounded-full p-2 mr-4">
								<VerificationFailedIcon size={32} />
							</div>
							<div>
								<h3 className="text-lg font-medium">本人確認に失敗しました</h3>
								<p className="text-sm opacity-80">
									問題が発生したため、本人確認プロセスを完了できませんでした
								</p>
							</div>
						</div>

						<div className="bg-white/50 rounded-lg p-4 mb-4">
							<h4 className="font-medium mb-2">考えられる原因:</h4>
							<ul className="list-disc pl-5 text-sm space-y-1">
								<li>写真が鮮明でなかった</li>
								<li>身分証明書が有効でなかった</li>
								<li>顔と身分証の写真が一致しなかった</li>
								<li>ネットワーク接続に問題があった</li>
							</ul>
						</div>

						<div className="flex justify-end space-x-4">
							<Button
								onClick={handleReset}
								variant="outline"
								disabled={isStartingVerification}
							>
								初めからやり直す
							</Button>
							<Button
								onClick={startVerification}
								disabled={isStartingVerification}
							>
								{isStartingVerification ? <LoadingSpinner size="small" /> : '再試行する'}
							</Button>
						</div>
					</motion.div>
				);

			case 'pending':
			default:
				return (
					<div className="space-y-6">
						<div className="bg-blue-500/10 text-blue-600 p-6 rounded-xl">
							<div className="flex items-center mb-4">
								<div className="bg-blue-100 rounded-full p-2 mr-4">
									<VerificationPendingIcon size={32} />
								</div>
								<div>
									<h3 className="text-lg font-medium">本人確認を開始しましょう</h3>
									<p className="text-sm opacity-80">
										安全なサービス提供のため、身分証明書による本人確認が必要です
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2h1v1H4v-1h1v-2a1 1 0 011-1h8a1 1 0 011 1z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">身分証撮影</h4>
									<p className="text-xs text-center">
										身分証明書の表面と裏面を撮影します
									</p>
								</div>
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">顔写真撮影</h4>
									<p className="text-xs text-center">
										自撮りで本人確認用の写真を撮影します
									</p>
								</div>
								<div className="bg-blue-500/5 p-4 rounded-lg">
									<div className="text-center mb-2">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
											<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
										</svg>
									</div>
									<h4 className="font-medium text-center mb-1">自動審査</h4>
									<p className="text-xs text-center">
										AIによる自動審査ですぐに結果が出ます
									</p>
								</div>
							</div>
						</div>

						<AnimatePresence>
							{showHelpSection && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.3 }}
									className="overflow-hidden"
								>
									<div className="bg-border/5 rounded-xl p-6 shadow-soft">
										<h3 className="text-lg font-medium mb-3">本人確認に必要なもの</h3>
										<ul className="list-disc pl-5 space-y-2">
											<li>有効な身分証明書（運転免許証、パスポート、マイナンバーカードなど）</li>
											<li>カメラ付きデバイス（スマートフォン、PC）</li>
											<li>良好な照明環境</li>
										</ul>

										<h4 className="font-medium mt-4 mb-2">準備のポイント</h4>
										<ul className="list-disc pl-5 space-y-1 text-sm">
											<li>身分証明書の情報が鮮明に見えるようにしてください</li>
											<li>反射や影が写り込まないよう注意してください</li>
											<li>顔写真撮影時は、明るい場所で正面から撮影してください</li>
											<li>眼鏡やマスクは外してください</li>
										</ul>
									</div>
								</motion.div>
							)}
						</AnimatePresence>

						<div className="flex flex-col space-y-4">
							<Button
								onClick={() => setShowHelpSection(!showHelpSection)}
								variant="outline"
								className="self-start"
							>
								{showHelpSection ? '準備のポイントを隠す' : '準備のポイントを表示する'}
							</Button>

							<div className="pt-2">
								{process.env.NODE_ENV === 'development' ? (
									<div className="space-y-4">
										<Button
											onClick={startVerification}
											disabled={isStartingVerification}
											className="w-full"
										>
											{isStartingVerification ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
										</Button>
										<Button
											onClick={simulateVerification}
											disabled={isStartingVerification}
											className="w-full bg-gray-500 hover:bg-gray-600"
										>
											{isStartingVerification ? <LoadingSpinner size="small" /> : '(開発用) 検証完了をシミュレート'}
										</Button>
									</div>
								) : (
									<Button
										onClick={startVerification}
										disabled={isStartingVerification}
										className="w-full"
									>
										{isStartingVerification ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
									</Button>
								)}
							</div>
						</div>
					</div>
				);
		}
	};

	return (
		<div className="bg-border/5 rounded-xl shadow-soft p-6">
			<h2 className="text-xl font-semibold mb-6">本人確認 (eKYC)</h2>

			{(error || ekycError) && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{error || ekycError}
				</div>
			)}

			{renderStatusContent()}
		</div>
	);
}