'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface FaceVideoCaptureProps {
	onComplete: (success: boolean) => void;
	onError: (error: string) => void;
}

const FaceVideoCapture: React.FC<FaceVideoCaptureProps> = ({ onComplete, onError }) => {
	const { user } = useAuth();
	const videoRef = useRef<HTMLVideoElement>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const videoContainerRef = useRef<HTMLDivElement>(null);

	// 各種状態管理
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [status, setStatus] = useState<string>('初期化中...');
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [cameraReady, setCameraReady] = useState<boolean>(false);
	const [debugInfo, setDebugInfo] = useState<string>('');
	const [showCameraSelector, setShowCameraSelector] = useState<boolean>(false);
	const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedCamera, setSelectedCamera] = useState<string>('');

	// 録画結果の Blob を保持（最終的に1つの動画）
	const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);

	// 各ポーズ（正面、左、右）ごとのオーバーレイ画像、案内文、録画時間（秒）
	const poseOverlays = [
		{
			src:`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/face1.webp`,
			alt: "Front Pose Overlay",
			instructions: "正面",
			duration: 5
		},
		{
			src:`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/face2.webp`,
			alt: "Left Pose Overlay",
			instructions: "左向き",
			duration: 5
		},
		{
			src:`${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/face3.webp`,
			alt: "Right Pose Overlay",
			instructions: "右向き",
			duration: 5
		},
	];
	const totalRecordingDuration = poseOverlays.reduce((acc, curr) => acc + curr.duration, 0); // 合計15秒
	const [currentPoseIndex, setCurrentPoseIndex] = useState<number>(0);

	// デバッグ情報を追加する関数
	const addDebugInfo = (info: string) => {
		setDebugInfo(prev => `${new Date().toLocaleTimeString()}: ${info}\n${prev}`);
	};

	// 利用可能なカメラデバイスの取得
	const getAvailableCameras = async () => {
		try {
			addDebugInfo("カメラデバイス一覧を取得中");
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(device => device.kind === 'videoinput');

			addDebugInfo(`検出されたカメラデバイス: ${videoDevices.length}台`);
			videoDevices.forEach((device, index) => {
				addDebugInfo(`デバイス ${index + 1}: ID=${device.deviceId}, ラベル=${device.label || '名称なし'}`);
			});

			setCameraDevices(videoDevices);

			// 初期デバイス設定
			if (videoDevices.length > 0 && !selectedCamera) {
				setSelectedCamera(videoDevices[0].deviceId);
				addDebugInfo(`初期カメラを設定: ${videoDevices[0].label || 'デバイス1'}`);
			}
		} catch (err) {
			addDebugInfo(`カメラデバイス取得エラー: ${err}`);
		}
	};

	// コンポーネント初期化時にカメラデバイス取得
	useEffect(() => {
		getAvailableCameras();
	}, []);

	// 選択したカメラでストリームを初期化
	const initializeCamera = async (deviceId?: string) => {
		try {
			setStatus('カメラへのアクセスを要求中...');
			addDebugInfo(`カメラ初期化: ${deviceId ? `デバイスID=${deviceId}` : '既定デバイス'}`);

			// すでにストリームがある場合は停止
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
				addDebugInfo("既存のカメラストリームを停止");
			}

			const constraints: MediaStreamConstraints = {
				audio: false,
				video: deviceId
					? {
						deviceId: { exact: deviceId },
						width: { ideal: 640 },
						height: { ideal: 480 }
					}
					: {
						width: { ideal: 640 },
						height: { ideal: 480 }
					}
			};

			addDebugInfo(`制約オブジェクト: ${JSON.stringify(constraints)}`);

			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			addDebugInfo(`ストリーム取得成功: アクティブ=${stream.active}, トラック数=${stream.getTracks().length}`);

			const videoTrack = stream.getVideoTracks()[0];
			if (videoTrack) {
				addDebugInfo(`ビデオトラック: ${videoTrack.label}, 有効=${videoTrack.enabled}`);
				const settings = videoTrack.getSettings();
				addDebugInfo(`設定: 幅=${settings.width}, 高さ=${settings.height}, フレームレート=${settings.frameRate}`);
			}

			streamRef.current = stream;

			if (videoRef.current) {
				addDebugInfo("videoRef存在、ストリームをセット中");
				videoRef.current.style.width = '100%';
				videoRef.current.style.height = 'auto';
				videoRef.current.style.display = 'block';
				videoRef.current.style.objectFit = 'cover';
				videoRef.current.srcObject = stream;
				try {
					await videoRef.current.play();
					addDebugInfo("ビデオ再生開始成功");
					setCameraReady(true);
				} catch (e) {
					addDebugInfo(`ビデオ再生エラー: ${e}`);
					setStatus('カメラ映像の再生に失敗しました。再接続ボタンをクリックしてください。');
				}
			} else {
				addDebugInfo("videoRefが見つかりません");
			}

			setHasPermission(true);
			setStatus('');
			return true;
		} catch (err) {
			addDebugInfo(`カメラ初期化エラー: ${err}`);
			setHasPermission(false);
			onError(`カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。エラー: ${err}`);
			setStatus('エラー: カメラへのアクセスが許可されていません');
			return false;
		}
	};

	// カメラ選択時の処理
	const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
		const deviceId = e.target.value;
		addDebugInfo(`カメラ変更: ${deviceId}`);
		setSelectedCamera(deviceId);
		setCameraReady(false);
		await initializeCamera(deviceId);
	};

	// video タグのイベントリスナー
	useEffect(() => {
		if (videoRef.current) {
			const videoElement = videoRef.current;
			const handleCanPlay = () => {
				addDebugInfo("ビデオ再生可能イベント発生");
				setCameraReady(true);
			};
			const handlePlaying = () => {
				addDebugInfo("ビデオ再生中イベント発生");
				setCameraReady(true);
			};
			const handleError = (e: any) => {
				addDebugInfo(`ビデオエラー発生: ${e}`);
			};
			videoElement.addEventListener('canplay', handleCanPlay);
			videoElement.addEventListener('playing', handlePlaying);
			videoElement.addEventListener('error', handleError);
			return () => {
				videoElement.removeEventListener('canplay', handleCanPlay);
				videoElement.removeEventListener('playing', handlePlaying);
				videoElement.removeEventListener('error', handleError);
			};
		}
	}, [videoRef.current]);

	useEffect(() => {
		if (selectedCamera) {
			initializeCamera(selectedCamera);
		}
	}, [selectedCamera]);

	useEffect(() => {
		if (hasPermission === true && videoRef.current) {
			const checkVideoInterval = setInterval(() => {
				const video = videoRef.current;
				if (video) {
					addDebugInfo(`ビデオ状態: 幅=${video.videoWidth}, 高さ=${video.videoHeight}, 再生中=${!video.paused}, 読込状態=${video.readyState}`);
					if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
						setCameraReady(true);
					}
					try {
						const canvas = document.createElement('canvas');
						canvas.width = 320;
						canvas.height = 240;
						const ctx = canvas.getContext('2d');
						if (ctx) {
							ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
							const imageData = ctx.getImageData(0, 0, 10, 10);
							let isAllZero = true;
							for (let i = 0; i < 10 * 10 * 4; i += 4) {
								if (imageData.data[i] > 0 || imageData.data[i + 1] > 0 || imageData.data[i + 2] > 0) {
									isAllZero = false;
									break;
								}
							}
							if (isAllZero) {
								addDebugInfo("警告: ビデオが真っ黒です（ピクセルデータがすべて0）");
							} else {
								addDebugInfo("ビデオに画像データあり");
							}
						}
					} catch (e) {
						addDebugInfo(`ピクセルデータ確認エラー: ${e}`);
					}
				}
			}, 3000);
			return () => clearInterval(checkVideoInterval);
		}
	}, [hasPermission]);

	// ■ 全ステップ録画：すべて一つの動画として15秒間連続で録画し、5秒ごとにオーバーレイ・案内を更新
	const startMultiStepRecording = () => {
		if (!cameraReady || !streamRef.current) {
			addDebugInfo("カメラが準備できていません");
			return;
		}
		// 初期化：最初のポーズを設定
		setCurrentPoseIndex(0);
		setStatus(poseOverlays[0].instructions);
		// 連続録画開始
		startRecording();
		setIsRecording(true);

		// 5秒後：左向きに更新
		setTimeout(() => {
			setCurrentPoseIndex(1);
			setStatus(poseOverlays[1].instructions);
		}, poseOverlays[0].duration * 1000);

		// 10秒後：右向きに更新
		setTimeout(() => {
			setCurrentPoseIndex(2);
			setStatus(poseOverlays[2].instructions);
		}, (poseOverlays[0].duration + poseOverlays[1].duration) * 1000);

		// 15秒後：録画停止
		setTimeout(() => {
			stopRecording(true);
		}, totalRecordingDuration * 1000);
	};

	// ■ 連続録画開始（単一の MediaRecorder で録画）
	const startRecording = () => {
		if (!streamRef.current) {
			addDebugInfo("エラー: カメラストリームが見つかりません");
			onError('カメラストリームが見つかりません。カメラを再接続してください。');
			return;
		}
		setStatus('録画中...');
		setIsRecording(true);

		const mimeTypes = [
			'video/webm;codecs=vp9',
			'video/webm;codecs=vp8',
			'video/webm',
			'video/mp4'
		];
		let options = {};
		for (const mimeType of mimeTypes) {
			if (MediaRecorder.isTypeSupported(mimeType)) {
				options = { mimeType };
				addDebugInfo(`サポートされているmimeType: ${mimeType}`);
				break;
			}
		}
		const recordedChunks: BlobPart[] = [];
		try {
			mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
			addDebugInfo(`MediaRecorder作成成功: ${mediaRecorderRef.current.state}`);
		} catch (e) {
			addDebugInfo(`MediaRecorderの作成に失敗: ${e}`);
			onError('録画機能の初期化に失敗しました。ブラウザの互換性を確認してください。');
			return;
		}
		mediaRecorderRef.current.ondataavailable = (event) => {
			addDebugInfo(`データ利用可能: ${event.data.size} bytes`);
			if (event.data.size > 0) {
				recordedChunks.push(event.data);
			}
		};
		mediaRecorderRef.current.onstop = async () => {
			addDebugInfo(`MediaRecorder停止、チャンク数: ${recordedChunks.length}`);
			if (recordedChunks.length === 0) {
				addDebugInfo("エラー: 録画データがありません");
				onError('録画データがありません。もう一度お試しください。');
				return;
			}
			const blob = new Blob(recordedChunks, { type: 'video/webm' });
			addDebugInfo(`Blob作成: ${blob.size} bytes`);
			if (blob.size < 1000) {
				addDebugInfo(`警告: 録画サイズが小さすぎます (${blob.size} bytes)`);
				onError('録画データが不完全です。もう一度お試しください。');
				return;
			}
			setRecordedVideoBlob(blob);
			setStatus('録画完了！');
			setIsRecording(false);
			onComplete(true);
		};
		mediaRecorderRef.current.onerror = (event) => {
			addDebugInfo(`MediaRecorderエラー: ${event}`);
			onError('録画中にエラーが発生しました。もう一度お試しください。');
		};
		mediaRecorderRef.current.start(1000);
		addDebugInfo("録画開始");
	};

	// ■ 連続録画停止（multiStep フラグが true の場合はタイマー経由の自動停止）
	const stopRecording = (multiStep?: boolean) => {
		if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
			addDebugInfo(`録画停止リクエスト。現在の状態: ${mediaRecorderRef.current.state}`);
			setStatus('録画完了。処理中...');
			mediaRecorderRef.current.stop();
			setIsRecording(false);
		} else {
			const state = mediaRecorderRef.current ? mediaRecorderRef.current.state : "MediaRecorderなし";
			addDebugInfo(`録画を停止できません: ${state}`);
			onError(`録画を停止できません。録画の状態: ${state}`);
		}
	};

	// 録画動画をダウンロードするテスト用ボタンの処理
	const downloadVideo = () => {
		if (!recordedVideoBlob) return;
		const url = URL.createObjectURL(recordedVideoBlob);
		const a = document.createElement('a');
		a.style.display = 'none';
		a.href = url;
		a.download = `face_video.webm`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	if (hasPermission === false) {
		return (
			<div className="bg-background/80 p-6 rounded-xl shadow-soft">
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-2 max-w-md">
						<p className="text-lg font-medium">カメラへのアクセスが必要です</p>
						<p className="mt-2">本人確認のため、カメラの使用を許可してください。</p>
					</div>
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
					>
						再試行
					</button>
				</div>
			</div>
		);
	}

	const reconnectCamera = async () => {
		setStatus('カメラを再接続中...');
		addDebugInfo("カメラ再接続試行");
		await getAvailableCameras();
		if (selectedCamera) {
			await initializeCamera(selectedCamera);
		} else {
			await initializeCamera();
		}
	};

	return (
		<div className="bg-background/80 p-6 rounded-xl shadow-soft">
			<div className="flex flex-col items-center space-y-4">
				{/* カメラ選択 */}
				{cameraDevices.length > 1 && (
					<div className="w-full max-w-md">
						<label className="block text-sm font-medium mb-1">カメラを選択:</label>
						<select
							value={selectedCamera}
							onChange={handleCameraChange}
							className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
						>
							{cameraDevices.map((device) => (
								<option key={device.deviceId} value={device.deviceId}>
									{device.label || `カメラ ${cameraDevices.indexOf(device) + 1}`}
								</option>
							))}
						</select>
					</div>
				)}
				{/* ビデオプレビュー */}
				<div
					ref={videoContainerRef}
					className="relative w-full max-w-md bg-black rounded-lg overflow-hidden flex justify-center items-center"
					style={{
						minHeight: "320px",
						border: "1px solid #333"
					}}
				>
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						style={{
							display: "block",
							width: "100%",
							height: "auto",
							minHeight: "320px",
							objectFit: "cover",
							backgroundColor: "#000",
						}}
					/>
					<img
						src={poseOverlays[currentPoseIndex].src}
						alt={poseOverlays[currentPoseIndex].alt}
						className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
					/>
					{hasPermission === true && !cameraReady && (
						<div className="absolute inset-0 flex items-center justify-center bg-black/50">
							<div className="text-center">
								<LoadingSpinner size="medium" />
								<p className="text-white mt-2">カメラを準備中...</p>
							</div>
						</div>
					)}
				</div>
				{/* ステータス・案内表示 */}
				<p className="text-foreground/80 text-center">
					{poseOverlays[currentPoseIndex].instructions || status}
				</p>
				{/* 操作ボタン */}
				<div className="flex space-x-4">
					{!isRecording && (
						<>
							<button
								onClick={reconnectCamera}
								className="px-4 py-2 bg-border text-foreground rounded-lg hover:bg-border/80 mr-2"
							>
								カメラを再接続
							</button>
							<button
								onClick={startMultiStepRecording}
								disabled={hasPermission !== true}
								className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								録画開始
							</button>
						</>
					)}
					{isRecording && (
						<button
							onClick={() => stopRecording()}
							className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
						>
							録画停止
						</button>
					)}
				</div>
				{/* 録画完了後のダウンロードボタン */}
				{recordedVideoBlob && (
					<button
						onClick={downloadVideo}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg"
					>
						動画をダウンロード
					</button>
				)}
			</div>
		</div>
	);
};

export default FaceVideoCapture;
