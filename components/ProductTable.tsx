import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { SearchIcon, SortAscIcon, SortDescIcon } from './Icons';

type SortKey = keyof Product;
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return "0";
    return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

interface ProductTableProps {
    products: Product[];
    onProductSelect: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ products, onProductSelect }) => {
    const [filterText, setFilterText] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const filteredProducts = useMemo(() => {
        const lowercasedFilter = filterText.toLowerCase();
        if (!lowercasedFilter) {
            return products;
        }
        return products.filter(product =>
            product.name.toLowerCase().includes(lowercasedFilter) ||
            product.id.toLowerCase().includes(lowercasedFilter) ||
            product.modelId.toLowerCase().includes(lowercasedFilter)
        );
    }, [products, filterText]);

    const sortedProducts = useMemo(() => {
        let sortableItems = [...filteredProducts];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                }
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'ascending' 
                        ? aValue.localeCompare(bValue) 
                        : bValue.localeCompare(aValue);
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredProducts, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) {
            return null;
        }
        return sortConfig.direction === 'ascending' ? <SortAscIcon /> : <SortDescIcon />;
    };
    
    const tableHeaders: { key: SortKey, label: string }[] = [
        { key: 'name', label: 'Tên sản phẩm' },
        { key: 'id', label: 'ID' },
        { key: 'finalPrice', label: 'Giá' },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="w-5 h-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Lọc sản phẩm trong bảng..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                            {tableHeaders.map(({ key, label }) => (
                                <th
                                    key={key}
                                    scope="col"
                                    onClick={() => requestSort(key)}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                                >
                                    <div className="flex items-center gap-2">
                                        {label}
                                        {getSortIcon(key)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedProducts.map((product) => (
                            <tr
                                key={product.id}
                                onClick={() => onProductSelect(product)}
                                className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(product.finalPrice)}đ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedProducts.length === 0 && (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                        <p>Không tìm thấy sản phẩm nào.</p>
                    </div>
                )}
            </div>
             <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center flex-shrink-0">
                Hiển thị {sortedProducts.length} trên {products.length} sản phẩm
            </div>
        </div>
    );
};
