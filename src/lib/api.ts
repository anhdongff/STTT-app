import { toast } from 'sonner';
import { Capacitor, CapacitorHttp, HttpResponse } from '@capacitor/core';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) {
    console.log("no base url found")
    return 'http://192.168.0.100:8111'
  } else return envUrl.replace(/\/$/, ''); // Remove trailing slash
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

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  // Use Native HTTP for Android/iOS to bypass CORS
  if (Capacitor.isNativePlatform()) {
    try {
      const nativeOptions = {
        url,
        method: options.method || 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        data: options.body ? JSON.parse(options.body as string) : undefined,
      };

      // Handle FormData if needed (simplified for common JSON cases)
      if (options.body instanceof FormData) {
        delete nativeOptions.headers['Content-Type'];
        // Note: FormData handling in CapacitorHttp might need more complex logic
        // but for login/basic JSON it works perfectly with the above.
      }

      const response: HttpResponse = await CapacitorHttp.request(nativeOptions);
      
      const data = response.data;

      if (data?.meta?.action) {
        if (!(data.meta.action === 'toast' && data.meta.message === 'OK')) {
          handleAction(data.meta.action, data.meta.message);
        }
      }

      if (response.status < 200 || response.status >= 300) {
        throw data || new Error('Network response was not ok');
      }

      return data;
    } catch (error) {
      console.error('Native API Call Error:', error);
      throw error;
    }
  }

  // Fallback to standard fetch for Web/Dev
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
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
