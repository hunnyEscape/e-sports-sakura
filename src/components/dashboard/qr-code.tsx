'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';
import axios from 'axios';

export default function QrCodeDisplay() {
	const { userData } = useAuth();
	const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
	const [isUnlocking, setIsUnlocking] = useState(false);

	// 解錠制限のための状態
	const [cooldownActive, setCooldownActive] = useState(false);
	const [remainingTime, setRemainingTime] = useState(0);
	const cooldownPeriod = 3 * 60; // 3分 = 180秒

	// 前回の解錠時間をローカルストレージから取得
	useEffect(() => {
		const lastUnlockTime = localStorage.getItem('lastUnlockTime');
		if (lastUnlockTime) {
			const elapsedSeconds = Math.floor((Date.now() - parseInt(lastUnlockTime)) / 1000);
			if (elapsedSeconds < cooldownPeriod) {
				setCooldownActive(true);
				setRemainingTime(cooldownPeriod - elapsedSeconds);
			}
		}
	}, []);

	// クールダウンタイマー
	useEffect(() => {
		let timer: NodeJS.Timeout | null = null;

		if (cooldownActive && remainingTime > 0) {
			timer = setInterval(() => {
				setRemainingTime(prev => {
					if (prev <= 1) {
						setCooldownActive(false);
						if (timer) clearInterval(timer);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}

		return () => {
			if (timer) clearInterval(timer);
		};
	}, [cooldownActive, remainingTime]);

	// QRコードの生成関数
	const generateQrCode = async (memberId: string) => {
		try {
			const dataUrl = await QRCode.toDataURL(memberId, {
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

	// ドア解錠関数
	const unlockDoor = async () => {
		if (!userData?.currentMemberId || cooldownActive) return;

		setIsUnlocking(true);
		setUnlockMessage(null);

		try {
			const response = await axios.post('/api/unlockDoor', {
				memberID: userData.currentMemberId
			});

			// 解錠成功時に制限を設定
			if (response.data.success) {
				localStorage.setItem('lastUnlockTime', Date.now().toString());
				setCooldownActive(true);
				setRemainingTime(cooldownPeriod);
			}

			setUnlockMessage(response.data.message || 'ドアの解錠に成功しました');
		} catch (err: any) {
			setUnlockMessage(err.response?.data?.message || 'エラーが発生しました');
		} finally {
			setIsUnlocking(false);
		}
	};

	// 残り時間の表示用フォーマット
	const formatRemainingTime = () => {
		const minutes = Math.floor(remainingTime / 60);
		const seconds = remainingTime % 60;
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
	};

	// 初期ロード & 3分おきに更新
	useEffect(() => {
		if (!userData?.currentMemberId) return;

		// 初回生成
		generateQrCode(userData.currentMemberId);

		// 3分おきに更新
		const interval = setInterval(() => {
			if (userData?.currentMemberId) {
				generateQrCode(userData.currentMemberId);
			}
		}, 3 * 60 * 1000); // 3分 = 180,000ミリ秒

		return () => clearInterval(interval);
	}, [userData?.currentMemberId]);

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
					<Button
						onClick={unlockDoor}
						disabled={isUnlocking || !userData?.currentMemberId || cooldownActive}
						className="mb-4"
					>
						{isUnlocking
							? '解錠中...'
							: cooldownActive
								? `次の解錠まで ${formatRemainingTime()}`
								: '立川店のドアを解錠する'
						}
					</Button>

					{unlockMessage && cooldownActive && (
						<div className={`p-3 rounded-md mb-4 ${unlockMessage.includes('成功') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
							{unlockMessage}
						</div>
					)}

					<div className="bg-white p-4 rounded-lg w-40 h-40 mx-auto mb-4 flex items-center justify-center border-2 border-accent">
						<img
							src={qrCodeDataUrl}
							alt="QRコード"
							className="w-full max-w-[150px] h-full object-contain"
						/>
					</div>

					<p className="text-sm text-foreground/70 mb-4">
						席にあるQRリーダーへかざして、PCを起動させてください<br/>
					</p>
				</>
			) : (
				<div className="bg-orange-500/10 text-orange-500 p-4 rounded-lg mb-4">
					<p className="mb-2">QRコードが見つかりません。</p>
				</div>
			)}
		</div>
	);
}