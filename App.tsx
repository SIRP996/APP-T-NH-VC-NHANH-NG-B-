
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, ColumnMapping, DealList, FirebaseConfig } from './types';
import { fetchProducts, fetchSheetPreviewAndHeaders } from './services/googleSheetService';
import { Calculator } from './components/Calculator';
import { ProductTable } from './components/ProductTable';
import { RefreshIcon, LinkIcon, SheetIcon, EditIcon, CogIcon, PlusIcon, TrashIcon, FirebaseIcon, GoogleIcon, LogoutIcon, MailIcon, LockClosedIcon, SunIcon, MoonIcon } from './components/Icons';

// Declare firebase globally as it's loaded from a script tag
declare const firebase: any;

// Firebase configuration provided by the user.
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyCtlbPNXyXVoFSzKH4y7heD2Ac-lk9xVEA",
  authDomain: "tinhvc.firebaseapp.com",
  projectId: "tinhvc",
  storageBucket: "tinhvc.appspot.com",
  messagingSenderId: "166650240954",
  appId: "1:166650240954:web:c37e1eb1f5d43748e54783"
};


type AppState = 'LOADING' | 'LOGIN' | 'MANAGE_LISTS' | 'CONNECT_SHEET' | 'MAP_COLUMNS' | 'VIEW_DATA';
type Theme = 'light' | 'dark';

const MAPPING_CONFIG: { key: keyof ColumnMapping; label: string; keywords: string[], required: boolean }[] = [
    { key: 'id', label: 'ID Sản phẩm', keywords: ['id happyskinvn', 'id', 'sku', 'mã sản phẩm'], required: true },
    { key: 'name', label: 'Tên Sản phẩm', keywords: ['tên sản phẩm', 'tên', 'name'], required: true },
    { key: 'finalPrice', label: 'Giá hiển thị', keywords: ['giá live (trước voucher)', 'giá live', 'giá trước voucher', 'giá', 'price', 'giá cài'], required: true },
    { key: 'modelId', label: 'Model ID', keywords: ['model id', 'model'], required: false },
];

const getCsvUrl = (url: string): string | null => {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv` : null;
};

const LoginScreen: React.FC<{
    onGoogleSignIn: () => void;
    isFirebaseReady: boolean;
    isConfigPlaceholder: boolean;
}> = ({ onGoogleSignIn, isFirebaseReady, isConfigPlaceholder }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            if (mode === 'login') {
                await firebase.auth().signInWithEmailAndPassword(email, password);
            } else if (mode === 'register') {
                await firebase.auth().createUserWithEmailAndPassword(email, password);
            } else if (mode === 'reset') {
                await firebase.auth().sendPasswordResetEmail(email);
                setMessage('Email khôi phục mật khẩu đã được gửi!');
                setMode('login');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const title = mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Đăng ký tài khoản' : 'Quên mật khẩu';
    const buttonText = mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Đăng ký' : 'Gửi email khôi phục';
    const switchModeText = mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?';

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center max-w-sm w-full">
                <FirebaseIcon className="mx-auto w-16 h-16 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Truy cập vào công cụ quản lý deal list của bạn.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MailIcon className="w-5 h-5 text-gray-400" />
                        </span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    {mode !== 'reset' && (
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <LockClosedIcon className="w-5 h-5 text-gray-400" />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mật khẩu"
                                required
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    )}
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {message && <p className="text-green-600 text-sm">{message}</p>}

                    <button
                        type="submit"
                        disabled={isLoading || !isFirebaseReady || isConfigPlaceholder}
                        className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? 'Đang xử lý...' : buttonText}
                    </button>
                </form>

                <div className="text-sm text-center mt-4">
                    {mode !== 'reset' && (
                        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                            {switchModeText} {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
                        </button>
                    )}
                     {mode === 'login' && (
                        <>
                            <span className="mx-2 text-gray-400">|</span>
                            <button onClick={() => setMode('reset')} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">Quên mật khẩu?</button>
                        </>
                    )}
                     {mode === 'reset' && (
                         <button onClick={() => setMode('login')} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">Quay lại đăng nhập</button>
                    )}
                </div>

                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400 dark:text-gray-500 text-sm">hoặc</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                <button
                    onClick={onGoogleSignIn}
                    disabled={!isFirebaseReady || isConfigPlaceholder}
                    className="w-full inline-flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                    <GoogleIcon className="w-5 h-5" />
                    Tiếp tục với Google
                </button>
                {isConfigPlaceholder && (
                    <p className="text-red-500 text-xs mt-4">Lỗi: Cấu hình Firebase chưa được cập nhật. Vui lòng liên hệ quản trị viên.</p>
                )}
            </div>
        </div>
    );
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
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const [db, setDb] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);
    
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const activeDealList = useMemo(() => dealLists.find(dl => dl.id === activeDealListId), [dealLists, activeDealListId]);
    
    useEffect(() => {
        try {
            if (firebaseConfig.apiKey === "YOUR_API_KEY") {
                setError("Vui lòng cấu hình Firebase trong file App.tsx.");
                setIsFirebaseReady(false);
                setAppState('LOGIN');
                return;
            }
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            setIsFirebaseReady(true);
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
                     return () => unsubSnapshot();
                } else {
                    setUser(null);
                    setDealLists([]);
                    setAppState('LOGIN');
                }
            });
            return () => unsubscribe();

        } catch (err) {
            console.error("Firebase initialization error:", err);
            setError("Cấu hình Firebase không hợp lệ. Vui lòng kiểm tra lại trong App.tsx.");
            setIsFirebaseReady(false);
            setAppState('LOGIN');
        }
    }, [activeDealListId]);

    const handleGoogleSignIn = () => {
        if (!isFirebaseReady) return;
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).catch((error: any) => {
            console.error("Google Sign-In failed:", error);
            setError(error.message);
        });
    };

    const handleLogout = () => firebase.auth().signOut();
    const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    
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
            if (firstUnmapped) setActiveMappingKey(firstUnmapped.key);

        } catch (err: any) {
            setError(`Lỗi: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [editingDealList]);

    const loadProducts = useCallback(async (dealList: DealList | undefined) => {
        if (!dealList) {
            setError("Deal list không hợp lệ.");
            setAppState('MANAGE_LISTS');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSelectedProduct(null); // Reset selection when loading new products
        const csvUrl = getCsvUrl(dealList.sheetUrl);
        if (!csvUrl) {
            setError("URL Google Sheet không hợp lệ.");
            setIsLoading(false);
            return;
        }

        try {
            const fetchedProducts = await fetchProducts(csvUrl, dealList.columnMapping);
            setProducts(fetchedProducts);
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(`Lỗi tải sản phẩm: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (appState === 'VIEW_DATA' && activeDealList) {
            loadProducts(activeDealList);
        }
    }, [appState, activeDealList, loadProducts]);

    const handleSetActiveDealList = (id: string) => {
        setActiveDealListId(id);
        sessionStorage.setItem('activeDealListId', id);
        setAppState('VIEW_DATA');
    };
    
    const handleAddNewList = () => {
        setEditingDealList({ id: `dl_${new Date().getTime()}`, name: '', sheetUrl: '' });
        setAppState('CONNECT_SHEET');
    };
    
    const handleEditList = (dealList: DealList) => {
        setEditingDealList(dealList);
        setAppState('CONNECT_SHEET');
    };
    
    const handleDeleteList = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa deal list này không?")) {
            const newLists = dealLists.filter(dl => dl.id !== id);
            await updateDealLists(newLists);
            if (activeDealListId === id) {
                setActiveDealListId(null);
                sessionStorage.removeItem('activeDealListId');
                setAppState('MANAGE_LISTS');
            }
        }
    };
    
    const handleConnectSheetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDealList?.sheetUrl) handleFetchAndMap(editingDealList.sheetUrl);
    };
    
    const handleMappingSave = async () => {
        const isMappingComplete = MAPPING_CONFIG.every(c => !c.required || (tempMapping as ColumnMapping)[c.key]);
        if (!isMappingComplete) {
            setError("Vui lòng điền tất cả các cột bắt buộc (*).");
            return;
        }

        const finalDealList: DealList = { ...editingDealList, columnMapping: tempMapping as ColumnMapping } as DealList;
        const existingIndex = dealLists.findIndex(dl => dl.id === finalDealList.id);
        let newLists = [...dealLists];
        if (existingIndex > -1) newLists[existingIndex] = finalDealList;
        else newLists.push(finalDealList);
        
        await updateDealLists(newLists);
        
        handleSetActiveDealList(finalDealList.id);
        setEditingDealList(null);
        setTempMapping({});
    };

    const isConfigPlaceholder = firebaseConfig.apiKey === "YOUR_API_KEY";

    const renderWrapper = (children: React.ReactNode) => (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {children}
        </div>
    );

    const renderLoading = () => renderWrapper(
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-600 mx-auto"></div>
                <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">Đang tải ứng dụng...</h2>
            </div>
        </div>
    );
    
    const renderManageLists = () => renderWrapper(
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Quản lý Deal Lists</h1>
                {user && (
                    <div className="flex items-center gap-2">
                         <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">{user.displayName || user.email}</span>
                        <button onClick={handleLogout} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-600" aria-label="Đăng xuất">
                            <LogoutIcon className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>
            
            <div className="space-y-4">
                {dealLists.map(dl => (
                    <div key={dl.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{dl.name}</p>
                            <a href={dl.sheetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate">{dl.sheetUrl}</a>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => handleSetActiveDealList(dl.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Vào xem</button>
                            <button onClick={() => handleEditList(dl)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><EditIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleDeleteList(dl.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                ))}
            </div>
            {dealLists.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg mt-4">
                     <SheetIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">Chưa có deal list nào</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Hãy bắt đầu bằng cách thêm một list mới.</p>
                     <div className="mt-6">
                         <button onClick={handleAddNewList} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                            Thêm Deal List
                        </button>
                    </div>
                </div>
            )}
             {dealLists.length > 0 && (
                <div className="mt-6 text-center">
                    <button onClick={handleAddNewList} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Thêm Deal List Mới
                    </button>
                </div>
            )}
        </div>
    );
    
    const renderConnectSheet = () => renderWrapper(
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{editingDealList?.columnMapping ? 'Chỉnh sửa Deal List' : 'Thêm Deal List Mới'}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Cung cấp thông tin về Google Sheet bạn muốn kết nối.</p>
                <form onSubmit={handleConnectSheetSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="dealListName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên Deal List</label>
                        <input
                            type="text"
                            id="dealListName"
                            value={editingDealList?.name || ''}
                            onChange={(e) => setEditingDealList(prev => ({...prev, name: e.target.value}))}
                            placeholder="Ví dụ: Deal 11.11"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="sheetUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL Google Sheet</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm">
                                <LinkIcon className="w-5 h-5"/>
                            </span>
                             <input
                                type="url"
                                id="sheetUrl"
                                value={editingDealList?.sheetUrl || ''}
                                onChange={(e) => setEditingDealList(prev => ({...prev, sheetUrl: e.target.value}))}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                required
                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Lưu ý: Sheet phải được chia sẻ công khai ("Bất kỳ ai có đường liên kết").</p>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setAppState('MANAGE_LISTS')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">Hủy</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                            {isLoading ? 'Đang kiểm tra...' : 'Tiếp tục'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderMapColumns = () => renderWrapper(
       <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Ánh xạ Cột Dữ liệu</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Hãy cho chúng tôi biết cột nào tương ứng với dữ liệu nào. Các cột có dấu (*) là bắt buộc.</p>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {MAPPING_CONFIG.map(config => (
                        <div key={config.key}>
                            <button
                                onClick={() => setActiveMappingKey(config.key)}
                                className={`w-full text-left p-4 border rounded-lg transition-colors ${activeMappingKey === config.key ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-300' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                            >
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{config.label} {config.required && <span className="text-red-500">*</span>}</p>
                                <p className={`mt-1 text-sm truncate ${tempMapping[config.key] ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {tempMapping[config.key] || 'Chưa chọn'}
                                </p>
                            </button>
                        </div>
                    ))}
                    <div className="flex justify-end gap-3 pt-4">
                         <button type="button" onClick={() => setAppState('CONNECT_SHEET')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">Quay lại</button>
                        <button onClick={handleMappingSave} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Lưu & Xem Dữ liệu</button>
                    </div>
                </div>

                <div className="lg:col-span-3">
                     <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700 h-full">
                        <p className="font-medium mb-2 dark:text-gray-200">Chọn cột từ Google Sheet cho: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{MAPPING_CONFIG.find(c => c.key === activeMappingKey)?.label}</span></p>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {sheetHeaders.map((header, index) => (
                                     header && <button
                                        key={index}
                                        onClick={() => setTempMapping(prev => ({...prev, [activeMappingKey!]: header}))}
                                        className={`p-3 rounded-md text-sm text-left truncate transition-colors ${tempMapping[activeMappingKey!] === header ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                     >
                                        {header}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Xem trước Dữ liệu</h3>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
                     <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {sheetHeaders.map((header, index) => (
                                    <th key={index} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                             {sheetPreview.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderMainView = () => (
        <div className="h-screen w-full flex flex-col bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-sm p-3 flex justify-between items-center z-10 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                     <SheetIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                     <select 
                        value={activeDealListId || ''} 
                        onChange={(e) => handleSetActiveDealList(e.target.value)}
                        className="font-semibold text-gray-800 dark:text-gray-100 bg-transparent border-0 focus:ring-0"
                    >
                         {dealLists.map(dl => (
                            <option key={dl.id} value={dl.id}>{dl.name}</option>
                        ))}
                    </select>
                     <button onClick={() => setAppState('MANAGE_LISTS')} className="p-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CogIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => loadProducts(activeDealList)} disabled={isLoading} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">
                            {isLoading ? 'Đang tải...' : `Cập nhật lần cuối: ${lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}`}
                        </span>
                    </button>
                    <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                    </button>
                     {user && (
                        <div className="flex items-center gap-2">
                             <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">{user.displayName || user.email}</span>
                            <button onClick={handleLogout} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600" aria-label="Đăng xuất">
                                <LogoutIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    )}
                </div>
            </header>
            
            {error && <div className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 p-3 text-center text-sm">{error}</div>}

            <main className="flex-grow flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
                <div className="lg:w-1/3 xl:w-1/4 flex-shrink-0">
                    <Calculator products={products} dealListName={activeDealList?.name || 'N/A'} selectedProduct={selectedProduct} />
                </div>
                <div className="flex-grow min-h-[400px]">
                    <ProductTable products={products} onProductSelect={setSelectedProduct} />
                </div>
            </main>
        </div>
    );
    
    switch (appState) {
        case 'LOADING':
            return renderLoading();
        case 'LOGIN':
            return <LoginScreen onGoogleSignIn={handleGoogleSignIn} isFirebaseReady={isFirebaseReady} isConfigPlaceholder={isConfigPlaceholder} />;
        case 'MANAGE_LISTS':
            return renderManageLists();
        case 'CONNECT_SHEET':
            return renderConnectSheet();
        case 'MAP_COLUMNS':
            return renderMapColumns();
        case 'VIEW_DATA':
            if (activeDealList) return renderMainView();
            setAppState('MANAGE_LISTS'); // Fallback if no active list
            return renderManageLists();
        default:
            return <LoginScreen onGoogleSignIn={handleGoogleSignIn} isFirebaseReady={isFirebaseReady} isConfigPlaceholder={isConfigPlaceholder} />;
    }
};

export default App;
