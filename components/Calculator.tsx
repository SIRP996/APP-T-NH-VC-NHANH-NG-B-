import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Product, VoucherType } from '../types';
import { CalculatorIcon, CogIcon, CopyIcon, CheckIcon } from './Icons';

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return "0";
    return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

interface InputFieldProps {
    label?: string;
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
            {label && <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{label}</label>}
            <div className="relative transition-all duration-300">
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
                    className="block w-full px-4 py-3 glass-input rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm font-mono font-medium shadow-sm placeholder:text-slate-600 hover:border-primary-500/40 hover:shadow-glow-hover hover:bg-slate-900/80"
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
    presetVouchers: number[];
    onSavePresets: (presets: number[]) => void;
}

interface HistoryItem {
    id: number;
    productName: string;
    desiredPrice: number;
    result: number;
    timestamp: Date;
}

const ALL_POSSIBLE_VOUCHERS = Array.from({ length: 19 }, (_, i) => i + 7); // 7 to 25

export const Calculator: React.FC<CalculatorProps> = ({ 
    selectedProduct, 
    dealListName, 
    products, 
    onProductSelect, 
    onFocusSearch,
    presetVouchers,
    onSavePresets
}) => {
    const [productId, setProductId] = useState('');
    const [exclusiveId, setExclusiveId] = useState('');
    const [productName, setProductName] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');
    const [desiredPrice, setDesiredPrice] = useState('');
    const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.Percentage);
    const [voucherValue, setVoucherValue] = useState('');
    
    const [minOrderValue, setMinOrderValue] = useState('');
    const [maxDiscountValue, setMaxDiscountValue] = useState('');

    const [result, setResult] = useState<number | null>(null);
    const [appliedPlatformDiscount, setAppliedPlatformDiscount] = useState<number>(0); 
    
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const voucherInputRef = useRef<HTMLInputElement>(null);
    const desiredPriceInputRef = useRef<HTMLInputElement>(null);

    const [isCopied, setIsCopied] = useState(false);
    const [isIdCopied, setIsIdCopied] = useState(false);
    const [isExclusiveIdCopied, setIsExclusiveIdCopied] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    const [isQuickPriceInput, setIsQuickPriceInput] = useState(true);
    const [isDesiredPriceFocused, setIsDesiredPriceFocused] = useState(false);
    const [isVoucherFocused, setIsVoucherFocused] = useState(false);
    const [isMinOrderFocused, setIsMinOrderFocused] = useState(false);
    const [isMaxDiscountFocused, setIsMaxDiscountFocused] = useState(false);

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
                return [newItem, ...prev].slice(5);
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

    const voucherDisplayValue = useMemo(() => {
        if (!voucherValue) return '';
        if (voucherType === VoucherType.Percentage) {
            return voucherValue;
        }
        const numericValue = parseInt(voucherValue, 10);
        if (isNaN(numericValue)) return '';

        if (isQuickPriceInput && isVoucherFocused) {
            return String(Math.round(numericValue / 1000));
        } else {
            return formatCurrencyForInput(voucherValue);
        }
    }, [voucherValue, voucherType, isQuickPriceInput, isVoucherFocused]);

    const handleVoucherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const numericString = parseInput(rawValue);

        if (voucherType === VoucherType.Percentage) {
            setVoucherValue(numericString);
        } else {
            if (isQuickPriceInput) {
                const numericValue = parseInt(numericString, 10);
                if (isNaN(numericValue)) {
                    setVoucherValue('');
                } else {
                    setVoucherValue(String(numericValue * 1000));
                }
            } else {
                setVoucherValue(numericString);
            }
        }
    };

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
        onSavePresets(tempSelectedPresets);
        setIsSettingsOpen(false);
    };

    useEffect(() => {
        if (isSettingsOpen) {
            setTempSelectedPresets(presetVouchers);
        }
    }, [isSettingsOpen, presetVouchers]);


    return (
        <div className="h-full flex flex-col relative overflow-hidden p-6">
             {/* Header Card */}
             <div className="flex justify-between items-center mb-6 flex-shrink-0 border-b border-slate-800/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary-500/20 rounded-xl border border-primary-500/20">
                        <CalculatorIcon className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-100 tracking-tight leading-tight">Tính giá nhanh</h2>
                        <p className="text-xs font-mono text-slate-500">{dealListName}</p>
                    </div>
                </div>
                {/* Clock */}
                <div className="glass-input px-3 py-1.5 rounded-lg font-mono text-lg font-bold text-primary-300 tracking-widest shadow-inner">
                    {formattedTime}
                </div>
            </div>

            {/* SCROLLABLE BODY AREA */}
            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-5 pr-1 pb-2">
                
                 {/* Product Info Section */}
                 <div className="space-y-3">
                    <div className="relative">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">Sản phẩm đang chọn</label>
                        <textarea
                            value={productName}
                            onChange={handleProductNameChange}
                            placeholder="Chọn hoặc nhập tên..."
                            rows={2}
                            className="block w-full px-4 py-3 glass-input rounded-xl focus:ring-2 focus:ring-primary-500/50 transition-all text-sm font-medium resize-y shadow-inner placeholder:text-slate-600 min-h-[80px] hover:border-primary-500/40 hover:shadow-glow-hover hover:bg-slate-900/80"
                        />
                    </div>
                     
                    {/* IDs Display */}
                    {(productId || exclusiveId) && (
                        <div className="flex gap-2">
                            {productId && (
                                <div 
                                    onClick={handleCopyId}
                                    className="flex-1 bg-slate-900/50 rounded-xl px-3 py-2 border border-slate-700 flex items-center justify-between cursor-pointer group hover:border-primary-500/50 hover:bg-primary-900/10 transition-all hover:shadow-glow-hover"
                                >
                                    <div className="overflow-hidden">
                                         <span className="text-[10px] font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">ID Sản phẩm</span>
                                         <span className="text-xs font-mono font-bold text-slate-200 truncate block">{productId}</span>
                                    </div>
                                     {isIdCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4 text-slate-600 group-hover:text-primary-400" />}
                                </div>
                            )}
                             {exclusiveId && (
                                <div 
                                    onClick={handleCopyExclusiveId}
                                    className="flex-1 bg-secondary-900/10 rounded-xl px-3 py-2 border border-secondary-500/20 flex items-center justify-between cursor-pointer group hover:border-secondary-500/50 hover:bg-secondary-900/20 transition-all hover:shadow-glow-hover"
                                >
                                    <div className="overflow-hidden">
                                         <span className="text-[10px] font-bold text-secondary-400 block mb-0.5 uppercase tracking-wider">ID Độc quyền</span>
                                         <span className="text-xs font-mono font-bold text-secondary-200 truncate block">{exclusiveId}</span>
                                    </div>
                                     {isExclusiveIdCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4 text-secondary-600 group-hover:text-secondary-400" />}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-px bg-slate-800/50 w-full"></div>

                {/* Price Inputs */}
                <div className="space-y-4">
                    <InputField
                        label="Giá hiển thị"
                        id="currentPrice"
                        value={currentPrice ? formatCurrency(parseInt(currentPrice)) : ''}
                        onChange={(e) => setCurrentPrice(e.target.value.replace(/[^0-9]/g, ''))}
                        suffix={<span className="text-slate-500 text-xs font-bold font-mono">VND</span>}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                    />
                    
                    {/* Separated Logic for Desired Price */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                            <label htmlFor="desiredPrice" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Giá cuối mong muốn</label>
                            
                            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsQuickPriceInput(!isQuickPriceInput)} title="Bật/Tắt nhập nhanh (x1000)">
                                 <span className={`text-[10px] uppercase font-bold transition-colors ${isQuickPriceInput ? 'text-primary-400' : 'text-slate-600 group-hover:text-slate-500'}`}>
                                    x1000
                                </span>
                                <div className={`w-7 h-3.5 rounded-full relative transition-colors ${isQuickPriceInput ? 'bg-primary-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all ${isQuickPriceInput ? 'left-4' : 'left-0.5'}`} />
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
                            placeholder={isQuickPriceInput ? "100 -> 100.000" : "Nhập số tiền"}
                            suffix={<span className="text-slate-500 text-xs font-bold font-mono">VND</span>}
                            className="shadow-sm"
                        />
                    </div>
                </div>

                {/* Voucher Inputs */}
                <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wide">Voucher sàn</label>
                         <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                            <button
                                onClick={() => setVoucherType(VoucherType.Percentage)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${voucherType === VoucherType.Percentage ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                %
                            </button>
                            <button
                                onClick={() => setVoucherType(VoucherType.Fixed)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${voucherType === VoucherType.Fixed ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                VND
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                         <input
                            ref={voucherInputRef}
                            type="text" 
                            value={voucherDisplayValue}
                            onChange={handleVoucherChange} 
                            onKeyDown={handleKeyDown}
                            onFocus={(e) => { setIsVoucherFocused(true); handleInputFocus(e); }}
                            onBlur={() => setIsVoucherFocused(false)}
                            placeholder={voucherType === VoucherType.Percentage ? "Nhập %" : (isQuickPriceInput ? "Nhập số tiền (x1000)" : "Nhập số tiền")}
                            className="block w-full px-4 py-3 bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-lg font-bold font-mono shadow-sm text-center placeholder:text-slate-700 hover:border-primary-500/40 hover:shadow-glow-hover hover:bg-slate-900/80"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">
                            {voucherType === VoucherType.Percentage ? '%' : 'VND'}
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
                                    placeholder="Min (x1k)"
                                    className="block w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:ring-1 focus:ring-primary-500 text-xs font-mono shadow-sm placeholder:text-slate-700 hover:border-primary-400 hover:shadow-glow-hover hover:bg-slate-900/80 transition-all"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 text-[9px] font-bold pointer-events-none">MIN</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={maxDiscountDisplayValue}
                                    onChange={handleMaxDiscountChange}
                                    onFocus={(e) => { setIsMaxDiscountFocused(true); handleInputFocus(e); }}
                                    onBlur={() => setIsMaxDiscountFocused(false)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Max (x1k)"
                                    className="block w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:ring-1 focus:ring-primary-500 text-xs font-mono shadow-sm placeholder:text-slate-700 hover:border-primary-400 hover:shadow-glow-hover hover:bg-slate-900/80 transition-all"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 text-[9px] font-bold pointer-events-none">MAX</span>
                            </div>
                        </div>
                    )}

                    {/* Preset Vouchers */}
                     {voucherType === VoucherType.Percentage && (
                        <div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Chọn nhanh</span>
                                <button onClick={toggleSettings} className="text-slate-600 hover:text-primary-400 transition-colors"><CogIcon className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {presetVouchers.map(v => (
                                    <button
                                        key={v}
                                        onClick={() => handlePresetClick(v)}
                                        className={`flex-1 min-w-[2.5rem] py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 font-mono ${
                                            voucherValue === String(v) 
                                            ? 'bg-primary-600 text-white border-primary-500 shadow-glow-sm' 
                                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-primary-500/50 hover:text-primary-300 hover:bg-primary-900/20 hover:shadow-glow-hover'
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
                            <div className="w-1 h-1 rounded-full bg-primary-500"></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Lịch sử</span>
                            <div className="h-px bg-slate-800 flex-grow"></div>
                         </div>
                         <div className="space-y-2">
                            {history.map((item) => (
                                <div 
                                    key={item.id}
                                    className="bg-slate-900/40 hover:bg-slate-800/60 rounded-xl p-2.5 border border-white/5 transition-all flex justify-between items-center group cursor-pointer hover:shadow-glow-hover hover:border-primary-500/30"
                                    onClick={() => {
                                         navigator.clipboard.writeText(String(Math.round(item.result)));
                                    }}
                                    title="Click để sao chép kết quả"
                                >
                                    <div className="flex-1 min-w-0 mr-3">
                                        <div className="text-xs font-medium text-slate-300 truncate">{item.productName}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                            <span>Mong muốn: {formatCurrency(item.desiredPrice)}</span>
                                            <span className="text-slate-700">•</span>
                                            <span>{item.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute:'2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div className="font-bold font-mono text-primary-300 text-sm bg-primary-500/10 px-2 py-1 rounded-lg border border-primary-500/20 group-hover:border-primary-500/40">
                                        {formatCurrency(item.result)}
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                )}

            </div>

             {/* Footer / Result */}
            <div className="mt-auto pt-4 border-t border-slate-800 flex-shrink-0 z-10 -mx-6 -mb-6 px-6 pb-6 bg-[#0f172a]">
                <button
                    onClick={handleCalculation}
                    className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-base shadow-lg shadow-primary-900/30 hover:shadow-glow-hover hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 mb-4"
                >
                    Tính giá ngay
                </button>

                 {result !== null && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-gradient-to-br from-primary-600 via-secondary-600 to-primary-600 rounded-2xl p-[1px] shadow-2xl shadow-primary-900/50">
                            <div className="bg-slate-950/90 backdrop-blur-md rounded-[15px] p-5 relative overflow-hidden">
                                {/* Glow */}
                                <div className="absolute top-[-50%] right-[-50%] w-full h-full bg-primary-500/20 blur-3xl rounded-full"></div>
                                
                                <div className="relative z-10">
                                    {/* Platform Contribution Info */}
                                    {(minOrderValue || maxDiscountValue) && appliedPlatformDiscount > 0 && (
                                        <div className="mb-3 pb-3 border-b border-white/10 text-primary-200 text-xs font-medium flex justify-between items-center">
                                            <span>Sàn tài trợ</span>
                                            <span className="font-bold font-mono text-white text-sm bg-white/10 px-2 py-0.5 rounded border border-white/5">{formatCurrency(appliedPlatformDiscount)}</span>
                                        </div>
                                    )}
                                     {(parseFloat(maxDiscountValue.replace(/[^0-9]/g, '')) > 0 && appliedPlatformDiscount === parseFloat(maxDiscountValue.replace(/[^0-9]/g, ''))) && (
                                        <div className="text-[10px] text-yellow-500 mb-2 font-bold flex items-center gap-1">
                                            <span>⚠️</span> Đã chạm trần giảm tối đa
                                        </div>
                                    )}

                                    {(minOrderValue || maxDiscountValue) && appliedPlatformDiscount === 0 && voucherType === VoucherType.Percentage && voucherValue && (
                                        <div className="mb-3 pb-3 border-b border-white/10 text-red-400 text-xs font-bold flex items-center gap-1">
                                            <span>⚠️</span> Không đủ điều kiện áp mã sàn
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Voucher người bán</p>
                                            <div className="text-3xl font-black font-mono text-white tracking-tight">
                                                {formatCurrency(result)} <span className="text-lg text-slate-500 font-medium">đ</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleCopyResult}
                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 mb-1 shrink-0"
                                            title="Sao chép kết quả"
                                        >
                                             {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5 text-slate-300" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

             {/* Settings Modal */}
             {isSettingsOpen && (
                <div className="absolute inset-0 bg-slate-900 z-50 p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col rounded-3xl border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-lg text-white">Cài đặt phím tắt %</h3>
                         <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                         </button>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">Chọn tối đa 6 mức phần trăm thường dùng:</p>
                    <div className="grid grid-cols-4 gap-3 mb-auto">
                        {ALL_POSSIBLE_VOUCHERS.map(v => (
                            <button
                                key={v}
                                onClick={() => handlePresetSelection(v)}
                                className={`py-3 rounded-xl text-sm font-bold border transition-all font-mono ${
                                    tempSelectedPresets.includes(v)
                                    ? 'bg-primary-600 text-white border-primary-500 shadow-glow-sm'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-primary-500/50 hover:text-primary-300 hover:bg-primary-900/20 hover:shadow-glow-hover'
                                }`}
                            >
                                {v}%
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={savePresets}
                        className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all shadow-lg"
                    >
                        Lưu cài đặt
                    </button>
                </div>
            )}
        </div>
    );
};