'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { ReservationProvider } from '@/context/reservation-context';
import ProtectedRoute from '@/components/auth/protected-route';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';
import QrCodeDisplay from '@/components/dashboard/qr-code';
import UsageHistory from '@/components/dashboard/usage-history';
import ReservationHistory from '@/components/dashboard/reservation-history';
import { Calendar, Clock, CreditCard } from 'lucide-react';

export default function DashboardPage() {
	const { user, userData, signOut } = useAuth();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [activeTab, setActiveTab] = useState('qr');
	const router = useRouter();

	const handleSignOut = async () => {
		try {
			setIsLoggingOut(true);
			await signOut();
			router.push('/');
		} catch (error) {
			console.error('Logout error:', error);
			setIsLoggingOut(false);
		}
	};

	return (
		<ProtectedRoute>
			<ReservationProvider>
				<div className="min-h-screen bg-background text-foreground">
					{/* ヘッダー */}
					<header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
						<div className="container mx-auto px-4">
							<div className="flex items-center justify-between h-16">
								<Link href="/lp" className="flex items-center">
									<span className="font-bold text-xl text-accent">E-Sports Sakura</span>
								</Link>
								<div className="flex items-center space-x-4">
									{user?.photoURL && (
										<Image
											src={user.photoURL}
											alt={user.displayName || 'ユーザー'}
											width={32}
											height={32}
											className="rounded-full"
										/>
									)}
									<button
										onClick={handleSignOut}
										disabled={isLoggingOut}
										className="text-foreground/70 hover:text-accent"
									>
										{isLoggingOut ? <LoadingSpinner size="small" /> : 'ログアウト'}
									</button>
								</div>
							</div>
						</div>
					</header>

					{/* メインコンテンツ */}
					<main className="container mx-auto px-4 py-8">
						<h1 className="text-2xl font-bold mb-6">マイダッシュボード</h1>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
							<Link
								href="/reservation"
								className="bg-border/5 hover:bg-border/10 rounded-xl p-4 flex flex-col items-center justify-center transition-colors"
							>
								<Calendar className="w-8 h-8 text-accent mb-2" />
								<span className="font-medium text-foreground">新規予約</span>
								<span className="text-sm text-foreground/60">座席を予約する</span>
							</Link>

						</div>

						{/* 会員登録が完了していない場合は登録フローに誘導 */}
						{userData && !userData.registrationCompleted && (
							<div className="bg-accent/10 border border-accent/20 rounded-xl p-6 mb-8">
								<h2 className="text-lg font-semibold mb-2">会員登録を完了させましょう</h2>
								<p className="mb-4">
									身分証明と支払い方法の登録が必要です。2分で完了します。

								</p>
								<Button
									href="/register/verification"
									variant="primary"
								>
									登録を続ける
								</Button>
							</div>
						)}

						{/* 登録完了している場合は会員情報を表示 */}
						{userData && userData.registrationCompleted && (
							<>
								{/* タブナビゲーション */}
								<div className="flex border-b border-border mb-6">
									<button
										onClick={() => setActiveTab('qr')}
										className={`py-2 px-4 font-medium ${activeTab === 'qr'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										会員QRコード
									</button>
									<button
										onClick={() => setActiveTab('reservations')}
										className={`py-2 px-4 font-medium ${activeTab === 'reservations'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										予約情報
									</button>
									<button
										onClick={() => setActiveTab('usage')}
										className={`py-2 px-4 font-medium ${activeTab === 'usage'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										過去の利用
									</button>
									<button
										onClick={() => setActiveTab('payment')}
										className={`py-2 px-4 font-medium ${activeTab === 'payment'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										支払い方法
									</button>
								</div>

								{/* タブコンテンツ */}
								<div className="grid md:grid-cols-1 gap-8">
									{activeTab === 'qr' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-6">
											<h2 className="text-lg font-semibold mb-4">会員QRコード</h2>
											<QrCodeDisplay />
										</div>
									)}

									{activeTab === 'reservations' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-6">
											<ReservationHistory />
										</div>
									)}

									{activeTab === 'usage' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-6">
											<UsageHistory />
										</div>
									)}

									{activeTab === 'payment' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-6">
											<h2 className="text-lg font-semibold mb-4">決済情報管理</h2>
											{userData?.stripe?.paymentMethodId ? (
												<div className="space-y-6">
													<div className="p-4 border border-border/30 rounded-lg">
														<div className="flex items-center justify-between mb-2">
															<div className="flex items-center">
																<CreditCard className="w-5 h-5 text-accent mr-2" />
																<span className="font-medium">登録済みのカード</span>
															</div>
															<span className="text-xs bg-highlight/10 text-highlight px-2 py-1 rounded-full">
																有効
															</span>
														</div>
														<div className="text-sm text-foreground/70">
															<p>••••••••••••{userData.stripe.paymentMethodId.slice(-4)}</p>
															<p className="mt-1">更新日: {new Date(userData.stripe.updatedAt).toLocaleDateString('ja-JP')}</p>
														</div>
													</div>

													<div className="flex justify-between items-center">
														{/*<Button
															href="/payment"
															variant="outline"
															disabled={true}
														>
															カード情報を更新
														</Button>*/}

														<Button
															variant="outline"
															className="opacity-50 pointer-events-auto cursor-pointer"
														>
															カード情報を更新（未実装）
														</Button>


														<button
															className="text-sm text-foreground/60 hover:text-accent"
														>
															カード情報について
														</button>
													</div>

													<div className="mt-6 border-t border-border/20 pt-6">
														<h3 className="text-md font-medium mb-3">請求について</h3>
														<p className="text-sm text-foreground/70 mb-4">
															利用料金は月末にまとめて請求されます。従量課金制のため、実際に利用した分のみの請求となります。
														</p>
														<div className="bg-border/10 p-3 rounded-md text-sm">
															<p className="font-medium">次回請求予定</p>
															<p className="text-foreground/70 mt-1">2025年4月30日</p>
														</div>
													</div>
												</div>
											) : (
												<div className="text-center py-8">
													<CreditCard className="w-12 h-12 text-accent/40 mx-auto mb-4" />
													<h3 className="text-lg font-medium mb-2">支払い方法が未登録です</h3>
													<p className="text-foreground/60 mb-6 max-w-md mx-auto">
														サービスをご利用いただくには、クレジットカードまたはデビットカードの登録が必要です。
													</p>
													<Button
														href="/payment"
														variant="primary"
													>
														支払い方法を登録する
													</Button>
												</div>
											)}
										</div>
									)}
								</div>

								{/* クイックアクション */}
							</>
						)}
					</main>
				</div>
			</ReservationProvider>
		</ProtectedRoute>
	);
}