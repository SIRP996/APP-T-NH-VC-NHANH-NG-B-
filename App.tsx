



import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product, ColumnMapping, DealList, FirebaseConfig } from './types';
import { fetchProductsFromSheet, fetchSheetPreviewAndHeaders } from './services/googleSheetService';
import { Calculator } from './components/Calculator';
import { ProductTable } from './components/ProductTable';
import { SyncIcon, LinkIcon, SheetIcon, EditIcon, CogIcon, PlusIcon, TrashIcon, FirebaseIcon, GoogleIcon, LogoutIcon, MailIcon, LockClosedIcon, SpinnerIcon } from './components/Icons';

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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa</h3>
                <p className="mt-2 text-sm text-slate-800">
                    Bạn có chắc chắn muốn xóa deal list <strong className="font-semibold text-slate-900">{dealList.name}</strong>?
                </p>
                <p className="mt-1 text-sm text-slate-800">
                    Tất cả dữ liệu sản phẩm liên quan cũng sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 w-28 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
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
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
            <div className="p-8 bg-white rounded-xl shadow-md text-center max-w-sm w-full">
                <FirebaseIcon className="mx-auto w-16 h-16 mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
                <p className="text-slate-800 mb-6">Truy cập vào công cụ quản lý deal list của bạn.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MailIcon className="w-5 h-5 text-slate-400" />
                        </span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {mode !== 'reset' && (
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <LockClosedIcon className="w-5 h-5 text-slate-400" />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mật khẩu"
                                required
                                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-medium text-indigo-600 hover:text-indigo-500">
                            {switchModeText} {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
                        </button>
                    )}
                     {mode === 'login' && (
                        <>
                            <span className="mx-2 text-slate-400">|</span>
                            <button onClick={() => setMode('reset')} className="font-medium text-indigo-600 hover:text-indigo-500">Quên mật khẩu?</button>
                        </>
                    )}
                     {mode === 'reset' && (
                         <button onClick={() => setMode('login')} className="font-medium text-indigo-600 hover:text-indigo-500">Quay lại đăng nhập</button>
                    )}
                </div>

                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-slate-300"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-sm">hoặc</span>
                    <div className="flex-grow border-t border-slate-300"></div>
                </div>

                <button
                    onClick={onGoogleSignIn}
                    disabled={!isFirebaseReady || isConfigPlaceholder}
                    className="w-full inline-flex justify-center items-center gap-3 py-3 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
    
    const [listPendingDeletion, setListPendingDeletion] = useState<DealList | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    // Firebase state
    const [db, setDb] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    const activeDealList = useMemo(() => dealLists.find(dl => dl.id === activeDealListId), [dealLists, activeDealListId]);
    
    // Main Firebase and Auth effect
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

            const unsubscribeAuth = firebase.auth().onAuthStateChanged((user: any) => {
                if (user) {
                    setUser(user);
                } else {
                    setUser(null);
                    setDealLists([]);
                    setProducts([]);
                    setAppState('LOGIN');
                }
            });
            return () => unsubscribeAuth();
        } catch (err) {
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
    }, [user, db]); // This effect now correctly depends only on user and db

    // Effect for fetching products when active deal list changes
    useEffect(() => {
        if (!user || !db || !activeDealListId) {
            setProducts([]);
            return;
        }

        setIsLoading(true);
        const productsRef = db.collection('users').doc(user.uid).collection('dealLists').doc(activeDealListId).collection('products');
        const unsubscribe = productsRef.onSnapshot((snapshot: any) => {
            const fetchedProducts = snapshot.docs.map((doc: any) => doc.data());
            setProducts(fetchedProducts);
            setIsLoading(false);
        }, (error: any) => {
            console.error("Firestore products snapshot error:", error);
            setError("Không thể tải dữ liệu sản phẩm.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, db, activeDealListId]);


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
                setTempExcelData(json);
                
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

    const handleSetActiveDealList = useCallback((id: string) => {
        if (id !== activeDealListId) {
            setSelectedProduct(null);
            setActiveDealListId(id);
            sessionStorage.setItem('activeDealListId', id);
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

    const renderLoading = () => (
        <div className="flex items-center justify-center h-screen bg-slate-100">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-600 mx-auto"></div>
                <h2 className="mt-4 text-xl font-semibold text-slate-700">Đang tải ứng dụng...</h2>
            </div>
        </div>
    );
    
    const isConfigPlaceholder = firebaseConfig.apiKey === "YOUR_API_KEY";

    const renderManageLists = () => (
        <div className="bg-slate-100 min-h-screen">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls, .csv" />
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-900">Quản lý Deal Lists</h1>
                    {user && (
                        <div className="flex items-center gap-2">
                             <span className="text-sm text-slate-800 hidden sm:inline">{user.displayName || user.email}</span>
                            <button onClick={handleLogout} className="p-2 rounded-full text-slate-700 hover:bg-slate-200 hover:text-red-600" aria-label="Đăng xuất">
                                <LogoutIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    )}
                </div>
                
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

                <div className="space-y-4">
                    {dealLists.map(dl => (
                        <div key={dl.id} className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-slate-900 flex items-center gap-2">
                                    {dl.name}
                                    {dl.source === 'excel' && <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Excel</span>}
                                </p>
                                <a href={dl.sheetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate">{dl.sheetUrl || 'Dữ liệu từ file đã nhập'}</a>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => handleSetActiveDealList(dl.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Vào xem</button>
                                <button onClick={() => handleEditList(dl)} className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed" disabled={dl.source === 'excel'}><EditIcon className="w-5 h-5"/></button>
                                <button 
                                    onClick={() => setListPendingDeletion(dl)}
                                    className="p-2 text-slate-700 hover:text-red-600 hover:bg-slate-100 rounded-md"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {dealLists.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg mt-6">
                         <SheetIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có deal list nào</h3>
                        <p className="mt-1 text-sm text-slate-700">Hãy bắt đầu bằng cách thêm một list mới hoặc nhập từ Excel.</p>
                         <div className="mt-6 flex justify-center gap-4">
                             <button onClick={handleAddNewList} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                Thêm từ Google Sheet
                            </button>
                             <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-800 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Nhập từ Excel
                            </button>
                        </div>
                    </div>
                )}
                 {dealLists.length > 0 && (
                    <div className="mt-6 text-center flex justify-center gap-4">
                        <button onClick={handleAddNewList} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                            Thêm từ Google Sheet
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-800 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Nhập từ Excel
                        </button>
                    </div>
                )}
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
        <div className="bg-slate-100 min-h-screen">
            <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white p-8 rounded-xl shadow-lg border">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{editingDealList?.id ? 'Chỉnh sửa Deal List' : 'Thêm Deal List Mới'}</h2>
                    <p className="text-slate-800 mb-6">Cung cấp thông tin về Google Sheet bạn muốn kết nối.</p>
                    <form onSubmit={handleConnectSheetSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="dealListName" className="block text-sm font-medium text-slate-900">Tên Deal List</label>
                            <input
                                type="text"
                                id="dealListName"
                                value={editingDealList?.name || ''}
                                onChange={(e) => setEditingDealList(prev => ({...prev, name: e.target.value}))}
                                placeholder="Ví dụ: Deal 11.11"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="sheetUrl" className="block text-sm font-medium text-slate-900">URL Google Sheet</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-600 sm:text-sm">
                                    <LinkIcon className="w-5 h-5"/>
                                </span>
                                 <input
                                    type="url"
                                    id="sheetUrl"
                                    value={editingDealList?.sheetUrl || ''}
                                    onChange={(e) => setEditingDealList(prev => ({...prev, sheetUrl: e.target.value}))}
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    required
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-slate-300"
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-700">Lưu ý: Sheet phải được chia sẻ công khai ("Bất kỳ ai có đường liên kết").</p>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setAppState('MANAGE_LISTS')} className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-800 bg-white hover:bg-slate-50">Hủy</button>
                            <button type="submit" disabled={isLoading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                                {isLoading ? 'Đang kiểm tra...' : 'Tiếp tục'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    const renderMapColumns = () => (
       <div className="bg-slate-100 min-h-screen">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Ánh xạ Cột Dữ liệu</h2>
                <p className="text-slate-800 mb-6">Hãy cho chúng tôi biết cột nào tương ứng với dữ liệu nào. Các cột có dấu (*) là bắt buộc.</p>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* FIX: Replaced malformed div containing an error list with the correct JSX for the column mapping UI. */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-lg shadow-md border sticky top-6">
                            <h3 className="font-semibold text-lg mb-4 text-slate-900">Cột cần ánh xạ</h3>
                            <div className="space-y-3">
                                {MAPPING_CONFIG.map(config => (
                                    <div key={config.key} onClick={() => setActiveMappingKey(config.key)} className={`p-3 rounded-md cursor-pointer border-2 transition-all ${activeMappingKey === config.key ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-slate-100'}`}>
                                        <p className="font-medium text-slate-900">{config.label} {config.required && <span className="text-red-500">*</span>}</p>
                                        <div className={`mt-1 text-sm px-3 py-1.5 rounded-md w-full text-left truncate ${tempMapping[config.key] ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>
                                            {tempMapping[config.key] || 'Chưa chọn'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setAppState('MANAGE_LISTS')} className="px-4 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Quay lại</button>
                                <button onClick={handleMappingSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Lưu & Đồng bộ</button>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                     <h3 className="font-semibold text-lg mb-4 text-slate-900">Xem trước dữ liệu (15 hàng đầu tiên)</h3>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-md border">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    {sheetHeaders.map((header, index) => (
                                        <th key={index} scope="col" className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${Object.values(tempMapping).includes(header) ? 'text-indigo-600' : 'text-slate-700'}`}>
                                            <button 
                                                onClick={() => {
                                                    if (activeMappingKey) {
                                                        setTempMapping(prev => ({ ...prev, [activeMappingKey]: header }));
                                                        const currentMappingIndex = MAPPING_CONFIG.findIndex(c => c.key === activeMappingKey);
                                                        const nextUnmapped = MAPPING_CONFIG.find((c, idx) => idx > currentMappingIndex && c.required && !tempMapping[c.key]);
                                                        setActiveMappingKey(nextUnmapped ? nextUnmapped.key : null);
                                                    }
                                                }}
                                                className="w-full text-left"
                                            >
                                                {header}
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {sheetPreview.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={cellIndex} className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 truncate max-w-[200px]">
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
    );

    const renderViewData = () => (
        <div className="h-screen w-screen flex flex-col bg-slate-100 p-4 gap-4">
            <header className="flex-shrink-0 bg-white rounded-xl shadow-lg p-4 border border-slate-200">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setAppState('MANAGE_LISTS')} className="text-slate-700 hover:text-indigo-600 p-2 rounded-full hover:bg-slate-100">
                            <CogIcon className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{activeDealList?.name || 'Loading...'}</h1>
                             <p className="text-xs text-slate-700">
                                {activeDealList?.lastSynced ? `Lần cuối đồng bộ: ${new Date(activeDealList.lastSynced.toDate()).toLocaleString('vi-VN')}` : 'Chưa đồng bộ'}
                            </p>
                        </div>
                        <button 
                            onClick={() => activeDealList && handleSync(activeDealList)} 
                            disabled={isSyncing || activeDealList?.source === 'excel'}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <SyncIcon className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
                        </button>
                    </div>
                     {user && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-800 hidden sm:inline">{user.displayName || user.email}</span>
                            <button onClick={handleLogout} className="p-2 rounded-full text-slate-700 hover:bg-slate-200 hover:text-red-600" aria-label="Đăng xuất">
                                <LogoutIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    )}
                </div>
                {error && <p className="text-red-500 text-sm mt-2 text-center bg-red-50 p-2 rounded-md">{error}</p>}
            </header>
            <main className="flex-grow flex gap-4 min-h-0">
                <div className="w-1/3 h-full">
                     <Calculator 
                        selectedProduct={selectedProduct} 
                        dealListName={activeDealList?.name || ''} 
                        products={products}
                        onProductSelect={setSelectedProduct}
                    />
                </div>
                <div className="w-2/3 h-full">
                    <ProductTable products={products} onProductSelect={setSelectedProduct} isLoading={isLoading} activeDealListId={activeDealListId} />
                </div>
            </main>
        </div>
    );
    
    switch (appState) {
        case 'LOADING':
            return renderLoading();
        case 'LOGIN':
            return <LoginScreen onGoogleSignIn={handleGoogleSignIn} isFirebaseReady={isFirebaseReady} isConfigPlaceholder={isConfigPlaceholder}/>;
        case 'MANAGE_LISTS':
            return renderManageLists();
        case 'CONNECT_SHEET':
            return renderConnectSheet();
        case 'MAP_COLUMNS':
            return renderMapColumns();
        case 'VIEW_DATA':
            return renderViewData();
        default:
            return renderManageLists();
    }
};

export default App;
