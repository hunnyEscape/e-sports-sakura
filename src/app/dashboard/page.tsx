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
								<Link href="/dashboard" className="flex items-center">
									<Image
										src="/images/logo.svg"
										alt="E-Sports Sakura"
										width={40}
										height={40}
										className="mr-2"
									/>
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

						{/* 会員登録が完了していない場合は登録フローに誘導 */}
						{userData && !userData.registrationCompleted && (
							<div className="bg-accent/10 border border-accent/20 rounded-xl p-6 mb-8">
								<h2 className="text-lg font-semibold mb-2">会員登録を完了させましょう</h2>
								<p className="mb-4">
									サービスを利用するには、追加情報の入力とeKYC認証が必要です。
									数分で完了します。
								</p>
								<Button
									href="/register/personal-info"
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
										予約履歴
									</button>
									<button
										onClick={() => setActiveTab('usage')}
										className={`py-2 px-4 font-medium ${activeTab === 'usage'
												? 'text-accent border-b-2 border-accent'
												: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										利用履歴
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
								</div>

								{/* クイックアクション */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
									<Link
										href="/reservation"
										className="bg-border/5 hover:bg-border/10 rounded-xl p-4 flex flex-col items-center justify-center transition-colors"
									>
										<Calendar className="w-8 h-8 text-accent mb-2" />
										<span className="font-medium text-foreground">新規予約</span>
										<span className="text-sm text-foreground/60">座席を予約する</span>
									</Link>

									<button
										onClick={() => setActiveTab('usage')}
										className="bg-border/5 hover:bg-border/10 rounded-xl p-4 flex flex-col items-center justify-center transition-colors"
									>
										<Clock className="w-8 h-8 text-accent mb-2" />
										<span className="font-medium text-foreground">利用履歴</span>
										<span className="text-sm text-foreground/60">過去の利用を確認</span>
									</button>

									<Link
										href="/payment"
										className="bg-border/5 hover:bg-border/10 rounded-xl p-4 flex flex-col items-center justify-center transition-colors"
									>
										<CreditCard className="w-8 h-8 text-accent mb-2" />
										<span className="font-medium text-foreground">決済情報</span>
										<span className="text-sm text-foreground/60">支払い方法を管理</span>
									</Link>
								</div>
							</>
						)}
					</main>
				</div>
			</ReservationProvider>
		</ProtectedRoute>
	);
}