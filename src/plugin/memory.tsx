import { registerPlugin } from '@capacitor/core';

export interface MemoryInfoResult {
  usedMB: number;
  freeMB: number;
  remainingMB: number;
  maxMB: number;

  normalHeapMB: number;
  largeHeapMB: number;

  nativeHeapMB: number;

  dalvikPssMB: number;
  nativePssMB: number;
  totalPssMB: number;

  isLowMemory: boolean;
}

export interface MemoryInfoPlugin {
  getMemoryInfo(): Promise<MemoryInfoResult>;
}

export const MemoryInfo =
  registerPlugin<MemoryInfoPlugin>('MemoryInfo');