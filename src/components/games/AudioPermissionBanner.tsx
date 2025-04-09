'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioPermissionBannerProps {
  onEnable: () => void;
  onDisable: () => void;
}

export default function AudioPermissionBanner({ onEnable, onDisable }: AudioPermissionBannerProps) {
  return (
    <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border/20 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Volume2 className="h-5 w-5 text-accent" />
            <p className="text-sm md:text-base">
              動画の音声を再生しますか？スクロールするとアクティブなゲームの音声が自動的に再生されます。
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onDisable}
              className="px-3 py-1.5 text-sm rounded-md border border-border/30 hover:bg-border/10 transition-colors flex items-center"
            >
              <VolumeX className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">音声オフ</span>
              <span className="md:hidden">オフ</span>
            </button>
            
            <button
              onClick={onEnable}
              className="px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors flex items-center"
            >
              <Volume2 className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">音声オン</span>
              <span className="md:hidden">オン</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}