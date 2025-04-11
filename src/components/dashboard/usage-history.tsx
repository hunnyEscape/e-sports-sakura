'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SessionDocument, SeatDocument } from '@/types/firebase';
import { Timestamp } from '@/types/index';

// 表示用の履歴アイテム
interface HistoryItem {
	id: string;
	amount: number;
	durationMinutes: number;
	description: string;
	timestamp: string;
	status: string;
	seatId: string;
	seatName?: string;
	branchName?: string;
	invoiceId?: string;
	isActive: boolean; // アクティブセッションかどうかのフラグを追加
	startTime?: string; // アクティブセッションの開始時間を追加
}

export default function UsageHistory() {
	const { user } = useAuth();
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
	const [hasMore, setHasMore] = useState(true);
	const itemsPerPage = 5;
	const [activeSession, setActiveSession] = useState<HistoryItem | null>(null); // アクティブなセッションを保存
	const [seats, setSeats] = useState<{ [key: string]: SeatDocument }>({});

	// 座席情報を取得
	const fetchSeats = async () => {
		try {
			const seatsSnapshot = await getDocs(collection(db, 'seats'));
			const seatsData: { [key: string]: SeatDocument } = {};

			seatsSnapshot.docs.forEach(doc => {
				const seatData = doc.data() as SeatDocument;
				seatsData[seatData.seatId] = seatData;
			});

			setSeats(seatsData);
		} catch (err) {
			console.error('Error fetching seats:', err);
		}
	};

	const fetchHistory = async (isLoadMore = false) => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			// 初回読み込み時に座席情報を取得
			if (!isLoadMore && Object.keys(seats).length === 0) {
				await fetchSeats();
			}

			// アクティブなセッションを先に取得する
			const activeSessionQuery = query(
				collection(db, 'sessions'),
				where('userId', '==', user.uid),
				where('active', '==', true),
				orderBy('startTime', 'desc')
			);

			const activeSessionSnapshot = await getDocs(activeSessionQuery);

			if (!activeSessionSnapshot.empty) {
				const activeData = activeSessionSnapshot.docs[0].data() as SessionDocument;

				// Firestoreのタイムスタンプをフォーマット
				const startTimeDate =
					typeof activeData.startTime === 'string'
						? new Date(activeData.startTime)
						: 'toDate' in activeData.startTime
							? activeData.startTime.toDate()
							: new Date();


				const now = new Date();
				// 現在の時点での利用時間（分）を計算
				const currentDurationMinutes = Math.floor((now.getTime() - startTimeDate.getTime()) / (1000 * 60));
				// 現在の時点での料金を計算（時間単位の料金を分単位に変換）
				const currentAmount = Math.ceil(currentDurationMinutes * (activeData.pricePerHour / 60));

				// 座席情報を取得
				const seatInfo = seats[activeData.seatId];
				const seatName = seatInfo?.name || `座席 ${activeData.seatId}`;
				const branchName = seatInfo?.branchName || '';

				const activeItem: HistoryItem = {
					id: activeSessionSnapshot.docs[0].id,
					amount: currentAmount,
					durationMinutes: currentDurationMinutes,
					description: `${branchName ? branchName + 'の' : ''}${seatName}の利用`,
					timestamp: startTimeDate.toISOString(),
					startTime: startTimeDate.toISOString(),
					status: 'in-progress',
					seatId: activeData.seatId,
					seatName: seatName,
					branchName: branchName,
					invoiceId: activeData.billingId || '',
					isActive: true,
				};

				setActiveSession(activeItem);
			} else {
				setActiveSession(null);
			}

			// 過去の利用履歴（非アクティブなセッション）を取得
			let sessionsQuery = query(
				collection(db, 'sessions'),
				where('userId', '==', user.uid),
				where('active', '==', false),
				orderBy('endTime', 'desc'),
				limit(itemsPerPage)
			);

			// 続きを読み込む場合は前回の最後の項目から開始
			if (isLoadMore && lastVisible) {
				sessionsQuery = query(
					collection(db, 'sessions'),
					where('userId', '==', user.uid),
					where('active', '==', false),
					orderBy('endTime', 'desc'),
					startAfter(lastVisible),
					limit(itemsPerPage)
				);
			}

			const sessionsSnapshot = await getDocs(sessionsQuery);

			// 続きがあるかどうかを確認
			if (sessionsSnapshot.docs.length < itemsPerPage) {
				setHasMore(false);
			} else {
				setHasMore(true);
			}

			// 最後の見えるドキュメントを保存
			const lastVisibleDoc = sessionsSnapshot.docs[sessionsSnapshot.docs.length - 1];
			if (lastVisibleDoc) {
				setLastVisible(lastVisibleDoc);
			}

			// 結果をマッピング
			const newHistoryItems = sessionsSnapshot.docs.map(doc => {
				const data = doc.data() as SessionDocument;

				// Firestoreのタイムスタンプをフォーマット
				const endTimeDate =
					typeof data.endTime === 'string'
						? new Date(data.endTime)
						: 'toDate' in data.endTime
							? data.endTime.toDate()
							: new Date();

				const startTimeDate =
					typeof data.startTime === 'string'
						? new Date(data.startTime)
						: 'toDate' in data.startTime
							? data.startTime.toDate()
							: new Date();


				// 座席情報を取得
				const seatInfo = seats[data.seatId];
				const seatName = seatInfo?.name || `座席 ${data.seatId}`;
				const branchName = seatInfo?.branchName || '';

				// 座席情報から説明を作成
				const description = `${branchName ? branchName + 'の' : ''}${seatName}の利用`;

				return {
					id: doc.id,
					amount: data.amount || Math.ceil(data.durationMinutes * (data.pricePerHour / 60)), // 金額計算 (時間単位の料金を分単位に変換)
					durationMinutes: data.durationMinutes,
					description,
					timestamp: endTimeDate.toISOString(),
					startTime: startTimeDate.toISOString(),
					status: 'paid', // 完了したセッションは支払い済みとみなす
					seatId: data.seatId,
					seatName: seatName,
					branchName: branchName,
					invoiceId: data.billingId || '',
					isActive: false,
				};
			});

			// 既存の履歴と新しい履歴を結合（続きを読み込む場合）
			if (isLoadMore) {
				setHistory(prev => [...prev, ...newHistoryItems]);
			} else {
				setHistory(newHistoryItems);
			}
		} catch (err) {
			console.error('Error fetching history from Firestore:', err);
			setError(err instanceof Error ? err.message : 'Firestoreからの履歴の取得中にエラーが発生しました');
		} finally {
			setLoading(false);
		}
	};

	// 初回読み込み
	useEffect(() => {
		if (user) {
			fetchHistory();
		}
	}, [user]);

	// 定期的にアクティブセッションの情報を更新
	useEffect(() => {
		if (!user || !activeSession) return;

		const intervalId = setInterval(() => {
			fetchHistory();
		}, 60000); // 1分ごとに更新

		return () => clearInterval(intervalId);
	}, [user, activeSession]);

	// 続きを読み込む
	const handleLoadMore = () => {
		if (hasMore && !loading) {
			fetchHistory(true);
		}
	};

	// 日付フォーマット
	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return date.toLocaleString('ja-JP', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (e) {
			return dateString;
		}
	};

	// 金額フォーマット
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(amount);
	};

	// 経過時間計算（アクティブセッション用）
	const getElapsedTime = (startTimeString: string) => {
		const startTime = new Date(startTimeString);
		const now = new Date();
		const elapsedMs = now.getTime() - startTime.getTime();

		const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
		const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

		return `${hours}時間${minutes}分`;
	};

	return (
		<div className="bg-border/5 rounded-2xl shadow-soft p-6">
			<h2 className="text-lg font-semibold mb-4">利用履歴</h2>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4">
					{error}
				</div>
			)}

			{/* アクティブセッションの表示 */}
			{activeSession && (
				<div className="mb-6">
					<h3 className="text-md font-medium mb-3">現在利用中のセッション</h3>
					<div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
						<div className="flex justify-between items-start">
							<div>
								<p className="font-medium">{activeSession.description}</p>
								{activeSession.branchName && (
									<p className="text-sm text-foreground/70">{activeSession.branchName}</p>
								)}
								<p className="text-sm text-foreground/70">開始時間: {formatDate(activeSession.timestamp)}</p>
								<p className="text-sm text-foreground/70">
									現在の利用時間: {getElapsedTime(activeSession.startTime || '')}
								</p>
							</div>
							<div className="text-right">
								<p className="text-lg font-semibold">{formatCurrency(activeSession.amount)}</p>
								<span className="inline-block bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded">
									利用中
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* 過去の利用履歴 */}
			{loading && history.length === 0 && !activeSession ? (
				<div className="flex justify-center items-center py-12">
					<LoadingSpinner size="large" />
				</div>
			) : history.length === 0 && !activeSession ? (
				<div className="text-center py-8 text-foreground/70">
					<p>まだ利用履歴はありません。</p>
				</div>
			) : (
				<>
					{history.length > 0 && (
						<h3 className="text-md font-medium mb-3">過去の利用履歴</h3>
					)}
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="text-left text-foreground/70 border-b border-border">
									<th className="pb-2">日時</th>
									<th className="pb-2">内容</th>
									<th className="pb-2">店舗</th>
									<th className="pb-2 text-right">利用時間</th>
									<th className="pb-2 text-right">料金</th>
									<th className="pb-2 text-right">ステータス</th>
								</tr>
							</thead>
							<tbody>
								{history.map((item) => (
									<tr key={item.id} className="border-b border-border/20">
										<td className="py-3">{formatDate(item.timestamp)}</td>
										<td className="py-3">
											{item.seatName || item.description}
										</td>
										<td className="py-3">
											{item.branchName || '-'}
										</td>
										<td className="py-3 text-right">
											{item.durationMinutes}分
										</td>
										<td className="py-3 text-right font-medium">
											{formatCurrency(item.amount)}
										</td>
										<td className="py-3 text-right">
											{item.status === 'paid' ? (
												<span className="inline-block bg-green-500/10 text-green-500 text-xs px-2 py-0.5 rounded">
													支払済
												</span>
											) : (
												<span className="inline-block bg-red-500/10 text-red-500 text-xs px-2 py-0.5 rounded">
													{item.status}
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* 続きを読み込むボタン */}
					{hasMore && (
						<div className="flex justify-center mt-6">
							<Button
								onClick={handleLoadMore}
								disabled={loading}
								variant="outline"
								size="sm"
							>
								{loading ? <LoadingSpinner size="small" /> : 'さらに読み込む'}
							</Button>
						</div>
					)}
				</>
			)}
		</div>
	);
}