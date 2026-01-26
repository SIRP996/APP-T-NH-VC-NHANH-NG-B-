
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Product, VoucherType } from '../types';
import { CalculatorIcon, CogIcon, CopyIcon, CheckIcon, LockClosedIcon, Square2StackIcon, ClockIcon, IdentificationIcon, ClipboardDocumentListIcon } from './Icons';

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
    readOnly?: boolean;
    disabled?: boolean;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
    ({ label, id, value, onChange, placeholder, type = "text", onKeyDown, onFocus, onBlur, suffix, className, readOnly, disabled }, ref) => (
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
                    readOnly={readOnly}
                    disabled={disabled}
                    autoComplete="off"
                    className={`block w-full px-4 py-3 glass-input rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm font-mono font-medium shadow-sm placeholder:text-slate-600 hover:border-primary-500/40 hover:shadow-glow-hover hover:bg-slate-900/80 ${readOnly || disabled ? 'bg-slate-900/50 text-slate-400 cursor-not-allowed border-slate-800' : ''}`}
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
    resultNormal: number | null;
    resultVip: number | null;
    timestamp: Date;
}

const ALL_POSSIBLE_VOUCHERS = Array.from({ length: 19 }, (_, i) => i + 7); // 7 to 25

const getRoundedTime = (date: Date): string => {
    const seconds = date.getSeconds();
    const newDate = new Date(date);
    // Logic: Seconds >= 10 moves to next minute. Seconds < 10 stays at current minute.
    if (seconds >= 10) {
        newDate.setMinutes(newDate.getMinutes() + 1);
    }
    return newDate.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

type VoucherSection = 'normal' | 'vip';

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
    
    // Config States - Normal
    const [voucherNormal, setVoucherNormal] = useState('');
    const [minNormal, setMinNormal] = useState('');
    const [maxNormal, setMaxNormal] = useState('');
    
    // Config States - VIP
    const [voucherVip, setVoucherVip] = useState('');
    const [minVip, setMinVip] = useState('');
    const [maxVip, setMaxVip] = useState('');

    const [activeSection, setActiveSection] = useState<VoucherSection>('normal');

    const [resultNormal, setResultNormal] = useState<number | null>(null);
    const [platformDiscNormal, setPlatformDiscNormal] = useState<number>(0);
    
    const [resultVip, setResultVip] = useState<number | null>(null);
    const [platformDiscVip, setPlatformDiscVip] = useState<number>(0);

    const [history, setHistory] = useState<HistoryItem[]>([]);

    const desiredPriceInputRef = useRef<HTMLInputElement>(null);
    const voucherNormalRef = useRef<HTMLInputElement>(null);
    const voucherVipRef = useRef<HTMLInputElement>(null);
    
    const prevProductIdRef = useRef<string | null>(null);

    const [isCopiedNormal, setIsCopiedNormal] = useState(false);
    const [isCopiedVip, setIsCopiedVip] = useState(false);
    const [isIdCopied, setIsIdCopied] = useState(false);
    const [isExclusiveIdCopied, setIsExclusiveIdCopied] = useState(false);
    const [isTimeCopied, setIsTimeCopied] = useState(false);
    
    const [isCopyAllNormal, setIsCopyAllNormal] = useState(false);
    const [isCopyAllVip, setIsCopyAllVip] = useState(false);
    
    const [currentTime, setCurrentTime] = useState(new Date());
    
    const [isQuickPriceInput, setIsQuickPriceInput] = useState(true);
    
    const [useFinalPrice, setUseFinalPrice] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('calculator_useFinalPrice') === 'true';
        }
        return false;
    });

    const [isDesiredPriceFocused, setIsDesiredPriceFocused] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tempSelectedPresets, setTempSelectedPresets] = useState<number[]>([]);
    
    const handleToggleFinalPrice = () => {
        const newState = !useFinalPrice;
        setUseFinalPrice(newState);
        localStorage.setItem('calculator_useFinalPrice', String(newState));
    };

    useEffect(() => {
        if (selectedProduct) {
            const isNewProduct = prevProductIdRef.current !== selectedProduct.id;
            
            if (isNewProduct) {
                setProductId(selectedProduct.id);
                setExclusiveId(selectedProduct.exclusiveId || '');
                setProductName(selectedProduct.name);
                setCurrentPrice(String(selectedProduct.displayPrice));
                setResultNormal(null);
                setResultVip(null);
                setPlatformDiscNormal(0);
                setPlatformDiscVip(0);
            }
            
            if (useFinalPrice) {
                if (selectedProduct.finalPrice) {
                    const rawFinal = String(selectedProduct.finalPrice).replace(/[^0-9]/g, '');
                    setDesiredPrice(rawFinal);
                } else {
                    if (isNewProduct) setDesiredPrice('');
                }

                if (isNewProduct) {
                    setTimeout(() => {
                        // Focus on the active section's voucher input
                        if (activeSection === 'normal') {
                            voucherNormalRef.current?.focus();
                            voucherNormalRef.current?.select();
                        } else {
                            voucherVipRef.current?.focus();
                            voucherVipRef.current?.select();
                        }
                    }, 50);
                }

            } else {
                if (isNewProduct) {
                    setDesiredPrice('');
                    setTimeout(() => {
                        desiredPriceInputRef.current?.focus();
                    }, 50);
                }
            }
            
            prevProductIdRef.current = selectedProduct.id;

        } else {
             setProductId('');
             setExclusiveId('');
             setProductName('');
             setCurrentPrice('');
             setDesiredPrice('');
             setVoucherNormal('');
             setVoucherVip('');
             setResultNormal(null);
             setResultVip(null);
             prevProductIdRef.current = null;
        }
    }, [selectedProduct, useFinalPrice]); 

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

        let sellerVoucher = 0;
        let platformContribution = 0;

        if (priceAfterSeller < minOrder) {
            platformContribution = 0;
            priceAfterSeller = desired; 
            sellerVoucher = current - desired;
        } else {
            platformContribution = calculatedDiscount;
            sellerVoucher = current - priceAfterSeller;
        }

        return { sellerVoucher, platformContribution };
    };

    const handleCalculation = useCallback(() => {
        // Calculate Normal
        const normalResult = performCalculation(
            currentPrice, desiredPrice, voucherNormal, 
            minNormal.replace(/[^0-9]/g, ''), 
            maxNormal.replace(/[^0-9]/g, '')
        );
        setResultNormal(normalResult.sellerVoucher);
        setPlatformDiscNormal(normalResult.platformContribution);

        // Calculate VIP
        const vipResult = performCalculation(
            currentPrice, desiredPrice, voucherVip, 
            minVip.replace(/[^0-9]/g, ''), 
            maxVip.replace(/[^0-9]/g, '')
        );
        setResultVip(vipResult.sellerVoucher);
        setPlatformDiscVip(vipResult.platformContribution);

        // Add History if at least one result is valid
        if ((normalResult.sellerVoucher !== null || vipResult.sellerVoucher !== null) && desiredPrice) {
            setHistory(prev => {
                const newItem: HistoryItem = {
                    id: Date.now(),
                    productName: productName || 'Sản phẩm không tên',
                    desiredPrice: parseFloat(desiredPrice),
                    resultNormal: normalResult.sellerVoucher,
                    resultVip: vipResult.sellerVoucher,
                    timestamp: new Date()
                };
                return [newItem, ...prev].slice(5);
            });
        }
    }, [currentPrice, desiredPrice, voucherNormal, minNormal, maxNormal, voucherVip, minVip, maxVip, productName]);

    const handlePresetClick = (val: number) => {
        const newVoucherStr = String(val);
        
        if (activeSection === 'normal') {
            setVoucherNormal(newVoucherStr);
            const { sellerVoucher, platformContribution } = performCalculation(
                currentPrice, desiredPrice, newVoucherStr, 
                minNormal.replace(/[^0-9]/g, ''), maxNormal.replace(/[^0-9]/g, '')
            );
            setResultNormal(sellerVoucher);
            setPlatformDiscNormal(platformContribution);
        } else {
            setVoucherVip(newVoucherStr);
            const { sellerVoucher, platformContribution } = performCalculation(
                currentPrice, desiredPrice, newVoucherStr, 
                minVip.replace(/[^0-9]/g, ''), maxVip.replace(/[^0-9]/g, '')
            );
            setResultVip(sellerVoucher);
            setPlatformDiscVip(platformContribution);
        }
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
            if (activeSection === 'normal') voucherNormalRef.current?.focus();
            else voucherVipRef.current?.focus();
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

    // --- Quick Input Logic ---
    const desiredPriceValue = useMemo(() => {
        if (!desiredPrice) return '';
        const numericValue = parseInt(desiredPrice, 10);
        if (isNaN(numericValue)) return '';
        if (!useFinalPrice && isQuickPriceInput && isDesiredPriceFocused) {
            return String(Math.round(numericValue / 1000));
        }
        return formatCurrencyForInput(desiredPrice);
    }, [desiredPrice, isQuickPriceInput, isDesiredPriceFocused, useFinalPrice]);

    // Generic handler for formatted inputs
    const createFormattedChangeHandler = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const numericString = parseInput(rawValue);
        if (isQuickPriceInput) {
            const numericValue = parseInt(numericString, 10);
            if (isNaN(numericValue)) setter('');
            else setter(String(numericValue * 1000));
        } else {
            setter(numericString);
        }
    };

    // Generic display value
    const getDisplayValue = (val: string, isFocused: boolean) => {
        if (!val) return '';
        const numericValue = parseInt(val, 10);
        if (isNaN(numericValue)) return '';
        if (isQuickPriceInput && isFocused) return String(Math.round(numericValue / 1000));
        return formatCurrencyForInput(val);
    };

    const handleCopyResult = (result: number | null, isVip: boolean) => {
        if (result !== null) {
            const textToCopy = String(Math.round(result));
            navigator.clipboard.writeText(textToCopy).then(() => {
                if (isVip) {
                    setIsCopiedVip(true);
                    setTimeout(() => setIsCopiedVip(false), 2000);
                } else {
                    setIsCopiedNormal(true);
                    setTimeout(() => setIsCopiedNormal(false), 2000);
                }
            });
        }
    };

    const handleCopyTime = () => {
        const timeText = getRoundedTime(currentTime);
        navigator.clipboard.writeText(timeText).then(() => {
            setIsTimeCopied(true);
            setTimeout(() => setIsTimeCopied(false), 2000);
        });
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

    const handleCopyAll = async (result: number | null, isVip: boolean) => {
        if (result !== null) {
             const timeText = getRoundedTime(currentTime);
             const price = String(Math.round(result));
             const id = productId || 'NoID';
             
             // Sequential copy with delay to create distinct clipboard history entries (Win + V)
             // Desired History Order (Top to Bottom): [Time, Price, ID]
             // Execution Sequence: ID -> Price -> Time
             
             try {
                 // 1. Copy ID
                 await navigator.clipboard.writeText(id);
                 await new Promise(resolve => setTimeout(resolve, 250)); // Wait for OS to register

                 // 2. Copy Price
                 await navigator.clipboard.writeText(price);
                 await new Promise(resolve => setTimeout(resolve, 250)); 

                 // 3. Copy Time (This will be the "active" current item)
                 await navigator.clipboard.writeText(timeText);

                 // UI Feedback
                 if (isVip) {
                    setIsCopyAllVip(true);
                    setTimeout(() => setIsCopyAllVip(false), 2000);
                } else {
                    setIsCopyAllNormal(true);
                    setTimeout(() => setIsCopyAllNormal(false), 2000);
                }
             } catch (err) {
                 console.error("Multi-copy failed", err);
             }
        }
    };

    const toggleSettings = () => setIsSettingsOpen(!isSettingsOpen);
    const handlePresetSelection = (voucher: number) => {
        setTempSelectedPresets(prev => {
            if (prev.includes(voucher)) return prev.filter(v => v !== voucher);
            if (prev.length >= 6) return prev; 
            return [...prev, voucher].sort((a, b) => a - b);
        });
    };
    const savePresets = () => {
        onSavePresets(tempSelectedPresets);
        setIsSettingsOpen(false);
    };
    useEffect(() => {
        if (isSettingsOpen) setTempSelectedPresets(presetVouchers);
    }, [isSettingsOpen, presetVouchers]);

    // Active field tracking for display formatting
    const [focusedField, setFocusedField] = useState<string | null>(null);

    return (
        <div className="h-full flex flex-col relative overflow-hidden p-6">
             {/* Header */}
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
                {/* Global Time Display in Header (Visual Only) */}
                <div className="glass-input px-3 py-1.5 rounded-lg font-mono text-lg font-bold text-primary-300 tracking-widest shadow-inner flex items-center gap-2">
                    <span className="flex items-center gap-2"><span className="font-mono">{formattedTime}</span></span>
                </div>
            </div>

            {/* BODY */}
            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-5 pr-1 pb-2">
                 {/* Product Info */}
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
                    {(productId || exclusiveId) && (
                        <div className="flex gap-2">
                            {productId && (
                                <div onClick={handleCopyId} className="flex-1 bg-slate-900/50 rounded-xl px-3 py-2 border border-slate-700 flex items-center justify-between cursor-pointer group hover:border-primary-500/50 hover:bg-primary-900/10 transition-all hover:shadow-glow-hover">
                                    <div className="overflow-hidden">
                                         <span className="text-[10px] font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">ID Sản phẩm</span>
                                         <span className="text-xs font-mono font-bold text-slate-200 truncate block">{productId}</span>
                                    </div>
                                     {isIdCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4 text-slate-600 group-hover:text-primary-400" />}
                                </div>
                            )}
                             {exclusiveId && (
                                <div onClick={handleCopyExclusiveId} className="flex-1 bg-secondary-900/10 rounded-xl px-3 py-2 border border-secondary-500/20 flex items-center justify-between cursor-pointer group hover:border-secondary-500/50 hover:bg-secondary-900/20 transition-all hover:shadow-glow-hover">
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

                {/* Shared Prices */}
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
                    
                    <div>
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                            <div className="flex items-center gap-2">
                                <label htmlFor="desiredPrice" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Giá cuối mong muốn</label>
                                <div className="flex items-center gap-2 ml-2 bg-slate-900/50 px-2 py-0.5 rounded-full border border-slate-800/50" title="Tự động điền giá cuối">
                                    <span className={`text-[9px] font-bold uppercase transition-colors ${useFinalPrice ? 'text-emerald-400' : 'text-slate-600'}`}>Dùng giá cuối</span>
                                    <div onClick={handleToggleFinalPrice} className={`w-6 h-3.5 rounded-full relative transition-colors cursor-pointer ${useFinalPrice ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all ${useFinalPrice ? 'left-3' : 'left-0.5'}`} />
                                    </div>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 cursor-pointer group ${useFinalPrice ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => setIsQuickPriceInput(!isQuickPriceInput)} title="Bật/Tắt nhập nhanh (x1000)">
                                 <span className={`text-[10px] uppercase font-bold transition-colors ${isQuickPriceInput ? 'text-primary-400' : 'text-slate-600 group-hover:text-slate-500'}`}>x1000</span>
                                <div className={`w-7 h-3.5 rounded-full relative transition-colors ${isQuickPriceInput ? 'bg-primary-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all ${isQuickPriceInput ? 'left-4' : 'left-0.5'}`} />
                                </div>
                            </div>
                        </div>

                        <InputField
                            ref={desiredPriceInputRef}
                            id="desiredPrice"
                            value={desiredPriceValue}
                            onChange={(e) => {
                                if (useFinalPrice) return;
                                const rawValue = e.target.value;
                                const numericString = parseInput(rawValue);
                                if (isQuickPriceInput) {
                                    const num = parseInt(numericString, 10);
                                    if (isNaN(num)) setDesiredPrice('');
                                    else setDesiredPrice(String(num * 1000));
                                } else setDesiredPrice(numericString);
                            }}
                            onFocus={(e) => {
                                if (!useFinalPrice) {
                                    setIsDesiredPriceFocused(true);
                                    handleInputFocus(e);
                                }
                            }}
                            onBlur={() => setIsDesiredPriceFocused(false)}
                            onKeyDown={handleDesiredPriceKeyDown}
                            readOnly={useFinalPrice}
                            disabled={useFinalPrice}
                            placeholder={useFinalPrice ? (selectedProduct?.finalPrice ? "" : "Không có giá cuối") : (isQuickPriceInput ? "100 -> 100.000" : "Nhập số tiền")}
                            suffix={useFinalPrice ? <LockClosedIcon className="w-4 h-4 text-emerald-500/50" /> : <span className="text-slate-500 text-xs font-bold font-mono">VND</span>}
                            className={`shadow-sm ${useFinalPrice ? 'opacity-90' : ''}`}
                        />
                    </div>
                </div>

                {/* VOUCHER DUAL COLUMNS */}
                <div className="grid grid-cols-2 gap-4">
                    {/* NORMAL ACCOUNT */}
                    <div 
                        className={`space-y-3 transition-opacity ${activeSection === 'vip' ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
                        onClick={() => setActiveSection('normal')}
                    >
                        <div className="flex items-center gap-2 mb-1">
                             <div className={`w-2 h-2 rounded-full ${activeSection === 'normal' ? 'bg-primary-500' : 'bg-slate-700'}`}></div>
                             <span className="text-xs font-bold text-slate-300 uppercase">Tài khoản Thường</span>
                        </div>
                        
                        <div className={`p-3 rounded-2xl border transition-all ${activeSection === 'normal' ? 'bg-slate-900/50 border-primary-500/30 shadow-glow-inset' : 'bg-slate-950/30 border-slate-800'}`}>
                             {/* % Input */}
                             <div className="relative mb-3">
                                <input
                                    ref={voucherNormalRef}
                                    type="text" 
                                    value={voucherNormal}
                                    onChange={e => setVoucherNormal(e.target.value.replace(/[^0-9]/g, ''))}
                                    onKeyDown={handleKeyDown}
                                    onFocus={handleInputFocus}
                                    placeholder="%"
                                    className="block w-full px-2 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-lg font-bold font-mono shadow-sm text-center placeholder:text-slate-700"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">%</span>
                             </div>
                             
                             {/* Min/Max Inputs */}
                             <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={getDisplayValue(minNormal, focusedField === 'minNormal')}
                                        onChange={createFormattedChangeHandler(setMinNormal)}
                                        onFocus={(e) => { setFocusedField('minNormal'); handleInputFocus(e); setActiveSection('normal'); }}
                                        onBlur={() => setFocusedField(null)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Min"
                                        className="block w-full pl-2 pr-7 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs font-mono focus:border-primary-500 focus:outline-none"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold">MIN</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={getDisplayValue(maxNormal, focusedField === 'maxNormal')}
                                        onChange={createFormattedChangeHandler(setMaxNormal)}
                                        onFocus={(e) => { setFocusedField('maxNormal'); handleInputFocus(e); setActiveSection('normal'); }}
                                        onBlur={() => setFocusedField(null)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Max"
                                        className="block w-full pl-2 pr-7 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs font-mono focus:border-primary-500 focus:outline-none"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold">MAX</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* VIP ACCOUNT */}
                    <div 
                        className={`space-y-3 transition-opacity ${activeSection === 'normal' ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
                        onClick={() => setActiveSection('vip')}
                    >
                        <div className="flex items-center gap-2 mb-1">
                             <div className={`w-2 h-2 rounded-full ${activeSection === 'vip' ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
                             <span className="text-xs font-bold text-amber-500 uppercase">Tài khoản VIP</span>
                        </div>

                        <div className={`p-3 rounded-2xl border transition-all ${activeSection === 'vip' ? 'bg-amber-900/10 border-amber-500/30 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]' : 'bg-slate-950/30 border-slate-800'}`}>
                             {/* % Input */}
                             <div className="relative mb-3">
                                <input
                                    ref={voucherVipRef}
                                    type="text" 
                                    value={voucherVip}
                                    onChange={e => setVoucherVip(e.target.value.replace(/[^0-9]/g, ''))}
                                    onKeyDown={handleKeyDown}
                                    onFocus={handleInputFocus}
                                    placeholder="%"
                                    className="block w-full px-2 py-2 bg-slate-950 border border-slate-700 text-amber-400 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-lg font-bold font-mono shadow-sm text-center placeholder:text-slate-700"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">%</span>
                             </div>
                             
                             {/* Min/Max Inputs */}
                             <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={getDisplayValue(minVip, focusedField === 'minVip')}
                                        onChange={createFormattedChangeHandler(setMinVip)}
                                        onFocus={(e) => { setFocusedField('minVip'); handleInputFocus(e); setActiveSection('vip'); }}
                                        onBlur={() => setFocusedField(null)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Min"
                                        className="block w-full pl-2 pr-7 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs font-mono focus:border-amber-500 focus:outline-none"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold">MIN</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={getDisplayValue(maxVip, focusedField === 'maxVip')}
                                        onChange={createFormattedChangeHandler(setMaxVip)}
                                        onFocus={(e) => { setFocusedField('maxVip'); handleInputFocus(e); setActiveSection('vip'); }}
                                        onBlur={() => setFocusedField(null)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Max"
                                        className="block w-full pl-2 pr-7 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs font-mono focus:border-amber-500 focus:outline-none"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold">MAX</span>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Preset Vouchers */}
                <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Chọn nhanh (Áp dụng cho <span className={activeSection === 'vip' ? 'text-amber-500' : 'text-primary-400'}>{activeSection === 'vip' ? 'VIP' : 'Thường'}</span>)
                        </span>
                        <button onClick={toggleSettings} className="text-slate-600 hover:text-primary-400 transition-colors"><CogIcon className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {presetVouchers.map(v => (
                            <button
                                key={v}
                                onClick={() => handlePresetClick(v)}
                                className={`flex-1 min-w-[2.5rem] py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 font-mono ${
                                    (activeSection === 'normal' && voucherNormal === String(v)) || (activeSection === 'vip' && voucherVip === String(v))
                                    ? (activeSection === 'vip' ? 'bg-amber-600 text-white border-amber-500 shadow-glow-sm' : 'bg-primary-600 text-white border-primary-500 shadow-glow-sm')
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200'
                                }`}
                            >
                                {v}%
                            </button>
                        ))}
                    </div>
                </div>
            </div>

             {/* Footer / Result */}
            <div className="mt-auto pt-4 border-t border-slate-800 flex-shrink-0 z-10 -mx-6 -mb-6 px-6 pb-6 bg-[#0f172a]">
                <button
                    onClick={handleCalculation}
                    className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-base shadow-lg shadow-primary-900/30 hover:shadow-glow-hover hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 mb-4"
                >
                    Tính giá ngay
                </button>

                 {(resultNormal !== null || resultVip !== null) && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* NORMAL RESULT */}
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 relative overflow-hidden group flex flex-col justify-between">
                             {resultNormal !== null ? (
                                <>
                                    <div>
                                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Kết quả Thường</div>
                                        <div className="text-xl font-black font-mono text-white tracking-tight mb-1">
                                            {formatCurrency(resultNormal)}
                                        </div>
                                        {platformDiscNormal > 0 && (
                                            <div className="text-[10px] text-primary-400 font-mono flex justify-between">
                                                <span>Sàn:</span> <span>{formatCurrency(platformDiscNormal)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 justify-end">
                                        <button
                                            onClick={() => handleCopyAll(resultNormal, false)}
                                            className={`p-1.5 rounded-lg transition-all ${isCopyAllNormal ? 'text-green-400 bg-green-900/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                                            title="Copy Tất cả (ID, Giá, Giờ)"
                                        >
                                            {isCopyAllNormal ? <CheckIcon className="w-3.5 h-3.5" /> : <ClipboardDocumentListIcon className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={() => handleCopyResult(resultNormal, false)}
                                            className={`p-1.5 rounded-lg transition-all ${isCopiedNormal ? 'text-green-400 bg-green-900/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                                            title="Copy Giá voucher"
                                        >
                                            {isCopiedNormal ? <CheckIcon className="w-3.5 h-3.5" /> : <Square2StackIcon className="w-3.5 h-3.5" />}
                                        </button>
                                         <button
                                            onClick={handleCopyId}
                                            className={`p-1.5 rounded-lg transition-all ${isIdCopied ? 'text-green-400 bg-green-900/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                                            title="Copy ID Sản phẩm"
                                        >
                                            {isIdCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <IdentificationIcon className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={handleCopyTime}
                                            className={`p-1.5 rounded-lg transition-all ${isTimeCopied ? 'text-green-400 bg-green-900/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                                            title="Copy Giờ hiện tại"
                                        >
                                            {isTimeCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </>
                             ) : <div className="text-xs text-slate-600 text-center py-4">Chưa tính</div>}
                        </div>

                        {/* VIP RESULT */}
                        <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 relative overflow-hidden group flex flex-col justify-between">
                             {resultVip !== null ? (
                                <>
                                    <div>
                                        <div className="text-[9px] font-bold text-amber-600 uppercase mb-1">Kết quả VIP</div>
                                        <div className="text-xl font-black font-mono text-amber-400 tracking-tight mb-1">
                                            {formatCurrency(resultVip)}
                                        </div>
                                        {platformDiscVip > 0 && (
                                            <div className="text-[10px] text-amber-600/80 font-mono flex justify-between">
                                                <span>Sàn:</span> <span>{formatCurrency(platformDiscVip)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 justify-end">
                                        <button
                                            onClick={() => handleCopyAll(resultVip, true)}
                                            className={`p-1.5 rounded-lg transition-all ${isCopyAllVip ? 'text-green-400 bg-green-900/20' : 'text-amber-600/70 hover:text-amber-400 hover:bg-amber-900/20'}`}
                                            title="Copy Tất cả (ID, Giá, Giờ)"
                                        >
                                            {isCopyAllVip ? <CheckIcon className="w-3.5 h-3.5" /> : <ClipboardDocumentListIcon className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={() => handleCopyResult(resultVip, true)}
                                            className={`p-1.5 rounded-lg transition-all ${isCopiedVip ? 'text-green-400 bg-green-900/20' : 'text-amber-600/70 hover:text-amber-400 hover:bg-amber-900/20'}`}
                                            title="Copy Giá voucher"
                                        >
                                            {isCopiedVip ? <CheckIcon className="w-3.5 h-3.5" /> : <Square2StackIcon className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={handleCopyId}
                                            className={`p-1.5 rounded-lg transition-all ${isIdCopied ? 'text-green-400 bg-green-900/20' : 'text-amber-600/70 hover:text-amber-400 hover:bg-amber-900/20'}`}
                                            title="Copy ID Sản phẩm"
                                        >
                                            {isIdCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <IdentificationIcon className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={handleCopyTime}
                                            className={`p-1.5 rounded-lg transition-all ${isTimeCopied ? 'text-green-400 bg-green-900/20' : 'text-amber-600/70 hover:text-amber-400 hover:bg-amber-900/20'}`}
                                            title="Copy Giờ hiện tại"
                                        >
                                            {isTimeCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </>
                             ) : <div className="text-xs text-slate-600 text-center py-4">Chưa tính</div>}
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
                    <button onClick={savePresets} className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all shadow-lg">Lưu cài đặt</button>
                </div>
            )}
        </div>
    );
};
