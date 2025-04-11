'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function CompletePage() {
	const { user, userData, loading } = useAuth();
	const router = useRouter();
	const [completing, setCompleting] = useState(false);
	const [completed, setCompleted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 登録情報を確認し、必要に応じて完了フラグを設定
	useEffect(() => {
		const completeRegistration = async () => {
			if (!user || loading) return;

			// すでに登録完了している場合はダッシュボードにリダイレクト
			if (userData?.registrationCompleted) {
				router.push('/dashboard');
				return;
			}

			// 決済設定が完了している場合のみ、登録完了処理を行う
			if (
				userData?.stripe?.paymentSetupCompleted ||
				(typeof userData?.registrationStep === 'number' && userData.registrationStep >= 1)
			  ) {
			  
				try {
					setCompleting(true);

					// 登録完了フラグを設定
					await setDoc(doc(db, 'users', user.uid), {
						registrationCompleted: true,
						registrationCompletedAt: new Date().toISOString()
					}, { merge: true });

					setCompleted(true);

				} catch (err) {
					console.error('Error completing registration:', err);
					setError('登録完了処理中にエラーが発生しました。');
				} finally {
					setCompleting(false);
				}
			} else {
				// 決済設定が完了していない場合は決済ページにリダイレクト
				router.push('/register/payment');
			}
		};

		completeRegistration();
	}, [user, userData, loading, router]);

	const goToDashboard = () => {
		router.push('/dashboard');
	};

	// ローディング表示
	if (loading || completing) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<LoadingSpinner size="large" />
				<p className="mt-4 text-foreground/70">
					{completing ? '登録情報を完了しています...' : '読み込み中...'}
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto text-center">
			<div className="bg-border/5 rounded-xl shadow-soft p-8">
				<div className="mb-8">
					<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" viewBox="0 0 20 20" fill="currentColor">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
						</svg>
					</div>
				</div>

				<h2 className="text-2xl font-semibold mb-4">会員登録が完了しました！</h2>

				<p className="text-foreground/70 mb-8">
					E-Sports Sakuraの会員登録が正常に完了しました。<br />
					ダッシュボードから会員QRコードを確認し、店舗でのサービスをお楽しみください。
				</p>

				{error && (
					<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6 max-w-md mx-auto">
						{error}
						<p className="mt-2 text-sm">
							※エラーが発生しましたが、ダッシュボードから利用を開始できます。
						</p>
					</div>
				)}

				<Button
					onClick={goToDashboard}
					className="w-full max-w-md mx-auto"
				>
					ダッシュボードへ
				</Button>

				<div className="mt-8 p-4 bg-accent/10 rounded-lg max-w-md mx-auto">
					<h3 className="font-medium text-accent mb-2">次のステップ</h3>
					<ul className="text-left text-sm space-y-2">
						<li>• ダッシュボードから会員QRコードを表示</li>
						<li>• 店舗入口のQRリーダーにかざして入室</li>
						<li>• 店内のPCでも同じQRコードを使用</li>
						<li>• 退出時は自動的に料金計算されます</li>
					</ul>
				</div>
			</div>
		</div>
	);
}