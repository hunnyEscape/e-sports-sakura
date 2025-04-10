'use client';
import React, { useState } from 'react';
import { collection, setDoc, getDocs, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SeatDocument, BranchDocument } from '@/types/firebase';

// This is a utility component for initializing seats in Firestore
// It's not part of the main app flow, but can be used for setup
const SeatInitializer: React.FC = () => {
	const [status, setStatus] = useState<string>('');
	const [isInitializing, setIsInitializing] = useState<boolean>(false);
	const [selectedBranchId, setSelectedBranchId] = useState<string>('');
	const [branches, setBranches] = useState<BranchDocument[]>([]);

	// Fetch branches
	const fetchBranches = async () => {
		setStatus('支店情報を取得中...');
		try {
			const branchesCollection = collection(db, 'branch');
			const branchesSnapshot = await getDocs(branchesCollection);

			const branchesData: BranchDocument[] = [];
			branchesSnapshot.forEach((doc) => {
				branchesData.push({
					branchId: doc.id,
					...doc.data()
				} as BranchDocument);
			});

			setBranches(branchesData);
			setStatus(`${branchesData.length}店舗を取得しました`);
		} catch (error) {
			console.error('Error fetching branches:', error);
			setStatus('支店情報の取得に失敗しました');
		}
	};

	// Initialize seats for selected branch
	const initializeSeats = async () => {
		if (!selectedBranchId) {
			setStatus('支店を選択してください');
			return;
		}

		setIsInitializing(true);
		setStatus('座席情報を初期化中...');

		try {
			const targetBranch = branches.find(b => b.branchId === selectedBranchId);
			if (!targetBranch) {
				throw new Error('選択された支店が見つかりません');
			}

			// Check if seats already exist for this branch
			const existingSeatsQuery = query(
				collection(db, 'seats'),
				where('branchCode', '==', targetBranch.branchCode)
			);

			const existingSeatsSnapshot = await getDocs(existingSeatsQuery);
			// Determine seat count based on branch
			const seatCount =
				selectedBranchId === 'tachikawa' ? 8 :
					selectedBranchId === 'shinjuku' ? 20 :
						selectedBranchId === 'akihabara' ? 16 : 10;

			// シートデータを作成して追加
			let createdCount = 0;
			for (let i = 1; i <= seatCount; i++) {
				//const isHighSpec = i <= Math.ceil(seatCount / 2); // 半分は高スペックPCとする

				// カスタムドキュメントID（支店コード-NN形式）を作成
				const seatId = `${targetBranch.branchCode}-${i.toString().padStart(2, '0')}`;

				// ドキュメント参照を取得
				const seatRef = doc(db, 'seats', seatId);

				// データを準備
				const seatData = {
					name: `PC #${i}`,
					branchCode: targetBranch.branchCode,
					branchName: targetBranch.branchName,
					seatType: 'Standard PC',
					seatNumber: i,
					ipAddress: `192.168.${selectedBranchId === 'tachikawa' ? '1' : selectedBranchId === 'shinjuku' ? '2' : '3'}.${i.toString().padStart(3, '0')}`,
					ratePerHour: 400,
					status: 'available',
					// スクリーンショットで確認された構造に合わせて定義
					availableHours: {
						weekday_night: "18:00-23:00",
						weekday_noon: "9:00-17:00",
						weekend: "9:00-23:00"
					},
					maxAdvanceBookingDays: 30,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				};

				// setDocを使ってカスタムIDでドキュメントを作成
				await setDoc(seatRef, seatData);
				createdCount++;
				setStatus(`座席を作成中... (${createdCount}/${seatCount})`);
			}

			setStatus(`${createdCount}席の座席情報を作成しました`);
		} catch (error) {
			console.error('Error initializing seats:', error);
			setStatus('座席情報の初期化に失敗しました: ' + (error as Error).message);
		} finally {
			setIsInitializing(false);
		}
	};

	return (
		<div className="max-w-md mx-auto p-6 bg-background border border-border rounded-lg shadow-sm">
			<h2 className="text-xl font-semibold mb-4">座席データ初期化ツール</h2>
			<p className="text-sm text-foreground/70 mb-4">
				このツールは、各支店の座席データをFirestoreに初期化するためのものです。
				運用開始時に一度だけ実行してください。
			</p>

			<div className="space-y-4">
				<button
					onClick={fetchBranches}
					disabled={isInitializing}
					className="w-full py-2 bg-accent/80 hover:bg-accent text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					支店情報を取得する
				</button>

				{branches.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-foreground mb-1">
							初期化する支店を選択
						</label>
						<select
							value={selectedBranchId}
							onChange={(e) => setSelectedBranchId(e.target.value)}
							disabled={isInitializing}
							className="w-full p-2 border border-border rounded-md bg-background disabled:opacity-50"
						>
							<option value="">支店を選択してください</option>
							{branches.map((branch) => (
								<option key={branch.branchId} value={branch.branchId}>
									{branch.branchName} ({branch.branchCode})
								</option>
							))}
						</select>
					</div>
				)}

				{selectedBranchId && (
					<button
						onClick={initializeSeats}
						disabled={isInitializing || !selectedBranchId}
						className="w-full py-2 bg-highlight hover:bg-highlight/90 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isInitializing ? '処理中...' : '座席データを初期化する'}
					</button>
				)}

				{status && (
					<div className={`p-3 rounded-md ${status.includes('失敗') ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
						{status}
					</div>
				)}
			</div>
		</div>
	);
};

export default SeatInitializer;