import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Product, VoucherType } from '../types';
import { CalculatorIcon, CogIcon } from './Icons';

interface CalculatorProps {
  products: Product[];
}

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return "0";
    return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

const InputField: React.FC<{ 
    label: string; 
    id: string; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    placeholder?: string; 
    type?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}> = ({ label, id, value, onChange, placeholder, type = "text", onKeyDown }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">
            <input
                type={type}
                id={id}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full px-3 py-2 border border-zinc-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-zinc-800 text-white placeholder-gray-400"
            />
        </div>
    </div>
);

export const Calculator: React.FC<CalculatorProps> = ({ products }) => {
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
    const isSelectionInProgress = useRef(false); // Ref to prevent re-search after selection

    const [presetVouchers, setPresetVouchers] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem('presetVouchers');
            return saved ? JSON.parse(saved) : [7, 10, 12, 15, 20, 25];
        } catch {
            return [7, 10, 12, 15, 20, 25];
        }
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tempPresets, setTempPresets] = useState(presetVouchers.join(', '));
    
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

    const formatCurrencyForInput = (value: string): string => {
        if (!value) return '';
        const number = parseInt(value, 10);
        return isNaN(number) ? '' : new Intl.NumberFormat('en-US').format(number);
    };

    const parseInput = (value: string): string => {
        return value.replace(/[^0-9]/g, '');
    };
    
    const handleSavePresets = () => {
        const newPresets = tempPresets
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0 && n < 100);
        
        // Fix: Explicitly type sort callback parameters to prevent type inference issues.
        const uniquePresets = [...new Set(newPresets)].sort((a: number, b: number) => a - b);
        
        setPresetVouchers(uniquePresets);
        localStorage.setItem('presetVouchers', JSON.stringify(uniquePresets));
        setIsSettingsOpen(false);
    };


    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 w-full h-full">
            <div className="flex items-center gap-3 mb-6">
                <CalculatorIcon className="w-8 h-8 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-800">Công cụ tính giá</h2>
            </div>
            <div className="space-y-4">
                 <div className="relative" ref={searchRef}>
                    <InputField 
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
                    onKeyDown={handleKeyDown}
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
                            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-100" aria-label="Cài đặt voucher nhanh">
                                <CogIcon className="w-5 h-5" />
                            </button>
                        </div>
                         {isSettingsOpen && (
                            <div className="p-3 bg-gray-50 rounded-md border mb-3 transition-all duration-300 ease-in-out">
                                <label htmlFor="preset-input" className="text-sm font-medium text-gray-700 block mb-1">Chỉnh sửa voucher (phân cách bằng dấu phẩy)</label>
                                <div className="flex gap-2">
                                    <input 
                                        id="preset-input"
                                        type="text" 
                                        value={tempPresets}
                                        onChange={(e) => setTempPresets(e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <button onClick={handleSavePresets} className="px-4 py-1 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Lưu</button>
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
                        <p className="text-sm font-medium text-indigo-800">Voucher người bán cần có:</p>
                        <p className="text-3xl font-bold text-indigo-600 text-center tracking-tight">{formatCurrency(result)} VND</p>
                         {result < 0 && <p className="text-center text-sm text-red-600 mt-2">Lưu ý: Giá trị âm có nghĩa là giá có thể giảm mà không cần thêm voucher của người bán.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};