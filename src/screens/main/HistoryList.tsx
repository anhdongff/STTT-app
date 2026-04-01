import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, ChevronRight } from 'lucide-react';
import { apiCall } from '../../lib/api';
import languageCodes from '../../lib/language-code.json';
import { toast } from 'sonner';
import { useAppStore } from '../../store/appStore';

interface Job {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  created_at: string;
  input_language: string;
  output_language?: string;
  metadata: string | any;
}

interface HistoryListProps {
  onSelectMenu: (menu: 'home' | 'history' | 'settings') => void;
}

export default function HistoryList({ onSelectMenu }: HistoryListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const setSelectedJobId = useAppStore(state => state.setSelectedJobId);

  const fetchJobs = async (start: number) => {
    setLoading(true);
    try {
      const res = await apiCall(`/get-job?start=${start}&limit=20`);
      if (res?.data) {
        setJobs(prev => start === 0 ? res.data : [...prev, ...res.data]);
        setHasMore(res.data.length === 20);
      }
    } catch (err: any) {
      toast.error('Lỗi khi tải lịch sử');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(0);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchJobs(nextPage * 20);
    }
  };

  const getLanguageName = (code: string) => {
    const lang = Object.entries(languageCodes).find(([key, l]) => l.whisper === code || l.nllb === code || key === code);
    return lang ? (lang[1] as any).name : code;
  };

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-800 dark:text-white">Lịch sử bản ghi</h2>
      
      <div className="flex-1 overflow-y-auto rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {jobs.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            Chưa có bản ghi nào
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {jobs.map((job) => {
              const metadata = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata;
              const fileName = metadata?.local_file_name || 'Không rõ tên file';
              const langStr = job.output_language 
                ? `${getLanguageName(job.input_language)} -> ${getLanguageName(job.output_language)}`
                : getLanguageName(job.input_language);

              return (
                <li 
                  key={job.id} 
                  onClick={() => {
                    setSelectedJobId(job.id);
                    onSelectMenu('home');
                  }}
                  className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{fileName}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{langStr}</span>
                        <span>•</span>
                        <span>{format(new Date(job.created_at), 'dd/MM/yyyy HH:mm')}</span>
                        <span>•</span>
                        <span className={
                          {
                            'pending': 'text-yellow-600 dark:text-yellow-400',
                            'running': 'text-blue-600 dark:text-blue-400',
                            'completed': 'text-green-600 dark:text-green-400',
                            'error': 'text-red-600 dark:text-red-400'
                          }[job.status]
                        }>
                          {{
                            'pending': 'Đang chờ',
                            'running': 'Đang xử lý',
                            'completed': 'Hoàn thành',
                            'error': 'Lỗi'
                          }[job.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </li>
              );
            })}
          </ul>
        )}
        
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {loading ? 'Đang tải...' : 'Tải thêm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
