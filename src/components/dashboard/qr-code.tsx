'use client';

import { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';

export default function BarcodeDisplay() {
	const { user } = useAuth();
	const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const generateBarcode = async () => {
			if (!user) return;

			try {
				// 一時的なキャンバス要素を作成してバーコードを描画
				const canvas = document.createElement('canvas');

				// ユーザーのUIDを一次元バーコードとして使用
				JsBarcode(canvas, user.uid, {
					format: "CODE128",
					width: 2,
					height: 100,
					displayValue: true,
					fontSize: 14,
					margin: 10,
					background: "#ffffff",
					lineColor: "#000000",
				});

				// キャンバスからデータURLを取得
				const dataUrl = canvas.toDataURL('image/png');
				setBarcodeDataUrl(dataUrl);
			} catch (err) {
				console.error('バーコード生成エラー:', err);
				setError('バーコードの生成に失敗しました');
			} finally {
				setLoading(false);
			}
		};

		generateBarcode();
	}, [user]);

	if (loading) {
		return (
			<div className="py-12 flex justify-center">
				<LoadingSpinner size="large" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
				<p className="mb-4">{error}</p>
				<Button onClick={() => window.location.reload()} size="sm" variant="outline">
					再読み込み
				</Button>
			</div>
		);
	}

	return (
		<div className="text-center">
			{barcodeDataUrl ? (
				<>
					<div className="bg-white p-4 rounded-lg w-64 mx-auto mb-4 flex items-center justify-center border-2 border-accent">
						<img
							src={barcodeDataUrl}
							alt="バーコード"
							className="w-full object-contain"
						/>
					</div>
					<p className="text-sm text-foreground/70 mb-4">
						店舗の入口リーダーにかざして入室できます。<br />
						席のリーダーにかざすとPCを起動できます。<br />
					</p>
					<Button
						variant="outline"
						className="opacity-50 pointer-events-auto cursor-pointer"
					>
						会員バーコードの更新手続き（未実装）
					</Button>
					<p className="text-sm text-foreground/70 mt-2">
						セキュリティの関係上、会員バーコードが紛失したり他人に漏洩した場合は更新手続きをお願いします。
					</p>
				</>
			) : (
				<div className="bg-orange-500/10 text-orange-500 p-4 rounded-lg mb-4">
					<p className="mb-2">バーコードが見つかりません。</p>
				</div>
			)}
		</div>
	);
}