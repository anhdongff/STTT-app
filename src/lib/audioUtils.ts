import { Capacitor } from '@capacitor/core';
import { AudioConverter } from '../plugin/ffmpegNative';
import { writeCacheFileBlob, clearCacheFiles } from './cacheFileService';
import { toast } from 'sonner';

// Utility functions for audio processing

export async function convertToPCM16(file: File): Promise<Blob> {
  // Use Web Audio API to decode and resample to 16kHz mono PCM 16-bit
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // We need to convert the AudioBuffer to a 16-bit PCM WAV file
  const numOfChannels = 1; // Mono
  const length = audioBuffer.length * numOfChannels * 2 + 44; // 16-bit = 2 bytes per sample
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + audioBuffer.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 16000 * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, audioBuffer.length * 2, true);

  // Write PCM data
  const channelData = audioBuffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function convertToPCM16Streaming(
  file: File,
  onProgress?: (phase: string, percent: number) => void
): Promise<Blob> {
  const CHUNK_SECONDS = 100; // Process 300s at a time
  const TARGET_SAMPLE_RATE = 16000;

  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({ sampleRate: TARGET_SAMPLE_RATE });

  // Decode in chunks using OfflineAudioContext to avoid holding full float32 buffer
  onProgress?.('Đang đọc file...', 0);
  const arrayBuffer = await file.arrayBuffer(); // Still needed for decodeAudioData
  (audioContext as any).detach?.(); // Hint to release previous buffer if supported
  onProgress?.('Đang giải mã audio...', 10);
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Release the raw arrayBuffer from memory ASAP
  // (GC hint — not guaranteed but helps)
  const totalSamples = audioBuffer.length;
  const chunkSize = TARGET_SAMPLE_RATE * CHUNK_SECONDS;
  const numChunks = Math.ceil(totalSamples / chunkSize);

  // Write WAV header
  const wavHeaderBuffer = new ArrayBuffer(44);
  const headerView = new DataView(wavHeaderBuffer);
  const totalPCMBytes = totalSamples * 2; // 16-bit = 2 bytes

  writeString(headerView, 0, 'RIFF');
  headerView.setUint32(4, 36 + totalPCMBytes, true);
  writeString(headerView, 8, 'WAVE');
  writeString(headerView, 12, 'fmt ');
  headerView.setUint32(16, 16, true);
  headerView.setUint16(20, 1, true); // PCM
  headerView.setUint16(22, 1, true); // Mono
  headerView.setUint32(24, TARGET_SAMPLE_RATE, true);
  headerView.setUint32(28, TARGET_SAMPLE_RATE * 2, true); // byte rate
  headerView.setUint16(32, 2, true); // block align
  headerView.setUint16(34, 16, true); // bits per sample
  writeString(headerView, 36, 'data');
  headerView.setUint32(40, totalPCMBytes, true);

  // Process PCM in chunks — each chunk is created, used, then GC-eligible
  const blobParts: BlobPart[] = [wavHeaderBuffer];
  const channelData = audioBuffer.getChannelData(0); // Float32Array ref (shared, not copied)

  for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
    const start = chunkIdx * chunkSize;
    const end = Math.min(start + chunkSize, totalSamples);
    const chunkLength = end - start;

    // Allocate only one chunk at a time
    const pcmChunk = new Int16Array(chunkLength);
    for (let i = 0; i < chunkLength; i++) {
      const s = Math.max(-1, Math.min(1, channelData[start + i]));
      pcmChunk[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Push as Blob so the Int16Array can be GC'd after this iteration
    blobParts.push(new Blob([pcmChunk]));

    const percent = 10 + Math.round(((chunkIdx + 1) / numChunks) * 80);
    onProgress?.(`Đang xử lý audio... (${chunkIdx + 1}/${numChunks})`, percent);

    // Yield to event loop every chunk to avoid blocking UI & help GC
    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.('Đang tạo file WAV...', 95);

  // Blob constructor concatenates without copying everything into one ArrayBuffer
  return new Blob(blobParts, { type: 'audio/wav' });
}

const createRandomCacheFileName = (extension = 'wav'): string => {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `pcm/${uuid}.${extension}`;
};

export async function convertToAACNative(file: Blob): Promise<Blob> {
  const cacheFileName = createRandomCacheFileName('input');
  const inputUri = await writeCacheFileBlob(cacheFileName, file);

  const { outputPath } = await AudioConverter.convertToAAC({ inputPath: inputUri });
  toast.info('Đường dẫn file đã được chuyển đổi: ' + outputPath);
  const fetchUrl = Capacitor.convertFileSrc(outputPath);
  toast.info('Đường dẫn fetch file: ' + fetchUrl);
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    return null as any; // Caller should handle null case
  }

  clearCacheFiles(); // Clean up old cache files after conversion
  return response.blob();
}

export async function convertToRawNative(file: Blob): Promise<Blob> {
  const cacheFileName = createRandomCacheFileName('input');
  const inputUri = await writeCacheFileBlob(cacheFileName, file);

  const { outputPath } = await AudioConverter.convertToRaw({ inputPath: inputUri });
  toast.info('Đường dẫn file đã được chuyển đổi: ' + outputPath);
  const fetchUrl = Capacitor.convertFileSrc(outputPath);
  toast.info('Đường dẫn fetch file: ' + fetchUrl);
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    return null as any; // Caller should handle null case
  }

  clearCacheFiles(); // Clean up old cache files after conversion
  return response.blob();
}