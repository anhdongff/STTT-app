import type { CapacitorConfig } from '@capacitor/cli';
import { loadEnv } from 'vite';
import dotenv from 'dotenv';
import path from 'path';

const mode = process.env.NODE_ENV ?? 'development';

// 1) ưu tiên biến môi trường hệ thống
// 2) sau đó load bằng Vite (load .env, .env.development, ...)
// 3) nếu vẫn thiếu thì load trực tiếp .env bằng dotenv (hỗ trợ khi chỉ có 1 .env)
const viteEnv = loadEnv(mode, process.cwd());
const dotenvParsed = dotenv.config({ path: path.resolve(process.cwd(), '.env') }).parsed ?? {};

const apiBase =
  process.env.VITE_API_BASE_URL ??
  viteEnv.VITE_API_BASE_URL ??
  dotenvParsed.VITE_API_BASE_URL ??
  '';

let allowNavHost = '';
try {
  allowNavHost = new URL(apiBase).hostname;
} catch {
  const parts = apiBase.split('/');
  allowNavHost = parts.length >= 3 ? parts[2].split(':')[0] : apiBase;
}

const config: CapacitorConfig = {
  appId: 'com.sttt.app',
  appName: 'STTT',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: allowNavHost ? [allowNavHost] : [],
  },
  loggingBehavior: 'none',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;