// src/components/reservation/branch-selector.tsx

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Phone, Info } from 'lucide-react';
import { useReservation } from '@/context/reservation-context';
import { BranchDocument } from '@/types/firebase';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface BranchSelectorProps {
	onBranchSelect: (branch: BranchDocument) => void;
}

export default function BranchSelector({ onBranchSelect }: BranchSelectorProps) {
	const { branches, fetchBranches, isLoading, error } = useReservation();

	useEffect(() => {
		fetchBranches();
	}, [fetchBranches]);

	if (isLoading) {
		return (
			<div className="w-full flex justify-center items-center py-12">
				<LoadingSpinner size="large" />
				<span className="ml-3 text-foreground/70">支店情報を読み込み中...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full bg-red-500/10 text-red-500 p-4 rounded-lg">
				<p className="font-medium">エラーが発生しました</p>
				<p className="mt-1">{error}</p>
				<button
					onClick={() => fetchBranches()}
					className="mt-3 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
				>
					再試行
				</button>
			</div>
		);
	}

	if (branches.length === 0) {
		return (
			<div className="w-full bg-border/10 p-6 rounded-lg text-center">
				<p className="text-foreground/70">支店情報が見つかりませんでした</p>
			</div>
		);
	}

	// 日本の曜日
	const getDayOfWeek = (day: string) => {
		const daysMap: Record<string, string> = {
			'sunday': '日曜日',
			'monday': '月曜日',
			'tuesday': '火曜日',
			'wednesday': '水曜日',
			'thursday': '木曜日',
			'friday': '金曜日',
			'saturday': '土曜日'
		};
		return daysMap[day] || day;
	};

	return (
		<div className="w-full space-y-6">
			<div className="text-center max-w-3xl mx-auto mb-8">
				<p className="text-foreground/70">
					ご利用になる支店を選択してください。各支店ごとに設備や座席数が異なります。
				</p>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
				{branches.map((branch) => (
					<motion.div
						key={branch.branchId}
						className="bg-border/5 border border-border/20 rounded-xl overflow-hidden shadow-soft hover:shadow-lg transition-all cursor-pointer"
						whileHover={{ y: -5 }}
						onClick={() => onBranchSelect(branch)}
					>
						<div className="h-48 w-full relative bg-gradient-to-br from-accent/20 to-highlight/20">
							{branch.layoutImagePath ? (
								<img
									src={branch.layoutImagePath}
									alt={`${branch.branchName}のレイアウト`}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="h-full w-full flex items-center justify-center">
									<div className="text-4xl font-bold text-accent/40">{branch.branchCode}</div>
								</div>
							)}
						</div>
						<div className="p-4">
							<h3 className="text-xl font-bold mb-2 flex items-center">
								<span className="bg-accent/10 text-accent px-2 py-0.5 rounded mr-2">{branch.branchName}</span>
							</h3>

							<div className="space-y-2 mb-4">
								<div className="flex items-start">
									<MapPin className="w-4 h-4 text-accent mr-2 mt-1 flex-shrink-0" />
									<span className="text-sm text-foreground/70">{branch.address}</span>
								</div>

								<div className="flex items-start">
									<Clock className="w-4 h-4 text-accent mr-2 mt-1 flex-shrink-0" />
									<div className="text-sm text-foreground/70">
										<span>
											{branch.businessHours.open === '24:00' && branch.businessHours.close === '24:00'
												? '24時間営業'
												: `${branch.businessHours.open} - ${branch.businessHours.close}`}
										</span>
									</div>
								</div>

								<div className="flex items-start">
									<Users className="w-4 h-4 text-accent mr-2 mt-1 flex-shrink-0" />
									<span className="text-sm text-foreground/70">{branch.totalSeats}席</span>
								</div>

								{branch.phoneNumber && (
									<div className="flex items-start">
										<Phone className="w-4 h-4 text-accent mr-2 mt-1 flex-shrink-0" />
										<span className="text-sm text-foreground/70">{branch.phoneNumber}</span>
									</div>
								)}
							</div>

							{branch.amenities && branch.amenities.length > 0 && (
								<div className="mt-3">
									<div className="flex items-center mb-1">
										<Info className="w-4 h-4 text-accent mr-1" />
										<span className="text-xs text-foreground/70 font-medium">設備</span>
									</div>
									<div className="flex flex-wrap gap-1">
										{branch.amenities.map((amenity, index) => (
											<span
												key={index}
												className="bg-border/10 text-foreground/70 text-xs px-2 py-0.5 rounded"
											>
												{amenity}
											</span>
										))}
									</div>
								</div>
							)}

							<button
								onClick={(e) => {
									e.stopPropagation();
									onBranchSelect(branch);
								}}
								className="w-full mt-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
							>
								この支店を選択
							</button>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
}