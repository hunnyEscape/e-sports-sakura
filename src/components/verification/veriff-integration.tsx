'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { createVeriffSession, VeriffSession, VeriffStatus } from '@/lib/veriff';

export default function VeriffIntegration() {
	const { user } = useAuth();
	const router = useRouter();
	const [veriffSession, setVeriffSession] = useState<VeriffSession | null>(null);
	const [status, setStatus] = useState<VeriffStatus>('pending');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ユーザーのVeriff状態を確認
	useEffect(() => {
		const checkVeriffStatus = async () => {
			if (!user) return;

			try {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists() && userDoc.data().eKYC) {
					const eKYC = userDoc.data().eKYC;
					setStatus(eKYC.status || 'pending');

					// すでにセッションがある場合
					if (eKYC.sessionId) {
						setVeriffSession({
							sessionId: eKYC.sessionId,
							sessionUrl: '',  // APIから取得する場合はここで設定
							status: eKYC.status
						});
					}

					// 検証が完了している場合
					if (eKYC.status === 'completed') {
						// 決済情報入力ステップに進む準備ができていることを示す
						setTimeout(() => {
							router.push('/register/payment');
						}, 2000);
					}
				}
			} catch (err) {
				console.error('Error checking verification status:', err);
				setError('検証状態の確認中にエラーが発生しました。');
			}
		};

		checkVeriffStatus();
	}, [user, router]);

	// Veriffセッションを開始
	const startVerification = async () => {
		if (!user || !user.email) {
			setError('ユーザー情報が取得できません。ログインし直してください。');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// Veriffセッションを作成
			const session = await createVeriffSession(user.uid, user.email);

			// セッション情報を保存
			setVeriffSession(session);

			// Firestoreにセッション情報を保存
			await setDoc(doc(db, 'users', user.uid), {
				eKYC: {
					sessionId: session.sessionId,
					status: 'pending',
					createdAt: new Date().toISOString()
				}
			}, { merge: true });

			// Veriffの検証ページにリダイレクト
			window.location.href = session.sessionUrl;
		} catch (err) {
			console.error('Error starting verification:', err);
			setError('検証の開始中にエラーが発生しました。後でもう一度お試しください。');
			setLoading(false);
		}
	};

	// モック実装用の関数（テスト/開発用）
	const simulateVerification = async () => {
		if (!user) return;

		setLoading(true);
		setError(null);

		try {
			// 検証完了をシミュレート
			setTimeout(async () => {
				const newStatus = 'completed';
				setStatus(newStatus);

				// Firestoreを更新
				await setDoc(doc(db, 'users', user.uid), {
					eKYC: {
						sessionId: `mock-session-${Date.now()}`,
						status: newStatus,
						verifiedAt: new Date().toISOString()
					},
					registrationStep: 0  // eKYCステップ完了
				}, { merge: true });

				setLoading(false);

				// 次のステップへ
				setTimeout(() => {
					router.push('/register/payment');
				}, 1500);
			}, 2000);
		} catch (err) {
			console.error('Error in mock verification:', err);
			setError('検証のシミュレーション中にエラーが発生しました。');
			setLoading(false);
		}
	};

	// UI表示
	const renderStatus = () => {
		switch (status) {
			case 'completed':
				return (
					<div className="bg-green-500/10 text-green-500 p-4 rounded-lg mb-6">
						<div className="flex items-center">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="font-medium">本人確認が完了しました。</span>
						</div>
						<p className="mt-2 text-sm">
							決済情報の登録に進みます...
						</p>
					</div>
				);
			case 'failed':
				return (
					<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6">
						<p className="font-medium">本人確認に失敗しました。</p>
						<p className="mt-2 text-sm">
							もう一度お試しいただくか、サポートにお問い合わせください。
						</p>
						<Button
							onClick={startVerification}
							className="mt-4"
							disabled={loading}
						>
							再試行する
						</Button>
					</div>
				);
			default:
				return (
					<div className="space-y-6">
						<div className="bg-orange-500/10 text-orange-500 p-4 rounded-lg mb-6">
							<p>
								安全なサービスのご提供のため、本人確認を行います。
								有効な身分証明書（運転免許証、パスポート、マイナンバーカードなど）をご用意ください。
							</p>
						</div>

						<div className="space-y-4">
							<h3 className="text-lg font-medium">本人確認の流れ</h3>
							<ol className="list-decimal pl-5 space-y-2">
								<li>有効な身分証明書を用意する</li>
								<li>本人確認を開始ボタンをクリックする</li>
								<li>身分証の撮影（両面）</li>
								<li>顔写真の撮影（本人確認）</li>
								<li>審査完了（自動）</li>
							</ol>
						</div>

						<div className="pt-4">
							{process.env.NODE_ENV === 'development' ? (
								// 開発環境では、モックボタンも表示
								<div className="space-y-4">
									<Button
										onClick={startVerification}
										disabled={loading}
										className="w-full"
									>
										{loading ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
									</Button>
									<Button
										onClick={simulateVerification}
										disabled={loading}
										className="w-full bg-gray-500 hover:bg-gray-600"
									>
										{loading ? <LoadingSpinner size="small" /> : '(開発用) 検証完了をシミュレート'}
									</Button>
								</div>
							) : (
								<Button
									onClick={startVerification}
									disabled={loading}
									className="w-full"
								>
									{loading ? <LoadingSpinner size="small" /> : '本人確認を開始する'}
								</Button>
							)}

							<p className="mt-4 text-sm text-foreground/60 text-center">
								本人確認は安全なシステムで行われ、あなたの個人情報は保護されます。<br />
								Veriffのサービスを使用した本人確認プロセスを通じて、不正アクセスを防止します。
							</p>
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

			{renderStatus()}
		</div>
	);
}