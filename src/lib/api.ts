import { toast } from 'sonner';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) {
    console.log("no base url found")
    return 'http://192.168.222.111:8111'
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

// Helper: convert a Blob/File to base64 string (without data: prefix)
async function fileToBase64(file: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });
}
