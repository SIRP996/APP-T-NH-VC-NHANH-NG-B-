
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, ColumnMapping, DealList, FirebaseConfig } from './types';
import { fetchProducts, fetchSheetPreviewAndHeaders } from './services/googleSheetService';
import { Calculator } from './components/Calculator';
import { RefreshIcon, LinkIcon, SheetIcon, EditIcon, CogIcon, PlusIcon, TrashIcon, FirebaseIcon, GoogleIcon, LogoutIcon } from './components/Icons';

// Declare firebase globally as it's loaded from a script tag
declare const firebase: any;

// PASTE YOUR FIREBASE CONFIG HERE
// Replace this with the config object from your Firebase project settings.
const firebaseConfig: FirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};


type AppState = 'LOADING' | 'LOGIN' | 'MANAGE_LISTS' | 'CONNECT_SHEET' | 'MAP_COLUMNS' | 'VIEW_DATA';

const MAPPING_CONFIG: { key: keyof ColumnMapping; label: string; keywords: string[], required: boolean }[] = [
    { key: 'id', label: 'ID Sản phẩm', keywords: ['id happyskinvn', 'id', 'sku', 'mã sản phẩm'], required: true },
    { key: 'name', label: 'Tên Sản phẩm', keywords: ['tên sản phẩm', 'tên', 'name'], required: true },
    { key: 'finalPrice', label: 'Giá hiển thị', keywords: ['giá live (trước voucher)', 'giá live', 'giá trước voucher', 'giá', 'price', 'giá cài'], required: true },
    { key: 'modelId', label: 'Model ID', keywords: ['model id', 'model'], required: false },
];

const getSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

const getEmbedUrl = (url: string): string | null => {
    const sheetId = getSheetIdFromUrl(url);
    return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview?rm=minimal` : null;
};

const getCsvUrl = (url: string): string | null => {
    const sheetId = getSheetIdFromUrl(url);
    return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv` : null;
};

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('LOADING');
    const [dealLists, setDealLists] = useState<DealList[]>([]);
    const [activeDealListId, setActiveDealListId] = useState<string | null>(() => sessionStorage.getItem('activeDealListId'));
    
    const [editingDealList, setEditingDealList] = useState<Partial<DealList> | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetPreview, setSheetPreview] = useState<string[][]>([]);
    const [tempMapping, setTempMapping] = useState<Partial<ColumnMapping>>({});
    const [activeMappingKey, setActiveMappingKey] = useState<keyof ColumnMapping | null>(null);

    // Firebase state
    const [db, setDb] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);

    const activeDealList = useMemo(() => dealLists.find(dl => dl.id === activeDealListId), [dealLists, activeDealListId]);
    const embedUrl = useMemo(() => (activeDealList ? getEmbedUrl(activeDealList.sheetUrl) : null), [activeDealList]);
    
    useEffect(() => {
        try {
            if (firebaseConfig.apiKey === "YOUR_API_KEY") {
                setError("Vui lòng cấu hình Firebase trong file App.tsx.");
                setAppState('LOGIN'); // Show login screen but with an error
                return;
            }
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            const firestore = firebase.firestore();
            setDb(firestore);

            const unsubscribe = firebase.auth().onAuthStateChanged((user: any) => {
                if (user) {
                    setUser(user);
                    const userDocRef = firestore.collection('users').doc(user.uid);
                    
                    const unsubSnapshot = userDocRef.onSnapshot((doc: any) => {
                        const data = doc.data();
                        const lists = data?.dealLists || [];
                        setDealLists(lists);
                         if (lists.length > 0 && activeDealListId && lists.some((dl: DealList) => dl.id === activeDealListId)) {
                            setAppState('VIEW_DATA');
                        } else {
                            setAppState('MANAGE_LISTS');
                        }
                    }, (error: any) => {
                         console.error("Firestore snapshot error:", error);
                         setError("Không thể tải dữ liệu. Vui lòng kiểm tra lại quy tắc bảo mật Firestore.");
                    });
                     // Cleanup Firestore listener on user change
                     return () => unsubSnapshot();
                } else {
                    setUser(null);
                    setDealLists([]);
                    setAppState('LOGIN');
                }
            });
            // Cleanup auth listener on component unmount
            return () => unsubscribe();

        } catch (err) {
            console.error("Firebase initialization error:", err);
            setError("Cấu hình Firebase không hợp lệ. Vui lòng kiểm tra lại trong App.tsx.");
            setAppState('LOGIN');
        }
    }, [activeDealListId]);

    const handleGoogleSignIn = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).catch((error: any) => {
            console.error("Google Sign-In failed:", error);
            setError(error.message);
        });
    };

    const handleLogout = () => {
        firebase.auth().signOut();
    };
    
    const updateDealLists = async (newDealLists: DealList[]) => {
        if (user && db) {
            const userDocRef = db.collection('users').doc(user.uid);
            await userDocRef.set({ dealLists: newDealLists });
        } else {
            setError("Không thể lưu dữ liệu. Vui lòng đăng nhập lại.");
        }
    };

    const handleFetchAndMap = useCallback(async (url: string) => {
        setIsLoading(true);
        setError(null);
        const csvUrl = getCsvUrl(url);
        if (!csvUrl) {
            setError('URL không hợp lệ. Vui lòng kiểm tra lại URL.');
            setIsLoading(false);
            return;
        }
        try {
            const { headers, previewData } = await fetchSheetPreviewAndHeaders(csvUrl);
            if (headers.length === 0) throw new Error("Không tìm thấy cột nào trong Sheet. File có trống không?");
            
            setSheetHeaders(headers);
            setSheetPreview(previewData);

            const initialMapping: Partial<ColumnMapping> = editingDealList?.columnMapping || {};
            if (!editingDealList?.columnMapping) { // Only auto-map if not editing an existing mapping
                MAPPING_CONFIG.forEach(config => {
                    const foundHeader = headers.find(h => config.keywords.some(kw => h.toLowerCase().includes(kw)));
                    if (foundHeader && !Object.values(initialMapping).includes(foundHeader)) {
                       initialMapping[config.key] = foundHeader;
                    }
                });
            }
            setTempMapping(initialMapping);
            setAppState('MAP_COLUMNS');
            const firstUnmapped = MAPPING_CONFIG.find(c => c.required && !initialMapping[c.key]);
            setActiveMappingKey(firstUnmapped ? firstUnmapped.key : null);
        } catch (err) {
            setError('URL không hợp lệ hoặc không thể truy cập. Vui lòng kiểm tra lại URL và quyền chia sẻ.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [editingDealList]);

    const loadProducts = useCallback(async (dealList: DealList) => {
        setIsLoading(true);
        setError(null);
        setProducts([]);
        const csvUrl = getCsvUrl(dealList.sheetUrl);
        if (!csvUrl) {
            setError('URL không hợp lệ.');
            setIsLoading(false);
            return;
        }
        try {
            const fetchedProducts = await fetchProducts(csvUrl, dealList.columnMapping);
            setProducts(fetchedProducts);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Không thể tải dữ liệu. Vui lòng kiểm tra lại URL và ánh xạ cột.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (appState === 'VIEW_DATA' && activeDealList) {
            loadProducts(activeDealList);
        }
    }, [appState, activeDealList, loadProducts]);

    const handleConnectSheet = () => {
        if (editingDealList && getSheetIdFromUrl(editingDealList.sheetUrl || '')) {
            setError(null);
            handleFetchAndMap(editingDealList.sheetUrl!);
        } else {
            setError('URL không hợp lệ hoặc tên deal list trống.');
        }
    };
    
    const handleMappingConfirm = () => {
        const allRequiredMapped = MAPPING_CONFIG.filter(c => c.required).every(key => tempMapping[key.key]);
        if (allRequiredMapped && editingDealList) {
            const finalMapping = { ...tempMapping } as ColumnMapping;
            const newDealList: DealList = {
                id: editingDealList.id!,
                name: editingDealList.name!,
                sheetUrl: editingDealList.sheetUrl!,
                columnMapping: finalMapping
            };

            const existingIndex = dealLists.findIndex(dl => dl.id === newDealList.id);
            if (existingIndex > -1) {
                const updatedLists = [...dealLists];
                updatedLists[existingIndex] = newDealList;
                updateDealLists(updatedLists);
            } else {
                updateDealLists([...dealLists, newDealList]);
            }
            setActiveDealListId(newDealList.id);
            sessionStorage.setItem('activeDealListId', newDealList.id);
            setAppState('VIEW_DATA');
            setEditingDealList(null);
        } else {
            setError("Vui lòng ánh xạ tất cả các trường bắt buộc.");
        }
    }

    const handleHeaderClick = (header: string) => {
        if (activeMappingKey) {
            setTempMapping(prev => {
                const newMapping = { ...prev };
                Object.keys(newMapping).forEach(key => {
                    if (newMapping[key as keyof ColumnMapping] === header) {
                        delete newMapping[key as keyof ColumnMapping];
                    }
                });
                newMapping[activeMappingKey] = header;
                return newMapping;
            });
            const currentIndex = MAPPING_CONFIG.findIndex(c => c.key === activeMappingKey);
            const nextUnmapped = [...MAPPING_CONFIG.slice(currentIndex + 1), ...MAPPING_CONFIG.slice(0, currentIndex + 1)]
                .find(c => c.required && !tempMapping[c.key]);
            setActiveMappingKey(nextUnmapped ? nextUnmapped.key : null);
        }
    };

    const handleAddNewList = () => {
        setEditingDealList({ id: Date.now().toString() });
        setAppState('CONNECT_SHEET');
    }
    
    const handleEditList = (list: DealList) => {
        setEditingDealList(list);
        setAppState('CONNECT_SHEET');
    };

    const handleDeleteList = (listId: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa deal list này?")) {
            updateDealLists(dealLists.filter(dl => dl.id !== listId));
            if (activeDealListId === listId) {
                setActiveDealListId(null);
                sessionStorage.removeItem('activeDealListId');
            }
        }
    }
    
    const handleSelectList = (listId: string) => {
        setActiveDealListId(listId);
        sessionStorage.setItem('activeDealListId', listId);
        setAppState('VIEW_DATA');
    }

    if (appState === 'LOADING') {
         return (
             <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                     <RefreshIcon className="w-12 h-12 text-indigo-600 animate-spin" />
                     <p className="text-gray-600 font-medium">Đang tải...</p>
                </div>
            </div>
         )
    }

    if (appState === 'LOGIN') {
        return (
             <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg border border-gray-200 text-center">
                    <SheetIcon className="w-12 h-12 mx-auto text-green-600"/>
                    <h1 className="text-3xl font-bold text-gray-800 mt-4">Công cụ Tính giá</h1>
                    <p className="mt-2 text-gray-600">Đăng nhập để quản lý các Deal List của bạn.</p>
                    
                    {error && (<div className="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-left" role="alert"><p>{error}</p></div>)}

                    <div className="mt-8">
                        <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50">
                            <GoogleIcon className="w-5 h-5" />
                            Đăng nhập với Google
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (appState === 'MANAGE_LISTS') {
        return (
             <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Quản lý Deal Lists</h1>
                            <p className="mt-1 text-gray-600">Chào, {user?.displayName || 'bạn'}!</p>
                        </div>
                         <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50">
                            <LogoutIcon className="w-4 h-4" /> Đăng xuất
                        </button>
                    </div>

                    <div className="mt-8 space-y-4">
                        {dealLists.map(list => (
                            <div key={list.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="font-medium text-gray-800">{list.name}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleSelectList(list.id)} className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Chọn</button>
                                    <button onClick={() => handleEditList(list)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-md"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteList(list.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-200 rounded-md"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                        {dealLists.length === 0 && <p className="text-center text-gray-500 py-4">Chưa có deal list nào.</p>}
                    </div>

                    <div className="mt-8">
                        <button onClick={handleAddNewList} className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                            <PlusIcon className="w-5 h-5" />
                            Thêm Deal List mới
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (appState === 'CONNECT_SHEET') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mt-4">{editingDealList?.columnMapping ? 'Chỉnh sửa' : 'Thêm mới'} Deal List</h1>
                    </div>
                    
                    <div className="mt-8 space-y-4">
                         <div>
                            <label htmlFor="dealListNameInput" className="block text-sm font-medium text-gray-700">Tên Deal List</label>
                            <input id="dealListNameInput" type="text" value={editingDealList?.name || ''} onChange={(e) => setEditingDealList(p => ({...p, name: e.target.value}))} placeholder="Ví dụ: KOC A - Livestream 6/6" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="sheetUrlInput" className="block text-sm font-medium text-gray-700">URL Chia sẻ Google Sheet</label>
                            <input id="sheetUrlInput" type="text" value={editingDealList?.sheetUrl || ''} onChange={(e) => setEditingDealList(p => ({...p, sheetUrl: e.target.value}))} placeholder="https://docs.google.com/spreadsheets/d/..." className="mt-1 w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" aria-label="Google Sheet URL" />
                        </div>
                    </div>
                    
                    {error && (<div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert"><p>{error}</p></div>)}

                    <div className="mt-8 flex justify-between">
                         <button onClick={() => setAppState('MANAGE_LISTS')} className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">Hủy</button>
                         <button onClick={handleConnectSheet} disabled={isLoading || !editingDealList?.name || !editingDealList?.sheetUrl} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                            {isLoading ? 'Đang xử lý...' : 'Tiếp tục'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }
    
    if (appState === 'MAP_COLUMNS') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-7xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
                    <div className="text-center">
                       <CogIcon className="w-12 h-12 mx-auto text-indigo-600"/>
                        <h1 className="text-3xl font-bold text-gray-800 mt-4">Ánh xạ Cột Dữ liệu</h1>
                        <p className="mt-2 text-gray-600">Nhấp vào một trường, sau đó nhấp vào tiêu đề cột tương ứng để ánh xạ.</p>
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
                                                   <button onClick={() => handleHeaderClick(header)} className={`w-full text-left p-1 rounded transition-colors ${Object.values(tempMapping).includes(header) ? 'bg-indigo-200 text-indigo-800 font-bold' : 'hover:bg-gray-200'}`}>
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
                                                    <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 truncate max-w-xs">{cell}</td>
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
                        <button onClick={() => setAppState('CONNECT_SHEET')} className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">Quay lại</button>
                        <button onClick={handleMappingConfirm} className="px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700">Xác nhận & Tải Dữ liệu</button>
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
                             <label htmlFor="dealListSelect" className="text-xs text-gray-500">Deal List hiện tại</label>
                             <select id="dealListSelect" value={activeDealListId || ''} onChange={e => handleSelectList(e.target.value)} className="text-xl font-bold text-gray-800 bg-transparent border-0 focus:ring-0 p-0">
                                {dealLists.map(dl => <option key={dl.id} value={dl.id}>{dl.name}</option>)}
                             </select>
                            <p className="text-sm text-gray-500">{lastUpdated ? `Cập nhật lần cuối: ${lastUpdated.toLocaleTimeString('vi-VN')}` : 'Đang tải...'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => activeDealList && loadProducts(activeDealList)} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /> Làm mới
                        </button>
                         <button onClick={() => activeDealList && handleEditList(activeDealList)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            <EditIcon className="w-5 h-5" /> Sửa
                        </button>
                        <button onClick={() => setAppState('MANAGE_LISTS')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                           <CogIcon className="w-5 h-5" /> Quản lý
                        </button>
                         <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                           <LogoutIcon className="w-5 h-5" /> Đăng xuất
                        </button>
                    </div>
                </div>
                {error && <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
            </header>
            
            <main className="flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
                <section className="lg:w-1/3 lg:flex-shrink-0">
                    {activeDealList && <Calculator key={activeDealList.id} products={products} dealListName={activeDealList.name} />}
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
