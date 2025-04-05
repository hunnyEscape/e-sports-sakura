'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useVeriff } from '@/hooks/use-veriff';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';

export default function VerificationStatus() {
	const router = useRouter();
	const { user } = useAuth();
	const { status, error, isLoading, startVerification, simulateVerification } = useVeriff();
	const [countdown, setCountdown] = useState(5);

	// 検証結果をリアルタイムで監視
	useEffect(() => {
		if (!user) return;

		const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
			if (snapshot.exists()) {
				const data = snapshot.data();
				if (data.eKYC?.status === 'completed') {
					// 自動的に次のステップに進むためのカウントダウン
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
			}
		});

		// クリーンアップ
		return () => unsubscribe();
	}, [user, router]);

	// UI表示をステータスに応じて切り替え
	const renderContent = () => {
		switch (status) {
			case 'completed':
				return (
					<div className="bg-green-500/10 text-green-500 p-6 rounded-lg mb-6">
						<div className="flex items-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="text-lg font-medium">本人確認が完了しました</span>
						</div>
						<p className="mb-4">
							お客様の本人確認が正常に完了しました。次のステップに進みます。
						</p>
						<div className="flex items-center justify-between">
							<span className="text-sm">
								{countdown}秒後に自動的に次のステップへ移動します...
							</span>
							<Button
								onClick={() => router.push('/register/payment')}
								variant="outline"
								size="sm"
							>
								今すぐ次へ
							</Button>
						</div>
					</div>
				);

			case 'failed':
				return (
					<div className="bg-red-500/10 text-red-500 p-6 rounded-lg mb-6">
						<div className="flex items-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
							</svg>
							<span className="text-lg font-medium">本人確認に失敗しました</span>
						</div>
						<p className="mb-4">
							本人確認に失敗しました。以下の一般的な問題をご確認ください：
							<ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
								<li>身分証明書が鮮明に写っていない</li>
								<li>顔写真と身分証明書の本人が一致していない</li>
								<li>有効期限が切れた身分証明書を使用している</li>
								<li>推奨される身分証明書を使用していない</li>
							</ul>
						</p>
						<Button
							onClick={startVerification}
							className="w-full mt-4"
							disabled={isLoading}
						>
							再試行する
						</Button>
					</div>
				);

			case 'pending':
			default:
				return (
					<div className="space-y-6">
						<div className="bg-blue-500/10 text-blue-500 p-6 rounded-lg">
							<h3 className="font-medium text-lg mb-2">本人確認について</h3>
							<p className="mb-4">
								本人確認は身分証明書と顔写真を使って、ご本人様であることを確認するプロセスです。
								これにより、サービスの安全性と信頼性を高めています。
							</p>
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

						<div>
							<h3 className="text-lg font-medium mb-3">本人確認に必要なもの</h3>
							<ul className="list-disc pl-5 space-y-2">
								<li>有効な身分証明書（運転免許証、パスポート、マイナンバーカードなど）</li>
								<li>カメラ付きデバイス（スマートフォン、PC）</li>
								<li>良好な照明環境</li>
							</ul>
						</div>

						<div className="pt-4">
							{process.env.NODE_ENV === 'development' ? (
								// 開発環境では、本番と開発用のボタンを表示
								<div className="space-y-4">
									<Button
										onClick={startVerification}
										disabled={isLoading}
										className="w-full"
									>
										{isLoading ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
									</Button>
									<Button
										onClick={simulateVerification}
										disabled={isLoading}
										className="w-full bg-gray-500 hover:bg-gray-600"
									>
										{isLoading ? <LoadingSpinner size="small" /> : '(開発用) 検証完了をシミュレート'}
									</Button>
								</div>
							) : (
								<Button
									onClick={startVerification}
									disabled={isLoading}
									className="w-full"
								>
									{isLoading ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
								</Button>
							)}
						</div>
					</div>
				);
		}
	};

	return (
		<div className="bg-border/5 rounded-xl shadow-soft p-6">
			<h2 className="text-xl font-semibold mb-6">本人確認 (eKYC)</h2>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
					{error}
				</div>
			)}

			{renderContent()}
		</div>
	);
}