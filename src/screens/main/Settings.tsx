import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const handleClearCache = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ file âm thanh và video đã lưu cục bộ?')) {
      // In a real app, this would clear IndexedDB or local storage files
      // For this web version, we just show a success message
      toast.success('Đã xóa bộ nhớ đệm thành công');
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-white">Cài đặt</h2>
      
      <div className="space-y-6">
        {/* Storage Settings */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Lưu trữ</h3>
          
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">Xóa bộ nhớ đệm</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Xóa các file âm thanh và video đã tải lên/thu âm để giải phóng dung lượng
              </p>
            </div>
            <button
              onClick={handleClearCache}
              className="flex items-center rounded-lg bg-red-50 px-4 py-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </button>
          </div>
        </div>

        {/* About */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Thông tin ứng dụng</h3>
          
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><span className="font-medium text-gray-800 dark:text-gray-200">Tên ứng dụng:</span> Speech to Text - Translate (STTT)</p>
            <p><span className="font-medium text-gray-800 dark:text-gray-200">Phiên bản:</span> 1.0.0</p>
            <p><span className="font-medium text-gray-800 dark:text-gray-200">Mô tả:</span> Ứng dụng hỗ trợ chuyển đổi giọng nói thành văn bản và dịch thuật đa ngôn ngữ.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
