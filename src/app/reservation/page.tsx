// src/app/reservation/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useReservation } from '@/context/reservation-context';
import { ReservationProvider } from '@/context/reservation-context';
import { ChevronLeft } from 'lucide-react';
import { BranchDocument } from '@/types/firebase';
import BranchSelector from '@/components/reservation/branch-selector';
import CalendarView from '@/components/reservation/calendar-view';
import TimeGrid from '@/components/reservation/time-grid';
import ReservationForm from '@/components/reservation/reservation-form';
import LoginPrompt from '@/components/reservation/login-prompt';

enum ReservationStep {
	SELECT_BRANCH,  // 新しいステップ
	SELECT_DATE,
	SELECT_TIME,
	CONFIRM
}

const ReservationPageContent: React.FC = () => {
	const { user, loading } = useAuth();
	const { setSelectedBranch } = useReservation(); // ここでフックを呼び出す
	const router = useRouter();

	const [currentStep, setCurrentStep] = useState<ReservationStep>(ReservationStep.SELECT_BRANCH);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [showLoginPrompt, setShowLoginPrompt] = useState(false);
	const [reservationDetails, setReservationDetails] = useState<{
		date: Date;
		seatId: string;
		startTime: string;
		endTime: string;
	} | null>(null);

	// Check for pending reservation in sessionStorage (after login/register)
	useEffect(() => {
		if (user && !loading) {
			const pendingReservation = sessionStorage.getItem('pendingReservation');
			if (pendingReservation) {
				try {
					const details = JSON.parse(pendingReservation);
					setReservationDetails({
						date: new Date(details.date),
						seatId: details.seatId,
						startTime: details.startTime,
						endTime: details.endTime
					});
					setSelectedDate(new Date(details.date));
					setCurrentStep(ReservationStep.CONFIRM);

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
		// useReservationフックを使用した結果をここで使う
		setSelectedBranch(branch);
		setCurrentStep(ReservationStep.SELECT_DATE);
	};

	// Handle date selection
	const handleDateSelect = (date: Date) => {
		setSelectedDate(date);
		setCurrentStep(ReservationStep.SELECT_TIME);
	};

	// Handle time selection
	const handleTimeSelect = (seatId: string, startTime: string, endTime: string) => {
		if (!user && !loading) {
			// Show login prompt for non-logged in users
			setReservationDetails({
				date: selectedDate!,
				seatId,
				startTime,
				endTime
			});
			setShowLoginPrompt(true);
			return;
		}

		setReservationDetails({
			date: selectedDate!,
			seatId,
			startTime,
			endTime
		});
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

	return (
		<div className="min-h-screen bg-background py-12 px-4">
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
				{showLoginPrompt && reservationDetails && (
					<LoginPrompt
						onClose={() => setShowLoginPrompt(false)}
						reservationDetails={reservationDetails}
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