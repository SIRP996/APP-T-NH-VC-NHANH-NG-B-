import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './Icons';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

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

  const handleSelect = (value: string | null) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <div className="relative w-64" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`group w-full pl-4 pr-10 py-2.5 text-sm font-bold text-left rounded-xl transition-all duration-200 border flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500/50
        ${disabled 
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-white border-transparent text-slate-700 shadow-sm hover:border-indigo-300 hover:shadow-md'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${!selectedValue ? 'text-slate-400' : 'text-slate-900'}`}>
          {selectedLabel}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:text-indigo-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
            <ul className="max-h-60 overflow-auto focus:outline-none p-1 custom-scrollbar" role="listbox">
            <li
                onClick={() => handleSelect(null)}
                className="text-slate-500 cursor-pointer select-none relative py-2.5 pl-3 pr-3 rounded-lg hover:bg-slate-50 text-sm transition-colors font-medium"
                role="option"
            >
                {placeholder}
            </li>
            {options.map(option => (
                <li
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`cursor-pointer select-none relative py-2.5 pl-3 pr-3 rounded-lg text-sm transition-colors mb-0.5 ${
                    selectedValue === option.value 
                    ? 'bg-indigo-50 text-indigo-700 font-bold' 
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
                role="option"
                aria-selected={selectedValue === option.value}
                >
                <span className="truncate block">{option.label}</span>
                </li>
            ))}
            </ul>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;