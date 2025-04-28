'use client';

import { useEffect } from 'react';

/**
 * スマートフォンでのスクロール時にビューポート高さが変化する問題を解決するフック
 * 初期のビューポート高さを取得し、CSS変数として設定
 */
export function useRealViewportHeight() {
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
}