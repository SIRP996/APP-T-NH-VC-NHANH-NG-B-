import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, ColumnMapping } from './types';
import { fetchProducts, fetchSheetPreviewAndHeaders } from './services/googleSheetService';
import { Calculator } from './components/Calculator';
import { RefreshIcon, LinkIcon, SheetIcon, EditIcon, CogIcon } from './components/Icons';

type AppState = 'CONNECT_SHEET' | 'MAP_COLUMNS' | 'VIEW_DATA';

const MAPPING_CONFIG: { key: keyof ColumnMapping; label: string; keywords: string[], required: boolean }[] = [
    { key: 'id', label: 'ID Sản phẩm', keywords: ['id happyskinvn', 'id', 'sku', 'mã sản phẩm'], required: true },
    { key: 'name', label: 'Tên Sản phẩm', keywords: ['tên sản phẩm', 'tên', 'name'], required: true },
    { key: 'finalPrice', label: 'Giá hiển thị', keywords: ['giá live (trước voucher)', 'giá live', 'giá trước voucher', 'giá', 'price', 'giá cài'], required: true },
    { key: 'modelId', label: 'Model ID', keywords: ['model id', 'model'], required: false },
];

// --- URL Helper Functions ---
const getSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

const getEmbedUrl = (url: string): string | null => {
    const sheetId = getSheetIdFromUrl(url);
    // Using /preview is cleaner for embedding
    return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview?rm=minimal` : null;
};

const getCsvUrl = (url: string): string | null => {
    const sheetId = getSheetIdFromUrl(url);
    return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv` : null;
};
// ----------------------------


const App: React.FC = () => {
    const [sheetUrl, setSheetUrl] = useState<string | null>(() => localStorage.getItem('googleSheetUrl'));
    const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(() => {
        const saved = localStorage.getItem('googleSheetColumnMapping');
        return saved ? JSON.parse(saved) : null;
    });

    const [appState, setAppState] = useState<AppState>('VIEW_DATA');
    const [tempUrl, setTempUrl] = useState<string>(sheetUrl || '');
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetPreview, setSheetPreview] = useState<string[][]>([]);
    const [tempMapping, setTempMapping] = useState<Partial<ColumnMapping>>({});
    const [activeMappingKey, setActiveMappingKey] = useState<keyof ColumnMapping | null>(null);

    const embedUrl = useMemo(() => (sheetUrl ? getEmbedUrl(sheetUrl) : null), [sheetUrl]);

    const handleFetchAndMap = useCallback(async (url: string) => {
        setIsLoading(true);
        setError(null);
        const csvUrl = getCsvUrl(url);
        if (!csvUrl) {
            setError('URL không hợp lệ. Vui lòng kiểm tra lại URL.');
            setAppState('CONNECT_SHEET');
            setIsLoading(false);
            return;
        }
        try {
            const { headers, previewData } = await fetchSheetPreviewAndHeaders(csvUrl);
            if (headers.length === 0) {
                throw new Error("Không tìm thấy cột nào trong Sheet. File có trống không?");
            }
            setSheetHeaders(headers);
            setSheetPreview(previewData);

            const initialMapping: Partial<ColumnMapping> = {};
            MAPPING_CONFIG.forEach(config => {
                const foundHeader = headers.find(h => config.keywords.some(kw => h.toLowerCase().includes(kw)));
                if (foundHeader && !Object.values(initialMapping).includes(foundHeader)) {
                   initialMapping[config.key] = foundHeader;
                }
            });
            setTempMapping(initialMapping);
            setAppState('MAP_COLUMNS');
            const firstUnmapped = MAPPING_CONFIG.find(c => c.required && !initialMapping[c.key]);
            setActiveMappingKey(firstUnmapped ? firstUnmapped.key : null);

        } catch (err) {
            setError('URL không hợp lệ hoặc không thể truy cập. Vui lòng kiểm tra lại URL và quyền chia sẻ.');
            console.error(err);
            setAppState('CONNECT_SHEET');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (sheetUrl && columnMapping) {
            setAppState('VIEW_DATA');
        } else if (sheetUrl) {
            handleFetchAndMap(sheetUrl);
        } else {
            setAppState('CONNECT_SHEET');
        }
    }, [sheetUrl, columnMapping, handleFetchAndMap]);

    const loadProducts = useCallback(async (url: string, mapping: ColumnMapping) => {
        setIsLoading(true);
        setError(null);
        const csvUrl = getCsvUrl(url);
        if (!csvUrl) {
            setError('URL không hợp lệ.');
            setIsLoading(false);
            return;
        }
        try {
            const fetchedProducts = await fetchProducts(csvUrl, mapping);
            setProducts(fetchedProducts);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Không thể tải dữ liệu nền cho máy tính. Vui lòng kiểm tra lại URL và ánh xạ cột.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (appState === 'VIEW_DATA' && sheetUrl && columnMapping) {
            loadProducts(sheetUrl, columnMapping);
        }
    }, [appState, sheetUrl, columnMapping, loadProducts]);

    const handleConnectSheet = () => {
        if (getSheetIdFromUrl(tempUrl)) {
            setError(null);
            localStorage.setItem('googleSheetUrl', tempUrl);
            setSheetUrl(tempUrl);
            // useEffect will trigger handleFetchAndMap
        } else {
            setError('URL không hợp lệ. Vui lòng dán link chia sẻ Google Sheet (ví dụ: https://docs.google.com/spreadsheets/d/...).');
        }
    };
    
    const handleMappingConfirm = () => {
        const requiredFields = MAPPING_CONFIG.filter(c => c.required).map(c => c.key);
        const allRequiredMapped = requiredFields.every(key => tempMapping[key]);
        
        if (allRequiredMapped) {
            const finalMapping = { ...tempMapping } as ColumnMapping;
            localStorage.setItem('googleSheetColumnMapping', JSON.stringify(finalMapping));
            setColumnMapping(finalMapping);
            // useEffect will trigger state change to VIEW_DATA
        } else {
            setError("Vui lòng ánh xạ tất cả các trường bắt buộc: ID Sản phẩm, Tên Sản phẩm, và Giá hiển thị.");
        }
    }
    
    const handleDisconnect = () => {
        localStorage.removeItem('googleSheetUrl');
        localStorage.removeItem('googleSheetColumnMapping');
        setSheetUrl(null);
        setColumnMapping(null);
        setProducts([]);
        setTempUrl('');
        setError(null);
        // useEffect will trigger state change to CONNECT_SHEET
    }
    
    const handleEditMapping = () => {
        if (!sheetUrl) return;
        localStorage.removeItem('googleSheetColumnMapping');
        setColumnMapping(null);
        // useEffect will trigger handleFetchAndMap
    }

    const handleHeaderClick = (header: string) => {
        if (activeMappingKey) {
            setTempMapping(prev => {
                const newMapping = { ...prev };
                // Unmap any other field that might be using this header
                for (const key in newMapping) {
                    if (newMapping[key as keyof ColumnMapping] === header) {
                        delete newMapping[key as keyof ColumnMapping];
                    }
                }
                newMapping[activeMappingKey] = header;
                return newMapping;
            });
            // Auto-advance to next unmapped required field
            const currentIndex = MAPPING_CONFIG.findIndex(c => c.key === activeMappingKey);
            const nextUnmapped = MAPPING_CONFIG.slice(currentIndex + 1).concat(MAPPING_CONFIG.slice(0, currentIndex + 1))
                                            .find(c => c.required && !tempMapping[c.key]);
            setActiveMappingKey(nextUnmapped ? nextUnmapped.key : null);
        }
    };


    if (appState === 'CONNECT_SHEET') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <div className="text-center">
                        <SheetIcon className="w-12 h-12 mx-auto text-green-600"/>
                        <h1 className="text-3xl font-bold text-gray-800 mt-4">Kết nối Google Sheet của bạn</h1>
                        <p className="mt-2 text-gray-600">Để bắt đầu, hãy dán URL chia sẻ của Google Sheet.</p>
                    </div>
                    
                    <div className="mt-8 space-y-2">
                        <label htmlFor="sheetUrlInput" className="block text-sm font-medium text-gray-700">URL Chia sẻ Google Sheet</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <LinkIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="sheetUrlInput" type="text" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" aria-label="Google Sheet URL" />
                            </div>
                            <button onClick={handleConnectSheet} disabled={isLoading} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                                {isLoading ? 'Đang xử lý...' : 'Tiếp tục'}
                            </button>
                        </div>
                    </div>
                    
                    {error && (<div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert"><p>{error}</p></div>)}

                    <div className="mt-8 text-sm text-gray-500">
                        <h4 className="font-semibold text-gray-600">Cách lấy URL:</h4>
                        <ol className="list-decimal list-inside space-y-1 mt-2">
                            <li>Trong Google Sheets, nhấp vào nút "Chia sẻ" màu xanh ở góc trên bên phải.</li>
                            <li>Trong mục "Quyền truy cập chung", thay đổi thành <code className="bg-gray-100 px-1 py-0.5 rounded">Bất kỳ ai có đường liên kết</code>.</li>
                            <li>Đảm bảo vai trò được đặt là <code className="bg-gray-100 px-1 py-0.5 rounded">Người xem</code>.</li>
                            <li>Nhấp vào "Sao chép đường liên kết" và dán vào ô trên.</li>
                        </ol>
                    </div>
                </div>
            </div>
        )
    }
    
    if (appState === 'MAP_COLUMNS') {
        const mappedHeaders = Object.values(tempMapping);
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-7xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
                    <div className="text-center">
                       <CogIcon className="w-12 h-12 mx-auto text-indigo-600"/>
                        <h1 className="text-3xl font-bold text-gray-800 mt-4">Ánh xạ Cột Dữ liệu</h1>
                        <p className="mt-2 text-gray-600">Nhấp vào một trường, sau đó nhấp vào tiêu đề cột tương ứng trong bảng xem trước để ánh xạ.</p>
                    </div>
                    
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-1 space-y-3">
                            <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">Trường dữ liệu</h3>
                            {MAPPING_CONFIG.map(({ key, label, required }) => (
                                <button key={key} onClick={() => setActiveMappingKey(key)} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${activeMappingKey === key ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                    <div className="font-semibold text-gray-900">{label} {required && <span className="text-red-500">*</span>}</div>
                                    <div className={`text-sm truncate ${tempMapping[key] ? 'text-indigo-700 font-medium' : 'text-gray-500'}`}>
                                        {tempMapping[key] ? tempMapping[key] : 'Chưa chọn'}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="lg:col-span-3 overflow-x-auto">
                           <div className="border border-gray-200 rounded-lg p-1 bg-gray-50 min-w-full inline-block">
                               <table className="min-w-full divide-y divide-gray-200">
                                   <thead className="bg-gray-100">
                                       <tr>
                                           {sheetHeaders.map((header, index) => (
                                               <th key={index} scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                   <button onClick={() => handleHeaderClick(header)} className={`w-full text-left p-1 rounded transition-colors ${mappedHeaders.includes(header) ? 'bg-indigo-200 text-indigo-800 font-bold' : 'hover:bg-gray-200'}`}>
                                                       {header || `Cột ${index + 1}`}
                                                   </button>
                                               </th>
                                           ))}
                                       </tr>
                                   </thead>
                                   <tbody className="bg-white divide-y divide-gray-200">
                                        {sheetPreview.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 truncate max-w-xs">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                   </tbody>
                               </table>
                           </div>
                        </div>
                    </div>

                    {error && (<div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert"><p>{error}</p></div>)}

                    <div className="mt-8 flex justify-between items-center">
                        <button onClick={handleDisconnect} className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">Bắt đầu lại</button>
                        <button onClick={handleMappingConfirm} className="px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Xác nhận & Tải Dữ liệu
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col">
            <header className="flex-shrink-0 mb-6">
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SheetIcon className="w-10 h-10 text-green-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Bảng điều khiển giá</h1>
                            <p className="text-sm text-gray-500">
                                {lastUpdated ? `Cập nhật lần cuối: ${lastUpdated.toLocaleTimeString('vi-VN')}` : 'Đang tải...'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => sheetUrl && columnMapping && loadProducts(sheetUrl, columnMapping)} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            Làm mới
                        </button>
                        <button onClick={handleEditMapping} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <EditIcon className="w-5 h-5" />
                            Sửa
                        </button>
                        <button onClick={handleDisconnect} className="flex items-center gap-2 px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                            Ngắt kết nối
                        </button>
                    </div>
                </div>
                {error && <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
            </header>
            
            <main className="flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
                <section className="lg:w-1/3 lg:flex-shrink-0">
                    <Calculator products={products} />
                </section>

                <section className="flex-grow lg:w-2/3 min-h-[600px] lg:min-h-0">
                    {embedUrl && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 h-full flex flex-col">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex-shrink-0">Xem trước Google Sheet</h2>
                            <div className="flex-grow border border-gray-200 rounded-lg overflow-hidden">
                                <iframe src={embedUrl} title="Google Sheet Preview" className="w-full h-full"></iframe>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default App;
