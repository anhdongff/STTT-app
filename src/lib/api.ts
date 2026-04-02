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

  // Helper to handle response data and actions
  const processResponse = (status: number, data: any) => {
    if (data?.meta?.action) {
      if (!(data.meta.action === 'toast' && data.meta.message === 'OK')) {
        handleAction(data.meta.action, data.meta.message);
      }
    }

    if (status < 200 || status >= 300) {
      throw data || new Error('Network response was not ok');
    }

    return data;
  };

  // Use Native HTTP for ALL requests on Android/iOS to bypass CORS
  if (Capacitor.isNativePlatform()) {
    try {
      const isFormData = options.body instanceof FormData;
      
      const nativeOptions: any = {
        url,
        method: options.method || 'GET',
        headers: {
          ...headers,
        },
      };

      if (isFormData) {
        // For FormData, let Capacitor handle the content-type and boundary
        nativeOptions.data = options.body;
      } else {
        // For JSON requests
        nativeOptions.headers['Content-Type'] = 'application/json';
        if (options.body) {
          // Only parse if it's a string, if it's already an object use it directly
          nativeOptions.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        }
      }

      console.log(`Native Request [${nativeOptions.method}]: ${url}`);
      const response: HttpResponse = await CapacitorHttp.request(nativeOptions);
      return processResponse(response.status, response.data);
    } catch (error) {
      console.error('Native API Call Error:', error);
      throw error; 
    }
  }

  // Standard fetch logic (ONLY for Web/Development browser)
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

  return processResponse(response.status, data);
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
