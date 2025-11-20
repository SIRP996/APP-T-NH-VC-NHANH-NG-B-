
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';
import { SearchIcon, CogIcon, Bars3Icon } from './Icons';

const SortAscIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 ml-1 text-violet-600" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9M3 12h9m-9 4h6m4-11l4-4m0 0l4 4m-4-4v12" /></svg>;
const SortDescIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 ml-1 text-violet-600" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9M3 12h9m-9 4h6m4 5l4-4m0 0l-4-4m4 4V3" /></svg>;

type ColumnKey = keyof Pick<Product, 'name' | 'id' | 'exclusiveId' | 'displayPrice' | 'finalPrice' | 'gift'>;
type SortKey = ColumnKey;
type SortDirection = 'asc' | 'desc';

const COLUMN_DEFINITIONS: { key: ColumnKey; label: string }[] = [
    { key: 'name', label: 'Tên Sản phẩm' },
    { key: 'id', label: 'ID' },
    { key: 'exclusiveId', label: 'ID Độc quyền' },
    { key: 'displayPrice', label: 'Giá hiển thị' },
    { key: 'finalPrice', label: 'Giá cuối' },
    { key: 'gift', label: 'Quà tặng' },
];

const DEFAULT_COLUMN_ORDER = COLUMN_DEFINITIONS.map(c => c.key);
const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
    name: 400,
    id: 180,
    exclusiveId: 180,
    displayPrice: 140,
    finalPrice: 140,
    gift: 250,
};


interface ColumnSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentOrder: ColumnKey[];
    onOrderSave: (newOrder: ColumnKey[]) => void;
}

const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({ isOpen, onClose, currentOrder, onOrderSave }) => {
    const [tempOrder, setTempOrder] = useState(currentOrder);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTempOrder(currentOrder);
        }
    }, [isOpen, currentOrder]);

    const handleDragStart = (_e: React.DragEvent<HTMLLIElement>, index: number) => {
        dragItem.current = index;
    };
    const handleDragEnter = (_e: React.DragEvent<HTMLLIElement>, index: number) => {
        dragOverItem.current = index;
    };
    const handleDrop = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newOrder = [...tempOrder];
            const draggedItem = newOrder.splice(dragItem.current, 1)[0];
            newOrder.splice(dragOverItem.current, 0, draggedItem);
            setTempOrder(newOrder);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    if (!isOpen) return null;
    
    const orderedColumnLabels = tempOrder.map(key => COLUMN_DEFINITIONS.find(c => c.key === key)!);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-100 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold leading-6 text-slate-900 mb-1">Tùy chỉnh cột</h3>
                <p className="text-sm text-slate-500 mb-5">Kéo và thả để sắp xếp thứ tự hiển thị.</p>
                <ul className="space-y-2 mb-6">
                    {orderedColumnLabels.map(({ key, label }, index) => (
                        <li 
                            key={key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onDragEnd={() => { dragItem.current = null; dragOverItem.current = null; }}
                            className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-grab active:cursor-grabbing hover:border-violet-200 hover:shadow-sm transition-all"
                        >
                            <Bars3Icon className="w-5 h-5 text-slate-400 mr-3"/>
                            <span className="text-sm font-medium text-slate-700">{label}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                     <button
                        onClick={() => setTempOrder(DEFAULT_COLUMN_ORDER)}
                        className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Về mặc định
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => onOrderSave(tempOrder)}
                            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-200"
                        >
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ProductTableProps {
    products: Product[];
    onProductSelect: (product: Product | null) => void;
    isLoading: boolean;
    activeDealListId: string | null;
    searchInputRef?: React.RefObject<HTMLInputElement>;
}

export const ProductTable: React.FC<ProductTableProps> = ({ products, onProductSelect, isLoading, activeDealListId, searchInputRef }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'name', direction: 'asc' });

    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
    const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // New State for keyboard navigation
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const tableContainerRef = useRef<HTMLDivElement>(null);


    const totalProducts = products.length;
    const totalSKUs = useMemo(() => new Set(products.map(p => p.id)).size, [products]);

    useEffect(() => {
        if (activeDealListId) {
            // Load column order
            const savedOrder = localStorage.getItem(`column-order-${activeDealListId}`);
            if (savedOrder) {
                try {
                    const parsedOrder = JSON.parse(savedOrder) as ColumnKey[];
                    const validKeys = new Set(COLUMN_DEFINITIONS.map(c => c.key));
                    if (parsedOrder.length === validKeys.size && parsedOrder.every(key => validKeys.has(key))) {
                         setColumnOrder(parsedOrder);
                    } else {
                         setColumnOrder(DEFAULT_COLUMN_ORDER);
                    }
                } catch (e) {
                    setColumnOrder(DEFAULT_COLUMN_ORDER);
                }
            } else {
                setColumnOrder(DEFAULT_COLUMN_ORDER);
            }

            // Load column widths
            const savedWidths = localStorage.getItem(`column-widths-${activeDealListId}`);
            let initialWidths = DEFAULT_COLUMN_WIDTHS;
            if (savedWidths) {
                try {
                    const parsedWidths = JSON.parse(savedWidths);
                    initialWidths = { ...DEFAULT_COLUMN_WIDTHS, ...parsedWidths };
                } catch (e) {
                    // Keep defaults on parse error
                }
            }
            setColumnWidths(initialWidths);
        } else {
            setColumnOrder(DEFAULT_COLUMN_ORDER);
            setColumnWidths(DEFAULT_COLUMN_WIDTHS);
        }
    }, [activeDealListId]);

    useEffect(() => {
        if (activeDealListId) {
            localStorage.setItem(`column-order-${activeDealListId}`, JSON.stringify(columnOrder));
        }
    }, [columnOrder, activeDealListId]);

    useEffect(() => {
        if (activeDealListId) {
            localStorage.setItem(`column-widths-${activeDealListId}`, JSON.stringify(columnWidths));
        }
    }, [columnWidths, activeDealListId]);


    const filteredProducts = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        if (!lowercasedFilter) return products;
        return products.filter(product => {
            return (
                product.name.toLowerCase().includes(lowercasedFilter) ||
                product.id.toLowerCase().includes(lowercasedFilter) ||
                (product.exclusiveId && product.exclusiveId.toLowerCase().includes(lowercasedFilter)) ||
                (product.gift && product.gift.toLowerCase().includes(lowercasedFilter))
            );
        });
    }, [products, searchTerm]);

    const sortedProducts = useMemo(() => {
        let sortableItems = [...filteredProducts];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                     return aValue.localeCompare(bValue, 'vi', { sensitivity: 'base' }) * (sortConfig.direction === 'asc' ? 1 : -1);
                }
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredProducts, sortConfig]);

    // Reset selection index when filtering
    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchTerm, sortedProducts.length]);

    // Auto-scroll active row into view
    useEffect(() => {
        if (selectedIndex >= 0 && tableContainerRef.current) {
            const rows = tableContainerRef.current.querySelectorAll('tbody tr');
            if (rows[selectedIndex]) {
                rows[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);


    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
    };
    
    const formatCurrency = (value: number) => {
        if (isNaN(value) || !isFinite(value)) return "0đ";
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const handleResizeMouseDown = useCallback((key: ColumnKey) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevents sorting when clicking resizer
        const thElement = (e.target as HTMLElement).closest('th');
        if (!thElement) return;

        const startX = e.clientX;
        const startWidth = thElement.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            const minWidth = 100; // Minimum column width
    
            if (newWidth > minWidth) {
                setColumnWidths(prev => ({
                    ...prev,
                    [key]: newWidth,
                }));
            }
        };

        const handleMouseUp = () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, []);
    
    // Handle keyboard inputs on search box
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, sortedProducts.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < sortedProducts.length) {
                onProductSelect(sortedProducts[selectedIndex]);
            } else if (sortedProducts.length > 0) {
                // If nothing selected but Enter is pressed, select first item
                onProductSelect(sortedProducts[0]);
            }
        }
    };

    const orderedTableHeaders = useMemo(() => {
        return columnOrder.map(key => COLUMN_DEFINITIONS.find(c => c.key === key)!);
    }, [columnOrder]);

    const cellClassMap: Record<ColumnKey, string> = {
        name: 'font-semibold text-slate-900 text-[15px]',
        id: 'text-slate-700 font-medium font-mono text-xs',
        exclusiveId: 'text-fuchsia-700 font-mono text-xs bg-fuchsia-50 px-2 py-1 rounded-md w-fit font-bold border border-fuchsia-100',
        displayPrice: 'text-slate-600 font-bold font-mono', 
        finalPrice: 'text-violet-900 font-black text-[15px] font-mono',
        gift: 'text-slate-600 text-xs', 
    };
    
    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-white/60">
            <div className="p-5 border-b border-slate-100 bg-white/60 backdrop-blur-md z-20 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                        </span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Tìm kiếm sản phẩm... (Phím tắt: /)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 bg-white/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm font-medium"
                        />
                    </div>
                    <button 
                        onClick={() => setIsSettingsModalOpen(true)} 
                        className="p-2.5 text-slate-500 hover:text-violet-600 rounded-xl hover:bg-violet-50 transition-colors flex-shrink-0 border border-slate-200 hover:border-violet-100" 
                        aria-label="Tùy chỉnh cột"
                    >
                        <CogIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="mt-4 flex gap-4">
                    <div className="flex items-baseline gap-2 px-4 py-2 bg-violet-50/80 rounded-xl border border-violet-100">
                        <span className="text-xs font-bold uppercase text-violet-500 tracking-wider">Tổng SKU</span>
                        <span className="text-lg font-bold text-violet-900">{isLoading ? '...' : new Intl.NumberFormat('vi-VN').format(totalSKUs)}</span>
                    </div>
                    <div className="flex items-baseline gap-2 px-4 py-2 bg-slate-50/80 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Tổng sản phẩm</span>
                        <span className="text-lg font-bold text-slate-700">{isLoading ? '...' : new Intl.NumberFormat('vi-VN').format(totalProducts)}</span>
                    </div>
                </div>

            </div>
             <ColumnSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                currentOrder={columnOrder}
                onOrderSave={(newOrder) => {
                    setColumnOrder(newOrder);
                    setIsSettingsModalOpen(false);
                }}
            />

            <div className="flex-grow overflow-auto custom-scrollbar relative" ref={tableContainerRef}>
                <table className="divide-y divide-slate-100 table-fixed w-full">
                    <thead className="bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm border-b border-slate-200">
                        <tr>
                            {orderedTableHeaders.map(({ key, label }) => (
                                 <th 
                                     key={key} 
                                     scope="col" 
                                     className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider group relative select-none"
                                     style={{ width: columnWidths[key] ? `${columnWidths[key]}px` : 'auto' }}
                                 >
                                    <button onClick={() => requestSort(key)} className="flex items-center gap-1 hover:text-violet-600 transition-colors w-full">
                                        {label} {getSortIcon(key)}
                                    </button>
                                    <div
                                        onMouseDown={handleResizeMouseDown(key)}
                                        className="absolute top-1/2 -translate-y-1/2 -right-1 w-4 h-6 cursor-col-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <div className="w-0.5 h-full bg-violet-300 rounded-full" />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white/50 divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={orderedTableHeaders.length} className="text-center py-20 text-slate-400">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin"/>
                                    <span>Đang tải dữ liệu...</span>
                                </div>
                            </td></tr>
                        ) : sortedProducts.length > 0 ? (
                            sortedProducts.map((product, index) => {
                                const isSelected = index === selectedIndex;
                                return (
                                    <tr 
                                        key={`${product.id}-${index}`} 
                                        onClick={() => onProductSelect(product)} 
                                        onMouseEnter={() => setSelectedIndex(index)} // Sync hover with selection
                                        className={`cursor-pointer transition-all group border-b border-slate-50 last:border-none ${isSelected ? 'bg-violet-50/80 ring-1 ring-inset ring-violet-200 z-10 relative shadow-sm' : 'hover:bg-violet-50/40'}`}
                                    >
                                        {orderedTableHeaders.map(({ key }) => (
                                            <td key={key} className={`px-6 py-4 text-sm ${cellClassMap[key]} break-words align-top ${isSelected ? 'text-violet-900' : 'group-hover:text-violet-900'} transition-colors`}>
                                                {key === 'displayPrice' || key === 'finalPrice' ? formatCurrency(Number(product[key])) : product[key]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        ) : (
                             <tr><td colSpan={orderedTableHeaders.length} className="text-center py-20 text-slate-400 font-medium">Không tìm thấy sản phẩm nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
