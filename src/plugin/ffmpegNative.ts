import { registerPlugin } from '@capacitor/core';

export interface AudioConverterPlugin {
  convertToAAC(options: { inputPath: string }): Promise<{ outputPath: string }>;
  convertToRaw(options: { inputPath: string }): Promise<{ outputPath: string }>;
}

export const AudioConverter = registerPlugin<AudioConverterPlugin>('AudioConverter');