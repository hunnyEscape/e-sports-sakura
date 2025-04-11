'use client';

import React, { useRef, useState, useEffect } from 'react';

/**
 * カメラテスト用のシンプルなコンポーネント
 * 撮影・録画・アップロード機能はなく、カメラの表示テストのみを行う
 */
const CameraTest: React.FC = () => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedCamera, setSelectedCamera] = useState<string>('');
	const [log, setLog] = useState<string>('初期化中...\n');
	const [showCanvas, setShowCanvas] = useState<boolean>(false);
	const [cameraReady, setCameraReady] = useState<boolean>(false);
	const [cameraSize, setCameraSize] = useState<{ width: number, height: number }>({ width: 640, height: 480 });

	// ログを追加する関数
	const addLog = (message: string) => {
		setLog(prev => `${new Date().toLocaleTimeString()}: ${message}\n${prev}`);
	};

	// 利用可能なカメラデバイスを取得
	const getAvailableCameras = async () => {
		try {
			addLog("カメラデバイス一覧を取得中...");
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(device => device.kind === 'videoinput');

			addLog(`検出されたカメラデバイス: ${videoDevices.length}台`);
			videoDevices.forEach((device, index) => {
				addLog(`デバイス ${index + 1}: ${device.label || '名称なし'} (${device.deviceId.substring(0, 10)}...)`);
			});

			setCameraDevices(videoDevices);

			// 初期デバイスを設定
			if (videoDevices.length > 0 && !selectedCamera) {
				setSelectedCamera(videoDevices[0].deviceId);
				addLog(`初期カメラを設定: ${videoDevices[0].label || 'デバイス1'}`);
			}

			return videoDevices;
		} catch (err) {
			addLog(`カメラデバイス取得エラー: ${err}`);
			return [];
		}
	};

	// 初期化時にカメラデバイスを取得
	useEffect(() => {
		getAvailableCameras();
	}, []);

	// カメラの初期化と開始
	const startCamera = async (deviceId?: string) => {
		try {
			// すでに使用中のカメラがあれば停止
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
				addLog("既存のカメラストリームを停止しました");
			}

			// カメラの制約オブジェクト
			const constraints: MediaStreamConstraints = {
				audio: false,
				video: deviceId
					? { deviceId: { exact: deviceId } }
					: true
			};

			addLog(`カメラに接続を試みます... ${deviceId ? `デバイスID: ${deviceId.substring(0, 10)}...` : '既定のカメラ'}`);

			// カメラへのアクセス要求
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			addLog(`カメラ接続成功: ビデオトラック数=${stream.getVideoTracks().length}`);

			// ビデオトラックの情報を確認
			const videoTrack = stream.getVideoTracks()[0];
			if (videoTrack) {
				addLog(`ビデオトラック情報: ${videoTrack.label}`);

				// 設定を取得
				const settings = videoTrack.getSettings();
				addLog(`ビデオ設定: 幅=${settings.width || '不明'}, 高さ=${settings.height || '不明'}, フレームレート=${settings.frameRate || '不明'}`);

				if (settings.width && settings.height) {
					setCameraSize({ width: settings.width, height: settings.height });
				}
			}

			streamRef.current = stream;

			// ビデオ要素にストリームをセット
			if (videoRef.current) {
				addLog("ビデオ要素にストリームをセットします");
				videoRef.current.srcObject = stream;
				videoRef.current.onloadedmetadata = () => {
					addLog("ビデオのメタデータを読み込みました");

					if (videoRef.current) {
						videoRef.current.play()
							.then(() => {
								addLog("ビデオの再生を開始しました");
								setCameraReady(true);
							})
							.catch(err => {
								addLog(`ビデオ再生エラー: ${err}`);
							});
					}
				};
			} else {
				addLog("エラー: ビデオ要素が見つかりません");
			}

			return true;
		} catch (err) {
			addLog(`カメラ初期化エラー: ${err}`);
			return false;
		}
	};

	// カメラ選択時の処理
	const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const deviceId = e.target.value;
		addLog(`カメラ変更: ${deviceId.substring(0, 10)}...`);
		setSelectedCamera(deviceId);
		setCameraReady(false);
		startCamera(deviceId);
	};

	// キャンバスにビデオフレームをキャプチャ
	const captureFrame = () => {
		if (videoRef.current && canvasRef.current) {
			const video = videoRef.current;
			const canvas = canvasRef.current;

			// キャンバスサイズをビデオに合わせる
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			const ctx = canvas.getContext('2d');
			if (ctx) {
				// ビデオフレームをキャンバスに描画
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

				// 画像データを取得して解析
				try {
					const imageData = ctx.getImageData(0, 0, 20, 20);
					let totalBrightness = 0;

					// 最初の20x20ピクセルの明るさを計算
					for (let i = 0; i < 20 * 20 * 4; i += 4) {
						const r = imageData.data[i];
						const g = imageData.data[i + 1];
						const b = imageData.data[i + 2];
						// グレースケール変換（輝度を計算）
						const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
						totalBrightness += brightness;
					}

					const averageBrightness = totalBrightness / (20 * 20);
					addLog(`フレームキャプチャ: 平均輝度=${averageBrightness.toFixed(2)}`);

					if (averageBrightness < 10) {
						addLog("警告: 画像が非常に暗いです。カメラが正しく機能していない可能性があります。");
					}
				} catch (err) {
					addLog(`画像解析エラー: ${err}`);
				}

				setShowCanvas(true);
			}
		}
	};

	return (
		<div className="p-6 bg-background/80 rounded-xl shadow-soft">
			<h2 className="text-xl font-medium text-center mb-6">カメラテスト</h2>

			{/* カメラ選択 */}
			<div className="mb-4">
				<label className="block text-sm font-medium mb-1">カメラを選択:</label>
				<div className="flex space-x-2">
					<select
						value={selectedCamera}
						onChange={handleCameraChange}
						className="flex-1 px-3 py-2 bg-background border border-border rounded-lg"
					>
						{cameraDevices.map((device) => (
							<option key={device.deviceId} value={device.deviceId}>
								{device.label || `カメラ ${cameraDevices.indexOf(device) + 1}`}
							</option>
						))}
					</select>
					<button
						onClick={() => getAvailableCameras()}
						className="px-3 py-2 bg-border text-foreground rounded-lg hover:bg-border/80"
					>
						更新
					</button>
				</div>
			</div>

			{/* カメラ表示エリア */}
			<div className="mb-4 relative">
				<div className="w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						style={{
							width: '100%',
							height: 'auto',
							display: 'block',
							backgroundColor: '#000',
						}}
					/>

					{!cameraReady && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
							カメラの準備中...
						</div>
					)}
				</div>

				{/* カメラ情報 */}
				<div className="mt-2 text-sm">
					<p>解像度: {cameraSize.width} x {cameraSize.height}</p>
				</div>
			</div>

			{/* 操作ボタン */}
			<div className="flex flex-wrap gap-2 mb-4">
				<button
					onClick={() => startCamera(selectedCamera)}
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					カメラを開始
				</button>
				<button
					onClick={captureFrame}
					disabled={!cameraReady}
					className="px-4 py-2 bg-highlight text-white rounded-lg hover:bg-highlight/90 disabled:opacity-50"
				>
					フレームキャプチャ
				</button>
				<button
					onClick={() => {
						if (streamRef.current) {
							streamRef.current.getTracks().forEach(track => track.stop());
							addLog("カメラを停止しました");
							setCameraReady(false);
						}
					}}
					disabled={!cameraReady}
					className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
				>
					カメラを停止
				</button>
			</div>

			{/* キャプチャしたフレーム表示 */}
			{showCanvas && (
				<div className="mb-4">
					<h3 className="text-sm font-medium mb-1">キャプチャしたフレーム:</h3>
					<canvas
						ref={canvasRef}
						className="border border-border rounded-lg"
						style={{ maxWidth: '100%', height: 'auto' }}
					/>
				</div>
			)}

			{/* ログ表示 */}
			<div className="mt-4">
				<h3 className="text-sm font-medium mb-1">カメラログ:</h3>
				<pre className="p-3 text-xs bg-background/30 rounded-lg h-40 overflow-auto whitespace-pre-wrap">
					{log}
				</pre>
			</div>
		</div>
	);
};

export default CameraTest;