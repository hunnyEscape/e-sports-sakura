'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Gift, ChevronDown, ChevronUp, Info, Calendar, Check, AlertCircle, Tag, Star } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCoupon, CouponDefinition } from '../../types/index';

// 表示用に issuedAt を Date 型にしたローカル型
type UIUserCoupon = Omit<UserCoupon, 'issuedAt'> & { issuedAt: Date };

// 期間グループを示す型
type CouponTimeGroup = 'thisMonth' | 'lastMonth' | 'older';

// 獲得可能なクーポン表示用の型
type AcquirableCoupon = CouponDefinition & {
	isAcquirable: boolean;
};

// タブの種類
type CouponTab = 'available' | 'used';

export default function CouponsTab() {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// 獲得可能なクーポン
	const [acquirableCoupons, setAcquirableCoupons] = useState<AcquirableCoupon[]>([]);

	// 所有しているクーポン
	const [coupons, setCoupons] = useState<{
		available: UIUserCoupon[];
		used: UIUserCoupon[];
		byTimeGroup: Record<CouponTimeGroup, UIUserCoupon[]>;
	}>({
		available: [],
		used: [],
		byTimeGroup: {
			thisMonth: [],
			lastMonth: [],
			older: []
		}
	});

	// マイクーポンセクションの折りたたみ状態
	const [myCouponsExpanded, setMyCouponsExpanded] = useState(false);

	// アクティブなタブ
	const [activeTab, setActiveTab] = useState<CouponTab>('available');

	/** クーポンのグループ分け処理 */
	const categorizeCoupons = (coupons: UIUserCoupon[]) => {
		const now = new Date();
		const thisMonth = now.getMonth();
		const thisYear = now.getFullYear();

		// 先月の年月を計算
		let lastMonth = thisMonth - 1;
		let lastMonthYear = thisYear;
		if (lastMonth < 0) {
			lastMonth = 11;
			lastMonthYear = thisYear - 1;
		}

		const available: UIUserCoupon[] = [];
		const used: UIUserCoupon[] = [];
		const byTimeGroup: Record<CouponTimeGroup, UIUserCoupon[]> = {
			thisMonth: [],
			lastMonth: [],
			older: []
		};

		coupons.forEach(coupon => {
			const couponYear = coupon.issuedAt.getFullYear();
			const couponMonth = coupon.issuedAt.getMonth();

			// 発行時期でグループ分け
			if (couponYear === thisYear && couponMonth === thisMonth) {
				byTimeGroup.thisMonth.push(coupon);
			} else if (couponYear === lastMonthYear && couponMonth === lastMonth) {
				byTimeGroup.lastMonth.push(coupon);
			} else {
				byTimeGroup.older.push(coupon);
			}

			// ステータス別に分類
			if (coupon.status === 'available') {
				available.push(coupon);
			} else {
				used.push(coupon);
			}
		});

		return { available, used, byTimeGroup };
	};

	/** Firestore からデータを取得 */
	const fetchCoupons = async () => {
		if (!user) return;
		try {
			setLoading(true);
			setError(null);

			// 1. UserCoupons コレクションからユーザーのクーポンを取得
			const userCouponsQuery = query(
				collection(db, 'userCoupons'),
				where('userId', '==', user.uid),
				orderBy('issuedAt', 'desc')
			);

			const userCouponsSnapshot = await getDocs(userCouponsQuery);

			// ユーザーが持っているクーポンコードのセット
			const userCouponCodes = new Set<string>();

			const fetchedUserCoupons: UIUserCoupon[] = userCouponsSnapshot.docs.map(doc => {
				const data = doc.data() as any;
				const raw = data.issuedAt;

				// Timestamp か文字列かを判定して Date に変換
				let issuedAtDate: Date;
				if (raw?.toDate) {
					issuedAtDate = raw.toDate();
				} else {
					issuedAtDate = new Date(raw);
				}

				// ユーザーが持っているクーポンコードを記録
				userCouponCodes.add(data.code);

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

			// 2. CouponDefinitions コレクションから有効なクーポン定義を取得
			const couponDefsQuery = query(
				collection(db, 'couponDefinitions'),
				where('isActive', '==', true)
			);

			const couponDefsSnapshot = await getDocs(couponDefsQuery);

			const fetchedAcquirableCoupons: AcquirableCoupon[] = [];

			couponDefsSnapshot.forEach(doc => {
				const data = doc.data() as any;

				// ユーザーがまだ持っていないクーポンのみを「獲得可能」とする
				const isAcquirable = !userCouponCodes.has(data.code);

				if (isAcquirable) {
					fetchedAcquirableCoupons.push({
						id: doc.id,
						code: data.code,
						name: data.name,
						description: data.description,
						discountValue: data.discountValue,
						validityPeriod: data.validityPeriod,
						isActive: data.isActive,
						isAcquirable: true
					});
				}
			});

			// 結果を設定
			setCoupons(categorizeCoupons(fetchedUserCoupons));
			setAcquirableCoupons(fetchedAcquirableCoupons);
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

	// 日付を日本語形式でフォーマット
	const formatDate = (date: Date) => {
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	// 獲得可能クーポンカード
	const AcquirableCouponCard = ({ coupon }: { coupon: AcquirableCoupon }) => {
		return (
			<motion.div
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				className="relative overflow-hidden border border-highlight/30 bg-highlight/5 rounded-lg p-4 transition-all"
			>
				{/* Status Badge */}
				<div className="absolute top-3 right-3">
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-highlight/10 text-highlight">
						<Star className="w-3 h-3 mr-1" />
						獲得可能
					</span>
				</div>

				{/* Coupon Content */}
				<div className="mb-3">
					<h4 className="font-medium text-foreground">{coupon.name}</h4>
					<p className="text-sm text-foreground/70 mt-1">{coupon.description}</p>
				</div>

				{/* Discount Value */}
				<div className="font-semibold text-highlight text-lg mb-2">
					{coupon.discountValue.toLocaleString()}円引き
				</div>
			</motion.div>
		);
	};

	// ユーザー所有クーポンカード
	const UserCouponCard = ({ coupon }: { coupon: UIUserCoupon }) => {
		const isAvailable = coupon.status === 'available';

		return (
			<motion.div
				initial={{ opacity: 0, y: 5 }}
				animate={{ opacity: 1, y: 0 }}
				className={`
          relative overflow-hidden border rounded-lg p-4 transition-all
          ${isAvailable
						? 'border-accent/30 bg-accent/5'
						: 'border-border/40 bg-background/5 opacity-80'
					}
        `}
			>
				{/* Status Badge */}
				<div className="absolute top-3 right-3">
					<span
						className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs
              ${isAvailable
								? 'bg-green-500/10 text-green-600'
								: 'bg-gray-200 text-gray-600'
							}
            `}
					>
						{isAvailable ? (
							<>
								<Check className="w-3 h-3 mr-1" />
								利用可能
							</>
						) : (
							<>
								<Check className="w-3 h-3 mr-1" />
								使用済み
							</>
						)}
					</span>
				</div>

				{/* Coupon Content */}
				<div className="mb-3">
					<h4 className="font-medium text-foreground">{coupon.name}</h4>
					<p className="text-sm text-foreground/70 mt-1">{coupon.description}</p>
				</div>

				{/* Discount Value */}
				<div className="font-semibold text-accent text-lg mb-2">
					{coupon.discountValue.toLocaleString()}円引き
				</div>

				{/* Issue Date */}
				<div className="text-xs text-foreground/60 flex items-center">
					<Calendar className="w-3 h-3 mr-1" />
					発行日: {formatDate(coupon.issuedAt)}
				</div>
			</motion.div>
		);
	};

	// ローディング表示
	if (loading) {
		return (
			<div className="bg-border/5 rounded-2xl shadow-soft p-6">
				<h2 className="text-lg font-semibold mb-6">クーポン管理</h2>
				<div className="flex justify-center items-center py-12">
					<div className="flex flex-col items-center">
						<div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
						<p className="text-foreground/70">クーポン情報を読み込み中...</p>
					</div>
				</div>
			</div>
		);
	}

	// エラー表示
	if (error) {
		return (
			<div className="bg-border/5 rounded-2xl shadow-soft p-6">
				<h2 className="text-lg font-semibold mb-2">クーポン管理</h2>
				<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
					<div className="flex items-start">
						<AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
						<p className="text-red-500">{error}</p>
					</div>
					<button
						onClick={fetchCoupons}
						className="mt-3 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md transition-colors text-sm flex items-center"
					>
						<Gift className="w-4 h-4 mr-2" />
						再読み込み
					</button>
				</div>
			</div>
		);
	}

	// クーポンが存在しない場合
	const hasUserCoupons = coupons.available.length > 0 || coupons.used.length > 0;
	const hasAcquirableCoupons = acquirableCoupons.length > 0;
	const hasCoupons = hasUserCoupons || hasAcquirableCoupons;

	// クーポンがある時期に発行されたかを表示するヘッダー
	const TimeGroupHeader = ({ title }: { title: string }) => (
		<div className="text-sm font-medium text-foreground/70 mt-6 mb-3 pl-2 border-l-2 border-accent/30">
			{title}
		</div>
	);

	// 時期ごとのクーポン表示
	const renderCouponsByTimeGroup = (couponsToRender: UIUserCoupon[]) => {
		// 表示するクーポンが空の場合
		if (couponsToRender.length === 0) {
			return (
				<div className="text-center py-8 bg-border/5 rounded-lg">
					<p className="text-foreground/70">クーポンがありません</p>
				</div>
			);
		}

		// 時期ごとにグループ分け
		const thisMonthCoupons = couponsToRender.filter(coupon =>
			coupons.byTimeGroup.thisMonth.some(c => c.id === coupon.id)
		);

		const lastMonthCoupons = couponsToRender.filter(coupon =>
			coupons.byTimeGroup.lastMonth.some(c => c.id === coupon.id)
		);

		const olderCoupons = couponsToRender.filter(coupon =>
			coupons.byTimeGroup.older.some(c => c.id === coupon.id)
		);

		return (
			<>
				{thisMonthCoupons.length > 0 && (
					<>
						<TimeGroupHeader title="今月獲得したクーポン" />
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{thisMonthCoupons.map(coupon => (
								<UserCouponCard key={coupon.id} coupon={coupon} />
							))}
						</div>
					</>
				)}

				{lastMonthCoupons.length > 0 && (
					<>
						<TimeGroupHeader title="先月獲得したクーポン" />
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{lastMonthCoupons.map(coupon => (
								<UserCouponCard key={coupon.id} coupon={coupon} />
							))}
						</div>
					</>
				)}

				{olderCoupons.length > 0 && (
					<>
						<TimeGroupHeader title="過去のクーポン" />
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{olderCoupons.map(coupon => (
								<UserCouponCard key={coupon.id} coupon={coupon} />
							))}
						</div>
					</>
				)}
			</>
		);
	};

	return (
		<div className="bg-border/5 rounded-2xl shadow-soft p-2 md:p-6 mb-3">
			{!hasCoupons ? (
				// クーポンが存在しない場合のUI
				<div className="text-center py-12 bg-border/5 rounded-lg">
					<Gift className="w-16 h-16 text-border/40 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-foreground mb-2">クーポンがありません</h3>
					<p className="text-foreground/70 mb-6">
						ご利用可能なクーポンはまだありません。<br />
						サービスをご利用いただくとクーポンが発行されます。
					</p>
				</div>
			) : (
				// クーポンが存在する場合のUI
				<div className="space-y-8">
					{/* 獲得可能なクーポン */}
					{hasAcquirableCoupons && (
						<div>
							<h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
								<Tag className="w-5 h-5 mr-2 text-highlight" />
								獲得可能なクーポン
								<span className="ml-2 text-sm px-2 py-0.5 bg-highlight/10 text-highlight rounded-full">
									{acquirableCoupons.length}枚
								</span>
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{acquirableCoupons.map(coupon => (
									<AcquirableCouponCard key={coupon.id} coupon={coupon} />
								))}
							</div>
						</div>
					)}

					{/* マイクーポン（折りたたみ可能セクション） */}
					{hasUserCoupons && (
						<div className="border border-border/20 rounded-lg overflow-hidden">
							{/* マイクーポンヘッダー */}
							<button
								onClick={() => setMyCouponsExpanded(!myCouponsExpanded)}
								className="w-full flex justify-between items-center p-4 bg-border/5 hover:bg-border/10 transition-colors"
							>
								<div className="flex items-center">
									<Gift className="w-5 h-5 mr-2 text-accent" />
									<h3 className="text-lg font-medium text-foreground">マイクーポン</h3>
									<span className="ml-2 text-sm px-2 py-0.5 bg-accent/10 text-accent rounded-full">
										{coupons.available.length}枚
									</span>
								</div>

								{myCouponsExpanded ? (
									<ChevronUp className="w-5 h-5 text-accent" />
								) : (
									<ChevronDown className="w-5 h-5 text-accent" />
								)}
							</button>

							{/* マイクーポンコンテンツ（折りたたみ可能） */}
							<AnimatePresence>
								{myCouponsExpanded && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.2 }}
										className="overflow-hidden"
									>
										<div className="p-4">
											{/* タブナビゲーション */}
											<div className="flex border-b border-border/20 mb-4">
												<button
													onClick={() => setActiveTab('available')}
													className={`py-2 px-4 font-medium text-sm transition-colors ${activeTab === 'available'
														? 'text-accent border-b-2 border-accent'
														: 'text-foreground/60 hover:text-foreground'
														}`}
												>
													利用可能
													<span className="ml-2 px-1.5 py-0.5 bg-accent/10 text-accent rounded-full text-xs">
														{coupons.available.length}
													</span>
												</button>
												<button
													onClick={() => setActiveTab('used')}
													className={`py-2 px-4 font-medium text-sm transition-colors ${activeTab === 'used'
														? 'text-accent border-b-2 border-accent'
														: 'text-foreground/60 hover:text-foreground'
														}`}
												>
													使用済み
													<span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
														{coupons.used.length}
													</span>
												</button>
											</div>
											<div className="flex items-start">
												<div className="text-sm">
													<p className="mb-1 text-foreground/50">
														クーポンは<span className="font-medium">翌月の請求書発行時に自動的に適用</span>されます。<span className="text-accent">割引額が大きいもの</span>が優先適用されます。
													</p>
												</div>
											</div>


											{/* タブコンテンツ */}
											<div className="mt-2">
												{activeTab === 'available' && renderCouponsByTimeGroup(coupons.available)}
												{activeTab === 'used' && renderCouponsByTimeGroup(coupons.used)}
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					)}
				</div>
			)}
		</div>
	);
}