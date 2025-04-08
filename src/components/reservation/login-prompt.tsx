import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { LockKeyhole, LogIn, UserPlus } from 'lucide-react';

interface LoginPromptProps {
	onClose?: () => void;
	reservationDetails?: {
		date: Date;
		seatId: string;
		startTime: string;
		endTime: string;
	};
}

const LoginPrompt: React.FC<LoginPromptProps> = ({ onClose, reservationDetails }) => {
	const router = useRouter();

	// Handle login click
	const handleLoginClick = () => {
		// Store reservation details in sessionStorage to retrieve after login
		if (reservationDetails) {
			sessionStorage.setItem('pendingReservation', JSON.stringify({
				date: reservationDetails.date.toISOString(),
				seatId: reservationDetails.seatId,
				startTime: reservationDetails.startTime,
				endTime: reservationDetails.endTime
			}));
		}

		// Navigate to login page
		router.push('/login?redirect=reservation');
	};

	// Handle register click
	const handleRegisterClick = () => {
		// Store reservation details in sessionStorage to retrieve after registration
		if (reservationDetails) {
			sessionStorage.setItem('pendingReservation', JSON.stringify({
				date: reservationDetails.date.toISOString(),
				seatId: reservationDetails.seatId,
				startTime: reservationDetails.startTime,
				endTime: reservationDetails.endTime
			}));
		}

		// Navigate to registration page
		router.push('/register?redirect=reservation');
	};

	// Format date for display
	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

		return `${year}年${month}月${day}日(${dayOfWeek})`;
	};

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
			onClick={() => onClose && onClose()}
		>
			<motion.div
				className="w-full max-w-md p-6 bg-background rounded-2xl shadow-xl"
				onClick={(e) => e.stopPropagation()}
				initial={{ y: 20 }}
				animate={{ y: 0 }}
			>
				<div className="flex justify-center mb-6">
					<div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
						<LockKeyhole size={28} className="text-accent" />
					</div>
				</div>

				<h2 className="text-xl font-medium text-foreground text-center mb-2">
					会員限定機能です
				</h2>

				<p className="text-foreground/70 text-center mb-6">
					予約機能を利用するには、ログインまたは会員登録が必要です。
				</p>

				{reservationDetails && (
					<div className="mb-6 p-4 bg-border/10 rounded-lg">
						<h3 className="font-medium text-foreground mb-2">選択中の予約</h3>
						<p className="text-sm text-foreground/70">
							{formatDate(reservationDetails.date)} {reservationDetails.startTime}〜{reservationDetails.endTime}
						</p>
						<p className="text-xs text-accent mt-1">
							ログイン後に継続できます
						</p>
					</div>
				)}

				<div className="space-y-3">
					<button
						onClick={handleLoginClick}
						className="w-full py-3 flex items-center justify-center space-x-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
					>
						<LogIn size={18} />
						<span>ログイン</span>
					</button>

					<button
						onClick={handleRegisterClick}
						className="w-full py-3 flex items-center justify-center space-x-2 border border-border bg-background hover:bg-border/10 text-foreground rounded-lg transition-colors"
					>
						<UserPlus size={18} />
						<span>新規会員登録</span>
					</button>

					<button
						onClick={() => onClose && onClose()}
						className="w-full py-2 text-foreground/70 hover:text-foreground text-sm transition-colors"
					>
						キャンセル
					</button>
				</div>
			</motion.div>
		</motion.div>
	);
};

export default LoginPrompt;