import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // 先ほど見せていただいたFirebase初期化ファイルからdbをインポート

export default function SeatInitializer() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const createSeatDocuments = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const seatNumbers = [1,2, 3, 4, 5, 6, 7, 8];
			const seatsCollection = collection(db, 'seats');

			for (const seatNumber of seatNumbers) {
				const seatId = `TACH-${seatNumber.toString().padStart(2, '0')}`;
				const seatDoc = {
					seatId: seatId,
					branchCode: 'TACH',
					branchName: '立川店',
					seatType: 'PC',
					seatNumber: seatNumber,
					name: `Gaming PC #${seatNumber}`,
					ipAddress: `192.000.123.00${seatNumber}`,
					ratePerHour: {
						'weekday night': 400,
						'weekday noon': 1300,
						'weekend': 400
					},
					status: 'available',
					availableHours: {
						'weekday night': ['18:00-23:00'],
						'weekday noon': ['9:00-17:00'],
						'weekend': ['9:00-23:00']
					},
					maxAdvanceBookingDays: 90,
					createdAt: new Date('2025-04-08T14:00:00').toISOString(),
					updatedAt: new Date('2025-04-08T14:00:00').toISOString()
				};

				// 各座席ドキュメントをFirestoreに保存
				await setDoc(doc(seatsCollection, seatId), seatDoc);
			}

			alert('座席情報をFirestoreに保存しました！');
		} catch (err) {
			console.error('座席情報の保存中にエラーが発生しました:', err);
			setError('座席情報の保存に失敗しました');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="p-4">
			<button
				onClick={createSeatDocuments}
				disabled={isLoading}
				className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
			>
				{isLoading ? '保存中...' : '座席情報を保存 (TACH-02 to TACH-08)'}
			</button>
			{error && <p className="text-red-500 mt-2">{error}</p>}
		</div>
	);
}