import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  console.log('Capacitor Platform:', platform);
  console.log('Is Native Platform:', isNative);

  // If we are on a native platform (Android/iOS), use the hardcoded IP
  if (isNative || platform === 'android' || platform === 'ios') {
    const androidIp = 'http://192.168.0.100:8111';
    console.log('Using Android/Native BASE_URL:', androidIp);
    return androidIp;
  }

  console.log('Using default BASE_URL: http://localhost:8111');
  return 'http://localhost:8111';
};

export const BASE_URL = getBaseUrl();

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return null;
  }

  if (data?.meta?.action) {
    // Ignore 'OK' toast messages which might come from prefetch or default success responses
    if (!(data.meta.action === 'toast' && data.meta.message === 'OK')) {
      handleAction(data.meta.action, data.meta.message);
    }
  }

  if (!response.ok) {
    throw data;
  }

  return data;
}

function handleAction(action: string, message: string) {
  switch (action) {
    case 'toast':
      toast(message);
      break;
    case 'dialog':
      alert(message);
      break;
    case 'logout':
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-change'));
      break;
    case 'verify':
      window.dispatchEvent(new CustomEvent('require-verify', { detail: message }));
      break;
  }
}

export function getWsUrl(endpoint: string) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // If BASE_URL is absolute, parse it. Otherwise use current host.
  let host = window.location.host;
  if (BASE_URL.startsWith('http')) {
    const url = new URL(BASE_URL);
    host = url.host;
  }
  return `${wsProtocol}//${host}${endpoint}`;
}
