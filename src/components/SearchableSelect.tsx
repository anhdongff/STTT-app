import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  disabled,
  placeholder = "Chọn ngôn ngữ...",
  className
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.id === value);
  
  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white p-2 text-left dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-all",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 border-transparent shadow-sm"
        )}
      >
        <span className="truncate">{selectedOption?.name || placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 z-[100] w-full min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-600 dark:bg-gray-800"
          >
            <div className="p-2 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full rounded-md border border-gray-300 bg-gray-50 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-left transition-colors",
                      opt.id === value 
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" 
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    )}
                  >
                    <span className="truncate">{opt.name}</span>
                    {opt.id === value && <Check className="h-4 w-4" />}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">Không tìm thấy ngôn ngữ</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
