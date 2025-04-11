'use client';

import React from 'react';
import CameraTest from '@/components/verification/camera-test';
import Link from 'next/link';

export default function CameraTestPage() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className="bg-background/80 backdrop-blur-sm border-b border-border">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between h-16">
						<Link href="/" className="font-bold text-xl text-accent">
							E-Sports Sakura
						</Link>

						<nav>
							<Link href="/dashboard" className="text-foreground/70 hover:text-accent">
								ダッシュボードに戻る
							</Link>
						</nav>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8 max-w-2xl">
				<div className="mb-6">
					<h1 className="text-2xl font-bold mb-2">カメラテストツール</h1>
					<p className="text-foreground/70">
						このページはカメラの動作確認テスト用です。異なるカメラを選択して、正しく映像が表示されるか確認できます。
					</p>
				</div>

				<CameraTest />

				<div className="mt-8 bg-border/5 p-4 rounded-lg">
					<h2 className="text-lg font-medium mb-2">使い方:</h2>
					<ol className="list-decimal pl-5 space-y-2">
						<li>「カメラを選択」からテストしたいカメラデバイスを選びます</li>
						<li>「カメラを開始」ボタンをクリックしてカメラを起動します</li>
						<li>カメラの映像が表示されることを確認します</li>
						<li>「フレームキャプチャ」ボタンで現在の映像をキャプチャし、画像データを確認できます</li>
						<li>「カメラを停止」でテストを終了します</li>
					</ol>
					<p className="mt-4 text-sm text-foreground/60">
						<strong>注意:</strong> カメラが表示されない場合は、ブラウザのカメラ許可設定を確認してください。また、他のアプリケーションがカメラを使用している場合は、それらを閉じてからお試しください。
					</p>
				</div>
			</main>
		</div>
	);
}