import React, { useState, useRef, useEffect } from 'react';
import { Mic, FileAudio, Play, Square, Settings2, Maximize2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { apiCall, getWsUrl } from '../../lib/api';
import { convertToPCM16 } from '../../lib/audioUtils';
import languageCodes from '../../lib/language-code.json';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../lib/utils';

type Mode = 'transcribe' | 'translate';
type Status = 'idle' | 'processing' | 'running' | 'completed' | 'error';

interface Subtitle {
  id: string;
  start: number;
  end: number;
  text: string;
}

function parseSrt(srt: string): Subtitle[] {
  if (!srt) return [];
  const blocks = srt.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split('\n');
    const id = lines[0];
    const timeLine = lines[1];
    const text = lines.slice(2).join('\n');
    
    if (!timeLine) return { id, start: 0, end: 0, text };

    const [startStr, endStr] = timeLine.split(' --> ');
    const parseTime = (t: string) => {
      if (!t) return 0;
      const [hours, minutes, seconds] = t.split(':');
      const [sec, ms] = seconds.split(',');
      return (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(sec)) * 1000 + parseInt(ms);
    };

    return {
      id,
      start: parseTime(startStr),
      end: parseTime(endStr),
      text
    };
  });
}

function srtToVtt(srt: string): string {
  if (!srt) return '';
  let vtt = 'WEBVTT\n\n';
  vtt += srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return vtt;
}

function PreviewBox({
  title,
  content,
  type,
  expandedBox,
  setExpandedBox,
  currentTime,
  isBusy
}: {
  title: string;
  content: string;
  type: 'transcribe' | 'translate';
  expandedBox: 'transcribe' | 'translate' | null;
  setExpandedBox: (box: 'transcribe' | 'translate' | null) => void;
  currentTime: number;
  isBusy: boolean;
}) {
  const subtitles = parseSrt(content);
  const activeIndex = subtitles.findIndex(sub => currentTime >= sub.start && currentTime <= sub.end);
  const lastScrolledIndex = useRef<number>(-1);

  useEffect(() => {
    if (activeIndex !== -1 && activeIndex !== lastScrolledIndex.current && expandedBox !== type) {
      lastScrolledIndex.current = activeIndex;
      const el = document.getElementById(`subtitle-${type}-${activeIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, type, expandedBox]);

  if (expandedBox && expandedBox !== type) return null;

  return (
    <div className={cn(
      "flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800",
      expandedBox === type ? "absolute inset-0 z-20" : "flex-1 min-h-0"
    )}>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 dark:border-gray-700">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(content);
              toast.success('Đã sao chép');
            }}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExpandedBox(expandedBox === type ? null : type)}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {subtitles.length > 0 ? (
          <div className="whitespace-pre-wrap text-sm">
            {expandedBox === type ? (
              // Expanded view: show raw SRT
              <pre className="font-mono text-gray-800 dark:text-gray-200">{content}</pre>
            ) : (
              // Normal view: show text only, highlight active
              subtitles.map((sub, i) => {
                const isActive = i === activeIndex;
                return (
                  <p 
                    key={i} 
                    id={`subtitle-${type}-${i}`}
                    className={cn(
                      "mb-2 transition-colors duration-200",
                      isActive ? "text-blue-600 font-medium dark:text-blue-400" : "text-gray-800 dark:text-gray-200"
                    )}
                  >
                    {sub.text}
                  </p>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            {isBusy ? <span className="animate-pulse">Đang xử lý...</span> : 'Chưa có dữ liệu'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { token } = useAuthStore();
  const { selectedJobId, setSelectedJobId } = useAppStore();
  const [mode, setMode] = useState<Mode>('transcribe');
  const [inputLang, setInputLang] = useState('VIE');
  const [outputLang, setOutputLang] = useState('ENG');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [transcribeContent, setTranscribeContent] = useState('');
  const [translateContent, setTranslateContent] = useState('');
  const [transcribeVttUrl, setTranscribeVttUrl] = useState<string | null>(null);
  const [translateVttUrl, setTranslateVttUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [expandedBox, setExpandedBox] = useState<'transcribe' | 'translate' | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  useEffect(() => {
    if (transcribeContent) {
      const vtt = srtToVtt(transcribeContent);
      const blob = new Blob([vtt], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      setTranscribeVttUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setTranscribeVttUrl(null);
    }
  }, [transcribeContent]);

  useEffect(() => {
    if (translateContent) {
      const vtt = srtToVtt(translateContent);
      const blob = new Blob([vtt], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      setTranslateVttUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setTranslateVttUrl(null);
    }
  }, [translateContent]);

  useEffect(() => {
    if (selectedJobId) {
      fetchJobDetails(selectedJobId);
    } else {
      setFile(null);
      setFileUrl(null);
      setTranscribeContent('');
      setTranslateContent('');
      setStatus('idle');
      setMode('transcribe');
      setInputLang('VIE');
      setOutputLang('ENG');
      setCurrentTime(0);
    }
  }, [selectedJobId]);

  // The useEffect for timeupdate was removed because we use onTimeUpdate directly on media elements
  
  const fetchJobDetails = async (id: number) => {
    try {
      const res = await apiCall(`/get-job/${id}`);
      if (res?.data) {
        const job = res.data;
        const metadata = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata;
        
        const inLangKey = job.input_language;
        const outLangKey = job.output_language;

        setInputLang(inLangKey);
        setOutputLang(outLangKey);
        setMode(job.output_language ? 'translate' : 'transcribe');
        setTranscribeContent(job.transcribe_content || '');
        setTranslateContent(job.translate_content || '');
        setStatus(job.status);
        
        if (metadata?.local_file_path) {
          setFileUrl(metadata.local_file_path);
        } else {
          setFileUrl(null);
        }
      }
    } catch (err) {
      toast.error('Không thể tải thông tin bản ghi');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error('Kích thước file vượt quá 100MB');
        return;
      }
      setFile(selectedFile);
      setFileUrl(URL.createObjectURL(selectedFile));
      setTranscribeContent('');
      setTranslateContent('');
      setStatus('idle');
      setSelectedJobId(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setFile(audioFile);
        setFileUrl(URL.createObjectURL(audioFile));
        setTranscribeContent('');
        setTranslateContent('');
        setStatus('idle');
        setSelectedJobId(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      toast.error(`Không thể truy cập microphone: ${err.message || 'Lỗi không xác định'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleStart = async () => {
    if (!file && !fileUrl) {
      toast.error('Vui lòng chọn hoặc thu âm file');
      return;
    }

    if (mode === 'translate' && inputLang === outputLang) {
      toast.error('Ngôn ngữ dịch phải khác ngôn ngữ gốc');
      return;
    }

    setStatus('processing');
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.currentTime = 0;
    }

    try {
      let pcmFile = file;
      if (file) {
        const pcmBlob = await convertToPCM16(file);
        pcmFile = new File([pcmBlob], file.name.replace(/\.[^/.]+$/, "") + ".wav", { type: 'audio/wav' });
      }

      const formData = new FormData();
      if (pcmFile) {
        formData.append('file', pcmFile);
      } else {
        throw new Error('Không tìm thấy file để xử lý');
      }

      const uploadRes = await apiCall('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes?.data?.path) {
        throw new Error('Upload thất bại');
      }

      const filePath = uploadRes.data.path;

      const wsUrl = getWsUrl(`/submit_and_get_job?token=${token}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const payload = {
          file_path: filePath,
          output_type: 'srt',
          input_language: inputLang,
          output_language: mode === 'translate' ? outputLang : undefined,
          type: mode,
          metadata: {
            local_file_path: fileUrl,
            local_file_name: file?.name || 'audio.wav',
          }
        };
        ws.send(JSON.stringify(payload));
        setStatus('running');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcribe_content) setTranscribeContent(data.transcribe_content);
          if (data.translate_content) setTranslateContent(data.translate_content);
          if (data.status) setStatus(data.status);
        } catch (e) {
          console.error('WS message parse error', e);
        }
      };

      ws.onclose = (event) => {
        if (event.code === 1000) {
          setStatus('completed');
        } else {
          setStatus('error');
          toast.error('Có lỗi xảy ra trong quá trình xử lý');
        }
      };

      ws.onerror = () => {
        setStatus('error');
        toast.error('Lỗi kết nối WebSocket');
      };

    } catch (err: any) {
      setStatus('error');
      toast.error(err.message || 'Có lỗi xảy ra');
    }
  };

  const handleStop = () => {
    if (confirm('Bạn có chắc chắn muốn dừng quá trình này?')) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setStatus('idle');
      setTranscribeContent('');
      setTranslateContent('');
    }
  };

  const isBusy = status === 'processing' || status === 'running';

  return (
    <div className="flex h-full flex-col p-4 md:p-6 space-y-4 overflow-y-auto md:overflow-hidden">
      {/* Top/Main Content Area */}
      <div className="flex flex-1 flex-col md:flex-row md:space-x-6 min-h-0 space-y-4 md:space-y-0">
        
        {/* Left/Top: Player */}
        <div className="flex flex-col md:w-1/2 shrink-0 md:shrink">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg">
            {fileUrl ? (
              file?.type?.startsWith('video/') || fileUrl.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  ref={playerRef as any}
                  src={fileUrl}
                  controls
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
                  className={cn("h-full w-full object-contain", isBusy && "pointer-events-none opacity-50")}
                  crossOrigin="anonymous"
                  key={`${transcribeVttUrl}-${translateVttUrl}`} // Force re-render when subtitles change
                >
                  {transcribeVttUrl && (
                    <track
                      kind="subtitles"
                      src={transcribeVttUrl}
                      srcLang={languageCodes[inputLang as keyof typeof languageCodes]?.whisper || 'vi'}
                      label="Bản chép lời"
                      default
                    />
                  )}
                  {translateVttUrl && (
                    <track
                      kind="subtitles"
                      src={translateVttUrl}
                      srcLang={languageCodes[outputLang as keyof typeof languageCodes]?.whisper || 'en'}
                      label="Bản dịch"
                    />
                  )}
                </video>
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-900">
                  <audio
                    ref={playerRef as any}
                    src={fileUrl}
                    controls
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
                    className={cn("w-full px-4", isBusy && "pointer-events-none opacity-50")}
                  />
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                Chưa chọn file
              </div>
            )}
          </div>
        </div>

        {/* Right/Middle: Previews */}
        <div className="flex flex-1 flex-col space-y-4 md:w-1/2 min-h-0 relative">
          <PreviewBox
            title="Bản chép lời"
            content={transcribeContent}
            type="transcribe"
            expandedBox={expandedBox}
            setExpandedBox={setExpandedBox}
            currentTime={currentTime}
            isBusy={isBusy}
          />
          {mode === 'translate' && (
            <PreviewBox
              title="Bản dịch"
              content={translateContent}
              type="translate"
              expandedBox={expandedBox}
              setExpandedBox={setExpandedBox}
              currentTime={currentTime}
              isBusy={isBusy}
            />
          )}
        </div>
      </div>

      {/* Bottom: Controls */}
      <div className="shrink-0 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-2 lg:space-x-4 space-y-4 md:space-y-0">
          {/* Mode Selection */}
          <div className="md:w-32 lg:w-48 shrink-0">
            <label className="mb-1 hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300">Chế độ</label>
            <select
              disabled={isBusy}
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="transcribe">Chép lời</option>
              <option value="translate">Chép lời và dịch</option>
            </select>
          </div>

          {/* Language Selection */}
          <div className="flex flex-1 space-x-2">
            <div className="flex-1">
              <label className="mb-1 hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300">Ngôn ngữ gốc</label>
              <select
                disabled={isBusy}
                value={inputLang}
                onChange={(e) => setInputLang(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(languageCodes).map(([key, lang]) => (
                  <option key={key} value={key}>{lang.name}</option>
                ))}
              </select>
            </div>
            {mode === 'translate' && (
              <div className="flex-1">
                <label className="mb-1 hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300">Ngôn ngữ dịch</label>
                <select
                  disabled={isBusy}
                  value={outputLang}
                  onChange={(e) => setOutputLang(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {Object.entries(languageCodes).map(([key, lang]) => (
                    <option key={key} value={key}>{lang.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 space-x-2">
            <button
              disabled={isBusy}
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "flex flex-1 md:flex-none items-center justify-center rounded-lg px-3 lg:px-4 py-2 font-medium text-white transition-colors",
                isRecording ? "bg-red-500 hover:bg-red-600" : "bg-gray-600 hover:bg-gray-700",
                isBusy && "opacity-50"
              )}
            >
              {isRecording ? <Square className="md:mr-0 lg:mr-2 h-4 w-4" /> : <Mic className="md:mr-0 lg:mr-2 h-4 w-4" />}
              <span className="md:hidden lg:inline">{isRecording ? 'Dừng thu' : 'Thu âm'}</span>
            </button>
            
            <label className={cn(
              "flex flex-1 md:flex-none cursor-pointer items-center justify-center rounded-lg bg-gray-200 px-3 lg:px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
              isBusy && "pointer-events-none opacity-50"
            )}>
              <FileAudio className="md:mr-0 lg:mr-2 h-4 w-4" />
              <span className="md:hidden lg:inline">Chọn file</span>
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isBusy}
              />
            </label>
          </div>

          {/* Start/Stop Button */}
          <div className="shrink-0 md:w-auto lg:w-48">
            <button
              onClick={isBusy ? handleStop : handleStart}
              disabled={status === 'processing' || (!file && !!selectedJobId)}
              className={cn(
                "flex w-full items-center justify-center rounded-lg px-3 lg:px-4 py-2 font-bold text-white transition-colors",
                isBusy ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
                (status === 'processing' || (!file && !!selectedJobId)) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isBusy ? (
                <>
                  <Square className="md:mr-0 lg:mr-2 h-5 w-5" />
                  <span className="md:hidden lg:inline">Dừng lại</span>
                </>
              ) : (
                <>
                  <Play className="md:mr-0 lg:mr-2 h-5 w-5" />
                  <span className="md:hidden lg:inline">{(!file && !!selectedJobId) ? 'Hoàn thành' : 'Bắt đầu dịch'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
