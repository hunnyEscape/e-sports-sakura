'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AudioContextType {
	globalAudioEnabled: boolean;
	hasUserInteracted: boolean;
	enableAudio: () => void;
	disableAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
	children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
	// ユーザーのオーディオ設定と、インタラクション状態を管理
	const [globalAudioEnabled, setGlobalAudioEnabled] = useState(false);
	const [hasUserInteracted, setHasUserInteracted] = useState(false);

	// ローカルストレージから設定を復元（ページリロード時やセッション間）
	useEffect(() => {
		const storedAudioPref = localStorage.getItem('audioPreference');
		const storedInteraction = localStorage.getItem('userInteracted');

		if (storedAudioPref === 'enabled') {
			setGlobalAudioEnabled(true);
		}

		if (storedInteraction === 'true') {
			setHasUserInteracted(true);
		}
	}, []);

	// オーディオを有効にする関数（ユーザーインタラクション捕捉）
	const enableAudio = () => {
		setGlobalAudioEnabled(true);
		setHasUserInteracted(true);
		localStorage.setItem('audioPreference', 'enabled');
		localStorage.setItem('userInteracted', 'true');
	};

	// オーディオを無効にする関数
	const disableAudio = () => {
		setGlobalAudioEnabled(false);
		localStorage.setItem('audioPreference', 'disabled');
	};

	return (
		<AudioContext.Provider
			value={{
				globalAudioEnabled,
				hasUserInteracted,
				enableAudio,
				disableAudio
			}}
		>
			{children}
		</AudioContext.Provider>
	);
}

// カスタムフック - コンポーネントからオーディオコンテキストにアクセスするために使用
export function useAudio() {
	const context = useContext(AudioContext);
	if (context === undefined) {
		throw new Error('useAudio must be used within an AudioProvider');
	}
	return context;
}