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
					<div className="bg-white p-4 rounded-lg w-40 h-40 mx-auto mb-4 flex items-center justify-center border-2 border-accent">
						<img
							src={qrCodeDataUrl}
							alt="QRコード"
							className="w-full max-w-[150px] h-full object-contain"
						/>
					</div>
					<p className="text-sm text-foreground/70 mb-4">
						店舗の入口や席のQRリーダーにかざしてください<br/>
					</p>
					<Button
						variant="outline"
						className="text-sm opacity-50 pointer-events-auto cursor-pointer"
					>
						会員QRの更新手続き : 紛失したり他人に漏洩した場合は更新手続きをお願いします。（未実装）
					</Button>
				</>
			) : (
				<div className="bg-orange-500/10 text-orange-500 p-4 rounded-lg mb-4">
					<p className="mb-2">QRコードが見つかりません。</p>
				</div>
			)}
		</div>
	);
}