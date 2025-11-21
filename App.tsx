
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product, ColumnMapping, DealList, FirebaseConfig, Creator } from './types';
import { fetchProductsFromSheet, fetchSheetPreviewAndHeaders, forwardFillData } from './services/googleSheetService';
import { Calculator } from './components/Calculator';
import { ProductTable } from './components/ProductTable';
import { CreatorList } from './components/CreatorList';
import { SyncIcon, LinkIcon, SheetIcon, EditIcon, CogIcon, PlusIcon, TrashIcon, FirebaseIcon, GoogleIcon, LogoutIcon, MailIcon, LockClosedIcon, SpinnerIcon, IdentificationIcon } from './components/Icons';
import CustomDropdown from './components/CustomDropdown';
import { ProductModal } from './components/ProductModal';

// Declare firebase and XLSX globally as they're loaded from script tags
declare const firebase: any;
declare const XLSX: any;

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
type ViewDataTab = 'products' | 'creators';


const MAPPING_CONFIG: { key: keyof ColumnMapping; label: string; keywords: string[], required: boolean }[] = [
    { key: 'id', label: 'ID Sản phẩm', keywords: ['id happyskinvn', 'id', 'sku', 'mã sản phẩm'], required: true },
    { key: 'exclusiveId', label: 'ID Độc quyền', keywords: ['id độc quyền'], required: false },
    { key: 'name', label: 'Tên Sản phẩm', keywords: ['tên sản phẩm', 'tên', 'name'], required: true },
    { key: 'displayPrice', label: 'Giá hiển thị', keywords: ['giá hiển thị hiện tại', 'giá live (trước voucher)', 'giá live', 'giá trước voucher', 'giá', 'price', 'giá cài'], required: true },
    { key: 'finalPrice', label: 'Giá cuối', keywords: ['giá cuối'], required: false },
    { key: 'modelId', label: 'Model ID', keywords: ['model'], required: false },
    { key: 'gift', label: 'Quà Tặng', keywords: ['quà', 'gift', 'quà tặng'], required: false },
];

const getCsvUrl = (url: string): string | null => {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv` : null;
};

const DeleteConfirmationModal: React.FC<{
    dealList: DealList | null;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}> = ({ dealList, onClose, onConfirm, isDeleting }) => {
    if (!dealList) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md m-4 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa</h3>
                <p className="mt-2 text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa deal list <strong className="font-semibold text-slate-900">{dealList.name}</strong>?
                </p>
                <p className="mt-1 text-sm text-slate-500">
                    Tất cả dữ liệu sản phẩm liên quan cũng sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 w-28 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center shadow-lg shadow-red-200"
                    >
                        {isDeleting ? <SpinnerIcon className="w-5 h-5" /> : 'Xóa'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeleteProductConfirmationModal: React.FC<{
    product: Product | null;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}> = ({ product, onClose, onConfirm, isDeleting }) => {
    if (!product) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md m-4 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa sản phẩm</h3>
                <p className="mt-2 text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa sản phẩm <strong className="font-semibold text-slate-900">{product.name}</strong> (ID: {product.id})?
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 w-28 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center shadow-lg shadow-red-200"
                    >
                        {isDeleting ? <SpinnerIcon className="w-5 h-5" /> : 'Xóa'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const LoginScreen: React.FC<{
    onGoogleSignIn: () => void;
    isFirebaseReady: boolean;
}> = ({ onGoogleSignIn, isFirebaseReady }) => {
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
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 p-4 relative overflow-hidden">
             {/* Decorative background elements */}
             <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

            <div className="p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 text-center max-w-sm w-full relative z-10">
                <div className="bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-violet-200">
                    <FirebaseIcon className="w-10 h-10 brightness-200 grayscale contrast-200 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">{title}</h1>
                <p className="text-slate-500 mb-8 text-sm font-medium">Truy cập vào công cụ quản lý giá & deal.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MailIcon className="w-5 h-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                        </span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="w-full pl-10 pr-3 py-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all outline-none text-sm font-medium"
                        />
                    </div>

                    {mode !== 'reset' && (
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <LockClosedIcon className="w-5 h-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mật khẩu"
                                required
                                className="w-full pl-10 pr-3 py-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all outline-none text-sm font-medium"
                            />
                        </div>
                    )}
                    
                    {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
                    {message && <p className="text-green-600 text-sm bg-green-50 p-2 rounded-lg border border-green-100">{message}</p>}

                    <button
                        type="submit"
                        disabled={isLoading || !isFirebaseReady}
                        className="w-full py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-violet-200 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        {isLoading ? 'Đang xử lý...' : buttonText}
                    </button>
                </form>

                <div className="text-sm text-center mt-6">
                    {mode !== 'reset' && (
                        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-violet-600 hover:text-violet-700 hover:underline">
                            {switchModeText} {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
                        </button>
                    )}
                     {mode === 'login' && (
                        <>
                            <span className="mx-2 text-slate-300">|</span>
                            <button onClick={() => setMode('reset')} className="font-medium text-slate-500 hover:text-slate-800">Quên mật khẩu?</button>
                        </>
                    )}
                     {mode === 'reset' && (
                         <button onClick={() => setMode('login')} className="font-bold text-violet-600 hover:text-violet-700 hover:underline">Quay lại đăng nhập</button>
                    )}
                </div>

                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase font-bold tracking-wider">hoặc</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button
                    onClick={onGoogleSignIn}
                    disabled={!isFirebaseReady}
                    className="w-full inline-flex justify-center items-center gap-3 py-3 px-4 border border-slate-200 rounded-xl shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <GoogleIcon className="w-5 h-5" />
                    Tiếp tục với Google
                </button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('LOADING');
    const [dealLists, setDealLists] = useState<DealList[]>([]);
    const [activeDealListId, setActiveDealListId] = useState<string | null>(() => sessionStorage.getItem('activeDealListId'));
    const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
    
    const [editingDealList, setEditingDealList] = useState<Partial<DealList> | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [creators, setCreators] = useState<Creator[]>([]);
    const [isCreatorLoading, setIsCreatorLoading] = useState<boolean>(false);
    const [activeViewDataTab, setActiveViewDataTab] = useState<ViewDataTab>('products');

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetPreview, setSheetPreview] = useState<string[][]>([]);
    const [tempMapping, setTempMapping] = useState<Partial<ColumnMapping>>({});
    const [activeMappingKey, setActiveMappingKey] = useState<keyof ColumnMapping | null>(null);
    const [tempExcelData, setTempExcelData] = useState<any[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isInitialLoad = useRef(true);
    
    // Ref for the search input in ProductTable to handle global hotkeys
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [listPendingDeletion, setListPendingDeletion] = useState<DealList | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Product Editing State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [productPendingDeletion, setProductPendingDeletion] = useState<Product | null>(null);
    const [isDeletingProduct, setIsDeletingProduct] = useState(false);


    // Firebase state
    const [db, setDb] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    const activeDealList = useMemo(() => dealLists.find(dl => dl.id === activeDealListId), [dealLists, activeDealListId]);
    
    // Global Hotkey Listener
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Focus search input on '/' or 'Ctrl+K' or 'Cmd+K'
            if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) && appState === 'VIEW_DATA' && activeViewDataTab === 'products') {
                if (document.activeElement !== searchInputRef.current) {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [appState, activeViewDataTab]);


    // Main Firebase and Auth effect
    useEffect(() => {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            setIsFirebaseReady(true);
            const firestore = firebase.firestore();
            setDb(firestore);

            const unsubscribeAuth = firebase.auth().onAuthStateChanged((user: any) => {
                if (user) {
                    setUser(user);
                } else {
                    setUser(null);
                    setDealLists([]);
                    setProducts([]);
                    setCreators([]);
                    setAppState('LOGIN');
                }
            });
            return () => unsubscribeAuth();
        } catch (err: any) {
            console.error("Firebase initialization error:", err);
            setError("Cấu hình Firebase không hợp lệ. Vui lòng kiểm tra lại trong App.tsx.");
            setIsFirebaseReady(false);
            setAppState('LOGIN');
        }
    }, []);

    // Effect for fetching deal lists when user logs in
    useEffect(() => {
        // Reset the flag on logout or if db/user are not ready
        if (!user || !db) {
            isInitialLoad.current = true;
            return;
        }
        
        const dealListsRef = db.collection('users').doc(user.uid).collection('dealLists');
        const unsubscribe = dealListsRef.onSnapshot((snapshot: any) => {
            const lists = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            setDealLists(lists);
            
            // This initial routing logic will now only run once per login session
            if (isInitialLoad.current) {
                isInitialLoad.current = false; // Prevent this from running on subsequent data updates
                const lastActiveId = sessionStorage.getItem('activeDealListId');
                if (lastActiveId && lists.some((l: DealList) => l.id === lastActiveId)) {
                    setActiveDealListId(lastActiveId);
                    setAppState('VIEW_DATA');
                } else {
                    // If there's no valid last-active list, go to the management screen
                    setAppState('MANAGE_LISTS');
                }
            }
        }, (error: any) => {
            console.error("Firestore deal lists snapshot error:", error);
            setError("Không thể tải danh sách deals. Vui lòng kiểm tra lại quy tắc bảo mật Firestore.");
        });
    
        return () => unsubscribe();
    }, [user, db]);

    // Effect for fetching products when active deal list changes
    useEffect(() => {
        if (!user || !db || !activeDealListId) {
            setProducts([]);
            return;
        }

        setIsLoading(true);
        const productsRef = db.collection('users').doc(user.uid).collection('dealLists').doc(activeDealListId).collection('products');
        const unsubscribe = productsRef.onSnapshot((snapshot: any) => {
            // Important: Include doc.id as docId so we can update/delete specific documents later
            const fetchedProducts = snapshot.docs.map((doc: any) => ({
                ...doc.data(),
                docId: doc.id
            }));
            setProducts(fetchedProducts);
            setIsLoading(false);
        }, (error: any) => {
            console.error("Firestore products snapshot error:", error);
            setError("Không thể tải dữ liệu sản phẩm.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, db, activeDealListId]);
    
    // Effect for fetching creators
    useEffect(() => {
        if (!user || !db) {
            setCreators([]);
            return;
        }

        setIsCreatorLoading(true);
        const creatorsRef = db.collection('users').doc(user.uid).collection('creators');
        const unsubscribe = creatorsRef.orderBy('name').onSnapshot((snapshot: any) => {
            const fetchedCreators = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            setCreators(fetchedCreators);
            setIsCreatorLoading(false);
        }, (error: any) => {
            console.error("Firestore creators snapshot error:", error);
            setError("Không thể tải danh sách creator.");
            setIsCreatorLoading(false);
        });

        return () => unsubscribe();
    }, [user, db]);


    const handleGoogleSignIn = () => {
        if (!isFirebaseReady) return;
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).catch((error: any) => {
            console.error("Google Sign-In failed:", error);
            setError(error.message);
        });
    };

    const handleLogout = () => {
        firebase.auth().signOut();
    };
    
    const syncProductsToFirestore = useCallback(async (dealListId: string, productsToSync: Product[]) => {
        if (!user || !db) throw new Error("Người dùng chưa đăng nhập.");

        const productsRef = db.collection('users').doc(user.uid).collection('dealLists').doc(dealListId).collection('products');
        const dealListRef = db.collection('users').doc(user.uid).collection('dealLists').doc(dealListId);

        // Batch delete existing products
        const deleteBatch = db.batch();
        const snapshot = await productsRef.get();
        snapshot.docs.forEach((doc: any) => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();

        // Batch write new products with auto-generated IDs
        const writeBatch = db.batch();
        productsToSync.forEach(product => {
            const docRef = productsRef.doc(); // Let Firestore generate a unique ID
            writeBatch.set(docRef, product);
        });
        await writeBatch.commit();
        
        // Update sync timestamp
        await dealListRef.update({ lastSynced: firebase.firestore.FieldValue.serverTimestamp() });

    }, [user, db]);


    const handleSync = useCallback(async (dealList: DealList) => {
        if (!user || !db || !dealList.sheetUrl) {
            setError("Không thể đồng bộ: URL sheet không tồn tại hoặc người dùng chưa đăng nhập.");
            return;
        }
        setIsSyncing(true);
        setError(null);
        const csvUrl = getCsvUrl(dealList.sheetUrl);
        if (!csvUrl) {
             setError("URL không hợp lệ.");
             setIsSyncing(false);
             return;
        }

        try {
            const fetchedProducts = await fetchProductsFromSheet(csvUrl, dealList.columnMapping);
            await syncProductsToFirestore(dealList.id, fetchedProducts);
        } catch (err: any) {
            setError(`Lỗi đồng bộ: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    }, [user, db, syncProductsToFirestore]);

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
            setSheetPreview(previewData.map(row => row.map(cell => String(cell))));

            const initialMapping: Partial<ColumnMapping> = editingDealList?.columnMapping || {};
            if (!editingDealList?.columnMapping) { 
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
            if (firstUnmapped) {
                setActiveMappingKey(firstUnmapped.key);
            }

        } catch (err: any) {
            setError(`Lỗi: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [editingDealList]);
    
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (json.length === 0) {
                    throw new Error("File Excel không có dữ liệu hoặc sheet đầu tiên trống.");
                }

                const headers = Object.keys(json[0]);
                const previewData = json.slice(0, 15).map(row => headers.map(header => String(row[header] ?? "")));
                
                setSheetHeaders(headers);
                setSheetPreview(previewData);

                // Apply forward fill here for the Excel data to handle merged cells
                const filledJson = forwardFillData(json);
                setTempExcelData(filledJson);
                
                const listName = file.name.replace(/\.(xlsx|xls|csv)$/i, '');
                setEditingDealList({ name: listName, source: 'excel' });

                const initialMapping: Partial<ColumnMapping> = {};
                MAPPING_CONFIG.forEach(config => {
                    const foundHeader = headers.find(h => config.keywords.some(kw => h.toLowerCase().includes(kw)));
                    if (foundHeader && !Object.values(initialMapping).includes(foundHeader)) {
                       initialMapping[config.key] = foundHeader;
                    }
                });
                setTempMapping(initialMapping);
                setAppState('MAP_COLUMNS');

            } catch (err: any) {
                setError(`Lỗi đọc file: ${err.message}`);
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
            }
        };
        reader.onerror = () => {
            setError("Không thể đọc file đã chọn.");
            setIsLoading(false);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSetActiveDealList = useCallback((id: string | null) => {
        if (id !== activeDealListId) {
            setSelectedProduct(null);
            setActiveDealListId(id);
            if (id) {
                sessionStorage.setItem('activeDealListId', id);
            } else {
                sessionStorage.removeItem('activeDealListId');
            }
        }
        setAppState('VIEW_DATA');
    }, [activeDealListId]);
    
    const handleAddNewList = useCallback(() => {
        setEditingDealList({
            name: '',
            sheetUrl: '',
            source: 'google-sheet',
        });
        setAppState('CONNECT_SHEET');
    }, []);
    
    const handleEditList = useCallback((dealList: DealList) => {
        if (dealList.source === 'excel') {
            alert("Không thể chỉnh sửa nguồn dữ liệu của deal list nhập từ Excel. Vui lòng nhập lại file mới nếu cần cập nhật.");
            return;
        }
        setEditingDealList(dealList);
        setAppState('CONNECT_SHEET');
    }, []);
    
    const handleConfirmDelete = useCallback(async () => {
        if (!listPendingDeletion || !user || !db) {
            return;
        }

        setIsDeleting(true);
        setError(null);
        try {
            const idToDelete = listPendingDeletion.id;
            const dealListRef = db.collection('users').doc(user.uid).collection('dealLists').doc(idToDelete);
            const productsRef = dealListRef.collection('products');

            // Deleting a subcollection requires deleting all its documents first.
            const productsSnapshot = await productsRef.get();
            if (!productsSnapshot.empty) {
                const batch = db.batch();
                productsSnapshot.docs.forEach((doc: any) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }

            // After subcollection is cleared, delete the main document.
            await dealListRef.delete();

            // Cleanup local state
            if (activeDealListId === idToDelete) {
                setActiveDealListId(null);
                sessionStorage.removeItem('activeDealListId');
            }

            setListPendingDeletion(null); // Close modal on success
        } catch (err: any) {
            console.error("Lỗi khi xóa deal list:", err);
            setError(`Không thể xóa: ${err.message}`);
            setListPendingDeletion(null);
        } finally {
            setIsDeleting(false);
        }
    }, [listPendingDeletion, user, db, activeDealListId]);
    
    const handleConnectSheetSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (editingDealList?.sheetUrl) {
            handleFetchAndMap(editingDealList.sheetUrl);
        }
    }, [editingDealList, handleFetchAndMap]);
    
    const handleMappingSave = useCallback(async () => {
        if (!user || !db || !editingDealList) return;

        const isMappingComplete = MAPPING_CONFIG.every(c => !c.required || (tempMapping as ColumnMapping)[c.key]);
        if (!isMappingComplete) {
            setError("Vui lòng điền tất cả các cột bắt buộc (*).");
            return;
        }
        
        const dealListId = editingDealList.id || `dl_${new Date().getTime()}`;
        const finalMapping = tempMapping as ColumnMapping;

        const finalDealListData: Omit<DealList, 'id' | 'lastSynced'> = {
            name: editingDealList.name || 'Unnamed List',
            source: editingDealList.source || 'google-sheet',
            sheetUrl: editingDealList.sheetUrl || '',
            columnMapping: finalMapping,
        };

        const dealListRef = db.collection('users').doc(user.uid).collection('dealLists').doc(dealListId);
        await dealListRef.set(finalDealListData, { merge: true });

        setEditingDealList(null);
        setTempMapping({});
        setActiveDealListId(dealListId);
        sessionStorage.setItem('activeDealListId', dealListId);
        setAppState('VIEW_DATA');
        
        // Trigger initial sync based on source
        if (finalDealListData.source === 'excel' && tempExcelData) {
            const parsePrice = (priceValue: any): number => {
                if (priceValue === null || priceValue === undefined || priceValue === '') {
                    return 0;
                }
                if (typeof priceValue === 'number') {
                    return Math.round(priceValue);
                }
                const cleanedString = String(priceValue).replace(/[.,]/g, '');
                const number = parseInt(cleanedString, 10);
                return isNaN(number) ? 0 : number;
            };
            const normalizeSheetId = (id: any): string => id ? String(id).trim() : '';

            const productsToSync: Product[] = tempExcelData.map(row => {
                const product: Product = {
                    id: normalizeSheetId(row[finalMapping.id]),
                    name: String(row[finalMapping.name] || ''),
                    displayPrice: parsePrice(row[finalMapping.displayPrice]),
                    finalPrice: finalMapping.finalPrice ? String(row[finalMapping.finalPrice] || '') : '',
                    originalPrice: 0,
                };
                if (finalMapping.exclusiveId) {
                    product.exclusiveId = normalizeSheetId(row[finalMapping.exclusiveId]);
                }
                if (finalMapping.modelId) {
                    product.modelId = normalizeSheetId(row[finalMapping.modelId]);
                }
                if (finalMapping.gift) {
                    product.gift = String(row[finalMapping.gift] || '');
                }
                return product;
            }).filter(p => p.id && p.name && p.displayPrice > 0);
            
            await syncProductsToFirestore(dealListId, productsToSync);
            setTempExcelData(null);
        } else if (finalDealListData.source === 'google-sheet') {
            const fullDealListObject: DealList = { id: dealListId, ...finalDealListData, lastSynced: null };
            await handleSync(fullDealListObject);
        }
    }, [user, db, editingDealList, tempMapping, handleSync, tempExcelData, syncProductsToFirestore]);

    const handleAddCreator = async (name: string, tiktokId: string, assignedDealListIds: string[]) => {
        if (!user || !db) throw new Error("Người dùng chưa đăng nhập.");
        await db.collection('users').doc(user.uid).collection('creators').add({ name, tiktokId, assignedDealListIds });
    };

    const handleUpdateCreator = async (id: string, name: string, tiktokId: string, assignedDealListIds: string[]) => {
        if (!user || !db) throw new Error("Người dùng chưa đăng nhập.");
        await db.collection('users').doc(user.uid).collection('creators').doc(id).update({ name, tiktokId, assignedDealListIds });
    };

    const handleDeleteCreator = async (id: string) => {
        if (!user || !db) throw new Error("Người dùng chưa đăng nhập.");
        await db.collection('users').doc(user.uid).collection('creators').doc(id).delete();
    };

    // Handlers for Products
    const handleSaveProduct = async (productData: Omit<Product, 'docId'>) => {
        if (!user || !db || !activeDealListId) return;
        
        setIsSavingProduct(true);
        try {
            const productsRef = db.collection('users').doc(user.uid).collection('dealLists').doc(activeDealListId).collection('products');
            
            if (editingProduct && editingProduct.docId) {
                // Update existing
                await productsRef.doc(editingProduct.docId).update(productData);
            } else {
                // Add new
                await productsRef.add(productData);
            }
            setIsProductModalOpen(false);
            setEditingProduct(null);
        } catch (e: any) {
            console.error("Error saving product:", e);
            alert("Lỗi lưu sản phẩm: " + e.message);
        } finally {
            setIsSavingProduct(false);
        }
    };

    const handleDeleteProductConfirm = async () => {
        if (!user || !db || !activeDealListId || !productPendingDeletion || !productPendingDeletion.docId) return;
        
        setIsDeletingProduct(true);
        try {
             const productsRef = db.collection('users').doc(user.uid).collection('dealLists').doc(activeDealListId).collection('products');
             await productsRef.doc(productPendingDeletion.docId).delete();
             setProductPendingDeletion(null);
             if (selectedProduct?.docId === productPendingDeletion.docId) {
                 setSelectedProduct(null);
             }
        } catch (e: any) {
             console.error("Error deleting product:", e);
             alert("Lỗi xóa sản phẩm: " + e.message);
        } finally {
            setIsDeletingProduct(false);
        }
    };


    const renderLoading = () => (
        <div className="flex items-center justify-center h-screen bg-slate-900">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-violet-400 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-white tracking-tight">Đang tải ứng dụng...</h2>
            </div>
        </div>
    );
    

    const renderManageLists = () => (
        <div className="bg-slate-50 min-h-screen relative overflow-hidden">
             {/* Background blobs */}
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>

            <div className="max-w-5xl mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls, .csv" />
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quản lý Deal Lists</h1>
                    {user && (
                        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white/50">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-bold shadow-md">
                                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                             <span className="text-sm font-bold text-slate-700 hidden sm:inline">{user.displayName || user.email}</span>
                            <button onClick={handleLogout} className="p-1.5 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" aria-label="Đăng xuất">
                                <LogoutIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    )}
                </div>
                
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl relative mb-6 shadow-sm" role="alert">{error}</div>}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {dealLists.map(dl => (
                        <div key={dl.id} className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-white/60 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-200/20 transition-all group flex flex-col justify-between h-56 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                                 {dl.source === 'excel' ? <SheetIcon className="w-24 h-24 text-green-600"/> : <LinkIcon className="w-24 h-24 text-violet-600"/>}
                             </div>

                            <div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${dl.source === 'excel' ? 'bg-green-50 text-green-600' : 'bg-violet-50 text-violet-600'}`}>
                                         {dl.source === 'excel' ? <SheetIcon className="w-6 h-6"/> : <LinkIcon className="w-6 h-6"/>}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg tracking-wide ${dl.source === 'excel' ? 'bg-green-100 text-green-800' : 'bg-violet-100 text-violet-800'}`}>
                                        {dl.source === 'excel' ? 'Excel' : 'Sheet'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-xl text-slate-900 truncate relative z-10" title={dl.name}>{dl.name}</h3>
                                <p className="text-xs text-slate-400 mt-1 truncate font-medium relative z-10">{dl.sheetUrl || 'Nhập từ file cục bộ'}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 relative z-10">
                                <button onClick={() => handleSetActiveDealList(dl.id)} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95">Vào xem</button>
                                <button onClick={() => handleEditList(dl)} className="p-2.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors" disabled={dl.source === 'excel'}><EditIcon className="w-5 h-5"/></button>
                                <button 
                                    onClick={() => setListPendingDeletion(dl)}
                                    className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {/* Add New Card */}
                     <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-violet-400 hover:bg-white/80 transition-all flex flex-col items-center justify-center h-56 gap-4 group cursor-default">
                        <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-violet-600 group-hover:shadow-md transition-all">
                             <PlusIcon className="w-7 h-7" />
                        </div>
                        <p className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Tạo danh sách mới</p>
                        <div className="flex gap-2 w-full">
                             <button onClick={handleAddNewList} className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-violet-300 hover:text-violet-600 shadow-sm transition-all">
                                Google Sheet
                            </button>
                             <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-green-300 hover:text-green-600 shadow-sm transition-all">
                                Excel File
                            </button>
                        </div>
                    </div>
                </div>
                
                <DeleteConfirmationModal
                    dealList={listPendingDeletion}
                    onClose={() => setListPendingDeletion(null)}
                    onConfirm={handleConfirmDelete}
                    isDeleting={isDeleting}
                />
            </div>
        </div>
    );
    
    const renderConnectSheet = () => (
        <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-xl w-full border border-slate-100">
                 <div className="mb-8 text-center">
                    <div className="w-16 h-16 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-violet-600 shadow-sm">
                        <LinkIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{editingDealList?.id ? 'Cập nhật kết nối' : 'Kết nối Google Sheet'}</h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Nhập thông tin bảng tính để đồng bộ dữ liệu.</p>
                </div>

                <form onSubmit={handleConnectSheetSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="dealListName" className="block text-sm font-bold text-slate-700 mb-2">Tên danh sách</label>
                        <input
                            type="text"
                            id="dealListName"
                            value={editingDealList?.name || ''}
                            onChange={(e) => setEditingDealList(prev => ({...prev, name: e.target.value}))}
                            placeholder="Ví dụ: Deal tháng 11"
                            required
                            className="block w-full px-4 py-3.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm font-medium"
                        />
                    </div>
                    <div>
                        <label htmlFor="sheetUrl" className="block text-sm font-bold text-slate-700 mb-2">Đường dẫn Google Sheet (URL)</label>
                         <input
                            type="url"
                            id="sheetUrl"
                            value={editingDealList?.sheetUrl || ''}
                            onChange={(e) => setEditingDealList(prev => ({...prev, sheetUrl: e.target.value}))}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            required
                            className="block w-full px-4 py-3.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm font-medium"
                        />
                        <p className="mt-3 text-xs text-blue-700 bg-blue-50 p-3.5 rounded-xl flex gap-2 items-start border border-blue-100">
                            <span>ℹ️</span>
                            Sheet phải được chia sẻ công khai ở chế độ "Bất kỳ ai có đường liên kết".
                        </p>
                    </div>
                    {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
                    
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button type="button" onClick={() => setAppState('MANAGE_LISTS')} className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-3.5 rounded-xl shadow-lg shadow-violet-200 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-all">
                            {isLoading ? 'Đang kiểm tra...' : 'Tiếp tục'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderMapColumns = () => (
       <div className="bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-8">
                     <div>
                        <h2 className="text-3xl font-black text-slate-900">Ánh xạ dữ liệu</h2>
                        <p className="text-slate-500 text-sm mt-1 font-medium">Chọn cột tương ứng trong file của bạn với dữ liệu hệ thống.</p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => setAppState('MANAGE_LISTS')} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Hủy</button>
                        <button onClick={handleMappingSave} className="px-6 py-2.5 text-sm font-bold text-white bg-violet-600 rounded-xl shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all">Lưu & Đồng bộ</button>
                    </div>
                </div>

                {error && <p className="text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl text-sm mb-6">{error}</p>}
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
                            <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-3 text-lg">
                                <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</span>
                                Cột cần chọn
                            </h3>
                            <div className="space-y-3">
                                {MAPPING_CONFIG.map(config => (
                                    <div 
                                        key={config.key} 
                                        onClick={() => setActiveMappingKey(config.key)} 
                                        className={`p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 ${activeMappingKey === config.key ? 'border-violet-500 bg-violet-50/50 shadow-sm' : 'border-slate-100 hover:border-violet-200 bg-white'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className={`text-sm font-bold ${activeMappingKey === config.key ? 'text-violet-900' : 'text-slate-700'}`}>{config.label}</span>
                                            {config.required && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Bắt buộc</span>}
                                        </div>
                                        <div className={`text-xs px-3 py-2 rounded-lg w-full truncate font-medium ${tempMapping[config.key] ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-400 border border-slate-200 border-dashed'}`}>
                                            {tempMapping[config.key] || 'Chưa chọn cột'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
                             <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-3 text-lg">
                                <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                                Dữ liệu từ file (15 dòng đầu)
                            </h3>
                            <div className="flex-grow overflow-auto border border-slate-200 rounded-xl custom-scrollbar shadow-inner bg-slate-50">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            {sheetHeaders.map((header, index) => {
                                                const isMapped = Object.values(tempMapping).includes(header);
                                                return (
                                                    <th key={index} scope="col" className="px-1 py-1 text-left text-xs font-medium uppercase tracking-wider min-w-[180px]">
                                                        <button 
                                                            onClick={() => {
                                                                if (activeMappingKey) {
                                                                    setTempMapping(prev => ({ ...prev, [activeMappingKey]: header }));
                                                                    const currentMappingIndex = MAPPING_CONFIG.findIndex(c => c.key === activeMappingKey);
                                                                    const nextUnmapped = MAPPING_CONFIG.find((c, idx) => idx > currentMappingIndex && c.required && !tempMapping[c.key]);
                                                                    setActiveMappingKey(nextUnmapped ? nextUnmapped.key : null);
                                                                }
                                                            }}
                                                            className={`w-full text-left px-4 py-3.5 border-b-4 transition-colors hover:bg-violet-50 ${isMapped ? 'border-violet-500 text-violet-700 bg-violet-50/50 font-bold' : 'border-transparent text-slate-500 hover:text-violet-600'}`}
                                                        >
                                                            {header}
                                                            {isMapped && <span className="ml-2 text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full align-middle">Đã chọn</span>}
                                                        </button>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {sheetPreview.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600 max-w-[200px] truncate border-r border-slate-100 last:border-r-0 font-medium">
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
                </div>
            </div>
       </div>
    );

    const ViewData = () => {
        const creatorOptions = useMemo(() => creators.map(c => ({ value: c.id, label: c.name })), [creators]);
        const dealListOptions = useMemo(() => dealLists.map(dl => ({ value: dl.id, label: dl.name })), [dealLists]);

        return (
            <div className="h-screen w-screen flex flex-col bg-slate-50 font-sans overflow-hidden relative">
                {/* Modern Vivid Gradient Background */}
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-200 mix-blend-multiply filter blur-[80px] opacity-40 animate-pulse"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-200 mix-blend-multiply filter blur-[80px] opacity-40 animate-pulse animation-delay-2000"></div>
                <div className="absolute top-[20%] left-[30%] w-[30%] h-[30%] rounded-full bg-blue-100 mix-blend-multiply filter blur-[80px] opacity-30 animate-pulse animation-delay-4000"></div>


                <header className="flex-shrink-0 bg-white/70 backdrop-blur-md border-b border-white/50 z-30 px-6 py-4 shadow-sm">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-4 flex-grow">
                            <button onClick={() => setAppState('MANAGE_LISTS')} className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 p-2.5 rounded-xl transition-all flex-shrink-0" title="Quay lại quản lý">
                                <CogIcon className="w-6 h-6" />
                            </button>
                            
                            <div className="h-8 w-px bg-slate-200 mx-1"></div>

                            <CustomDropdown
                                options={creatorOptions}
                                selectedValue={selectedCreatorId}
                                onSelect={(value) => setSelectedCreatorId(value)}
                                placeholder="Chọn KOC/KOL"
                            />

                            <CustomDropdown
                                options={dealListOptions}
                                selectedValue={activeDealListId}
                                onSelect={(value) => handleSetActiveDealList(value)}
                                placeholder="Chọn Deal List"
                            />

                            {activeDealList && (
                                <button 
                                    onClick={() => activeDealList && handleSync(activeDealList)} 
                                    disabled={isSyncing || activeDealList?.source === 'excel'}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-violet-300 hover:text-violet-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <SyncIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
                                </button>
                            )}
                            <div className="flex-grow"></div>
                        </div>

                         {user && (
                            <div className="flex items-center gap-4 flex-shrink-0 pr-2">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold text-slate-900">{user.displayName || 'User'}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{user.email}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-violet-200 ring-2 ring-white">
                                     {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <button onClick={handleLogout} className="p-2 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" aria-label="Đăng xuất">
                                    <LogoutIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        )}
                    </div>
                    {error && <p className="text-red-600 text-xs font-bold mt-2 text-center bg-red-50 p-2 rounded-lg animate-pulse border border-red-200">{error}</p>}
                </header>

                <main className="flex-grow flex gap-6 min-h-0 p-6 z-20">
                    {activeDealListId ? (
                        <>
                            <div className="w-1/3 h-full min-w-[360px] max-w-[420px]">
                                <Calculator 
                                    selectedProduct={selectedProduct} 
                                    dealListName={activeDealList?.name || ''} 
                                    products={products}
                                    onProductSelect={setSelectedProduct}
                                    onFocusSearch={() => searchInputRef.current?.focus()}
                                />
                            </div>
                            <div className="flex-1 h-full flex flex-col bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/60 overflow-hidden">
                                <div className="flex-shrink-0 border-b border-slate-100 px-6 pt-4">
                                    <nav className="flex space-x-4" aria-label="Tabs">
                                        <button
                                            onClick={() => setActiveViewDataTab('products')}
                                            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all border-b-2 ${
                                                activeViewDataTab === 'products'
                                                    ? 'border-violet-600 text-violet-700'
                                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            <SheetIcon className="w-4 h-4" />
                                            Sản phẩm
                                        </button>
                                        <button
                                            onClick={() => setActiveViewDataTab('creators')}
                                            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all border-b-2 ${
                                                activeViewDataTab === 'creators'
                                                    ? 'border-violet-600 text-violet-700'
                                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            <IdentificationIcon className="w-4 h-4" />
                                            Creator IDs
                                        </button>
                                    </nav>
                                </div>
                                <div className="flex-grow min-h-0 relative">
                                    {activeViewDataTab === 'products' && (
                                        <div className="h-full overflow-hidden">
                                             <ProductTable 
                                                products={products} 
                                                onProductSelect={setSelectedProduct} 
                                                isLoading={isLoading} 
                                                activeDealListId={activeDealListId}
                                                searchInputRef={searchInputRef}
                                                onAddProduct={() => {
                                                    setEditingProduct(null);
                                                    setIsProductModalOpen(true);
                                                }}
                                                onEditProduct={(p) => {
                                                    setEditingProduct(p);
                                                    setIsProductModalOpen(true);
                                                }}
                                                onDeleteProduct={(p) => setProductPendingDeletion(p)}
                                             />
                                        </div>
                                    )}
                                    {activeViewDataTab === 'creators' && (
                                        <div className="h-full p-6">
                                            <CreatorList
                                                creators={creators}
                                                isLoading={isCreatorLoading}
                                                onAdd={handleAddCreator}
                                                onUpdate={handleUpdateCreator}
                                                onDelete={handleDeleteCreator}
                                                dealLists={dealLists}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50">
                            <div className="text-center text-slate-400 max-w-md">
                                <div className="w-24 h-24 bg-violet-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-100">
                                    <SheetIcon className="w-10 h-10 text-violet-300" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Chưa chọn danh sách</h2>
                                <p className="text-slate-500 font-medium">Vui lòng chọn một Deal List từ menu phía trên để bắt đầu tính toán và tra cứu.</p>
                            </div>
                        </div>
                    )}
                </main>
                
                {/* Modals */}
                <ProductModal 
                    isOpen={isProductModalOpen} 
                    onClose={() => setIsProductModalOpen(false)} 
                    onSave={handleSaveProduct}
                    product={editingProduct}
                    isSaving={isSavingProduct}
                />

                <DeleteProductConfirmationModal 
                    product={productPendingDeletion}
                    onClose={() => setProductPendingDeletion(null)}
                    onConfirm={handleDeleteProductConfirm}
                    isDeleting={isDeletingProduct}
                />
            </div>
        );
    }
    
    switch (appState) {
        case 'LOADING':
            return renderLoading();
        case 'LOGIN':
            return <LoginScreen onGoogleSignIn={handleGoogleSignIn} isFirebaseReady={isFirebaseReady} />;
        case 'MANAGE_LISTS':
            return renderManageLists();
        case 'CONNECT_SHEET':
            return renderConnectSheet();
        case 'MAP_COLUMNS':
            return renderMapColumns();
        case 'VIEW_DATA':
            return <ViewData />;
        default:
            return renderManageLists();
    }
};

export default App;
