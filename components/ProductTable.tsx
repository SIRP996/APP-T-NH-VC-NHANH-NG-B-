import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';
import { SearchIcon, Bars3Icon } from './Icons';

const SortAscIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 ml-1 opacity-60" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h9m-9 4h6m4-11l4-4m0 0l4 4m-4-4v12" /></svg>;
const SortDescIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 ml-1 opacity-60" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h9m-9 4h6m4 5l4-4m0 0l-4-4m4 4V3" /></svg>;


interface ProductTableProps {
    products: Product[];
    onProductSelect: (product: Product) => void;
    isLoading: boolean;
    activeDealListId: string | null;
}

type ColumnKey = keyof Pick<Product, 'name' | 'id' | 'finalPrice'>;
type SortKey = ColumnKey;
type SortDirection = 'asc' | 'desc';

const COLUMN_DEFINITIONS: { key: ColumnKey; label: string }[] = [
    { key: 'name', label: 'Tên Sản phẩm' },
    { key: 'id', label: 'ID' },
    { key: 'finalPrice', label: 'Giá' },
];

export const ProductTable: React.FC<ProductTableProps> = ({ products, onProductSelect, isLoading, activeDealListId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'name', direction: 'asc' });

    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => COLUMN_DEFINITIONS.map(c => c.key));
    const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>({});

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

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
                         setColumnOrder(COLUMN_DEFINITIONS.map(c => c.key));
                    }
                } catch (e) {
                    setColumnOrder(COLUMN_DEFINITIONS.map(c => c.key));
                }
            } else {
                setColumnOrder(COLUMN_DEFINITIONS.map(c => c.key));
            }

            // Load column widths
            const savedWidths = localStorage.getItem(`column-widths-${activeDealListId}`);
            if (savedWidths) {
                try {
                    setColumnWidths(JSON.parse(savedWidths));
                } catch (e) {
                    setColumnWidths({});
                }
            } else {
                 setColumnWidths({});
            }
        }
    }, [activeDealListId]);

    useEffect(() => {
        if (activeDealListId) {
            localStorage.setItem(`column-order-${activeDealListId}`, JSON.stringify(columnOrder));
        }
    }, [columnOrder, activeDealListId]);

    useEffect(() => {
        if (activeDealListId && Object.keys(columnWidths).length > 0) {
            localStorage.setItem(`column-widths-${activeDealListId}`, JSON.stringify(columnWidths));
        }
    }, [columnWidths, activeDealListId]);


    const filteredProducts = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        if (!lowercasedFilter) return products;
        return products.filter(product => {
            return (
                product.name.toLowerCase().includes(lowercasedFilter) ||
                product.id.toLowerCase().includes(lowercasedFilter)
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

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        e.currentTarget.closest('th')?.classList.add('opacity-50', 'bg-indigo-100');
    };

    const handleDragEnter = (_e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.closest('th')?.classList.remove('opacity-50', 'bg-indigo-100');
        dragItem.current = null;
        dragOverItem.current = null;
    };
    
    const handleDrop = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newColumnOrder = [...columnOrder];
            const draggedItemContent = newColumnOrder.splice(dragItem.current, 1)[0];
            newColumnOrder.splice(dragOverItem.current, 0, draggedItemContent);
            setColumnOrder(newColumnOrder);
        }
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
    }, []); // No dependencies needed, setColumnWidths is stable.
    
    const orderedTableHeaders = useMemo(() => {
        return columnOrder.map(key => COLUMN_DEFINITIONS.find(c => c.key === key)!);
    }, [columnOrder]);

    const cellClassMap: Record<ColumnKey, string> = {
        name: 'font-medium text-gray-900',
        id: 'text-gray-500 font-mono',
        finalPrice: 'text-gray-600'
    };
    
    return (
        <div className="bg-white shadow-lg rounded-xl border border-gray-200 w-full h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="w-5 h-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc ID sản phẩm..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            {orderedTableHeaders.map(({ key, label }, index) => (
                                 <th 
                                     key={key} 
                                     scope="col" 
                                     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group relative select-none"
                                     style={{ width: columnWidths[key] ? `${columnWidths[key]}px` : 'auto' }}
                                 >
                                    <div 
                                        className="flex items-center"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnter={(e) => handleDragEnter(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleDrop}
                                    >
                                        <Bars3Icon className="w-4 h-4 text-gray-400 cursor-grab group-hover:opacity-100 opacity-0 transition-opacity" />
                                        <button onClick={() => requestSort(key)} className="flex items-center gap-1 transition-colors hover:text-gray-900 ml-2">
                                            {label} {getSortIcon(key)}
                                        </button>
                                    </div>
                                    <div
                                        onMouseDown={handleResizeMouseDown(key)}
                                        className="absolute top-0 -right-2 w-4 h-full cursor-col-resize select-none z-20"
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={3} className="text-center py-10 text-gray-500">Đang tải dữ liệu sản phẩm...</td></tr>
                        ) : sortedProducts.length > 0 ? (
                            sortedProducts.map((product, index) => (
                                <tr key={`${product.id}-${index}`} onClick={() => onProductSelect(product)} className="hover:bg-indigo-50 cursor-pointer transition-colors">
                                    {orderedTableHeaders.map(({ key }) => (
                                        <td key={key} className={`px-6 py-4 whitespace-nowrap text-sm ${cellClassMap[key]} overflow-hidden text-ellipsis`}>
                                            {key === 'finalPrice' ? formatCurrency(product.finalPrice) : product[key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={3} className="text-center py-10 text-gray-500">Không tìm thấy sản phẩm nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
