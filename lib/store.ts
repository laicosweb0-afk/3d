'use client';

import { create } from 'zustand';
import type { SceneId } from './scenes';

export type QualityTier = 'high' | 'mid' | 'low';

interface AppState {
  scene: SceneId;
  quality: QualityTier;
  audioOn: boolean;
  ready: boolean;
  setScene: (s: SceneId) => void;
  setQuality: (q: QualityTier) => void;
  toggleAudio: () => void;
  setReady: (r: boolean) => void;
}

export const useApp = create<AppState>((set) => ({
  scene: 's01',
  quality: 'high',
  audioOn: false,
  ready: false,
  setScene: (scene) => set({ scene }),
  setQuality: (quality) => set({ quality }),
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  setReady: (ready) => set({ ready }),
}));

export const DPR_BY_TIER: Record<QualityTier, number> = {
  high: 1.75,
  mid: 1.5,
  low: 1.1,
};
