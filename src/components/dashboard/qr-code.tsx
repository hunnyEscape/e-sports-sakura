'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';

export default function QrCodeDisplay() {
	const { user } = useAuth();
	const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const generateQrCode = async () => {
			if (!user) return;

			try {
				// ユーザーのUIDをそのままQRコードとして使用
				const dataUrl = await QRCode.toDataURL(user.uid, {
					width: 250,
					margin: 2,
					color: {
						dark: "#000",
						light: "#fff"
					}
				});

				setQrCodeDataUrl(dataUrl);
			} catch (err) {
				setError('QRコードの生成に失敗しました');
			} finally {
				setLoading(false);
			}
		};

		generateQrCode();
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
				<Button onClick={() => window.location.reload()} size="sm" variant="outline">
					再読み込み
				</Button>
			</div>
		);
	}

	return (
		<div className="text-center">
			{qrCodeDataUrl ? (
				<>
					<div className="bg-white p-4 rounded-lg w-64 h-64 mx-auto mb-4 flex items-center justify-center border-2 border-accent">
						<img
							src={qrCodeDataUrl}
							alt="QRコード"
							className="w-full h-full object-contain"
						/>
					</div>

					<p className="text-sm text-foreground/70 mb-4">
						このQRコードを店舗の入口リーダーにかざして入室できます。
					</p>

					<div className="text-center text-sm">
						<span className="bg-gray-800 text-white p-2 rounded-md">
							{user?.uid}
						</span>
					</div>
				</>
			) : (
				<div className="bg-orange-500/10 text-orange-500 p-4 rounded-lg mb-4">
					<p className="mb-2">QRコードが見つかりません。</p>
				</div>
			)}
		</div>
	);
}