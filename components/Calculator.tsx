

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Product, VoucherType } from '../types';
import { CalculatorIcon, CogIcon, CopyIcon, CheckIcon } from './Icons';

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return "0";
    return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

interface InputFieldProps {
    label: string;
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
    ({ label, id, value, onChange, placeholder, type = "text", onKeyDown }, ref) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="mt-1">
                <input
                    ref={ref}
                    type={type}
                    id={id}
                    value={value}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 text-gray-900 placeholder-gray-500 font-medium"
                />
            </div>
        </div>
    )
);

// New component for the taller search field with text wrapping
const SearchField: React.FC<{
    label: string;
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
}> = ({ label, id, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">
            <textarea
                id={id}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={2}
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 text-gray-900 placeholder-gray-500 font-medium resize-y"
            />
        </div>
    </div>
);

// Fix: Define CalculatorProps interface for the Calculator component.
interface CalculatorProps {
    products: Product[];
    dealListName: string;
}

const ALL_POSSIBLE_VOUCHERS = Array.from({ length: 19 }, (_, i) => i + 7); // 7 to 25

export const Calculator: React.FC<CalculatorProps> = ({ products, dealListName }) => {
    const [productId, setProductId] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');
    const [desiredPrice, setDesiredPrice] = useState('');
    const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.Percentage);
    const [voucherValue, setVoucherValue] = useState('');
    const [result, setResult] = useState<number | null>(null);

    // New states for enhanced features
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const voucherInputRef = useRef<HTMLInputElement>(null);
    const isSelectionInProgress = useRef(false); // Ref to prevent re-search after selection
    const [isCopied, setIsCopied] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());


    const [presetVouchers, setPresetVouchers] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem('presetVouchers');
            return saved ? JSON.parse(saved) : [7, 10, 12, 15, 20, 25];
        } catch {
            return [7, 10, 12, 15, 20, 25];
        }
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tempSelectedPresets, setTempSelectedPresets] = useState<number[]>([]);
    
    // Clock effect
    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh'
    });


    const handleProductSelect = useCallback((product: Product) => {
        isSelectionInProgress.current = true; // Flag that a programmatic selection is happening
        setProductId(product.id);
        setCurrentPrice(product.finalPrice.toString());
        setSearchTerm(product.name);
        setIsSuggestionsVisible(false);
    }, []);

    // Optimized search logic
    useEffect(() => {
        // If a selection was just made, the searchTerm was updated programmatically.
        // We reset the flag and skip this effect run to prevent the suggestion list from reappearing.
        if (isSelectionInProgress.current) {
            isSelectionInProgress.current = false;
            return;
        }

        const trimmedSearchTerm = searchTerm.trim();
        const selectedProduct = productId ? products.find(p => p.id === productId) : null;
        
        // Hide suggestions if search is empty or if it already matches the selected product's name
        if (trimmedSearchTerm.length < 1 || (selectedProduct && trimmedSearchTerm === selectedProduct.name)) {
            setIsSuggestionsVisible(false);
            return;
        }

        // Check for an exact ID/Model ID match to auto-select
        const exactMatch = products.find(p => p.id === trimmedSearchTerm || (p.modelId && p.modelId === trimmedSearchTerm));
        if (exactMatch) {
            handleProductSelect(exactMatch);
            return;
        }

        // Otherwise, perform a fuzzy search for suggestions
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(trimmedSearchTerm.toLowerCase()) ||
            p.id.includes(trimmedSearchTerm) ||
            (p.modelId && p.modelId.includes(trimmedSearchTerm))
        ).slice(0, 10);

        setSuggestions(filtered);
        setIsSuggestionsVisible(filtered.length > 0);

    }, [searchTerm, products, productId, handleProductSelect]);
    
    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSuggestionsVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCalculation = useCallback(() => {
        const current = parseFloat(currentPrice);
        const desired = parseFloat(desiredPrice);
        const voucher = parseFloat(voucherValue);

        if (isNaN(current) || isNaN(desired)) {
            setResult(null);
            return;
        }

        let sellerVoucher = 0;
        if (voucherType === VoucherType.Percentage) {
            if (isNaN(voucher) || voucher >= 100) {
                 setResult(null);
                 return;
            }
            sellerVoucher = current - (desired / (1 - voucher / 100));
        } else {
            const platformVoucher = isNaN(voucher) ? 0 : voucher;
            sellerVoucher = current - desired - platformVoucher;
        }

        setResult(sellerVoucher);

    }, [currentPrice, desiredPrice, voucherType, voucherValue]);

    // Calculate on Enter key press
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleCalculation();
        }
    };

     // Special handler for desiredPrice to override Tab behavior
    const handleDesiredPriceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleCalculation();
        } else if (event.key === 'Tab' && !event.shiftKey) {
            // Skip the radio buttons and focus directly on the voucher value input
            event.preventDefault();
            voucherInputRef.current?.focus();
        }
    };


    const formatCurrencyForInput = (value: string): string => {
        if (!value) return '';
        const number = parseInt(value, 10);
        return isNaN(number) ? '' : new Intl.NumberFormat('en-US').format(number);
    };

    const parseInput = (value: string): string => {
        return value.replace(/[^0-9]/g, '');
    };
    
    const handleSavePresets = () => {
        const sortedPresets = [...tempSelectedPresets].sort((a, b) => a - b);
        setPresetVouchers(sortedPresets);
        localStorage.setItem('presetVouchers', JSON.stringify(sortedPresets));
        setIsSettingsOpen(false);
    };

    const handleCopy = () => {
        if (result !== null) {
            navigator.clipboard.writeText(String(Math.round(result))).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
            });
        }
    };

    const toggleSettings = () => {
        if (!isSettingsOpen) {
            setTempSelectedPresets(presetVouchers);
        }
        setIsSettingsOpen(!isSettingsOpen);
    };

    const handlePresetSelectionChange = (voucherValue: number) => {
        setTempSelectedPresets(prev => {
            if (prev.includes(voucherValue)) {
                return prev.filter(v => v !== voucherValue); // Uncheck
            } else {
                return [...prev, voucherValue]; // Check
            }
        });
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 w-full h-full">
            <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <CalculatorIcon className="w-8 h-8 text-indigo-600 flex-shrink-0 mt-1" />
                     <div>
                        <h2 className="text-2xl font-bold text-gray-800">Công cụ tính giá</h2>
                        <p className="text-sm font-medium text-indigo-700 truncate" title={dealListName}>{dealListName}</p>
                    </div>
                </div>
                <div className="text-4xl font-bold text-gray-600 bg-gray-100 px-6 py-3 rounded-lg flex-shrink-0">
                     <span>{formattedTime}</span>
                </div>
            </div>
            <div className="space-y-4">
                 <div className="relative" ref={searchRef}>
                    <SearchField 
                        label="Tìm kiếm sản phẩm (Tên, ID, Model)" 
                        id="productSearch" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Nhập để tìm kiếm..." 
                    />
                    {isSuggestionsVisible && (
                        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {suggestions.map(product => (
                                <li key={product.id} 
                                    onClick={() => handleProductSelect(product)}
                                    className="p-3 hover:bg-indigo-100 cursor-pointer"
                                >
                                    <p className="font-semibold text-gray-800 truncate">{product.name}</p>
                                    <p className="text-sm text-gray-500">ID: {product.id} - {formatCurrency(product.finalPrice)}đ</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <InputField 
                    label="Giá hiển thị hiện tại" 
                    id="currentPrice" 
                    value={formatCurrencyForInput(currentPrice)} 
                    onChange={(e) => setCurrentPrice(parseInput(e.target.value))} 
                    placeholder="ví dụ: 139,000"
                    type="text" 
                    onKeyDown={handleKeyDown}
                />
                <InputField 
                    label="Giá cuối cùng mong muốn" 
                    id="desiredPrice" 
                    value={formatCurrencyForInput(desiredPrice)} 
                    onChange={(e) => setDesiredPrice(parseInput(e.target.value))} 
                    placeholder="ví dụ: 99,000" 
                    type="text"
                    onKeyDown={handleDesiredPriceKeyDown}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700">Loại Voucher</label>
                    <div className="mt-2 flex gap-4">
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" value={VoucherType.Percentage} checked={voucherType === VoucherType.Percentage} onChange={() => setVoucherType(VoucherType.Percentage)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
                            <span className="ml-2 text-sm text-gray-900">Phần trăm (%)</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" value={VoucherType.Fixed} checked={voucherType === VoucherType.Fixed} onChange={() => setVoucherType(VoucherType.Fixed)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
                            <span className="ml-2 text-sm text-gray-900">Số tiền cố định</span>
                        </label>
                    </div>
                </div>
                 <InputField 
                    ref={voucherInputRef}
                    label={voucherType === VoucherType.Percentage ? "Voucher Sàn (%)" : "Số tiền Voucher Sàn"}
                    id="voucherValue" 
                    value={voucherType === VoucherType.Fixed ? formatCurrencyForInput(voucherValue) : voucherValue} 
                    onChange={(e) => setVoucherValue(parseInput(e.target.value))} 
                    placeholder={voucherType === VoucherType.Percentage ? "ví dụ: 10" : "ví dụ: 10,000"} 
                    type="text"
                    onKeyDown={handleKeyDown}
                />

                {voucherType === VoucherType.Percentage && (
                    <div className="pt-2">
                         <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-gray-500">Hoặc chọn nhanh voucher thường dùng:</p>
                            <button onClick={toggleSettings} className="text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100" aria-label="Cài đặt voucher nhanh">
                                <CogIcon className="w-5 h-5" />
                            </button>
                        </div>
                         {isSettingsOpen && (
                            <div className="p-3 bg-gray-50 rounded-md border mb-3 transition-all duration-300 ease-in-out">
                                <p className="text-sm font-medium text-gray-700 block mb-3">Chọn voucher để hiển thị:</p>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
                                    {ALL_POSSIBLE_VOUCHERS.map((val) => (
                                        <label key={val} className="flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-200 cursor-pointer text-sm text-gray-800">
                                            <input
                                                type="checkbox"
                                                checked={tempSelectedPresets.includes(val)}
                                                onChange={() => handlePresetSelectionChange(val)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            {val}%
                                        </label>
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleSavePresets} className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        Lưu
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {presetVouchers.map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setVoucherValue(String(val))}
                                    type="button"
                                    className={`py-2 px-2 text-center rounded-md text-sm font-medium border transition-colors ${
                                        voucherValue === String(val)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                                    }`}
                                >
                                    {val}%
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleCalculation}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                    Tính Voucher Người Bán
                </button>

                {result !== null && (
                    <div className="mt-6 p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                        <p className="text-sm font-medium text-indigo-800 text-center">Voucher người bán cần có:</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <p className="text-3xl font-bold text-indigo-600 tracking-tight">{formatCurrency(result)} VND</p>
                             <button
                                onClick={handleCopy}
                                className="p-2 rounded-full text-gray-500 hover:bg-indigo-100 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                aria-label="Sao chép số tiền"
                            >
                                {isCopied ? <CheckIcon className="w-5 h-5 text-green-600" /> : <CopyIcon className="w-5 h-5" />}
                            </button>
                        </div>
                         {result < 0 && <p className="text-center text-sm text-red-600 mt-2">Lưu ý: Giá trị âm có nghĩa là giá có thể giảm mà không cần thêm voucher của người bán.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};
