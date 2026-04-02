import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { apiCall } from '../../lib/api';
import { toast } from 'sonner';

export default function VerifyAccount() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) {
      toast.error('Vui lòng nhập email');
      return;
    }
    setSendingCode(true);
    try {
      await apiCall('/send-verify-code', {
        method: 'POST',
        body: JSON.stringify({ email, type: 'email_verification' }),
      });
      toast.success('Mã xác thực đã được gửi');
      setCountdown(60);
    } catch (err: any) {
      toast.error(err?.meta?.message || 'Gửi mã thất bại');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiCall('/verify-new-account', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      toast.success('Xác thực thành công, vui lòng đăng nhập');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.meta?.message || 'Xác thực thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">STTT</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Xác thực tài khoản</p>
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <div className="mt-1 flex space-x-2">
              <input
                type="email"
                required
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0 || !email || sendingCode}
                className="whitespace-nowrap rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {sendingCode ? 'Đang gửi...' : countdown > 0 ? `Gửi lại (${countdown}s)` : 'Gửi mã'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mã xác thực</label>
            <input
              type="text"
              required
              maxLength={6}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !code}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Xác thực'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
