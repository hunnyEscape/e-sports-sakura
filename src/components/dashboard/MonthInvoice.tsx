'use client';

import { FC, useState, useEffect } from 'react';
import { Receipt, ExternalLink, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InvoiceDocument } from '@/types/firebase';

interface MonthInvoiceProps {
	monthKey: string;     // 例: "2025-03"
	displayMonth: string; // 例: "2025年3月"
}

const MonthInvoice: FC<MonthInvoiceProps> = ({ monthKey, displayMonth }) => {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [invoice, setInvoice] = useState<InvoiceDocument | null>(null);

	// 請求書情報を取得
	useEffect(() => {
		const fetchInvoice = async () => {
			if (!user) return;

			try {
				setLoading(true);

				// 対象の月の請求書をクエリ
				const invoicesQuery = query(
					collection(db, 'invoices'),
					where('userId', '==', user.uid),
					where('periodString', '==', monthKey),
					orderBy('createdAt', 'desc'), // 最新の請求書を取得
					limit(1)
				);

				const invoicesSnapshot = await getDocs(invoicesQuery);

				if (invoicesSnapshot.empty) {
					// 請求書がまだ存在しない
					setInvoice(null);
				} else {
					// 請求書が存在する場合
					const invoiceData = invoicesSnapshot.docs[0].data() as InvoiceDocument;
					setInvoice(invoiceData);
				}

				setError(null);
			} catch (err) {
				console.error(`Error fetching invoice for ${monthKey}:`, err);
				setError('請求書情報の取得に失敗しました');
			} finally {
				setLoading(false);
			}
		};

		fetchInvoice();
	}, [user, monthKey]);

	// ヘルパー関数: 金額フォーマット
	const formatCurrency = (amount: number): string => {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(amount);
	};

	// ステータスに応じたスタイルとテキストを返す
	const getStatusInfo = () => {
		if (!invoice) {
			return {
				text: '未請求',
				bgColor: 'bg-border/10',
				textColor: 'text-foreground/60',
				icon: <Clock className="w-3 h-3 mr-1" />
			};
		}

		switch (invoice.status) {
			case 'paid':
				return {
					text: '支払い済み',
					bgColor: 'bg-highlight/10',
					textColor: 'text-highlight',
					icon: <CreditCard className="w-3 h-3 mr-1" />
				};
			case 'pending':
			case 'pending_stripe':
				return {
					text: '支払い待ち',
					bgColor: 'bg-accent/10',
					textColor: 'text-accent',
					icon: <Clock className="w-3 h-3 mr-1" />
				};
			case 'failed':
				return {
					text: '支払い失敗',
					bgColor: 'bg-red-500/10',
					textColor: 'text-red-500',
					icon: <AlertTriangle className="w-3 h-3 mr-1" />
				};
			default:
				return {
					text: 'その他',
					bgColor: 'bg-border/10',
					textColor: 'text-foreground/60',
					icon: <Clock className="w-3 h-3 mr-1" />
				};
		}
	};

	// ローディング中の表示
	if (loading) {
		return (
			<div className="px-4 py-3 border-t border-border/10 flex items-center justify-center">
				<div className="animate-pulse flex items-center text-foreground/50 text-xs">
					<Receipt className="w-4 h-4 mr-2 opacity-70" />
					請求書情報を読み込み中...
				</div>
			</div>
		);
	}

	// エラー時の表示
	if (error) {
		return (
			<div className="px-4 py-3 border-t border-border/10 flex items-center justify-center">
				<div className="flex items-center text-red-500 text-xs">
					<AlertTriangle className="w-4 h-4 mr-2" />
					{error}
				</div>
			</div>
		);
	}

	// 請求書が存在しない場合
	if (!invoice) {
		return (
			<div className="px-4 py-3 border-t border-border/10 flex items-center justify-center mb-5">
				<div className="flex items-center text-foreground/50 text-xs">
					<Receipt className="w-4 h-4 mr-2 opacity-70" />
					{displayMonth}の請求書はまだ発行されていません
				</div>
			</div>
		);
	}

	// ステータス情報の取得
	const statusInfo = getStatusInfo();

	return (
		<div className="border-t border-border/10 overflow-hidden mb-5">
			<div className="px-4 py-3 bg-border/5 flex flex-wrap items-center justify-between">
				<div className="flex items-center">
					<Receipt className="w-4 h-4 mr-2 text-accent" />
					<span className="text-sm font-medium mr-3">請求書</span>
					<span className={`flex items-center px-2 py-0.5 text-xs rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}`}>
						{statusInfo.icon}
						{statusInfo.text}
					</span>
				</div>

				<div className="flex items-center space-x-4">
					{/* 小計・割引・最終金額の表示 */}
					<div className="text-xs text-foreground/70">
						<span className="mr-2">小計: {formatCurrency(invoice.subtotalAmount)}</span>
						{invoice.discountAmount > 0 && (
							<span className="mr-2 text-highlight">
								割引: -{formatCurrency(invoice.discountAmount)}
							</span>
						)}
						<span className="font-medium text-foreground">
							合計: {formatCurrency(invoice.finalAmount)}
						</span>
					</div>

					{/* 請求書URLがある場合はリンクを表示 */}
					{invoice.stripeInvoiceUrl && (
						<a
							href={invoice.stripeInvoiceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
							onClick={(e) => e.stopPropagation()}
						>
							<span className="mr-1">請求書を表示</span>
							<ExternalLink className="w-3 h-3" />
						</a>
					)}
				</div>
			</div>

			{/* 支払い失敗時のエラーメッセージを表示 */}
			{invoice.status === 'failed' && invoice.errorMessage && (
				<div className="px-4 py-2 bg-red-500/5 text-xs text-red-500 flex items-center">
					<AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
					<span>エラー: {invoice.errorMessage}</span>
				</div>
			)}

			{/* 適用されたクーポンの表示 */}
			{invoice.appliedCoupons && invoice.appliedCoupons.length > 0 && (
				<div className="px-4 py-2 bg-highlight/5 text-xs text-highlight/90 flex items-center">
					<div className="flex-1">
						<span className="font-medium">適用クーポン: </span>
						{invoice.appliedCoupons.map((coupon, idx) => (
							<span key={idx} className="mr-2">
								{coupon.name} (-{formatCurrency(coupon.discountValue)})
								{idx < invoice.appliedCoupons.length - 1 ? ", " : ""}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default MonthInvoice;