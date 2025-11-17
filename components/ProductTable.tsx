

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';
import { SearchIcon, CogIcon, Bars3Icon } from './Icons';

const SortAscIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 ml-1 opacity-60" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h9m-9 4h6m4-11l4-4m0 0l4 4m-4-4v12" /></svg>;
const SortDescIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 ml-1 opacity-60" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h9m-9 4h6m4 5l4-4m0 0l-4-4m4 4V3" /></svg>;

type ColumnKey = keyof Pick<Product, 'name' | 'id' | 'displayPrice' | 'finalPrice' | 'gift'>;
type SortKey = ColumnKey;
type SortDirection = 'asc' | 'desc';

const COLUMN_DEFINITIONS: { key: ColumnKey; label: string }[] = [
    { key: 'name', label: 'Tên Sản phẩm' },
    { key: 'id', label: 'ID' },
    { key: 'displayPrice', label: 'Giá hiển thị' },
    { key: 'finalPrice', label: 'Giá cuối' },
    { key: 'gift', label: 'Quà Tặng' },
];

const DEFAULT_COLUMN_ORDER = COLUMN_DEFINITIONS.map(c => c.key);
const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
    name: 400,
    id: 180,
    displayPrice: 120,
    finalPrice: 120,
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Tùy chỉnh thứ tự cột</h3>
                <p className="text-sm text-slate-700 mb-4">Kéo và thả để sắp xếp lại các cột.</p>
                <ul className="space-y-2">
                    {orderedColumnLabels.map(({ key, label }, index) => (
                        <li 
                            key={key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onDragEnd={() => { dragItem.current = null; dragOverItem.current = null; }}
                            className="flex items-center p-3 bg-slate-100 rounded-md cursor-grab active:cursor-grabbing"
                        >
                            <Bars3Icon className="w-5 h-5 text-slate-400 mr-3"/>
                            <span className="text-sm font-medium text-slate-900">{label}</span>
                        </li>
                    ))}
                </ul>
                <div className="mt-6 flex justify-between items-center">
                     <button
                        onClick={() => setTempOrder(DEFAULT_COLUMN_ORDER)}
                        className="px-4 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                        Đặt lại mặc định
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => onOrderSave(tempOrder)}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                        >
                            Lưu
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// FIX: Added missing ProductTableProps interface definition.
interface ProductTableProps {
    products: Product[];
    onProductSelect: (product: Product | null) => void;
    isLoading: boolean;
    activeDealListId: string | null;
}

export const ProductTable: React.FC<ProductTableProps> = ({ products, onProductSelect, isLoading, activeDealListId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'name', direction: 'asc' });

    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
    const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
    
    const orderedTableHeaders = useMemo(() => {
        return columnOrder.map(key => COLUMN_DEFINITIONS.find(c => c.key === key)!);
    }, [columnOrder]);

    const cellClassMap: Record<ColumnKey, string> = {
        name: 'font-medium text-slate-900',
        id: 'text-slate-700 font-mono',
        displayPrice: 'text-slate-900 font-medium',
        finalPrice: 'text-slate-700',
        gift: 'text-slate-700',
    };
    
    return (
        <div className="bg-white shadow-lg rounded-xl border border-slate-200 w-full h-full flex flex-col">
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="w-5 h-5 text-slate-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Tìm theo tên, ID hoặc quà tặng..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500"
                        />
                    </div>
                    <button 
                        onClick={() => setIsSettingsModalOpen(true)} 
                        className="p-2 text-slate-700 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors flex-shrink-0" 
                        aria-label="Tùy chỉnh cột"
                    >
                        <CogIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg text-center">
                        <div className="text-sm font-medium text-slate-700">Tổng SKU</div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">{isLoading ? '...' : new Intl.NumberFormat('vi-VN').format(totalSKUs)}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg text-center">
                        <div className="text-sm font-medium text-slate-700">Tổng ID (sản phẩm)</div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">{isLoading ? '...' : new Intl.NumberFormat('vi-VN').format(totalProducts)}</div>
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

            <div className="flex-grow overflow-auto">
                <table className="divide-y divide-slate-200 table-fixed">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            {orderedTableHeaders.map(({ key, label }) => (
                                 <th 
                                     key={key} 
                                     scope="col" 
                                     className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider group relative select-none"
                                     style={{ width: columnWidths[key] ? `${columnWidths[key]}px` : 'auto' }}
                                 >
                                    <button onClick={() => requestSort(key)} className="flex items-center gap-1 transition-colors hover:text-slate-900">
                                        {label} {getSortIcon(key)}
                                    </button>
                                    <div
                                        onMouseDown={handleResizeMouseDown(key)}
                                        className="absolute top-0 -right-2 w-4 h-full cursor-col-resize select-none z-20 flex items-center justify-center"
                                    >
                                        <div className="w-px h-1/2 bg-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {isLoading ? (
                            <tr><td colSpan={orderedTableHeaders.length} className="text-center py-10 text-slate-700">Đang tải dữ liệu sản phẩm...</td></tr>
                        ) : sortedProducts.length > 0 ? (
                            sortedProducts.map((product, index) => (
                                <tr key={`${product.id}-${index}`} onClick={() => onProductSelect(product)} className="hover:bg-indigo-50 cursor-pointer transition-colors">
                                    {orderedTableHeaders.map(({ key }) => (
                                        <td key={key} className={`px-6 py-4 text-sm ${cellClassMap[key]} break-words align-top`}>
                                            {key === 'displayPrice' ? formatCurrency(product[key] as number) : product[key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={orderedTableHeaders.length} className="text-center py-10 text-slate-700">Không tìm thấy sản phẩm nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
