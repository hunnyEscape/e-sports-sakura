// src/components/dashboard/usage-history.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';

interface HistoryItem {
	id: string;
	amount: number;
	durationMinutes?: number;
	description: string;
	timestamp: string;
	status: string;
	invoiceId: string;
	isTest?: boolean;
}

interface Pagination {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export default function UsageHistory() {
	const { user } = useAuth();
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [pagination, setPagination] = useState<Pagination>({
		total: 0,
		page: 1,
		limit: 5,
		pages: 0
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchHistory = async (page = 1) => {
		if (!user) return;

		try {
			setLoading(true);
			setError(null);

			const idToken = await user.getIdToken();
			const response = await fetch(`/api/billing/history?page=${page}&limit=${pagination.limit}`, {
				headers: {
					'Authorization': `Bearer ${idToken}`
				}
			});

			if (!response.ok) {
				throw new Error('履歴データの取得に失敗しました');
			}

			const data = await response.json();
			setHistory(data.history);
			setPagination(data.pagination);
		} catch (err) {
			console.error('Error fetching history:', err);
			setError(err instanceof Error ? err.message : '履歴の取得中にエラーが発生しました');
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

	// ページネーション
	const handlePageChange = (newPage: number) => {
		if (newPage < 1 || newPage > pagination.pages) return;
		fetchHistory(newPage);
	};

	// テスト決済のシミュレーション (開発環境のみ)
	const simulatePayment = async (minutes: number) => {
		if (!user || process.env.NODE_ENV === 'production') return;

		try {
			setLoading(true);
			const idToken = await user.getIdToken();

			const response = await fetch('/api/billing/mock-charge', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				},
				body: JSON.stringify({
					durationMinutes: minutes,
					description: `テスト利用 (${minutes}分)`
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'テスト決済に失敗しました');
			}

			// 履歴を再読み込み
			await fetchHistory();

		} catch (err) {
			console.error('Error simulating payment:', err);
			setError(err instanceof Error ? err.message : 'テスト決済中にエラーが発生しました');
		} finally {
			setLoading(false);
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

	return (
		<div className="bg-border/5 rounded-2xl shadow-soft p-6">
			<h2 className="text-lg font-semibold mb-4">利用履歴</h2>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4">
					{error}
				</div>
			)}

			{/* テスト決済ボタン (開発環境のみ) */}
			{process.env.NODE_ENV === 'development' && (
				<div className="mb-6 p-4 bg-orange-500/10 text-orange-600 rounded-lg">
					<p className="text-sm mb-2">開発環境: テスト決済をシミュレート</p>
					<div className="flex flex-wrap gap-2">
						<Button
							onClick={() => simulatePayment(30)}
							disabled={loading}
							variant="outline"
							size="sm"
						>
							30分利用 (¥360)
						</Button>
						<Button
							onClick={() => simulatePayment(60)}
							disabled={loading}
							variant="outline"
							size="sm"
						>
							1時間利用 (¥700)
						</Button>
						<Button
							onClick={() => simulatePayment(120)}
							disabled={loading}
							variant="outline"
							size="sm"
						>
							2時間利用 (¥1,400)
						</Button>
					</div>
				</div>
			)}

			{loading ? (
				<div className="flex justify-center items-center py-12">
					<LoadingSpinner size="large" />
				</div>
			) : history.length === 0 ? (
				<div className="text-center py-8 text-foreground/70">
					<p>まだ利用履歴はありません。</p>
				</div>
			) : (
				<>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="text-left text-foreground/70 border-b border-border">
									<th className="pb-2">日時</th>
									<th className="pb-2">内容</th>
									<th className="pb-2 text-right">料金</th>
									<th className="pb-2 text-right">ステータス</th>
								</tr>
							</thead>
							<tbody>
								{history.map((item) => (
									<tr key={item.id} className="border-b border-border/20">
										<td className="py-3">{formatDate(item.timestamp)}</td>
										<td className="py-3">
											{item.description}
											{item.durationMinutes && (
												<span className="text-foreground/60 text-sm block">
													{item.durationMinutes}分間の利用
												</span>
											)}
											{item.isTest && (
												<span className="inline-block bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded">
													テスト
												</span>
											)}
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

					{/* ページネーション */}
					{pagination.pages > 1 && (
						<div className="flex justify-center mt-6">
							<div className="flex space-x-1">
								<Button
									onClick={() => handlePageChange(pagination.page - 1)}
									disabled={pagination.page === 1 || loading}
									variant="outline"
									size="sm"
								>
									前へ
								</Button>

								<div className="flex items-center px-3 py-2 text-sm">
									{pagination.page} / {pagination.pages}
								</div>

								<Button
									onClick={() => handlePageChange(pagination.page + 1)}
									disabled={pagination.page === pagination.pages || loading}
									variant="outline"
									size="sm"
								>
									次へ
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}