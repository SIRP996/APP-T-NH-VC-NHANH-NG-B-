

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';
import { SearchIcon, CogIcon, Bars3Icon, PlusIcon, EditIcon, TrashIcon, EyeIcon, EyeSlashIcon } from './Icons';

const SortAscIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 ml-1 text-primary-400" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9M3 12h9m-9 4h6m4-11l4-4m0 0l4 4m-4-4v12" /></svg>;
const SortDescIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 ml-1 text-primary-400" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9M3 12h9m-9 4h6m4 5l4-4m0 0l-4-4m4 4V3" /></svg>;

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

const ROW_HEIGHT = 58; 
const BUFFER_ROWS = 5;

const TableSkeleton: React.FC<{ columnsCount: number }> = ({ columnsCount }) => {
    return (
        <>
            {[...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-slate-800/50 h-[58px]">
                    {[...Array(columnsCount)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                            <div className={`h-4 bg-slate-800 rounded animate-pulse ${j === 0 ? 'w-3/4' : 'w-1/2'}`}></div>
                        </td>
                    ))}
                     <td className="px-4 py-4">
                        <div className="h-4 w-8 bg-slate-800 rounded animate-pulse ml-auto"></div>
                     </td>
                </tr>
            ))}
        </>
    );
};

interface ColumnSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentOrder: ColumnKey[];
    visibleColumns: Set<ColumnKey>;
    onSave: (newOrder: ColumnKey[], newVisibility: Set<ColumnKey>) => void;
}

const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({ isOpen, onClose, currentOrder, visibleColumns, onSave }) => {
    const [tempOrder, setTempOrder] = useState(currentOrder);
    const [tempVisibility, setTempVisibility] = useState(new Set(visibleColumns));
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTempOrder(currentOrder);
            setTempVisibility(new Set(visibleColumns));
        }
    }, [isOpen, currentOrder, visibleColumns]);

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

    const toggleVisibility = (key: ColumnKey) => {
        const newSet = new Set(tempVisibility);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setTempVisibility(newSet);
    };

    if (!isOpen) return null;
    
    // Ensure we map over tempOrder to show current sort state
    const orderedColumnLabels = tempOrder.map(key => COLUMN_DEFINITIONS.find(c => c.key === key)!);

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/10 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold leading-6 text-white mb-1">Tùy chỉnh cột</h3>
                <p className="text-sm text-slate-400 mb-5">Kéo thả để sắp xếp hoặc ẩn/hiện cột.</p>
                <ul className="space-y-2 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {orderedColumnLabels.map(({ key, label }, index) => (
                        <li 
                            key={key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onDragEnd={() => { dragItem.current = null; dragOverItem.current = null; }}
                            className={`flex items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700 cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-all ${!tempVisibility.has(key) ? 'opacity-60 bg-slate-900/30 border-dashed' : 'hover:border-primary-500/50'}`}
                        >
                             <button 
                                onClick={(e) => { e.stopPropagation(); toggleVisibility(key); }}
                                className={`mr-3 p-1.5 rounded-lg transition-colors ${tempVisibility.has(key) ? 'text-primary-400 bg-primary-500/10 hover:bg-primary-500/20' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800'}`}
                                title={tempVisibility.has(key) ? "Đang hiện (Click để ẩn)" : "Đang ẩn (Click để hiện)"}
                             >
                                 {tempVisibility.has(key) ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                             </button>
                            <Bars3Icon className="w-5 h-5 text-slate-600 mr-3"/>
                            <span className={`text-sm font-medium ${tempVisibility.has(key) ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                     <button
                        onClick={() => {
                            setTempOrder(DEFAULT_COLUMN_ORDER);
                            setTempVisibility(new Set(DEFAULT_COLUMN_ORDER));
                        }}
                        className="text-sm font-medium text-slate-500 hover:text-white transition-colors"
                    >
                        Về mặc định
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => onSave(tempOrder, tempVisibility)}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-500 shadow-lg shadow-primary-900/20"
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
    onAddProduct?: () => void;
    onEditProduct?: (product: Product) => void;
    onDeleteProduct?: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ 
    products, 
    onProductSelect, 
    isLoading, 
    activeDealListId, 
    searchInputRef,
    onAddProduct,
    onEditProduct,
    onDeleteProduct
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'name', direction: 'asc' });

    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_COLUMN_ORDER));
    const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600); 

    const totalProducts = products.length;
    const totalSKUs = useMemo(() => new Set(products.map(p => p.id)).size, [products]);

    useEffect(() => {
        if (tableContainerRef.current) {
            const updateHeight = () => {
                if (tableContainerRef.current) {
                    setContainerHeight(tableContainerRef.current.clientHeight);
                }
            };
            
            updateHeight();
            const resizeObserver = new ResizeObserver(updateHeight);
            resizeObserver.observe(tableContainerRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    useEffect(() => {
        if (activeDealListId) {
            // Load Order
            const savedOrder = localStorage.getItem(`column-order-${activeDealListId}`);
            if (savedOrder) {
                try {
                    const parsedOrder = JSON.parse(savedOrder) as ColumnKey[];
                    const validKeys = new Set(COLUMN_DEFINITIONS.map(c => c.key));
                    // If saved order has same length and valid keys, use it
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

            // Load Visibility
            const savedVisibility = localStorage.getItem(`column-visibility-${activeDealListId}`);
            if (savedVisibility) {
                try {
                    const parsedVisibility = JSON.parse(savedVisibility);
                    setVisibleColumns(new Set(parsedVisibility));
                } catch (e) {
                    setVisibleColumns(new Set(DEFAULT_COLUMN_ORDER));
                }
            } else {
                setVisibleColumns(new Set(DEFAULT_COLUMN_ORDER));
            }

            // Load Widths
            const savedWidths = localStorage.getItem(`column-widths-${activeDealListId}`);
            let initialWidths = DEFAULT_COLUMN_WIDTHS;
            if (savedWidths) {
                try {
                    const parsedWidths = JSON.parse(savedWidths);
                    initialWidths = { ...DEFAULT_COLUMN_WIDTHS, ...parsedWidths };
                } catch (e) {
                }
            }
            setColumnWidths(initialWidths);
        } else {
            setColumnOrder(DEFAULT_COLUMN_ORDER);
            setVisibleColumns(new Set(DEFAULT_COLUMN_ORDER));
            setColumnWidths(DEFAULT_COLUMN_WIDTHS);
        }
    }, [activeDealListId]);

    useEffect(() => {
        if (activeDealListId) {
            localStorage.setItem(`column-order-${activeDealListId}`, JSON.stringify(columnOrder));
            localStorage.setItem(`column-visibility-${activeDealListId}`, JSON.stringify(Array.from(visibleColumns)));
            localStorage.setItem(`column-widths-${activeDealListId}`, JSON.stringify(columnWidths));
        }
    }, [columnOrder, columnWidths, visibleColumns, activeDealListId]);


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

    useEffect(() => {
        setSelectedIndex(-1);
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = 0;
            setScrollTop(0);
        }
    }, [searchTerm, sortedProducts.length]);

    useEffect(() => {
        if (selectedIndex >= 0 && tableContainerRef.current) {
            const currentScroll = tableContainerRef.current.scrollTop;
            const itemTop = selectedIndex * ROW_HEIGHT;
            const itemBottom = itemTop + ROW_HEIGHT;
            const viewHeight = tableContainerRef.current.clientHeight;

            if (itemTop < currentScroll + 32) { 
                tableContainerRef.current.scrollTo({ top: itemTop, behavior: 'auto' });
            } 
            else if (itemBottom > currentScroll + viewHeight) {
                tableContainerRef.current.scrollTo({ top: itemBottom - viewHeight, behavior: 'auto' });
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
        e.stopPropagation();
        const thElement = (e.target as HTMLElement).closest('th');
        if (!thElement) return;

        const startX = e.clientX;
        const startWidth = thElement.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            const minWidth = 100;
    
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
                onProductSelect(sortedProducts[0]);
            }
        }
    };

    const orderedTableHeaders = useMemo(() => {
        return columnOrder
            .filter(key => visibleColumns.has(key))
            .map(key => COLUMN_DEFINITIONS.find(c => c.key === key)!);
    }, [columnOrder, visibleColumns]);

    const cellClassMap: Record<ColumnKey, string> = {
        name: 'font-medium text-slate-200 text-[14px]',
        id: 'text-slate-400 font-mono text-xs',
        exclusiveId: 'text-secondary-400 font-mono text-xs bg-secondary-500/10 px-2 py-1 rounded-md w-fit border border-secondary-500/20',
        displayPrice: 'text-slate-300 font-mono text-sm', 
        finalPrice: 'text-primary-300 font-bold text-[14px] font-mono',
        gift: 'text-slate-400 text-xs italic', 
    };

    const totalHeight = sortedProducts.length * ROW_HEIGHT;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endIndex = Math.min(sortedProducts.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS);
    
    const visibleProducts = sortedProducts.slice(startIndex, endIndex);
    const paddingTop = startIndex * ROW_HEIGHT;
    const paddingBottom = (sortedProducts.length - endIndex) * ROW_HEIGHT;
    
    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-transparent">
            <div className="p-5 border-b border-white/5 bg-transparent z-20 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
                        </span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Tìm kiếm sản phẩm... (Phím tắt: /)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm font-medium hover:shadow-glow-hover hover:border-primary-500/50 hover:bg-slate-900/80"
                        />
                    </div>
                    
                    {onAddProduct && (
                         <button 
                            onClick={onAddProduct}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-500 shadow-lg shadow-primary-900/20 transition-all hover:scale-105 active:scale-95 hover:shadow-glow-hover"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Thêm</span>
                        </button>
                    )}

                    <button 
                        onClick={() => setIsSettingsModalOpen(true)} 
                        className="p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors flex-shrink-0 border border-white/5 hover:border-white/10" 
                        aria-label="Tùy chỉnh cột"
                    >
                        <CogIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="mt-4 flex gap-4">
                    <div className="flex items-baseline gap-2 px-4 py-2 bg-primary-500/10 rounded-xl border border-primary-500/20">
                        <span className="text-[10px] font-bold uppercase text-primary-400 tracking-wider">Tổng SKU</span>
                        <span className="text-lg font-bold text-primary-200 font-mono">{isLoading ? '...' : new Intl.NumberFormat('vi-VN').format(totalSKUs)}</span>
                    </div>
                    <div className="flex items-baseline gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Tổng sản phẩm</span>
                        <span className="text-lg font-bold text-slate-300 font-mono">{isLoading ? '...' : new Intl.NumberFormat('vi-VN').format(totalProducts)}</span>
                    </div>
                </div>

            </div>
             <ColumnSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                currentOrder={columnOrder}
                visibleColumns={visibleColumns}
                onSave={(newOrder, newVisibility) => {
                    setColumnOrder(newOrder);
                    setVisibleColumns(newVisibility);
                    setIsSettingsModalOpen(false);
                }}
            />

            <div 
                className="flex-grow overflow-auto custom-scrollbar relative bg-transparent" 
                ref={tableContainerRef}
                onScroll={handleScroll}
            >
                <table className="divide-y divide-slate-800/50 table-fixed w-full border-collapse">
                    <thead className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 shadow-sm border-b border-slate-800">
                        <tr>
                            {orderedTableHeaders.map(({ key, label }) => (
                                 <th 
                                     key={key} 
                                     scope="col" 
                                     className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider group relative select-none"
                                     style={{ width: columnWidths[key] ? `${columnWidths[key]}px` : 'auto' }}
                                 >
                                    <button onClick={() => requestSort(key)} className="flex items-center gap-1 hover:text-primary-400 transition-colors w-full">
                                        {label} {getSortIcon(key)}
                                    </button>
                                    <div
                                        onMouseDown={handleResizeMouseDown(key)}
                                        className="absolute top-1/2 -translate-y-1/2 -right-1 w-4 h-6 cursor-col-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <div className="w-0.5 h-full bg-primary-500/50 rounded-full" />
                                    </div>
                                </th>
                            ))}
                            {/* Action Column */}
                            <th scope="col" className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-24 sticky right-0 bg-slate-900/90 backdrop-blur-md z-20 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.2)]">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {isLoading ? (
                            <TableSkeleton columnsCount={orderedTableHeaders.length} />
                        ) : sortedProducts.length > 0 ? (
                            <>
                                {/* Top Spacer */}
                                {paddingTop > 0 && (
                                    <tr style={{ height: paddingTop }}>
                                        <td colSpan={orderedTableHeaders.length + 1} />
                                    </tr>
                                )}

                                {visibleProducts.map((product, i) => {
                                    const realIndex = startIndex + i;
                                    const isSelected = realIndex === selectedIndex;
                                    return (
                                        <tr 
                                            key={`${product.docId || product.id}-${realIndex}`} 
                                            onClick={() => onProductSelect(product)} 
                                            onMouseEnter={() => setSelectedIndex(realIndex)}
                                            className={`cursor-pointer transition-all duration-200 group border-b border-slate-800/30 last:border-none h-[58px] ${isSelected ? 'bg-primary-500/20 ring-1 ring-inset ring-primary-500/40 shadow-lg z-10 relative' : 'hover:bg-slate-800/90 hover:shadow-glow-inset hover:shadow-[inset_0_0_0_1px_rgba(var(--primary-500),0.3)]'}`}
                                        >
                                            {orderedTableHeaders.map(({ key }) => (
                                                <td key={key} className={`px-6 py-4 text-sm ${cellClassMap[key]} truncate ${isSelected ? 'text-white' : 'group-hover:text-white'} transition-colors`} title={String(product[key])}>
                                                    {key === 'displayPrice' || key === 'finalPrice' ? formatCurrency(Number(product[key])) : product[key]}
                                                </td>
                                            ))}
                                            
                                            {/* Action Buttons */}
                                            <td className="px-4 py-4 text-right whitespace-nowrap sticky right-0 bg-slate-900 group-hover:bg-slate-800 transition-colors z-10 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.2)]">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {onEditProduct && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onEditProduct(product); }}
                                                            className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {onDeleteProduct && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onDeleteProduct(product); }}
                                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Bottom Spacer */}
                                {paddingBottom > 0 && (
                                    <tr style={{ height: paddingBottom }}>
                                        <td colSpan={orderedTableHeaders.length + 1} />
                                    </tr>
                                )}
                            </>
                        ) : (
                             <tr><td colSpan={orderedTableHeaders.length + 1} className="text-center py-20 text-slate-500">Không tìm thấy sản phẩm nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};