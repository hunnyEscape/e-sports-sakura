'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Clock, Tag, Info, ExternalLink } from 'lucide-react';
import { MonthGroup, SessionDisplay, AppliedCoupon } from './types';
import { useAuth } from '@/context/auth-context';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SessionDocument, SeatDocument, UserCoupon } from '@/types/firebase';

export default function MonthGroupsDisplay() {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
	const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
	const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);

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

	// 利用可能なクーポンを取得
	const fetchAvailableCoupons = async () => {
		if (!user) return [];

		try {
			const couponsQuery = query(
				collection(db, 'userCoupons'),
				where('userId', '==', user.uid),
				where('status', '==', 'available'),
				orderBy('discountValue', 'desc') // 割引額の大きい順にソート
			);

			const couponsSnapshot = await getDocs(couponsQuery);
			const coupons: UserCoupon[] = [];

			couponsSnapshot.docs.forEach(doc => {
				const data = doc.data() as any;
				const issuedAtDate = getDateFromTimestamp(data.issuedAt);

				coupons.push({
					id: doc.id,
					userId: data.userId,
					name: data.name,
					code: data.code,
					description: data.description,
					discountValue: data.discountValue,
					status: data.status,
					issuedAt: issuedAtDate
				} as UserCoupon);
			});

			return coupons;
		} catch (err) {
			console.error('Error fetching coupons:', err);
			throw err;
		}
	};

	// 過去のセッションを取得
	const fetchSessionHistory = async () => {
		if (!user) return [];

		try {
			// 座席情報を先に取得
			const seatsData = await fetchSeats();

			const sessionsQuery = query(
				collection(db, 'sessions'),
				where('userId', '==', user.uid),
				where('active', '==', false),
				orderBy('endTime', 'desc')
			);

			const sessionsSnapshot = await getDocs(sessionsQuery);
			const sessions: SessionDisplay[] = [];

			sessionsSnapshot.docs.forEach(doc => {
				const data = doc.data() as SessionDocument;
				const sessionId = doc.id;

				// タイムスタンプの処理
				const startTimeDate = getDateFromTimestamp(data.startTime);
				const endTimeDate = getDateFromTimestamp(data.endTime);

				// 利用時間の計算
				const durationMinutes = Math.floor((endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60));
				const hourBlocks = data.hourBlocks || Math.ceil(durationMinutes / 60);
				const amount = hourBlocks * 600;

				// 座席情報を取得
				const seatInfo = seatsData[data.seatId];
				const seatName = seatInfo?.name || `座席 ${data.seatId}`;
				const branchName = seatInfo?.branchName || '';

				// ブロックチェーンステータスのスタイルマッピング
				let blockchainStatusClass = 'bg-gray-200 text-gray-700';
				let blockchainStatusText = '未記録';

				if (data.blockchainStatus === 'confirmed') {
					blockchainStatusClass = 'bg-green-500/10 text-green-600';
					blockchainStatusText = '確認済み';
				} else if (data.blockchainStatus === 'pending') {
					blockchainStatusClass = 'bg-yellow-500/10 text-yellow-600';
					blockchainStatusText = '保留中';
				} else if (data.blockchainStatus === 'error') {
					blockchainStatusClass = 'bg-red-500/10 text-red-600';
					blockchainStatusText = 'エラー';
				}

				sessions.push({
					...data,
					sessionId,
					formattedStartTime: formatDate(startTimeDate),
					formattedEndTime: formatDate(endTimeDate),
					durationText: `${Math.floor(durationMinutes / 60)}時間${durationMinutes % 60}分`,
					seatName,
					branchName,
					amount,
					hourBlocks,
					blockchainStatusClass,
					blockchainStatusText
				});
			});

			return sessions;
		} catch (err) {
			console.error('Error fetching session history:', err);
			throw err;
		}
	};

	// セッションを月ごとにグループ化する
	const groupSessionsByMonth = (sessions: SessionDisplay[]): MonthGroup[] => {
		const groups: { [key: string]: MonthGroup } = {};

		sessions.forEach(session => {
			// タイムスタンプからDateオブジェクトを正しく取得
			const startDate = getDateFromTimestamp(session.startTime);
			// 有効な日付オブジェクトかチェック
			if (isNaN(startDate.getTime())) {
				console.error('Invalid date object:', session.startTime);
				return; // 無効な日付の場合はスキップ
			}

			const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
			const displayMonth = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`;

			if (!groups[monthKey]) {
				groups[monthKey] = {
					monthKey,
					displayMonth,
					sessions: [],
					totalHourBlocks: 0,
					totalAmount: 0,
					appliedCoupons: [], // 初期化
					totalDiscountAmount: 0, // 初期化
					finalAmount: 0, // 初期化
					isPaid: false // 支払い済みフラグ、実際は支払いAPIから取得
				};
			}

			groups[monthKey].sessions.push(session);
			groups[monthKey].totalHourBlocks += session.hourBlocks || 0;
			groups[monthKey].totalAmount += session.amount || 0;
		});

		// 各月の最終金額を初期化（クーポン適用前）
		Object.values(groups).forEach(group => {
			group.finalAmount = group.totalAmount;

			// 前月の場合は支払い済みフラグをtrueに（デモ用）
			const now = new Date();
			const [year, month] = group.monthKey.split('-').map(Number);
			const groupDate = new Date(year, month - 1);

			if (groupDate.getFullYear() < now.getFullYear() ||
				(groupDate.getFullYear() === now.getFullYear() &&
					groupDate.getMonth() < now.getMonth())) {
				group.isPaid = true;
			}
		});

		// 月の降順でソート
		return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
	};

	// クーポンを適用する
	const applyCouponsToMonthGroups = (groups: MonthGroup[], coupons: UserCoupon[]): MonthGroup[] => {
		// ディープコピーを作成
		const updatedGroups = JSON.parse(JSON.stringify(groups)) as MonthGroup[];

		// 利用可能なクーポンをディープコピー（操作するため）
		let availableCoupons = JSON.parse(JSON.stringify(coupons));

		// 現在の日付を取得して、当月を判定
		const now = new Date();
		const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

		// 各月ごとにクーポン適用処理
		updatedGroups.forEach(group => {
			// デフォルト値の設定
			group.appliedCoupons = [];
			group.totalDiscountAmount = 0;
			group.finalAmount = group.totalAmount;

			// 当月のみクーポン適用（過去の月には適用しない）
			// もし過去の月にも適用したい場合は、この条件を変更
			if (group.monthKey === currentMonthKey) {
				// 割引額の大きい順に並んでいるクーポンを順に適用
				availableCoupons.forEach(coupon => {
					// まだ支払い額が残っていて、クーポンが適用可能な場合
					if (group.finalAmount > 0) {
						// 適用する割引額（残額よりも大きい場合は残額まで）
						const discountToApply = Math.min(coupon.discountValue, group.finalAmount);

						// クーポンを適用
						group.appliedCoupons.push({
							id: coupon.id,
							name: coupon.name,
							code: coupon.code,
							discountValue: discountToApply
						});

						// 合計割引額を更新
						group.totalDiscountAmount += discountToApply;

						// 最終金額を更新
						group.finalAmount = group.totalAmount - group.totalDiscountAmount;
					}
				});
			}
		});

		return updatedGroups;
	};

	// データ取得
	const fetchData = async () => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			// 過去のセッション履歴を取得
			const sessions = await fetchSessionHistory();

			// 利用可能なクーポンを取得
			const coupons = await fetchAvailableCoupons();
			setAvailableCoupons(coupons);

			// 月ごとにグループ化
			let groups = groupSessionsByMonth(sessions);

			// クーポンを適用
			groups = applyCouponsToMonthGroups(groups, coupons);

			setMonthGroups(groups);

			// 初回は何も展開しない
			setExpandedMonths(new Set());
		} catch (err) {
			console.error('Error fetching data:', err);
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

	// 月のセクションの展開/折りたたみを切り替える
	const toggleMonth = (monthKey: string) => {
		setExpandedMonths(prev => {
			const newSet = new Set(prev);
			if (newSet.has(monthKey)) {
				newSet.delete(monthKey);
			} else {
				newSet.add(monthKey);
			}
			return newSet;
		});
	};

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

	if (loading) return (
		<div className="text-center py-8 text-foreground/70">
			<p>データを読み込み中...</p>
		</div>
	);

	if (monthGroups.length === 0) {
		return (
			<div className="text-center py-8 text-foreground/70">
				<p>まだ利用履歴はありません。</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{monthGroups.map((group) => (
				<div key={group.monthKey} className="border border-border/50 rounded-lg overflow-hidden">
					{/* 月のヘッダー */}
					<div
						className="flex items-center justify-between p-4 bg-accent/5 cursor-pointer"
						onClick={() => toggleMonth(group.monthKey)}
					>
						<div className="flex items-center flex-wrap">
							<Calendar className="w-5 h-5 mr-2 text-primary" />
							<h3 className="font-medium">
								{group.displayMonth}
							</h3>
							{group.isPaid && (
								<span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-600">
									支払い済み
								</span>
							)}
						</div>
						<div className="flex items-center">
							<div className="text-right mr-3">
								{/* クーポン適用情報 */}
								{group.appliedCoupons.length > 0 && (
									<p className="text-xs text-green-600 flex items-center">
										<Tag className="w-3 h-3 mr-1" />
										クーポン適用 -{formatCurrency(group.totalDiscountAmount)}
									</p>
								)}
							</div>
							{expandedMonths.has(group.monthKey) ? (
								<ChevronUp className="w-5 h-5" />
							) : (
								<ChevronDown className="w-5 h-5" />
							)}
						</div>
					</div>

					{/* 詳細セクション */}
					{expandedMonths.has(group.monthKey) && (
						<div className="p-4">
							{/* 適用されたクーポンがある場合の表示 */}
							{group.appliedCoupons.length > 0 && (
								<div className="mb-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
									<div className="flex items-start">
										<Info className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
										<div>
											<p className="text-sm font-medium text-green-700">適用されたクーポン</p>
											<div className="mt-2 space-y-1">
												{group.appliedCoupons.map((coupon, idx) => (
													<div key={idx} className="flex justify-between text-sm">
														<span className="text-foreground/80">{coupon.name}</span>
														<span className="font-medium text-green-600">-{formatCurrency(coupon.discountValue)}</span>
													</div>
												))}
											</div>
											<div className="mt-2 pt-2 border-t border-green-500/10 flex justify-between">
												<span className="text-sm">割引合計</span>
												<span className="font-medium text-green-600">-{formatCurrency(group.totalDiscountAmount)}</span>
											</div>
											<div className="mt-1 flex justify-between font-medium">
												<span className="text-sm">お支払い金額</span>
												<span className="text-accent">{formatCurrency(group.finalAmount)}</span>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* セッション一覧テーブル */}
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="text-left text-foreground/70 border-b border-border">
											<th className="pb-2">日時</th>
											<th className="pb-2">座席</th>
											<th className="pb-2">利用時間</th>
											<th className="pb-2">料金</th>
											<th className="pb-2">ステータス</th>
											<th className="pb-2"></th>
										</tr>
									</thead>
									<tbody>
										{group.sessions.map((session) => (
											<tr key={session.sessionId} className="border-b border-border/20">
												<td className="py-3">
													<div>{session.formattedStartTime.split(' ')[0]}</div>
													<div className="text-xs text-foreground/70">
														{session.formattedStartTime.split(' ')[1]} -
														{session.active ? "利用中" : session.formattedEndTime.split(' ')[1]}
													</div>
												</td>
												<td className="py-3">
													<div>{session.seatName}</div>
													{session.branchName && (
														<div className="text-xs text-foreground/70">{session.branchName}</div>
													)}
												</td>
												<td className="py-3">
													<div className="flex items-center">
														<Clock className="w-4 h-4 mr-1 text-foreground/70" />
														<span>{session.durationText}</span>
													</div>
													<div className="text-xs text-foreground/70">
														{session.hourBlocks}時間ブロック
													</div>
												</td>
												<td className="py-3">{formatCurrency(session.amount)}</td>
												<td className="py-3">
													<span className={`inline-block text-xs px-2 py-0.5 rounded ${session.blockchainStatusClass}`}>
														{session.blockchainStatusText}
													</span>
												</td>
												<td className="py-3 text-right">
													{session.blockchainStatus === 'confirmed' && session.blockchainTxId && (
														<a
															href={`https://snowtrace.io/tx/${session.blockchainTxId}`}
															target="_blank"
															rel="noopener noreferrer"
															className="inline-flex items-center text-primary hover:text-primary/80"
														>
															<span className="text-xs mr-1">ブロックチェーン証明</span>
															<ExternalLink className="w-3 h-3" />
														</a>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<div className="p-2 text-sm text-foreground/70">
								<p>
									ご利用料金は時間単位で計算されます。1時間あたり600円、超過すると次の1時間分が加算されます。
									月初に前月分の利用料金が請求されます。クーポンは自動的に適用されます。
								</p>
							</div>
						</div>
					)}
				</div>

			))}
		</div>
	);
}