import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon, SearchIcon } from './Icons';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
  placeholder: string;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ options, selectedValue, onSelect, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(lower));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
        setSearchTerm('');
        // Small delay to ensure render complete
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    }
  }, [isOpen]);

  const handleSelect = (value: string | null) => {
    onSelect(value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredOptions.length > 0) {
              handleSelect(filteredOptions[0].value);
          }
      }
  };

  return (
    <div className="relative w-64" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`group w-full pl-4 pr-10 py-2.5 text-sm font-bold text-left rounded-xl transition-all duration-200 border flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500
        ${disabled 
            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
            : 'bg-slate-900 border-slate-700 text-slate-200 shadow-sm hover:border-primary-400 hover:shadow-glow-hover hover:bg-slate-800'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${!selectedValue ? 'text-slate-500' : 'text-slate-200'}`}>
          {selectedLabel}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-200 group-hover:text-primary-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-slate-900 rounded-xl shadow-xl border border-slate-700 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-800/50">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tìm kiếm..."
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>

            <ul className="max-h-60 overflow-auto focus:outline-none p-1 custom-scrollbar" role="listbox">
            {!searchTerm && (
                <li
                    onClick={() => handleSelect(null)}
                    className="text-slate-500 cursor-pointer select-none relative py-2.5 pl-3 pr-3 rounded-lg hover:bg-slate-800 text-sm transition-colors font-medium border-b border-slate-800/50 mb-1"
                    role="option"
                >
                    {placeholder} <span className="text-[10px] opacity-70">(Bỏ chọn)</span>
                </li>
            )}
            
            {filteredOptions.length === 0 ? (
                 <li className="py-3 text-center text-slate-500 text-xs italic">
                    Không tìm thấy kết quả
                </li>
            ) : (
                filteredOptions.map(option => (
                    <li
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`cursor-pointer select-none relative py-2.5 pl-3 pr-3 rounded-lg text-sm transition-colors mb-0.5 ${
                        selectedValue === option.value 
                        ? 'bg-primary-500/10 text-primary-400 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:shadow-glow-inset font-medium'
                    }`}
                    role="option"
                    aria-selected={selectedValue === option.value}
                    >
                    <span className="truncate block">{option.label}</span>
                    </li>
                ))
            )}
            </ul>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;