

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
            <label htmlFor={id} className="block text-sm font-semibold text-slate-900">{label}</label>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 sm:text-sm bg-white text-slate-900 placeholder-slate-400 font-medium transition-all duration-200"
                />
            </div>
        </div>
    )
);

interface CalculatorProps {
    selectedProduct: Product | null;
    dealListName: string;
    products: Product[];
    onProductSelect: (product: Product | null) => void;
}

const ALL_POSSIBLE_VOUCHERS = Array.from({ length: 19 }, (_, i) => i + 7); // 7 to 25

export const Calculator: React.FC<CalculatorProps> = ({ selectedProduct, dealListName, products, onProductSelect }) => {
    const [productId, setProductId] = useState('');
    const [exclusiveId, setExclusiveId] = useState('');
    const [productName, setProductName] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');
    const [desiredPrice, setDesiredPrice] = useState('');
    const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.Percentage);
    const [voucherValue, setVoucherValue] = useState('');
    const [result, setResult] = useState<number | null>(null);

    const voucherInputRef = useRef<HTMLInputElement>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isIdCopied, setIsIdCopied] = useState(false);
    const [isExclusiveIdCopied, setIsExclusiveIdCopied] = useState(false);
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
        if (selectedProduct) {
            setProductId(selectedProduct.id);
            setExclusiveId(selectedProduct.exclusiveId || '');
            setProductName(selectedProduct.name);
            setCurrentPrice(String(selectedProduct.displayPrice));
            setResult(null); // Reset result when a new product is selected
            setDesiredPrice(''); // Reset desired price on new product selection
        } else {
             setProductId('');
             setExclusiveId('');
             setProductName('');
             setCurrentPrice('');
             setDesiredPrice('');
             setVoucherValue('');
             setResult(null);
        }
    }, [selectedProduct]);

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);
    
    const handleProductNameChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setProductName(value);

        if (!value.trim()) {
            if (selectedProduct) {
                onProductSelect(null);
            }
            return;
        }

        const searchTerm = value.trim();
        const foundProduct = products.find(p => p.id === searchTerm || (p.exclusiveId && p.exclusiveId === searchTerm));
        
        if (foundProduct) {
            if (selectedProduct?.id !== foundProduct.id) {
                 onProductSelect(foundProduct);
            }
        }
    };


    const formattedTime = currentTime.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh'
    });

    const performCalculation = (
        currentPriceStr: string,
        desiredPriceStr: string,
        voucherValueStr: string,
        vType: VoucherType
    ): number | null => {
        const current = parseFloat(currentPriceStr);
        const desired = parseFloat(desiredPriceStr);
        const voucher = parseFloat(voucherValueStr);

        if (isNaN(current) || isNaN(desired)) {
            return null;
        }

        let sellerVoucher = 0;
        if (vType === VoucherType.Percentage) {
            if (isNaN(voucher) || voucher >= 100) {
                return null;
            }
            sellerVoucher = current - (desired / (1 - voucher / 100));
        } else {
            const platformVoucher = isNaN(voucher) ? 0 : voucher;
            sellerVoucher = current - desired - platformVoucher;
        }
        return sellerVoucher;
    };

    const handleCalculation = useCallback(() => {
        const calculationResult = performCalculation(currentPrice, desiredPrice, voucherValue, voucherType);
        setResult(calculationResult);
    }, [currentPrice, desiredPrice, voucherValue, voucherType]);

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

    const parseInput = (value: string): string => {
        return value.replace(/[^0-9]/g, '');
    };

    const desiredPriceValue = useMemo(() => {
        if (!desiredPrice) return '';
        const numericValue = parseInt(desiredPrice, 10);
        if (isNaN(numericValue)) return '';
    
        if (isQuickPriceInput && isDesiredPriceFocused) {
            return String(Math.round(numericValue / 1000));
        } else {
            return formatCurrencyForInput(desiredPrice);
        }
    }, [desiredPrice, isQuickPriceInput, isDesiredPriceFocused]);
    
    const handleDesiredPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const numericString = parseInput(rawValue);

        if (isQuickPriceInput) {
            const numericValue = parseInt(numericString, 10);
            if (isNaN(numericValue)) {
                setDesiredPrice('');
            } else {
                setDesiredPrice(String(numericValue * 1000));
            }
        } else {
            setDesiredPrice(numericString);
        }
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
                setTimeout(() => setIsCopied(false), 2000); 
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

    const handleExclusiveIdCopy = () => {
        if (exclusiveId) {
            navigator.clipboard.writeText(exclusiveId).then(() => {
                setIsExclusiveIdCopied(true);
                setTimeout(() => setIsExclusiveIdCopied(false), 2000);
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
                return prev.filter(v => v !== voucherValue);
            } else {
                return [...prev, voucherValue]; 
            }
        });
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 w-full h-full">
            <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <CalculatorIcon className="w-8 h-8 text-indigo-600 flex-shrink-0 mt-1" />
                     <div>
                        <h2 className="text-2xl font-bold text-slate-900">Công cụ tính giá</h2>
                        <p className="text-sm font-medium text-indigo-700 truncate" title={dealListName}>{dealListName}</p>
                    </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 bg-slate-100 px-6 py-3 rounded-lg flex-shrink-0">
                     <span>{formattedTime}</span>
                </div>
            </div>
            <div className="space-y-4">
                 <div>
                    <label htmlFor="productSearch" className="block text-sm font-semibold text-slate-900">Sản phẩm đang chọn</label>
                    <textarea
                        id="productSearch"
                        value={productName}
                        onChange={handleProductNameChange}
                        placeholder="Chọn một sản phẩm từ bảng hoặc dán ID vào đây..."
                        className="mt-1 w-full p-3 border border-slate-300 rounded-lg shadow-sm bg-white text-slate-900 sm:text-sm resize-y min-h-[60px] h-[60px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all duration-200"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 -mt-2">
                    {productId && (
                        <div>
                            <label htmlFor="selectedProductId" className="block text-xs font-medium text-slate-800">ID Sản phẩm</label>
                            <div className="mt-1 flex items-center gap-2">
                                <input
                                    id="selectedProductId"
                                    type="text"
                                    readOnly
                                    value={productId}
                                    title={productId}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-900 sm:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-default"
                                />
                                <button
                                    onClick={handleIdCopy}
                                    className="p-2 rounded-md text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-shrink-0"
                                    aria-label="Sao chép ID sản phẩm"
                                >
                                    {isIdCopied ? <CheckIcon className="w-5 h-5 text-green-600" /> : <CopyIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    )}
                    {exclusiveId && (
                         <div>
                            <label htmlFor="selectedExclusiveId" className="block text-xs font-medium text-purple-800">ID Độc quyền</label>
                            <div className="mt-1 flex items-center gap-2">
                                <input
                                    id="selectedExclusiveId"
                                    type="text"
                                    readOnly
                                    value={exclusiveId}
                                    title={exclusiveId}
                                    className="w-full px-3 py-1.5 border border-purple-200 rounded-lg bg-purple-50 text-purple-900 sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-300 cursor-default"
                                />
                                <button
                                    onClick={handleExclusiveIdCopy}
                                    className="p-2 rounded-md text-purple-700 hover:bg-purple-100 hover:text-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex-shrink-0"
                                    aria-label="Sao chép ID độc quyền"
                                >
                                    {isExclusiveIdCopied ? <CheckIcon className="w-5 h-5 text-green-600" /> : <CopyIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
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
                <div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="desiredPrice" className="block text-sm font-semibold text-slate-900">Giá cuối cùng mong muốn</label>
                        <label htmlFor="quick-price-toggle" className="flex items-center cursor-pointer">
                            <span className="text-xs font-medium text-slate-800 mr-2">Nhập nhanh (x1000)</span>
                            <div className="relative">
                                <input
                                    id="quick-price-toggle"
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isQuickPriceInput}
                                    onChange={() => setIsQuickPriceInput(!isQuickPriceInput)}
                                />
                                <div className="w-10 h-6 bg-slate-300 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
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
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 sm:text-sm bg-white text-slate-900 placeholder-slate-400 font-medium transition-all duration-200"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-900">Loại Voucher</label>
                    <div className="mt-2 flex gap-4">
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" value={VoucherType.Percentage} checked={voucherType === VoucherType.Percentage} onChange={() => setVoucherType(VoucherType.Percentage)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300" />
                            <span className="ml-2 text-sm text-slate-900">Phần trăm (%)</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" value={VoucherType.Fixed} checked={voucherType === VoucherType.Fixed} onChange={() => setVoucherType(VoucherType.Fixed)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300" />
                            <span className="ml-2 text-sm text-slate-900">Số tiền cố định</span>
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
                            <p className="text-xs text-slate-700">Hoặc chọn nhanh voucher thường dùng:</p>
                            <button onClick={toggleSettings} className="text-slate-700 hover:text-indigo-600 p-1 rounded-full hover:bg-slate-100" aria-label="Cài đặt voucher nhanh">
                                <CogIcon className="w-5 h-5" />
                            </button>
                        </div>
                         {isSettingsOpen && (
                            <div className="p-3 bg-slate-50 rounded-md border mb-3 transition-all duration-300 ease-in-out">
                                <p className="text-sm font-medium text-slate-900 block mb-3">Chọn voucher để hiển thị:</p>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
                                    {ALL_POSSIBLE_VOUCHERS.map((val) => (
                                        <label key={val} className="flex items-center justify-center gap-2 p-2 rounded-md hover:bg-slate-200 cursor-pointer text-sm text-slate-900">
                                            <input
                                                type="checkbox"
                                                checked={tempSelectedPresets.includes(val)}
                                                onChange={() => handlePresetSelectionChange(val)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
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
                        <p className="text-sm font-semibold text-indigo-800 text-center">Voucher người bán cần có:</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <p className="text-4xl font-bold text-indigo-600 tracking-tight">{formatCurrency(result)} VND</p>
                             <button
                                onClick={handleCopy}
                                className="p-2 rounded-full text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
