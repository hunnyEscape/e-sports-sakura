'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import UnlockDoorButton from '@/components//dashboard/UnlockDoorButton';

export default function QrCodeDisplay() {
	const { userData } = useAuth();
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isOnline, setIsOnline] = useState(true);

	// オンライン状態
	useEffect(() => {
		setIsOnline(navigator.onLine);
		const on = () => setIsOnline(true);
		const off = () => setIsOnline(false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	}, []);

	// QR生成
	const generate = async (id: string) => {
		if (!navigator.onLine) {
			setLoading(false);
			return;
		}
		try {
			const url = await QRCode.toDataURL(id, { width: 250, margin: 2 });
			setQrDataUrl(url);
		} catch {
			setError('QRコードの生成に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	// 初回 & 3分ごと更新
	useEffect(() => {
		if (!userData?.currentMemberId) return;
		generate(userData.currentMemberId);
		const iv = setInterval(() => {
			if (userData.currentMemberId && isOnline) {
				generate(userData.currentMemberId);
			}
		}, 3 * 60 * 1000);
		return () => clearInterval(iv);
	}, [userData?.currentMemberId, isOnline]);

	if (loading) {
		return <div className="py-12 flex justify-center"><LoadingSpinner size="large" /></div>;
	}
	if (!isOnline) {
		return (
			<div className="bg-accent/10 border border-accent/20 rounded-xl p-6 text-center">
				<p className="font-medium mb-2">オフラインモードでは利用できません</p>
				<p className="text-sm text-foreground/70">接続を確認してください</p>
			</div>
		);
	}
	if (error) {
		return (
			<div className="bg-red-100 text-red-700 p-4 rounded-lg">
				<p className="mb-4">{error}</p>
				<button onClick={() => window.location.reload()} className="btn-outline btn-sm">再読み込み</button>
			</div>
		);
	}

	return (
		<div className="text-center">
			{qrDataUrl ? (
				<>
					<UnlockDoorButton/>
					<div className="bg-white p-4 rounded-lg w-40 h-40 mx-auto mb-4 flex items-center justify-center border-2 border-accent">
						<img src={qrDataUrl} alt="QRコード" className="object-contain max-w-full max-h-full" />
					</div>
					<p className="text-sm text-foreground/70">
						席のQRリーダーへかざしてPCを起動してください。<br />
						スクショは無効です。
					</p>
				</>
			) : (
				<div className="bg-orange-100 text-orange-700 p-4 rounded-lg">QRコードがありません。</div>
			)}
		</div>
	);
}
