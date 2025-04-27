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
import MonthlyUsageHistory from '@/components/dashboard/monthly-usage-history';
import ReservationHistory from '@/components/dashboard/reservation-history';
import CouponsTab from '@/components/dashboard/coupons';
import { PaymentProvider } from '@/context/payment-context';
import PaymentMethodManager from '@/components/payment/payment-method-manager';
import { Calendar, Clock, CreditCard } from 'lucide-react';

export default function DashboardPage() {
	const { user, userData, signOut } = useAuth();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [activeTab, setActiveTab] = useState('usage');
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
					<main className="container mx-auto px-4 py-3 md:py-8">
						{userData && userData.registrationCompleted && (<>
							<div className="flex items-center justify-between h-16 border-b border-border">
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
							<div className="bg-border/5 rounded-2xl shadow-soft p-6 mb-6">
								<h2 className="text-lg font-semibold mb-4">会員ページ</h2>
								<QrCodeDisplay />
							</div>

						</>)}

						{userData && !userData.registrationCompleted && (
							<div className="bg-accent/10 border border-accent/20 rounded-xl p-6 mb-8">
								<h2 className="text-lg font-semibold mb-2">支払いの登録を完了させましょう</h2>
								<p className="mb-4">
									登録完了後、会員QRコードが即時に発行されます。会員コードを使って入店ができます。
								</p>
								<Button
									href="/register/verification"
									variant="primary"
								>
									登録を続ける
								</Button>
							</div>
						)}

						{userData && userData.registrationCompleted && (
							<>
								{/* タブナビゲーション */}
								<div className="flex justify-center md:justify-start border-b border-border mb-6">
									<button
										onClick={() => setActiveTab('usage')}
										className={`py-2 px-4 font-medium ${activeTab === 'usage'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										利用状況
									</button>
									<button
										onClick={() => setActiveTab('reservations')}
										className={`py-2 px-4 font-medium ${activeTab === 'reservations'
											? 'text-accent border-b-2 border-accent'
											: 'text-foreground/70 hover:text-foreground'
											}`}
									>
										予約
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

									{activeTab === 'usage' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-0 md:p-6">
											<MonthlyUsageHistory />
										</div>
									)}

									{activeTab === 'reservations' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-2 md:p-6">
											<ReservationHistory />
										</div>
									)}

									{activeTab === 'payment' && (
										<div className="bg-border/5 rounded-2xl shadow-soft p-2 md:p-6">
											<PaymentProvider>
												<PaymentMethodManager />
											</PaymentProvider>
										</div>
									)}
								</div>
							</>
						)}
					</main>
				</div>
			</ReservationProvider>
		</ProtectedRoute>
	);
}