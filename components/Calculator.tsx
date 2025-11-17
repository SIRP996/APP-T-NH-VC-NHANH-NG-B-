

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-medium"
                />
            </div>
        </div>
    )
);

const SearchField: React.FC<{
    label: string;
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
}> = ({ label, id, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="mt-1">
            <textarea
                id={id}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={2}
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-medium resize-y"
            />
        </div>
    </div>
);

interface CalculatorProps {
    products: Product[];
    dealListName: string;
    selectedProduct?: Product | null;
}

const ALL_POSSIBLE_VOUCHERS = Array.from({ length: 19 }, (_, i) => i + 7); // 7 to 25

export const Calculator: React.FC<CalculatorProps> = ({ products, dealListName, selectedProduct }) => {
    const [productId, setProductId] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');
    const [desiredPrice, setDesiredPrice] = useState('');
    const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.Percentage);
    const [voucherValue, setVoucherValue] = useState('');
    const [result, setResult] = useState<number | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const voucherInputRef = useRef<HTMLInputElement>(null);
    const [isIdCopied, setIsIdCopied] = useState(false);
    const [isResultCopied, setIsResultCopied] = useState(false);

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isQuickPriceInput, setIsQuickPriceInput] = useState(true);
    const [isDesiredPriceFocused, setIsDesiredPriceFocused] = useState(false);

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

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh'
    });
    
    // Auto-populate form when a product is selected from the table
    useEffect(() => {
        if (selectedProduct) {
            setProductId(selectedProduct.id);
            setCurrentPrice(selectedProduct.finalPrice.toString());
            setSearchTerm(selectedProduct.name);
            setResult(null); // Clear previous result
            setIsIdCopied(false);
            setIsResultCopied(false);
        }
    }, [selectedProduct]);

    const performCalculation = useCallback((currentPriceStr: string, desiredPriceStr: string, voucherValueStr: string, vType: VoucherType): number | null => {
        const current = parseFloat(currentPriceStr);
        const desired = parseFloat(desiredPriceStr);
        const voucher = parseFloat(voucherValueStr);

        if (isNaN(current) || isNaN(desired)) return null;

        let sellerVoucher = 0;
        if (vType === VoucherType.Percentage) {
            if (isNaN(voucher) || voucher >= 100) return null;
            sellerVoucher = current - (desired / (1 - voucher / 100));
        } else {
            const platformVoucher = isNaN(voucher) ? 0 : voucher;
            sellerVoucher = current - desired - platformVoucher;
        }
        return sellerVoucher;
    }, []);

    const handleCalculation = useCallback(() => {
        const calculationResult = performCalculation(currentPrice, desiredPrice, voucherValue, voucherType);
        setResult(calculationResult);
    }, [currentPrice, desiredPrice, voucherValue, voucherType, performCalculation]);

    const handlePresetClick = (val: number) => {
        const newVoucherStr = String(val);
        setVoucherValue(newVoucherStr);
        const calculationResult = performCalculation(currentPrice, desiredPrice, newVoucherStr, VoucherType.Percentage);
        setResult(calculationResult);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleCalculation();
        }
    };

    const handleDesiredPriceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleCalculation();
        } else if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            voucherInputRef.current?.focus();
        }
    };

    const formatCurrencyForInput = (value: string): string => {
        if (!value) return '';
        const number = parseInt(value.replace(/[^0-9]/g, ''), 10);
        return isNaN(number) ? '' : new Intl.NumberFormat('en-US').format(number);
    };

    const parseInput = (value: string): string => value.replace(/[^0-9]/g, '');

    const desiredPriceValue = useMemo(() => {
        if (!desiredPrice) return '';
        const numericValue = parseInt(desiredPrice, 10);
        if (isNaN(numericValue)) return '';

        if (isQuickPriceInput && isDesiredPriceFocused) {
            return String(Math.round(numericValue / 1000));
        }
        return formatCurrencyForInput(desiredPrice);
    }, [desiredPrice, isQuickPriceInput, isDesiredPriceFocused]);

    const handleDesiredPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const numericString = parseInput(rawValue);
        const numericValue = parseInt(numericString, 10);

        if (isNaN(numericValue)) {
            setDesiredPrice('');
            return;
        }

        setDesiredPrice(isQuickPriceInput ? String(numericValue * 1000) : numericString);
    };

    const handleSavePresets = () => {
        const sortedPresets = [...tempSelectedPresets].sort((a, b) => a - b);
        setPresetVouchers(sortedPresets);
        localStorage.setItem('presetVouchers', JSON.stringify(sortedPresets));
        setIsSettingsOpen(false);
    };

    const handleResultCopy = () => {
        if (result !== null) {
            navigator.clipboard.writeText(String(Math.round(result))).then(() => {
                setIsResultCopied(true);
                setTimeout(() => setIsResultCopied(false), 2000);
            });
        }
    };

    const handleIdCopy = () => {
        if (productId) {
            navigator.clipboard.writeText(productId).then(() => {
                setIsIdCopied(true);
                setTimeout(() => setIsIdCopied(false), 2000);
            });
        }
    };

    const toggleSettings = () => {
        if (!isSettingsOpen) setTempSelectedPresets(presetVouchers);
        setIsSettingsOpen(!isSettingsOpen);
    };

    const handlePresetSelectionChange = (voucherValue: number) => {
        setTempSelectedPresets(prev => prev.includes(voucherValue) ? prev.filter(v => v !== voucherValue) : [...prev, voucherValue]);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 w-full h-full">
            <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <CalculatorIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Công cụ tính giá</h2>
                        <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400 truncate" title={dealListName}>{dealListName}</p>
                    </div>
                </div>
                <div className="text-4xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-lg flex-shrink-0">
                    <span>{formattedTime}</span>
                </div>
            </div>
            <div className="space-y-4">
                <SearchField
                    label="Tên sản phẩm đã chọn"
                    id="productSearch"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Chọn một sản phẩm từ bảng"
                />

                {productId && (
                    <div className="-mt-2">
                        <label htmlFor="selectedProductId" className="block text-xs font-medium text-gray-600 dark:text-gray-400">ID Sản phẩm</label>
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                id="selectedProductId"
                                type="text"
                                readOnly
                                value={productId}
                                title={productId}
                                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sm:text-sm focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 cursor-default"
                            />
                            <button
                                onClick={handleIdCopy}
                                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-gray-600 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-shrink-0"
                                aria-label="Sao chép ID sản phẩm"
                            >
                                {isIdCopied ? <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                )}

                <InputField
                    label="Giá hiển thị hiện tại"
                    id="currentPrice"
                    value={formatCurrencyForInput(currentPrice)}
                    onChange={(e) => setCurrentPrice(parseInput(e.target.value))}
                    placeholder="ví dụ: 139,000"
                    type="text"
                    onKeyDown={handleKeyDown}
                />
                <div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="desiredPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Giá cuối cùng mong muốn</label>
                        <label htmlFor="quick-price-toggle" className="flex items-center cursor-pointer">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">Nhập nhanh (x1000)</span>
                            <div className="relative">
                                <input
                                    id="quick-price-toggle"
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isQuickPriceInput}
                                    onChange={() => setIsQuickPriceInput(!isQuickPriceInput)}
                                />
                                <div className="w-10 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 transition-colors"></div>
                                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4"></div>
                            </div>
                        </label>
                    </div>
                    <div className="mt-1">
                        <input
                            type="text"
                            id="desiredPrice"
                            value={desiredPriceValue}
                            onChange={handleDesiredPriceChange}
                            onFocus={() => setIsDesiredPriceFocused(true)}
                            onBlur={() => setIsDesiredPriceFocused(false)}
                            onKeyDown={handleDesiredPriceKeyDown}
                            placeholder={isQuickPriceInput ? "ví dụ: 99" : "ví dụ: 99,000"}
                            autoComplete="off"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-medium"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Loại Voucher</label>
                    <div className="mt-2 flex gap-4">
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" value={VoucherType.Percentage} checked={voucherType === VoucherType.Percentage} onChange={() => setVoucherType(VoucherType.Percentage)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600" />
                            <span className="ml-2 text-sm text-gray-900 dark:text-gray-200">Phần trăm (%)</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" value={VoucherType.Fixed} checked={voucherType === VoucherType.Fixed} onChange={() => setVoucherType(VoucherType.Fixed)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600" />
                            <span className="ml-2 text-sm text-gray-900 dark:text-gray-200">Số tiền cố định</span>
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
                            <p className="text-xs text-gray-500 dark:text-gray-400">Hoặc chọn nhanh voucher thường dùng:</p>
                            <button onClick={toggleSettings} className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Cài đặt voucher nhanh">
                                <CogIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {isSettingsOpen && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600 mb-3 transition-all duration-300 ease-in-out">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-3">Chọn voucher để hiển thị:</p>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
                                    {ALL_POSSIBLE_VOUCHERS.map((val) => (
                                        <label key={val} className="flex items-center justify-center gap-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
                                            <input
                                                type="checkbox"
                                                checked={tempSelectedPresets.includes(val)}
                                                onChange={() => handlePresetSelectionChange(val)}
                                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
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
                                    onClick={() => handlePresetClick(val)}
                                    type="button"
                                    className={`py-2 px-2 text-center rounded-md text-sm font-medium border transition-colors ${
                                        voucherValue === String(val)
                                            ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                                            : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
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
                    <div className="mt-6 p-4 rounded-lg bg-indigo-50 dark:bg-gray-700 border border-indigo-200 dark:border-indigo-500/50">
                        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200 text-center">Voucher người bán cần có:</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-300 tracking-tight">{formatCurrency(result)} VND</p>
                            <button
                                onClick={handleResultCopy}
                                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-gray-600 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                aria-label="Sao chép số tiền"
                            >
                                {isResultCopied ? <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        {result < 0 && <p className="text-center text-sm text-red-600 dark:text-red-400 mt-2">Lưu ý: Giá trị âm có nghĩa là giá có thể giảm mà không cần thêm voucher của người bán.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};
