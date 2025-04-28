'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import axios from 'axios';

type Props = {
	memberId: string;
	cooldownPeriod?: number;  // 秒単位（デフォルト: 180
	isOnline: boolean;
};

export default function UnlockDoorButton({
	memberId,
	cooldownPeriod = 3 * 60,
	isOnline,
}: Props) {
	const [isUnlocking, setIsUnlocking] = useState(false);
	const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
	const [cooldownActive, setCooldownActive] = useState(false);
	const [remainingTime, setRemainingTime] = useState(0);

	// 前回解錠時間の読込
	useEffect(() => {
		const t = localStorage.getItem('lastUnlockTime');
		if (t) {
			const elapsed = Math.floor((Date.now() - +t) / 1000);
			if (elapsed < cooldownPeriod) {
				setCooldownActive(true);
				setRemainingTime(cooldownPeriod - elapsed);
			}
		}
	}, [cooldownPeriod]);

	// クールダウンタイマー
	useEffect(() => {
		if (!cooldownActive) return;
		const timer = setInterval(() => {
			setRemainingTime(prev => {
				if (prev <= 1) {
					clearInterval(timer);
					setCooldownActive(false);
					return 0;
				}
				return prev - 1;
			});
			//}, 1000);
		}, 10);
		return () => clearInterval(timer);
	}, [cooldownActive]);

	const formatTime = () => {
		const m = Math.floor(remainingTime / 60);
		const s = remainingTime % 60;
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	};

	// UnlockDoorButton.tsx の handleClick 関数の修正部分
	const handleClick = async () => {
		if (!memberId || cooldownActive || !isOnline) return;
		setIsUnlocking(true);
		setUnlockMessage(null);
		try {
			// ここを修正: unlockDoorTACH から unlockDoor へエンドポイント変更
			const { data } = await axios.post('/api/unlockDoor', { memberID: memberId });
			if (data.success) {
				localStorage.setItem('lastUnlockTime', Date.now().toString());
				setCooldownActive(true);
				setRemainingTime(cooldownPeriod);
			}
			setUnlockMessage(data.message || '解錠に成功しました');
		} catch (err: any) {
			setUnlockMessage(err.response?.data?.message || 'エラーが発生しました');
		} finally {
			setIsUnlocking(false);
		}
	};

	return (
		<div className="mb-4">
			<Button
				onClick={handleClick}
				disabled={isUnlocking || !memberId || cooldownActive || !isOnline}
				className="mb-2 w-full"
			>
				{isUnlocking
					? '解錠中...'
					: cooldownActive
						? `次の解錠まで ${formatTime()}`
						: 'ドアを解錠する'}
			</Button>
			{unlockMessage && (
				<p
					className={`p-2 rounded ${unlockMessage.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
						}`}
				>
					{unlockMessage}
				</p>
			)}
		</div>
	);
}
