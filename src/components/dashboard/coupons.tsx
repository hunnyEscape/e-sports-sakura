// src/components/dashboard/coupons.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Gift } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { UserCoupon } from '../../types/index';

// 表示用に issuedAt を Date 型にしたローカル型
type UIUserCoupon = Omit<UserCoupon, 'issuedAt'> & { issuedAt: Date };

export default function CouponsTab() {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [thisMonthCoupons, setThisMonthCoupons] = useState<UIUserCoupon[]>([]);
	const [availableCoupons, setAvailableCoupons] = useState<UIUserCoupon[]>([]);
	const [usedCoupons, setUsedCoupons] = useState<UIUserCoupon[]>([]);
	const [hasCheckedNewUserCoupon, setHasCheckedNewUserCoupon] = useState(false);

	/** ステータス別に振り分ける */
	const categoryCoupons = (coupons: UIUserCoupon[]) => {
		const now = new Date();
		const thisMonth = now.getMonth();
		const thisYear = now.getFullYear();

		const available: UIUserCoupon[] = [];
		const used: UIUserCoupon[] = [];
		const thisMonthIssued: UIUserCoupon[] = [];

		coupons.forEach(c => {
			// 発行月が今月か？
			if (
				c.issuedAt.getFullYear() === thisYear &&
				c.issuedAt.getMonth() === thisMonth
			) {
				thisMonthIssued.push(c);
			}
			// 利用可能 / 使用済み で別配列へ
			if (c.status === 'available') {
				available.push(c);
			} else {
				used.push(c);
			}
		});

		return { available, used, thisMonthIssued };
	};

	/** Firestore からクーポンを取ってきて UIUserCoupon[] に変換 */
	const fetchCoupons = async () => {
		if (!user) return;
		try {
			setLoading(true);
			setError(null);

			const couponsQuery = query(
				collection(db, 'userCoupons'),
				where('userId', '==', user.uid),
				orderBy('issuedAt', 'desc')
			);
			const snapshot = await getDocs(couponsQuery);

			if (snapshot.empty) {
				setLoading(false);
				return;
			}

			const coupons: UIUserCoupon[] = snapshot.docs.map(doc => {
				const data = doc.data() as any;
				const raw = data.issuedAt;

				// Timestamp か文字列かを判定して Date に変換
				let issuedAtDate: Date;
				if (raw?.toDate) {
					issuedAtDate = raw.toDate();
				} else {
					issuedAtDate = new Date(raw);
				}

				return {
					id: doc.id,
					userId: data.userId,
					name: data.name,
					code: data.code,
					description: data.description,
					discountValue: data.discountValue,
					status: data.status,
					issuedAt: issuedAtDate,
				};
			});

			const { available, used, thisMonthIssued } = categoryCoupons(coupons);

			setAvailableCoupons(available);
			setUsedCoupons(used);
			setThisMonthCoupons(thisMonthIssued);
		} catch (e) {
			console.error(e);
			setError('クーポン情報の取得中にエラーが発生しました');
		} finally {
			setLoading(false);
		}
	};


	useEffect(() => {
		if (user) {
			fetchCoupons();
		}
	}, [user]);

	/** 今月獲得クーポン表示 */
	const ThisMonth = () => {
		if (thisMonthCoupons.length === 0) return null;
		return (
			<div className="mb-8">
				<h3 className="text-lg font-medium mb-4">今月獲得したクーポン</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{thisMonthCoupons.map(c => (
						<div
							key={c.id}
							className={`border rounded-lg p-4 ${c.status === 'available'
									? 'border-primary/30 bg-primary/5'
									: 'border-gray-200 bg-gray-50'
								}`}
						>
							<div className="flex justify-between">
								<div>
									<h4 className="font-medium">{c.name}</h4>
									<p className="text-sm text-foreground/70 mt-1">{c.description}</p>
								</div>
								<span
									className={`text-xs rounded-full px-2 py-1 ${c.status === 'available'
											? 'bg-green-500/10 text-green-600'
											: 'bg-gray-200 text-gray-600'
										}`}
								>
									{c.status === 'available' ? '利用可能' : '使用済み'}
								</span>
							</div>
							<div className="mt-3 flex justify-between items-center text-sm">
								<div className="font-semibold text-primary text-lg">
									{c.discountValue.toLocaleString()}円引き
								</div>
								<div className="text-xs text-foreground/60">
									{c.issuedAt.toLocaleDateString('ja-JP')}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	};

	/** 利用可能クーポン表示 */
	const Available = () => {
		if (availableCoupons.length === 0) {
			return (
				<div className="text-center py-6 bg-accent/5 rounded-lg">
					<Gift className="w-12 h-12 text-accent/40 mx-auto mb-3" />
					<p>現在利用可能なクーポンはありません</p>
				</div>
			);
		}
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{availableCoupons.map(c => (
					<div
						key={c.id}
						className="border border-primary/30 rounded-lg p-4 bg-primary/5"
					>
						<h4 className="font-medium">{c.name}</h4>
						<p className="text-sm text-foreground/70 mt-1">{c.description}</p>
						<div className="mt-3 flex justify-between items-center">
							<div className="font-semibold text-primary text-lg">
								{c.discountValue.toLocaleString()}円引き
							</div>
						</div>
						<div className="mt-2 text-xs text-foreground/60">
							<span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
								コード: {c.code}
							</span>
						</div>
					</div>
				))}
			</div>
		);
	};

	/** 使用済みクーポン表示 */
	const Used = () => {
		if (usedCoupons.length === 0) return null;
		return (
			<div className="mt-8">
				<h3 className="text-lg font-medium mb-4">使用済みクーポン</h3>
				<div className="border border-border/40 rounded-lg overflow-hidden">
					<table className="w-full">
						<thead className="bg-accent/5">
							<tr className="text-left">
								<th className="px-4 py-2">クーポン名</th>
								<th className="px-4 py-2">割引額</th>
								<th className="px-4 py-2">発行日</th>
								<th className="px-4 py-2">ステータス</th>
							</tr>
						</thead>
						<tbody>
							{usedCoupons.map(c => (
								<tr key={c.id} className="border-t border-border/20">
									<td className="px-4 py-3">
										<div>{c.name}</div>
										<div className="text-xs text-foreground/60">{c.code}</div>
									</td>
									<td className="px-4 py-3">
										{c.discountValue.toLocaleString()}円引き
									</td>
									<td className="px-4 py-3">
										<span className="text-xs text-foreground/60">
											{c.issuedAt.toLocaleDateString('ja-JP')}
										</span>
									</td>
									<td className="px-4 py-3">
										<span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
											使用済み
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	return (
		<div className="bg-border/5 rounded-2xl shadow-soft p-6">
			<h2 className="text-lg font-semibold mb-2">クーポン管理</h2>
			<div className="bg-accent/5 p-3 rounded-lg mb-6 text-sm">
				<p>
					利用可能なクーポンは月初の請求時に自動的に適用されます。
					適用優先順位は割引額の大きいものが優先されます。
				</p>
			</div>

			{error && (
				<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4">
					{error}
				</div>
			)}

			{loading ? (
				<div className="flex justify-center items-center py-12">
					<LoadingSpinner size="large" />
				</div>
			) : (
				<>
					<ThisMonth />
					<h3 className="text-lg font-medium mb-4">利用可能なクーポン</h3>
					<Available />
					<Used />
				</>
			)}
		</div>
	);
}
