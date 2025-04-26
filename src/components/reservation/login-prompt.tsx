import React from 'react';
import { motion } from 'framer-motion';
import { Lock, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SelectedTimeSlotsItem } from '@/context/reservation-context';

interface LoginPromptProps {
	onClose: () => void;
	reservationDetails: (SelectedTimeSlotsItem & { date: string })[];
}

const LoginPrompt: React.FC<LoginPromptProps> = ({ onClose, reservationDetails }) => {
	// Nextの最新バージョンのルーターを使用
	const router = useRouter();

	// Handle login button - 直接window.locationを使用
	const handleLogin = () => {
		console.log("ログインボタンがクリックされました");
		try {
			// Store reservation details in sessionStorage to retrieve after login
			sessionStorage.setItem('pendingReservation', JSON.stringify(reservationDetails));
			// Next.jsルーターの代わりに直接リダイレクト
			window.location.href = '/login';
		} catch (error) {
			console.error('Navigation error:', error);
		}
	};

	// Handle register button - 直接window.locationを使用
	const handleRegister = () => {
		console.log("新規登録ボタンがクリックされました");
		try {
			// Store reservation details in sessionStorage to retrieve after registration
			sessionStorage.setItem('pendingReservation', JSON.stringify(reservationDetails));
			// Next.jsルーターの代わりに直接リダイレクト
			window.location.href = '/register';
		} catch (error) {
			console.error('Navigation error:', error);
		}
	};

	// Calculate total seats
	const totalSeats = reservationDetails.length;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
		>
			<motion.div
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.9, opacity: 0 }}
				className="bg-background border border-border/20 rounded-lg shadow-lg p-6 max-w-md w-full relative"
			>
				<h2 className="text-xl font-bold text-foreground mb-4">アカウントが必要です</h2>
				<p className="text-foreground/70 mb-6">
					予約を完了するには、ログインまたは新規登録が必要です。
				</p>

				<div className="bg-border/5 p-3 rounded-md mb-6">
					<h3 className="font-medium text-foreground mb-2">選択中の予約内容</h3>
					<p className="text-sm text-foreground/70">
						<span className="font-medium">{totalSeats}席</span>の予約
						<span className="block mt-1">
							{new Date(reservationDetails[0].date).toLocaleDateString('ja-JP', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								weekday: 'long'
							})}
						</span>
					</p>

					{/* 予約情報のサマリー */}
					<div className="mt-2 space-y-1 text-sm text-foreground/70">
						{reservationDetails.map((item, index) => (
							<div key={index} className="flex justify-between">
								<span>{item.seatName || `座席 #${index + 1}`}</span>
								<span>{item.startTime} - {item.endTime}</span>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col space-y-3">
					<button
						type="button"
						onClick={handleLogin}
						className="flex items-center justify-center px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors"
					>
						<Lock className="w-4 h-4 mr-2" />
						ログイン
					</button>
					<button
						type="button"
						onClick={handleRegister}
						className="flex items-center justify-center px-4 py-2 border border-accent text-accent bg-accent/5 rounded-md hover:bg-accent/10 transition-colors"
					>
						<UserPlus className="w-4 h-4 mr-2" />
						新規登録
					</button>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-foreground/70 hover:text-foreground hover:bg-border/10 rounded-md transition-colors"
					>
						キャンセル
					</button>
				</div>
			</motion.div>
		</motion.div>
	);
};

export default LoginPrompt;