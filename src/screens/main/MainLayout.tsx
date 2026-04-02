import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Dashboard from './Dashboard';
import HistoryList from './HistoryList';
import Settings from './Settings';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<'home' | 'history' | 'settings'>('home');

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Top Bar (Mobile) */}
      <div className="fixed top-0 z-30 flex h-16 w-full items-center justify-between bg-white px-4 shadow-sm dark:bg-gray-800 md:hidden">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">STTT</h1>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectMenu={setCurrentMenu}
        currentMenu={currentMenu}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-16 md:ml-20 md:pt-0">
        {currentMenu === 'home' && <Dashboard />}
        {currentMenu === 'history' && <HistoryList onSelectMenu={setCurrentMenu} />}
        {currentMenu === 'settings' && <Settings />}
      </main>
    </div>
  );
}
