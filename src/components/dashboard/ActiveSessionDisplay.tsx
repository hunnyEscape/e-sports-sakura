'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { SessionDisplay } from '../../types/index';
import { useAuth } from '@/context/auth-context';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SessionDocument, SeatDocument } from '@/types/firebase';

export default function ActiveSessionDisplay() {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeSessions, setActiveSessions] = useState<SessionDisplay[]>([]);

	// 座席情報を取得
	const fetchSeats = async () => {
		try {
			const seatsSnapshot = await getDocs(collection(db, 'seats'));
			const seatsData: { [key: string]: SeatDocument } = {};

			seatsSnapshot.docs.forEach(doc => {
				const seatData = doc.data() as SeatDocument;
				seatsData[seatData.seatId] = seatData;
			});

			return seatsData;
		} catch (err) {
			console.error('Error fetching seats:', err);
			throw err;
		}
	};

	// アクティブセッションの取得（すべて）
	const fetchActiveSessions = async () => {
		if (!user) return [];

		try {
			// 座席情報を先に取得
			const seatsData = await fetchSeats();

			const activeSessionsQuery = query(
				collection(db, 'sessions'),
				where('userId', '==', user.uid),
				where('active', '==', true),
				orderBy('startTime', 'desc')
			);

			const activeSessionsSnapshot = await getDocs(activeSessionsQuery);

			if (activeSessionsSnapshot.empty) {
				return [];
			}

			// すべてのアクティブセッションを処理
			return activeSessionsSnapshot.docs.map(doc => {
				const activeData = doc.data() as SessionDocument;
				const sessionId = doc.id;

				// タイムスタンプの処理
				const startTimeDate = getDateFromTimestamp(activeData.startTime);
				const now = new Date();

				// 現在の時点での利用時間（分）を計算
				const currentDurationMinutes = Math.floor((now.getTime() - startTimeDate.getTime()) / (1000 * 60));
				const currentHourBlocks = Math.ceil(currentDurationMinutes / 60);
				const currentAmount = currentHourBlocks * 600;

				// 座席情報を取得
				const seatInfo = seatsData[activeData.seatId];
				const seatName = seatInfo?.name || `座席 ${activeData.seatId}`;
				const branchName = seatInfo?.branchName || '';

				return {
					...activeData,
					sessionId,
					formattedStartTime: formatDate(startTimeDate),
					formattedEndTime: '利用中',
					durationText: getElapsedTime(startTimeDate),
					seatName,
					branchName,
					amount: currentAmount,
					hourBlocks: currentHourBlocks,
					blockchainStatusClass: 'bg-blue-500/10 text-blue-500',
					blockchainStatusText: '利用中'
				} as SessionDisplay;
			});
		} catch (err) {
			console.error('Error fetching active sessions:', err);
			throw err;
		}
	};

	const fetchData = async () => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			// すべてのアクティブセッションを取得
			const sessions = await fetchActiveSessions();
			setActiveSessions(sessions);

		} catch (err) {
			console.error('Error fetching active session data:', err);
			setError(err instanceof Error ? err.message : 'データの取得中にエラーが発生しました');
		} finally {
			setLoading(false);
		}
	};

	// 初回読み込み
	useEffect(() => {
		if (user) {
			fetchData();
		}
	}, [user]);

	// アクティブセッションがある場合、定期的に更新
	useEffect(() => {
		if (!user || activeSessions.length === 0) return;

		const intervalId = setInterval(() => {
			fetchData();
		}, 60000); // 1分ごとに更新

		return () => clearInterval(intervalId);
	}, [user, activeSessions]);

	// ヘルパー関数: タイムスタンプからDateオブジェクトを取得
	function getDateFromTimestamp(timestamp: any): Date {
		if (typeof timestamp === 'string') {
			return new Date(timestamp);
		} else if (timestamp && 'toDate' in timestamp) {
			return timestamp.toDate();
		}
		return new Date();
	}

	// 日付フォーマット
	function formatDate(date: Date): string {
		return date.toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// 金額フォーマット
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(amount);
	}

	// 経過時間計算（アクティブセッション用）
	function getElapsedTime(startTime: Date): string {
		const now = new Date();
		const elapsedMs = now.getTime() - startTime.getTime();

		const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
		const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

		return `${hours}時間${minutes}分`;
	}

	if (loading) return null;
	if (activeSessions.length === 0) return null;

	return (
		<div className="space-y-3">
			{activeSessions.map((session) => (
				<div key={session.sessionId} className="bg-border/5 rounded-2xl shadow-soft p-2 md:p-6">
					<div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
						<div className="flex flex-col md:flex-row justify-between md:items-start">
							<div>
								<p className="font-medium">{session.seatName}</p>
								{session.branchName && (
									<p className="text-sm text-foreground/70">{session.branchName}</p>
								)}
								<p className="text-sm text-foreground/70">開始時間: {session.formattedStartTime}</p>
								<p className="text-sm text-foreground/70">
									現在の利用時間: {session.durationText}
									（{session.hourBlocks}時間ブロック）
								</p>
							</div>
							<div className="mt-3 md:mt-0 md:text-right">
								<p className="text-lg font-semibold">{formatCurrency(session.amount)}</p>
								<span className="inline-block bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded">
									利用中
								</span>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}