// src/app/reservation/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useReservation, SelectedTimeSlotsItem } from '@/context/reservation-context';
import { ReservationProvider } from '@/context/reservation-context';
import { ChevronLeft } from 'lucide-react';
import { BranchDocument } from '@/types/firebase';
import BranchSelector from '@/components/reservation/branch-selector';
import CalendarView from '@/components/reservation/calendar-view';
import TimeGrid from '@/components/reservation/time-grid';
import ReservationForm from '@/components/reservation/reservation-form';
import LoginPrompt from '@/components/reservation/login-prompt';
import Link from 'next/link';
import Image from 'next/image';
enum ReservationStep {
	SELECT_BRANCH,
	SELECT_DATE,
	SELECT_TIME,
	CONFIRM
}

const ReservationPageContent: React.FC = () => {
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const router = useRouter();
	const { user, loading, signOut } = useAuth();
	const { setSelectedBranch, selectedTimeSlots, clearSelectedTimeSlots } = useReservation();

	const [currentStep, setCurrentStep] = useState<ReservationStep>(ReservationStep.SELECT_BRANCH);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [showLoginPrompt, setShowLoginPrompt] = useState(false);
	const [pendingTimeSlots, setPendingTimeSlots] = useState<SelectedTimeSlotsItem[]>([]);

	// Check for pending reservation in sessionStorage (after login/register)
	useEffect(() => {
		if (user && !loading) {
			const pendingReservation = sessionStorage.getItem('pendingReservation');
			if (pendingReservation) {
				try {
					const details = JSON.parse(pendingReservation);
					if (Array.isArray(details)) {
						// 複数座席予約に対応
						const timeSlots = details.map((item: any) => ({
							seatId: item.seatId,
							seatName: item.seatName,
							startTime: item.startTime,
							endTime: item.endTime
						}));
						setPendingTimeSlots(timeSlots);
						setSelectedDate(new Date(details[0].date));
						setCurrentStep(ReservationStep.CONFIRM);
					} else {
						// 後方互換性のため、単一座席予約も処理
						const timeSlot = {
							seatId: details.seatId,
							startTime: details.startTime,
							endTime: details.endTime
						};
						setPendingTimeSlots([timeSlot]);
						setSelectedDate(new Date(details.date));
						setCurrentStep(ReservationStep.CONFIRM);
					}

					// Clear the pending reservation
					sessionStorage.removeItem('pendingReservation');
				} catch (error) {
					console.error('Error parsing pending reservation:', error);
				}
			}
		}
	}, [user, loading]);

	// 支店選択ハンドラー
	const handleBranchSelect = (branch: BranchDocument) => {
		setSelectedBranch(branch);
		setCurrentStep(ReservationStep.SELECT_DATE);
	};

	// Handle date selection
	const handleDateSelect = (date: Date) => {
		setSelectedDate(date);
		setCurrentStep(ReservationStep.SELECT_TIME);
	};

	// Handle time selection - 複数座席対応
	const handleTimeSelect = (timeSlots: SelectedTimeSlotsItem[]) => {
		if (!user && !loading) {
			// Show login prompt for non-logged in users
			setPendingTimeSlots(timeSlots);
			setShowLoginPrompt(true);
			return;
		}

		setCurrentStep(ReservationStep.CONFIRM);
	};

	// Handle reservation success
	const handleReservationSuccess = () => {
		router.push('/dashboard');
	};

	// Handle back navigation
	const handleBack = () => {
		if (currentStep === ReservationStep.CONFIRM) {
			setCurrentStep(ReservationStep.SELECT_TIME);
		} else if (currentStep === ReservationStep.SELECT_TIME) {
			setCurrentStep(ReservationStep.SELECT_DATE);
		} else if (currentStep === ReservationStep.SELECT_DATE) {
			clearSelectedTimeSlots();
			setCurrentStep(ReservationStep.SELECT_BRANCH);
		}
	};

	// Render appropriate step
	const renderStep = () => {
		switch (currentStep) {
			case ReservationStep.SELECT_BRANCH:
				return (
					<div className="w-full max-w-3xl mx-auto">
						<BranchSelector onBranchSelect={handleBranchSelect} />
					</div>
				);

			case ReservationStep.SELECT_DATE:
				return (
					<div className="w-full max-w-3xl mx-auto">
						<CalendarView onDateSelect={handleDateSelect} />
					</div>
				);

			case ReservationStep.SELECT_TIME:
				return (
					<div className="w-full max-w-3xl mx-auto">
						{selectedDate && (
							<TimeGrid
								date={selectedDate}
								onTimeSelect={handleTimeSelect}
							/>
						)}
					</div>
				);

			case ReservationStep.CONFIRM:
				return (
					<div className="w-full max-w-3xl mx-auto">
						<ReservationForm
							onSuccess={handleReservationSuccess}
							onCancel={handleBack}
						/>
					</div>
				);

			default:
				return null;
		}
	};

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
		<div className="min-h-screen bg-background px-4">
			<header className="relative bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10 mb-10">
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
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full"
			>
				{/* Header with back button */}
				<div className="max-w-3xl mx-auto mb-6 flex items-center">
					{currentStep > ReservationStep.SELECT_BRANCH && (
						<button
							onClick={handleBack}
							className="mr-3 p-2 rounded-full bg-border/50 border border-border/20 hover:bg-border/20 transition-colors"
							aria-label="戻る"
						>
							<ChevronLeft size={20} className="text-foreground/70" />
						</button>
					)}
					<h1 className="text-2xl font-bold text-foreground">
						{currentStep === ReservationStep.SELECT_BRANCH && '支店を選択'}
						{currentStep === ReservationStep.SELECT_DATE && '予約日を選択'}
						{currentStep === ReservationStep.SELECT_TIME && '時間と座席を選択'}
						{currentStep === ReservationStep.CONFIRM && '予約の確認'}
					</h1>
				</div>
				{/* Progress steps */}
				<div className="max-w-3xl mx-auto mb-8">
					<div className="flex items-center justify-between">
						<div className="flex flex-col items-center">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= ReservationStep.SELECT_BRANCH
								? 'bg-accent text-white'
								: 'bg-border text-foreground/70'
								}`}>
								1
							</div>
							<span className="text-sm mt-1 text-foreground/70">支店</span>
						</div>

						<div className={`flex-1 h-1 mx-2 ${currentStep > ReservationStep.SELECT_BRANCH
							? 'bg-accent'
							: 'bg-border'
							}`} />

						<div className="flex flex-col items-center">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= ReservationStep.SELECT_DATE
								? 'bg-accent text-white'
								: 'bg-border text-foreground/70'
								}`}>
								2
							</div>
							<span className="text-sm mt-1 text-foreground/70">日付</span>
						</div>

						<div className={`flex-1 h-1 mx-2 ${currentStep > ReservationStep.SELECT_DATE
							? 'bg-accent'
							: 'bg-border'
							}`} />

						<div className="flex flex-col items-center">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= ReservationStep.SELECT_TIME
								? 'bg-accent text-white'
								: 'bg-border text-foreground/70'
								}`}>
								3
							</div>
							<span className="text-sm mt-1 text-foreground/70">時間・座席</span>
						</div>

						<div className={`flex-1 h-1 mx-2 ${currentStep > ReservationStep.SELECT_TIME
							? 'bg-accent'
							: 'bg-border'
							}`} />

						<div className="flex flex-col items-center">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= ReservationStep.CONFIRM
								? 'bg-accent text-white'
								: 'bg-border text-foreground/70'
								}`}>
								4
							</div>
							<span className="text-sm mt-1 text-foreground/70">確認</span>
						</div>
					</div>
				</div>

				{/* Current step content */}
				{renderStep()}

				{/* Login prompt */}
				{showLoginPrompt && selectedDate && pendingTimeSlots.length > 0 && (
					<LoginPrompt
						onClose={() => setShowLoginPrompt(false)}
						reservationDetails={pendingTimeSlots.map(slot => ({
							...slot,
							date: selectedDate.toISOString()
						}))}
					/>
				)}
			</motion.div>
		</div>
	);
};

// ReservationProviderでラップしたコンポーネントを返す
const ReservationPage: React.FC = () => {
	return (
		<ReservationProvider>
			<ReservationPageContent />
		</ReservationProvider>
	);
};

export default ReservationPage;