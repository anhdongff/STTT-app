import { LogOut, History, Settings, Moon, Sun, Monitor, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMenu: (menu: 'home' | 'history' | 'settings') => void;
  currentMenu: string;
}

export default function Sidebar({ isOpen, onClose, onSelectMenu, currentMenu }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useAppStore();

  const handleThemeChange = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeText = theme === 'light' ? 'Sáng' : theme === 'dark' ? 'Tối' : 'Hệ thống';

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-64 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-gray-800 md:left-0 md:right-auto md:w-20 md:translate-x-0 md:hover:w-64 group",
          isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-center border-b border-gray-200 p-4 dark:border-gray-700 md:justify-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold cursor-pointer" onClick={() => onSelectMenu('home')}>
              ST
            </div>
            <div className="ml-3 overflow-hidden md:w-0 md:opacity-0 md:transition-all md:duration-300 group-hover:md:w-auto group-hover:md:opacity-100">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {user?.email || 'User'}
              </p>
            </div>
          </div>

          {/* Menu */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              <button
                onClick={() => { onSelectMenu('history'); onClose(); }}
                className={cn(
                  "flex w-full items-center rounded-lg px-2 py-3 text-sm font-medium transition-colors",
                  currentMenu === 'history'
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
              >
                <History className="h-6 w-6 shrink-0" />
                <span className="ml-3 md:hidden group-hover:md:block">Lịch sử bản ghi</span>
              </button>

              <div className="pt-4 pb-2">
                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 md:hidden group-hover:md:block">
                  Cài đặt
                </p>
              </div>

              <button
                onClick={() => { onSelectMenu('settings'); onClose(); }}
                className={cn(
                  "flex w-full items-center rounded-lg px-2 py-3 text-sm font-medium transition-colors",
                  currentMenu === 'settings'
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
              >
                <Settings className="h-6 w-6 shrink-0" />
                <span className="ml-3 md:hidden group-hover:md:block">Cài đặt</span>
              </button>

              <button
                onClick={handleThemeChange}
                className="flex w-full items-center rounded-lg px-2 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ThemeIcon className="h-6 w-6 shrink-0" />
                <span className="ml-3 md:hidden group-hover:md:block">Giao diện: {themeText}</span>
              </button>
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <button
              onClick={logout}
              className="flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <LogOut className="h-6 w-6 shrink-0" />
              <span className="ml-3 md:hidden group-hover:md:block">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
