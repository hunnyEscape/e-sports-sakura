'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';

// シンプルなQRコード表示コンポーネント（実際はQRコードライブラリを使用）
export default function QrCodeDisplay() {
	const { user } = useAuth();
	const [qrValue, setQrValue] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	// QRコードをロード
	const loadQrCode = async () => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			// QRコードを取得
			const qrDocRef = doc(db, 'memberQRs', user.uid);
			const qrDoc = await getDoc(qrDocRef);

			if (qrDoc.exists() && qrDoc.data().qrValue) {
				setQrValue(qrDoc.data().qrValue);
			} else {
				// QRコードがなければ新規作成
				await generateQrCode();
			}
		} catch (err) {
			console.error('Error loading QR code:', err);
			setError('QRコードの読み込みに失敗しました。');
		} finally {
			setLoading(false);
		}
	};

	// QRコードを生成（実際はCloud Functionsで行うべき処理）
	const generateQrCode = async () => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			// 簡易的なランダム文字列生成
			const randomQr = `ESQR-${user.uid.substring(0, 6)}-${Date.now().toString(36)}`;

			// Firestoreに保存
			const qrDocRef = doc(db, 'memberQRs', user.uid);
			await setDoc(qrDocRef, {
				userId: user.uid,
				qrValue: randomQr,
				createdAt: new Date().toISOString(),
				expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
				isActive: true
			});

			setQrValue(randomQr);
		} catch (err) {
			console.error('Error generating QR code:', err);
			setError('QRコードの生成に失敗しました。');
		} finally {
			setLoading(false);
		}
	};

	// QRコードをリフレッシュ
	const refreshQrCode = async () => {
		if (!user) return;

		try {
			setRefreshing(true);
			await generateQrCode();
		} catch (err) {
			console.error('Error refreshing QR code:', err);
			setError('QRコードの更新に失敗しました。');
		} finally {
			setRefreshing(false);
		}
	};

	// 初回ロード
	useEffect(() => {
		if (user) {
			loadQrCode();
		}
	}, [user]);

	if (loading) {
		return (
			<div className="py-12 flex justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
				<p className="mb-4">{error}</p>
				<Button onClick={loadQrCode} size="sm" variant="outline">
					再読み込み
				</Button>
			</div>
		);
	}

	return (
		<div className="text-center">
			{qrValue ? (
				<>
					{/* シンプルなQRコード表示（実際はQRコードライブラリを使用） */}
					<div className="bg-white p-4 rounded-lg w-48 h-48 mx-auto mb-4 flex items-center justify-center border-2 border-accent">
						<div className="text-black text-xs break-all overflow-hidden">
							QRコード: {qrValue}
						</div>
					</div>

					<p className="text-sm text-foreground/70 mb-4">
						このQRコードを店舗の入口リーダーにかざして入室できます。
					</p>

					<Button
						onClick={refreshQrCode}
						disabled={refreshing}
						size="sm"
						variant="outline"
					>
						{refreshing ? <LoadingSpinner size="small" /> : 'QRコードを更新'}
					</Button>
				</>
			) : (
				<div className="bg-orange-500/10 text-orange-500 p-4 rounded-lg mb-4">
					<p className="mb-2">QRコードが見つかりません。</p>
					<Button onClick={generateQrCode} size="sm">
						QRコードを生成
					</Button>
				</div>
			)}
		</div>
	);
}