'use client';

import { useEffect } from 'react';

/**
 * ビューポート高さを初期化するためのクライアントコンポーネント
 * レイアウトファイルなどのサーバーコンポーネントから利用可能
 */
export default function ViewportInitializer() {
  useEffect(() => {
    // 実際のビューポート高さを取得し、CSS変数として設定
    const setRealViewportHeight = () => {
      // 1vhの値をピクセル単位で計算
      const vh = window.innerHeight * 0.01;
      // CSS変数として設定
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 初期化時に実行
    setRealViewportHeight();

    // デバイスの向きが変わった時にも実行（オプション）
    window.addEventListener('orientationchange', setRealViewportHeight);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('orientationchange', setRealViewportHeight);
    };
  }, []);

  // このコンポーネントは何もレンダリングしない
  return null;
}