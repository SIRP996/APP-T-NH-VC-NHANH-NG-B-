
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Product, VoucherType } from '../types';
import { CalculatorIcon, CogIcon, CopyIcon, CheckIcon } from './Icons';

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return "0";
    return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

interface InputFieldProps {
    label?: string; // Made optional since we might render label externally
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    suffix?: React.ReactNode;
    className?: string;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
    ({ label, id, value, onChange, placeholder, type = "text", onKeyDown, onFocus, onBlur, suffix, className }, ref) => (
        <div className={`group ${className}`}>
            {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">{label}</label>}
            <div className="relative transition-all duration-200">
                <input
                    ref={ref}
                    type={type}
                    id={id}
                    value={value}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="block w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-semibold shadow-sm placeholder:text-slate-400 placeholder:font-normal hover:border-indigo-200"
                />
                {suffix && <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">{suffix}</div>}
            </div>
        </div>
    )
);

interface CalculatorProps {
    selectedProduct: Product | null;
    dealListName: string;
    products: Product[];
    onProductSelect: (product: Product | null) => void;
    onFocusSearch?: () => void;
}

interface HistoryItem {
    id: number;
    productName: string;
    desiredPrice: number;
    result: number;
    timestamp: Date;
}

const ALL_POSSIBLE_VOUCHERS = Array.from({ length: 19 }, (_, i) => i + 7); // 7 to 25

export const Calculator: React.FC<CalculatorProps> = ({ selectedProduct, dealListName, products, onProductSelect, onFocusSearch }) => {
    const [productId, setProductId] = useState('');
    const [exclusiveId, setExclusiveId] = useState('');
    const [productName, setProductName] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');
    const [desiredPrice, setDesiredPrice] = useState('');
    const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.Percentage);
    const [voucherValue, setVoucherValue] = useState('');
    
    // New states for conditional vouchers
    const [minOrderValue, setMinOrderValue] = useState('');
    const [maxDiscountValue, setMaxDiscountValue] = useState('');

    const [result, setResult] = useState<number | null>(null);
    const [appliedPlatformDiscount, setAppliedPlatformDiscount] = useState<number>(0); // To show user how much platform actually paid
    
    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const voucherInputRef = useRef<HTMLInputElement>(null);
    const desiredPriceInputRef = useRef<HTMLInputElement>(null);

    const [isCopied, setIsCopied] = useState(false);
    const [isIdCopied, setIsIdCopied] = useState(false);
    const [isExclusiveIdCopied, setIsExclusiveIdCopied] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Quick Input States
    const [isQuickPriceInput, setIsQuickPriceInput] = useState(true);
    const [isDesiredPriceFocused, setIsDesiredPriceFocused] = useState(false);
    const [isMinOrderFocused, setIsMinOrderFocused] = useState(false);
    const [isMaxDiscountFocused, setIsMaxDiscountFocused] = useState(false);


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
            setResult(null); 
            setDesiredPrice(''); 
            setAppliedPlatformDiscount(0);
            
            // Auto-focus desired price input when product is selected
            setTimeout(() => {
                desiredPriceInputRef.current?.focus();
            }, 50);
        } else {
             setProductId('');
             setExclusiveId('');
             setProductName('');
             setCurrentPrice('');
             setDesiredPrice('');
             setVoucherValue('');
             setResult(null);
             setAppliedPlatformDiscount(0);
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
        vType: VoucherType,
        minOrderStr: string,
        maxDiscountStr: string
    ): { sellerVoucher: number | null, platformContribution: number } => {
        const current = parseFloat(currentPriceStr);
        const desired = parseFloat(desiredPriceStr);
        const voucher = parseFloat(voucherValueStr);
        const minOrder = minOrderStr ? parseFloat(minOrderStr) : 0;
        const maxDiscount = maxDiscountStr ? parseFloat(maxDiscountStr) : Infinity;

        if (isNaN(current) || isNaN(desired)) {
            return { sellerVoucher: null, platformContribution: 0 };
        }

        let sellerVoucher = 0;
        let platformContribution = 0;

        if (vType === VoucherType.Percentage) {
            if (isNaN(voucher) || voucher >= 100) {
                return { sellerVoucher: null, platformContribution: 0 };
            }

            const voucherPercent = voucher / 100;
            let priceAfterSeller = desired / (1 - voucherPercent);
            let calculatedDiscount = priceAfterSeller * voucherPercent;

            if (calculatedDiscount > maxDiscount) {
                priceAfterSeller = desired + maxDiscount;
                calculatedDiscount = maxDiscount; 
            }

            if (priceAfterSeller < minOrder) {
                platformContribution = 0;
                priceAfterSeller = desired; 
                sellerVoucher = current - desired;
            } else {
                platformContribution = calculatedDiscount;
                sellerVoucher = current - priceAfterSeller;
            }

        } else {
            const platformVoucher = isNaN(voucher) ? 0 : voucher;
            
            if ((desired + platformVoucher) < minOrder) {
                 platformContribution = 0;
                 sellerVoucher = current - desired;
            } else {
                 platformContribution = platformVoucher;
                 sellerVoucher = current - desired - platformVoucher;
            }
        }

        return { sellerVoucher, platformContribution };
    };

    const handleCalculation = useCallback(() => {
        const desired = parseFloat(desiredPrice);
        const { sellerVoucher, platformContribution } = performCalculation(
            currentPrice, 
            desiredPrice, 
            voucherValue, 
            voucherType,
            minOrderValue.replace(/[^0-9]/g, ''),
            maxDiscountValue.replace(/[^0-9]/g, '')
        );
        setResult(sellerVoucher);
        setAppliedPlatformDiscount(platformContribution);

        if (sellerVoucher !== null && !isNaN(sellerVoucher) && !isNaN(desired)) {
            setHistory(prev => {
                const newItem: HistoryItem = {
                    id: Date.now(),
                    productName: productName || 'Sản phẩm không tên',
                    desiredPrice: desired,
                    result: sellerVoucher,
                    timestamp: new Date()
                };
                return [newItem, ...prev].slice(0, 5);
            });
        }

    }, [currentPrice, desiredPrice, voucherValue, voucherType, minOrderValue, maxDiscountValue, productName]);

    const handlePresetClick = (val: number) => {
        const newVoucherStr = String(val);
        setVoucherValue(newVoucherStr); 
        const { sellerVoucher, platformContribution } = performCalculation(
            currentPrice, 
            desiredPrice, 
            newVoucherStr, 
            VoucherType.Percentage,
            minOrderValue.replace(/[^0-9]/g, ''),
            maxDiscountValue.replace(/[^0-9]/g, '')
        );
        setResult(sellerVoucher);
        setAppliedPlatformDiscount(platformContribution);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleCalculation();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            onFocusSearch && onFocusSearch();
        }
    };

    const handleDesiredPriceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleCalculation();
        } else if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            voucherInputRef.current?.focus();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            onFocusSearch && onFocusSearch();
        }
    };
    
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    };


    const formatCurrencyForInput = (value: string): string => {
        if (!value) return '';
        const number = parseInt(value.replace(/[^0-9]/g, ''), 10);
        return isNaN(number) ? '' : new Intl.NumberFormat('en-US').format(number);
    };

    const parseInput = (value: string): string => {
        return value.replace(/[^0-9]/g, '');
    };

    // --- Quick Input Handlers & Memoized Values ---

    // 1. Desired Price Logic
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

    // 2. Min Order Logic
    const minOrderDisplayValue = useMemo(() => {
        if (!minOrderValue) return '';
        const numericValue = parseInt(minOrderValue, 10);
        if (isNaN(numericValue)) return '';
    
        if (isQuickPriceInput && isMinOrderFocused) {
            return String(Math.round(numericValue / 1000));
        } else {
            return formatCurrencyForInput(minOrderValue);
        }
    }, [minOrderValue, isQuickPriceInput, isMinOrderFocused]);

    const handleMinOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const numericString = parseInput(rawValue);

        if (isQuickPriceInput) {
            const numericValue = parseInt(numericString, 10);
            if (isNaN(numericValue)) {
                setMinOrderValue('');
            } else {
                setMinOrderValue(String(numericValue * 1000));
            }
        } else {
            setMinOrderValue(numericString);
        }
    };

    // 3. Max Discount Logic
    const maxDiscountDisplayValue = useMemo(() => {
        if (!maxDiscountValue) return '';
        const numericValue = parseInt(maxDiscountValue, 10);
        if (isNaN(numericValue)) return '';
    
        if (isQuickPriceInput && isMaxDiscountFocused) {
            return String(Math.round(numericValue / 1000));
        } else {
            return formatCurrencyForInput(maxDiscountValue);
        }
    }, [maxDiscountValue, isQuickPriceInput, isMaxDiscountFocused]);

    const handleMaxDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const numericString = parseInput(rawValue);

        if (isQuickPriceInput) {
            const numericValue = parseInt(numericString, 10);
            if (isNaN(numericValue)) {
                setMaxDiscountValue('');
            } else {
                setMaxDiscountValue(String(numericValue * 1000));
            }
        } else {
            setMaxDiscountValue(numericString);
        }
    };


    const handleCopyResult = () => {
        if (result !== null) {
            const textToCopy = String(Math.round(result));
            navigator.clipboard.writeText(textToCopy).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            });
        }
    };
     const handleCopyId = () => {
        if (productId) {
            navigator.clipboard.writeText(productId).then(() => {
                setIsIdCopied(true);
                setTimeout(() => setIsIdCopied(false), 2000);
            });
        }
    };

    const handleCopyExclusiveId = () => {
        if (exclusiveId) {
            navigator.clipboard.writeText(exclusiveId).then(() => {
                setIsExclusiveIdCopied(true);
                setTimeout(() => setIsExclusiveIdCopied(false), 2000);
            });
        }
    };

    const toggleSettings = () => setIsSettingsOpen(!isSettingsOpen);

    const handlePresetSelection = (voucher: number) => {
        setTempSelectedPresets(prev => {
            if (prev.includes(voucher)) {
                return prev.filter(v => v !== voucher);
            } else {
                if (prev.length >= 6) return prev; 
                return [...prev, voucher].sort((a, b) => a - b);
            }
        });
    };

    const savePresets = () => {
        setPresetVouchers(tempSelectedPresets);
        localStorage.setItem('presetVouchers', JSON.stringify(tempSelectedPresets));
        setIsSettingsOpen(false);
    };

    useEffect(() => {
        if (isSettingsOpen) {
            setTempSelectedPresets(presetVouchers);
        }
    }, [isSettingsOpen, presetVouchers]);


    return (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 h-full flex flex-col relative overflow-hidden">
             {/* Header Card */}
             <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
                        <CalculatorIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Tính giá nhanh</h2>
                        <p className="text-xs font-medium text-slate-500">{dealListName}</p>
                    </div>
                </div>
                {/* Clock - Resized to 1/2 of previous (text-3xl) */}
                <div className="bg-slate-100 px-4 py-2 rounded-2xl font-mono text-3xl font-black text-slate-700 tracking-widest">
                    {formattedTime}
                </div>
            </div>

            {/* SCROLLABLE BODY AREA */}
            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-5 pr-2 pb-2">
                
                 {/* Product Info Section */}
                 <div className="space-y-3">
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Sản phẩm đang chọn</label>
                        <textarea
                            value={productName}
                            onChange={handleProductNameChange}
                            placeholder="Chọn hoặc nhập ID..."
                            rows={2}
                            className="block w-full px-4 py-2.5 bg-slate-50 border-0 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium resize-y shadow-inner placeholder:text-slate-400 min-h-[80px]"
                        />
                    </div>
                     
                    {/* IDs Display */}
                    {(productId || exclusiveId) && (
                        <div className="flex gap-2">
                            {productId && (
                                <div 
                                    onClick={handleCopyId}
                                    className="flex-1 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 flex items-center justify-between cursor-pointer group hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                                >
                                    <div className="overflow-hidden">
                                         <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">ID Sản phẩm</span>
                                         <span className="text-xs font-bold text-slate-800 font-mono truncate block">{productId}</span>
                                    </div>
                                     {isIdCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />}
                                </div>
                            )}
                             {exclusiveId && (
                                <div 
                                    onClick={handleCopyExclusiveId}
                                    className="flex-1 bg-purple-50 rounded-xl px-3 py-2 border border-purple-100 flex items-center justify-between cursor-pointer group hover:border-purple-300 transition-all"
                                >
                                    <div className="overflow-hidden">
                                         <span className="text-[10px] font-semibold text-purple-500 block mb-0.5">ID Độc quyền</span>
                                         <span className="text-xs font-bold text-purple-800 font-mono truncate block">{exclusiveId}</span>
                                    </div>
                                     {isExclusiveIdCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4 text-purple-300 group-hover:text-purple-600" />}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <hr className="border-slate-100" />

                {/* Price Inputs */}
                <div className="space-y-4">
                    <InputField
                        label="Giá hiển thị"
                        id="currentPrice"
                        value={currentPrice ? formatCurrency(parseInt(currentPrice)) : ''}
                        onChange={(e) => setCurrentPrice(e.target.value.replace(/[^0-9]/g, ''))}
                        suffix={<span className="text-slate-400 text-xs font-medium">VND</span>}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                    />
                    
                    {/* Separated Logic for Desired Price */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                            <label htmlFor="desiredPrice" className="block text-sm font-medium text-slate-700">Giá cuối mong muốn</label>
                            
                            {/* Toggle Switch moved to Header */}
                            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsQuickPriceInput(!isQuickPriceInput)} title="Bật/Tắt nhập nhanh (x1000)">
                                 <span className={`text-xs font-semibold transition-colors ${isQuickPriceInput ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                    Nhập nhanh (x1000)
                                </span>
                                <div className={`w-9 h-5 rounded-full relative transition-colors ${isQuickPriceInput ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${isQuickPriceInput ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>

                        <InputField
                            ref={desiredPriceInputRef}
                            id="desiredPrice"
                            value={desiredPriceValue}
                            onChange={handleDesiredPriceChange}
                            onFocus={(e) => {
                                setIsDesiredPriceFocused(true);
                                handleInputFocus(e);
                            }}
                            onBlur={() => setIsDesiredPriceFocused(false)}
                            onKeyDown={handleDesiredPriceKeyDown}
                            placeholder={isQuickPriceInput ? "Ví dụ: 100 (sẽ là 100.000)" : "Nhập số tiền đầy đủ"}
                            suffix={<span className="text-slate-400 text-xs font-medium">VND</span>}
                            className="shadow-sm"
                        />
                    </div>
                </div>

                {/* Voucher Inputs */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-700 ml-1">Voucher sàn</label>
                         <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                            <button
                                onClick={() => setVoucherType(VoucherType.Percentage)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${voucherType === VoucherType.Percentage ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                %
                            </button>
                            <button
                                onClick={() => setVoucherType(VoucherType.Fixed)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${voucherType === VoucherType.Fixed ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                VND
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                         <input
                            ref={voucherInputRef}
                            type="number" 
                            value={voucherValue}
                            onChange={(e) => setVoucherType(VoucherType.Percentage) ? setVoucherValue(e.target.value) : setVoucherValue(e.target.value)} 
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                            placeholder={voucherType === VoucherType.Percentage ? "Nhập %" : "Nhập số tiền"}
                            className="block w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg font-bold shadow-sm text-center placeholder:text-slate-300"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                            {voucherType === VoucherType.Percentage ? '%' : ''}
                        </span>
                    </div>

                    {/* Conditional Voucher Fields (Min Order & Max Discount) */}
                    {voucherType === VoucherType.Percentage && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={minOrderDisplayValue}
                                    onChange={handleMinOrderChange}
                                    onFocus={(e) => { setIsMinOrderFocused(true); handleInputFocus(e); }}
                                    onBlur={() => setIsMinOrderFocused(false)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isQuickPriceInput ? "Đơn tối thiểu (x1k)" : "Đơn tối thiểu"}
                                    className="block w-full pl-3 pr-8 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-medium shadow-sm placeholder:text-slate-400"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold pointer-events-none">MIN</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={maxDiscountDisplayValue}
                                    onChange={handleMaxDiscountChange}
                                    onFocus={(e) => { setIsMaxDiscountFocused(true); handleInputFocus(e); }}
                                    onBlur={() => setIsMaxDiscountFocused(false)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isQuickPriceInput ? "Giảm tối đa (x1k)" : "Giảm tối đa"}
                                    className="block w-full pl-3 pr-8 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs font-medium shadow-sm placeholder:text-slate-400"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold pointer-events-none">MAX</span>
                            </div>
                        </div>
                    )}

                    {/* Preset Vouchers */}
                     {voucherType === VoucherType.Percentage && (
                        <div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-xs font-medium text-slate-500">Chọn nhanh</span>
                                <button onClick={toggleSettings} className="text-slate-400 hover:text-indigo-600 transition-colors"><CogIcon className="w-4 h-4" /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {presetVouchers.map(v => (
                                    <button
                                        key={v}
                                        onClick={() => handlePresetClick(v)}
                                        className={`flex-1 min-w-[3rem] py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                                            voucherValue === String(v) 
                                            ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm'
                                        }`}
                                    >
                                        {v}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* History Section */}
                {history.length > 0 && (
                    <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="flex items-center gap-2 mb-2 px-1 mt-2">
                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                            <span className="text-xs font-medium text-slate-500">Lịch sử tính toán</span>
                            <div className="h-px bg-slate-100 flex-grow"></div>
                         </div>
                         <div className="space-y-2">
                            {history.map((item) => (
                                <div 
                                    key={item.id}
                                    className="bg-slate-50 hover:bg-indigo-50/50 rounded-xl p-2.5 border border-slate-100 transition-colors flex justify-between items-center group cursor-pointer"
                                    onClick={() => {
                                         navigator.clipboard.writeText(String(Math.round(item.result)));
                                    }}
                                    title="Click để sao chép kết quả"
                                >
                                    <div className="flex-1 min-w-0 mr-3">
                                        <div className="text-xs font-medium text-slate-700 truncate">{item.productName}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <span>Mong muốn: {formatCurrency(item.desiredPrice)}</span>
                                            <span>•</span>
                                            <span>{item.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute:'2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div className="font-bold text-indigo-700 text-sm bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100 group-hover:border-indigo-200">
                                        {formatCurrency(item.result)}
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                )}

            </div>

             {/* Footer / Result (FIXED) */}
            <div className="mt-auto pt-4 border-t border-slate-100 flex-shrink-0 bg-white z-10">
                <button
                    onClick={handleCalculation}
                    className="w-full py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl font-bold text-base shadow-lg shadow-slate-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 mb-4"
                >
                    Tính giá
                </button>

                 {result !== null && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-1 shadow-lg shadow-indigo-200">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center relative overflow-hidden">
                                {/* Platform Contribution Info */}
                                {(minOrderValue || maxDiscountValue) && appliedPlatformDiscount > 0 && (
                                    <div className="mb-3 pb-3 border-b border-white/20 text-indigo-100 text-xs font-medium">
                                        <div className="flex justify-between items-center">
                                            <span>Voucher sàn tài trợ:</span>
                                            <span className="font-bold text-white">{formatCurrency(appliedPlatformDiscount)} đ</span>
                                        </div>
                                        {(parseFloat(maxDiscountValue.replace(/[^0-9]/g, '')) > 0 && appliedPlatformDiscount === parseFloat(maxDiscountValue.replace(/[^0-9]/g, ''))) && (
                                            <div className="text-[10px] text-yellow-300 mt-1 font-bold italic">⚠️ Đã chạm trần giảm tối đa</div>
                                        )}
                                    </div>
                                )}
                                {(minOrderValue || maxDiscountValue) && appliedPlatformDiscount === 0 && voucherType === VoucherType.Percentage && voucherValue && (
                                    <div className="mb-3 pb-3 border-b border-white/20 text-red-200 text-xs font-bold flex items-center justify-center gap-1">
                                        <span>⚠️ Không đủ điều kiện áp mã sàn</span>
                                    </div>
                                )}

                                <p className="text-indigo-100 text-xs font-semibold mb-1">Voucher người bán (VND)</p>
                                <div className="text-3xl font-bold text-white drop-shadow-sm tracking-tight">
                                    {formatCurrency(result)}
                                </div>
                                <button 
                                    onClick={handleCopyResult}
                                    className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-100 transition-colors"
                                    title="Sao chép kết quả"
                                >
                                     {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

             {/* Settings Modal */}
             {isSettingsOpen && (
                <div className="absolute inset-0 bg-white z-50 p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-lg text-slate-900">Cài đặt phím tắt %</h3>
                         <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                         </button>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">Chọn tối đa 6 mức phần trăm thường dùng:</p>
                    <div className="grid grid-cols-4 gap-3 mb-auto">
                        {ALL_POSSIBLE_VOUCHERS.map(v => (
                            <button
                                key={v}
                                onClick={() => handlePresetSelection(v)}
                                className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                                    tempSelectedPresets.includes(v)
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                }`}
                            >
                                {v}%
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={savePresets}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                    >
                        Lưu cài đặt
                    </button>
                </div>
            )}
        </div>
    );
};
