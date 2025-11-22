
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product, ColumnMapping, DealList, FirebaseConfig, Creator } from './types';
import { fetchProductsFromSheet, fetchSheetPreviewAndHeaders } from './services/googleSheetService';
import { Calculator } from './components/Calculator';
import { ProductTable } from './components/ProductTable';
import { CreatorList } from './components/CreatorList';
import { SyncIcon, LinkIcon, SheetIcon, EditIcon, CogIcon, PlusIcon, TrashIcon, FirebaseIcon, GoogleIcon, LogoutIcon, MailIcon, LockClosedIcon, SpinnerIcon, IdentificationIcon, SwatchIcon, SidebarIcon, CheckIcon, ChevronDownIcon } from './components/Icons';
import CustomDropdown from './components/CustomDropdown';
import { ProductModal } from './components/ProductModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';

declare const firebase: any;
declare const XLSX: any;

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
type Theme = 'violet' | 'green' | 'grey' | 'neon-blue';


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

// --- Theme Selector Component ---
const ThemeSelector: React.FC<{ currentTheme: Theme, onChange: (t: Theme) => void }> = ({ currentTheme, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const themes: { id: Theme, name: string, color: string }[] = [
        { id: 'violet', name: 'Tím mộng mơ', color: 'bg-violet-600' },
        { id: 'green', name: 'Xanh lá', color: 'bg-emerald-500' },
        { id: 'grey', name: 'Xám Apple', color: 'bg-zinc-500' },
        { id: 'neon-blue', name: 'Đen Neon', color: 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]' },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 p-2.5 rounded-full backdrop-blur-md border transition-all ${isOpen ? 'bg-primary-500/20 text-primary-400 border-primary-500/50' : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800 border-white/5'}`}
                title="Đổi giao diện"
            >
                <SwatchIcon className="w-5 h-5" />
                {isOpen && <ChevronDownIcon className="w-4 h-4" />}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50 p-2">
                    <div className="text-xs font-bold text-slate-500 px-2 py-1 mb-1 uppercase tracking-wider">Chọn màu</div>
                    <div className="space-y-1">
                        {themes.map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    onChange(t.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${currentTheme === t.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                            >
                                <div className={`w-4 h-4 rounded-full ${t.color}`}></div>
                                <span className="flex-grow text-left">{t.name}</span>
                                {currentTheme === t.id && <CheckIcon className="w-3.5 h-3.5 text-primary-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const DeleteConfirmationModal: React.FC<{
    dealList: DealList | null;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}> = ({ dealList, onClose, onConfirm, isDeleting }) => {
    if (!dealList) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-md m-4 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white">Xác nhận xóa</h3>
                <p className="mt-2 text-sm text-slate-400">
                    Bạn có chắc chắn muốn xóa deal list <strong className="font-semibold text-white">{dealList.name}</strong>?
                </p>
                <p className="mt-1 text-sm text-slate-500">
                    Tất cả dữ liệu sản phẩm liên quan cũng sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-transparent border border-slate-600 rounded-xl hover:bg-slate-800 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 w-28 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 focus:outline-none disabled:opacity-50 disabled:cursor-wait flex items-center justify-center shadow-lg shadow-red-900/20"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-md m-4 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white">Xác nhận xóa sản phẩm</h3>
                <p className="mt-2 text-sm text-slate-400">
                    Bạn có chắc chắn muốn xóa sản phẩm <strong className="font-semibold text-white">{product.name}</strong> (ID: {product.id})?
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-transparent border border-slate-600 rounded-xl hover:bg-slate-800 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 w-28 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 focus:outline-none disabled:opacity-50 disabled:cursor-wait flex items-center justify-center shadow-lg shadow-red-900/20"
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
        <div className="flex items-center justify-center min-h-screen bg-[#020617] p-4 relative overflow-hidden">
             <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-600/20 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-secondary-500/10 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse-slow animation-delay-2000"></div>

            <div className="p-8 bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 text-center max-w-sm w-full relative z-10">
                <div className="bg-gradient-to-tr from-primary-600 to-secondary-600 p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-primary-900/50">
                    <FirebaseIcon className="w-10 h-10 brightness-200 grayscale contrast-200 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">{title}</h1>
                <p className="text-slate-400 mb-8 text-sm font-medium">Truy cập vào Link2Ink Studio.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MailIcon className="w-5 h-5 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
                        </span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="w-full pl-10 pr-3 py-3 border border-slate-700 bg-slate-950/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-slate-900 transition-all outline-none text-sm font-medium text-white placeholder:text-slate-600 hover:bg-slate-900/80 hover:shadow-glow-hover hover:border-primary-500/40"
                        />
                    </div>

                    {mode !== 'reset' && (
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <LockClosedIcon className="w-5 h-5 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mật khẩu"
                                required
                                className="w-full pl-10 pr-3 py-3 border border-slate-700 bg-slate-950/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-slate-900 transition-all outline-none text-sm font-medium text-white placeholder:text-slate-600 hover:bg-slate-900/80 hover:shadow-glow-hover hover:border-primary-500/40"
                            />
                        </div>
                    )}
                    
                    {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded-lg border border-red-900/30">{error}</p>}
                    {message && <p className="text-green-400 text-sm bg-green-900/20 p-2 rounded-lg border border-green-900/30">{message}</p>}

                    <button
                        type="submit"
                        disabled={isLoading || !isFirebaseReady}
                        className="w-full py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-900/50 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] hover:shadow-glow-lg"
                    >
                        {isLoading ? 'Đang xử lý...' : buttonText}
                    </button>
                </form>

                <div className="text-sm text-center mt-6">
                    {mode !== 'reset' && (
                        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-primary-400 hover:text-primary-300 hover:underline">
                            {switchModeText} {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
                        </button>
                    )}
                     {mode === 'login' && (
                        <>
                            <span className="mx-2 text-slate-600">|</span>
                            <button onClick={() => setMode('reset')} className="font-medium text-slate-500 hover:text-slate-300">Quên mật khẩu?</button>
                        </>
                    )}
                     {mode === 'reset' && (
                         <button onClick={() => setMode('login')} className="font-bold text-primary-400 hover:text-primary-300 hover:underline">Quay lại đăng nhập</button>
                    )}
                </div>

                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase font-bold tracking-wider">hoặc</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <button
                    onClick={onGoogleSignIn}
                    disabled={!isFirebaseReady}
                    className="w-full inline-flex justify-center items-center gap-3 py-3 px-4 border border-slate-700 rounded-xl shadow-sm bg-slate-800 text-sm font-bold text-slate-200 hover:bg-slate-700 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-glow-sm"
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
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'violet');
    
    const [calculatorPresets, setCalculatorPresets] = useState<number[]>([7, 10, 12, 15, 20, 25]);

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
    
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [listPendingDeletion, setListPendingDeletion] = useState<DealList | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [productPendingDeletion, setProductPendingDeletion] = useState<Product | null>(null);
    const [isDeletingProduct, setIsDeletingProduct] = useState(false);

    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const [db, setDb] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    const activeDealList = useMemo(() => dealLists.find(dl => dl.id === activeDealListId), [dealLists, activeDealListId]);
    
    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);


    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
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

    useEffect(() => {
        // Remove existing data-theme first
        document.documentElement.removeAttribute('data-theme');
        
        if (theme === 'green') {
            document.documentElement.setAttribute('data-theme', 'green');
        } else if (theme === 'grey') {
            document.documentElement.setAttribute('data-theme', 'grey');
        } else if (theme === 'neon-blue') {
            document.documentElement.setAttribute('data-theme', 'neon-blue');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);


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

    useEffect(() => {
        if (!user || !db) {
            isInitialLoad.current = true;
            return;
        }
        
        const dealListsRef = db.collection('users').doc(user.uid).collection('dealLists');
        const unsubscribe = dealListsRef.onSnapshot((snapshot: any) => {
            const lists = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            setDealLists(lists);
            
            if (isInitialLoad.current) {
                isInitialLoad.current = false; 
                const lastActiveId = sessionStorage.getItem('activeDealListId');
                if (lastActiveId && lists.some((l: DealList) => l.id === lastActiveId)) {
                    setActiveDealListId(lastActiveId);
                    setAppState('VIEW_DATA');
                } else {
                    setAppState('MANAGE_LISTS');
                }
            }
        }, (error: any) => {
            console.error("Firestore deal lists snapshot error:", error);
            addToast("Không thể tải danh sách deals.", 'error');
        });
        
        const userDocRef = db.collection('users').doc(user.uid);
        userDocRef.get().then((doc: any) => {
             if (doc.exists && doc.data().calculatorPresets) {
                 setCalculatorPresets(doc.data().calculatorPresets);
             }
        }).catch((error: any) => {
             console.error("Error fetching user settings:", error);
        });
    
        return () => unsubscribe();
    }, [user, db, addToast]);

    useEffect(() => {
        if (!user || !db || !activeDealListId) {
            setProducts([]);
            return;
        }

        setIsLoading(true);
        const productsRef = db.collection('users').doc(user.uid).collection('dealLists').doc(activeDealListId).collection('products');
        const unsubscribe = productsRef.onSnapshot((snapshot: any) => {
            const fetchedProducts = snapshot.docs.map((doc: any) => ({
                ...doc.data(),
                docId: doc.id
            }));
            setProducts(fetchedProducts);
            setIsLoading(false);
        }, (error: any) => {
            console.error("Firestore products snapshot error:", error);
            addToast("Không thể tải dữ liệu sản phẩm.", 'error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, db, activeDealListId, addToast]);
    
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
            addToast("Không thể tải danh sách creator.", 'error');
            setIsCreatorLoading(false);
        });

        return () => unsubscribe();
    }, [user, db, addToast]);


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

        const deleteBatch = db.batch();
        const snapshot = await productsRef.get();
        snapshot.docs.forEach((doc: any) => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();

        const writeBatch = db.batch();
        productsToSync.forEach(product => {
            const docRef = productsRef.doc();
            writeBatch.set(docRef, product);
        });
        await writeBatch.commit();
        
        await dealListRef.update({ lastSynced: firebase.firestore.FieldValue.serverTimestamp() });

    }, [user, db]);


    const handleSync = useCallback(async (dealList: DealList) => {
        if (!user || !db || !dealList.sheetUrl) {
            addToast("Không thể đồng bộ: URL sheet không tồn tại hoặc chưa đăng nhập.", 'error');
            return;
        }
        setIsSyncing(true);
        const csvUrl = getCsvUrl(dealList.sheetUrl);
        if (!csvUrl) {
             addToast("URL không hợp lệ.", 'error');
             setIsSyncing(false);
             return;
        }

        try {
            const fetchedProducts = await fetchProductsFromSheet(csvUrl, dealList.columnMapping);
            await syncProductsToFirestore(dealList.id, fetchedProducts);
            addToast(`Đã đồng bộ thành công ${fetchedProducts.length} sản phẩm!`, 'success');
        } catch (err: any) {
            addToast(`Lỗi đồng bộ: ${err.message}`, 'error');
        } finally {
            setIsSyncing(false);
        }
    }, [user, db, syncProductsToFirestore, addToast]);

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

                const filledJson = json;
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
                if (fileInputRef.current) fileInputRef.current.value = ""; 
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
            addToast("Không thể chỉnh sửa nguồn dữ liệu Excel. Hãy nhập file mới.", 'info');
            return;
        }
        setEditingDealList(dealList);
        setAppState('CONNECT_SHEET');
    }, [addToast]);
    
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

            const productsSnapshot = await productsRef.get();
            if (!productsSnapshot.empty) {
                const batch = db.batch();
                productsSnapshot.docs.forEach((doc: any) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }

            await dealListRef.delete();

            if (activeDealListId === idToDelete) {
                setActiveDealListId(null);
                sessionStorage.removeItem('activeDealListId');
            }

            addToast(`Đã xóa danh sách "${listPendingDeletion.name}"`, 'success');
            setListPendingDeletion(null); 
        } catch (err: any) {
            console.error("Lỗi khi xóa deal list:", err);
            addToast(`Không thể xóa: ${err.message}`, 'error');
            setListPendingDeletion(null);
        } finally {
            setIsDeleting(false);
        }
    }, [listPendingDeletion, user, db, activeDealListId, addToast]);
    
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
            }).filter(p => p.name && p.displayPrice > 0); 
            
            await syncProductsToFirestore(dealListId, productsToSync);
            addToast("Đã nhập dữ liệu Excel thành công!", 'success');
            setTempExcelData(null);
        } else if (finalDealListData.source === 'google-sheet') {
            const fullDealListObject: DealList = { id: dealListId, ...finalDealListData, lastSynced: null };
            await handleSync(fullDealListObject);
        }
    }, [user, db, editingDealList, tempMapping, handleSync, tempExcelData, syncProductsToFirestore, addToast]);

    const handleAddCreator = async (name: string, tiktokId: string, assignedDealListIds: string[]) => {
        if (!user || !db) throw new Error("Người dùng chưa đăng nhập.");
        await db.collection('users').doc(user.uid).collection('creators').add({ name, tiktokId, assignedDealListIds });
        addToast("Đã thêm Creator thành công!", 'success');
    };

    const handleUpdateCreator = async (id: string, name: string, tiktokId: string, assignedDealListIds: string[]) => {
        if (!user || !db) throw new Error("Người dùng chưa đăng nhập.");
        await db.collection('users').doc(user.uid).collection('creators').doc(id).update({ name, tiktokId, assignedDealListIds });
        addToast("Đã cập nhật Creator!", 'success');
    };

    const handleDeleteCreator = async (id: string) => {
        if (!user || !db) throw new Error("Người dùng chưa đăng nhập.");
        await db.collection('users').doc(user.uid).collection('creators').doc(id).delete();
        addToast("Đã xóa Creator!", 'success');
    };

    const handleSaveProduct = async (productData: Omit<Product, 'docId'>) => {
        if (!user || !db || !activeDealListId) return;
        
        setIsSavingProduct(true);
        try {
            const productsRef = db.collection('users').doc(user.uid).collection('dealLists').doc(activeDealListId).collection('products');
            
            if (editingProduct && editingProduct.docId) {
                await productsRef.doc(editingProduct.docId).update(productData);
                addToast("Cập nhật sản phẩm thành công!", 'success');
            } else {
                await productsRef.add(productData);
                addToast("Thêm sản phẩm mới thành công!", 'success');
            }
            setIsProductModalOpen(false);
            setEditingProduct(null);
        } catch (e: any) {
            console.error("Error saving product:", e);
            addToast("Lỗi lưu sản phẩm: " + e.message, 'error');
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
             addToast(`Đã xóa sản phẩm "${productPendingDeletion.name}"`, 'success');
             setProductPendingDeletion(null);
             if (selectedProduct?.docId === productPendingDeletion.docId) {
                 setSelectedProduct(null);
             }
        } catch (e: any) {
             console.error("Error deleting product:", e);
             addToast("Lỗi xóa sản phẩm: " + e.message, 'error');
        } finally {
            setIsDeletingProduct(false);
        }
    };
    
    const handleSavePresets = async (newPresets: number[]) => {
        if(!user || !db) return;
        
        setCalculatorPresets(newPresets);
        
        try {
            await db.collection('users').doc(user.uid).set({ calculatorPresets: newPresets }, { merge: true });
            addToast("Đã lưu cài đặt phím tắt!", 'success');
        } catch(e: any) {
            console.error("Error saving settings:", e);
            addToast("Không thể lưu cài đặt: " + e.message, 'error');
        }
    };


    const renderLoading = () => (
        <div className="flex items-center justify-center h-screen bg-[#020617]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary-500 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-white tracking-tight">Đang tải...</h2>
            </div>
        </div>
    );
    

    const renderManageLists = () => (
        <div className="min-h-screen relative overflow-hidden">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-600 rounded-full mix-blend-overlay filter blur-[100px] opacity-30 animate-blob"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>

            <div className="max-w-6xl mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls, .csv" />
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">Quản lý Deal Lists</h1>
                    <div className="flex items-center gap-3">
                        <ThemeSelector currentTheme={theme} onChange={setTheme} />
                        
                        {user && (
                            <div className="flex items-center gap-3 bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/10">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white/20">
                                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <span className="text-sm font-bold text-slate-200 hidden sm:inline">{user.displayName || user.email}</span>
                                <button onClick={handleLogout} className="p-1.5 rounded-full text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors" aria-label="Đăng xuất">
                                    <LogoutIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {error && <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-xl relative mb-6 shadow-sm" role="alert">{error}</div>}

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {dealLists.map(dl => (
                        <div key={dl.id} className="bg-slate-900/40 backdrop-blur-lg p-6 rounded-3xl shadow-glass border border-white/5 hover:border-primary-500/40 hover:bg-slate-800 hover:shadow-glow-card hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between h-60 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                                 {dl.source === 'excel' ? <SheetIcon className="w-32 h-32 text-green-400"/> : <LinkIcon className="w-32 h-32 text-primary-400"/>}
                             </div>

                            <div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${dl.source === 'excel' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary-500/10 text-primary-400'}`}>
                                         {dl.source === 'excel' ? <SheetIcon className="w-6 h-6"/> : <LinkIcon className="w-6 h-6"/>}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg tracking-wide border ${dl.source === 'excel' ? 'bg-emerald-900/20 text-emerald-300 border-emerald-500/20' : 'bg-primary-900/20 text-primary-300 border-primary-500/20'}`}>
                                        {dl.source === 'excel' ? 'Excel' : 'Sheet'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-xl text-white truncate relative z-10" title={dl.name}>{dl.name}</h3>
                                <p className="text-xs text-slate-400 mt-1 truncate font-mono relative z-10">{dl.sheetUrl || 'Local File'}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 relative z-10">
                                <button onClick={() => handleSetActiveDealList(dl.id)} className="flex-1 py-2.5 bg-white text-slate-950 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all shadow-lg active:scale-95 hover:shadow-glow-sm">Vào xem</button>
                                <button onClick={() => handleEditList(dl)} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors" disabled={dl.source === 'excel'}><EditIcon className="w-5 h-5"/></button>
                                <button 
                                    onClick={() => setListPendingDeletion(dl)}
                                    className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    
                     <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border-2 border-dashed border-slate-700 hover:border-primary-500/50 hover:bg-white/10 transition-all flex flex-col items-center justify-center h-60 gap-4 group cursor-default hover:shadow-glow-card hover:-translate-y-1 duration-300">
                        <div className="w-14 h-14 rounded-full bg-slate-800 shadow-lg flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-primary-600 transition-all group-hover:shadow-glow-sm">
                             <PlusIcon className="w-7 h-7" />
                        </div>
                        <p className="text-sm font-bold text-slate-400 group-hover:text-white">Tạo danh sách mới</p>
                        <div className="flex gap-2 w-full px-4">
                             <button onClick={handleAddNewList} className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[11px] font-bold text-slate-300 hover:border-primary-500 hover:text-white shadow-sm transition-all hover:shadow-glow-sm">
                                Google Sheet
                            </button>
                             <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[11px] font-bold text-slate-300 hover:border-emerald-500 hover:text-white shadow-sm transition-all hover:shadow-glow-sm">
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
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl shadow-2xl p-10 max-w-xl w-full border border-white/10">
                 <div className="mb-8 text-center">
                    <div className="w-16 h-16 bg-primary-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary-400 shadow-lg border border-primary-500/20">
                        <LinkIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{editingDealList?.id ? 'Cập nhật kết nối' : 'Kết nối Google Sheet'}</h2>
                    <p className="text-slate-400 text-sm mt-2 font-medium">Nhập thông tin bảng tính để đồng bộ dữ liệu.</p>
                </div>

                <form onSubmit={handleConnectSheetSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="dealListName" className="block text-sm font-bold text-slate-300 mb-2">Tên danh sách</label>
                        <input
                            type="text"
                            id="dealListName"
                            value={editingDealList?.name || ''}
                            onChange={(e) => setEditingDealList(prev => ({...prev, name: e.target.value}))}
                            placeholder="Ví dụ: Deal tháng 11"
                            required
                            className="block w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-950 focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm font-medium text-white placeholder:text-slate-600 hover:border-primary-500/40 hover:bg-slate-900/80 hover:shadow-glow-hover"
                        />
                    </div>
                    <div>
                        <label htmlFor="sheetUrl" className="block text-sm font-bold text-slate-300 mb-2">Đường dẫn Google Sheet (URL)</label>
                         <input
                            type="url"
                            id="sheetUrl"
                            value={editingDealList?.sheetUrl || ''}
                            onChange={(e) => setEditingDealList(prev => ({...prev, sheetUrl: e.target.value}))}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            required
                            className="block w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-950 focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm font-medium text-white placeholder:text-slate-600 hover:border-primary-500/40 hover:bg-slate-900/80 hover:shadow-glow-hover"
                        />
                        <p className="mt-3 text-xs text-blue-300 bg-blue-900/20 p-3.5 rounded-xl flex gap-2 items-start border border-blue-800/50">
                            <span>ℹ️</span>
                            Sheet phải được chia sẻ công khai ở chế độ "Bất kỳ ai có đường liên kết".
                        </p>
                    </div>
                    {error && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">{error}</p>}
                    
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button type="button" onClick={() => setAppState('MANAGE_LISTS')} className="px-4 py-3.5 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 bg-transparent hover:bg-slate-800 transition-colors">Hủy bỏ</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-3.5 rounded-xl shadow-lg shadow-primary-900/20 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 transition-all hover:shadow-glow-lg">
                            {isLoading ? 'Đang kiểm tra...' : 'Tiếp tục'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderMapColumns = () => (
       <div className="min-h-screen">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-8">
                     <div>
                        <h2 className="text-3xl font-black text-white">Ánh xạ dữ liệu</h2>
                        <p className="text-slate-400 text-sm mt-1 font-medium">Chọn cột tương ứng trong file của bạn với dữ liệu hệ thống.</p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => setAppState('MANAGE_LISTS')} className="px-5 py-2.5 text-sm font-bold text-slate-300 bg-transparent border border-slate-600 rounded-xl hover:bg-slate-800">Hủy</button>
                        <button onClick={handleMappingSave} className="px-6 py-2.5 text-sm font-bold text-white bg-primary-600 rounded-xl shadow-lg shadow-primary-900/20 hover:bg-primary-500 transition-all hover:shadow-glow-lg">Lưu & Đồng bộ</button>
                    </div>
                </div>

                {error && <p className="text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-xl text-sm mb-6">{error}</p>}
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4">
                        <div className="bg-slate-900/80 p-6 rounded-2xl shadow-sm border border-white/10 sticky top-6">
                            <h3 className="font-bold text-white mb-5 flex items-center gap-3 text-lg">
                                <span className="w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-bold">1</span>
                                Cột cần chọn
                            </h3>
                            <div className="space-y-3">
                                {MAPPING_CONFIG.map(config => (
                                    <div 
                                        key={config.key} 
                                        onClick={() => setActiveMappingKey(config.key)} 
                                        className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 ${activeMappingKey === config.key ? 'border-primary-500 bg-primary-500/10 shadow-sm' : 'border-slate-700 hover:border-primary-500/30 bg-slate-950 hover:shadow-glow-hover'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className={`text-sm font-bold ${activeMappingKey === config.key ? 'text-primary-300' : 'text-slate-300'}`}>{config.label}</span>
                                            {config.required && <span className="text-[10px] font-bold text-red-400 bg-red-900/20 px-2 py-0.5 rounded-full">Bắt buộc</span>}
                                        </div>
                                        <div className={`text-xs px-3 py-2 rounded-lg w-full truncate font-medium ${tempMapping[config.key] ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-slate-900 text-slate-500 border border-slate-800 border-dashed'}`}>
                                            {tempMapping[config.key] || 'Chưa chọn cột'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-8">
                        <div className="bg-slate-900/80 p-6 rounded-2xl shadow-sm border border-white/10 h-full flex flex-col">
                             <h3 className="font-bold text-white mb-5 flex items-center gap-3 text-lg">
                                <span className="w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-bold">2</span>
                                Dữ liệu từ file (15 dòng đầu)
                            </h3>
                            <div className="flex-grow overflow-auto border border-slate-700 rounded-xl custom-scrollbar shadow-inner bg-slate-950">
                                <table className="min-w-full divide-y divide-slate-800">
                                    <thead className="bg-slate-900 sticky top-0 z-10 shadow-sm">
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
                                                            className={`w-full text-left px-4 py-3.5 border-b-4 transition-colors hover:bg-slate-800 ${isMapped ? 'border-primary-500 text-primary-400 bg-primary-900/20 font-bold' : 'border-transparent text-slate-400 hover:text-primary-300'}`}
                                                        >
                                                            {header}
                                                            {isMapped && <span className="ml-2 text-[10px] bg-primary-500 text-white px-1.5 py-0.5 rounded-full align-middle">Đã chọn</span>}
                                                        </button>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-slate-950 divide-y divide-slate-800">
                                        {sheetPreview.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-slate-900/50 transition-colors">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-400 max-w-[200px] truncate border-r border-slate-800 last:border-r-0 font-medium">
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
        const [isInspectorOpen, setIsInspectorOpen] = useState(true);

        return (
            <div className="h-screen w-screen flex flex-col font-sans overflow-hidden relative bg-[#020617] p-6">
                <ToastContainer toasts={toasts} removeToast={removeToast} />

                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary-600 mix-blend-screen filter blur-[120px] opacity-10 animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-500 mix-blend-screen filter blur-[120px] opacity-10 animate-pulse-slow animation-delay-2000"></div>

                {/* Unified Workspace Container */}
                <div className="glass-panel h-full w-full rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-white/10 relative z-20">
                    
                    {/* Integrated Header */}
                    <header className="flex-shrink-0 bg-slate-900/30 backdrop-blur-md border-b border-white/5 z-30 px-6 py-4 shadow-sm">
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-4 flex-grow">
                                <button onClick={() => setAppState('MANAGE_LISTS')} className="text-slate-400 hover:text-white hover:bg-white/10 p-2.5 rounded-xl transition-all flex-shrink-0" title="Quay lại quản lý">
                                    <CogIcon className="w-6 h-6" />
                                </button>
                                
                                <div className="h-8 w-px bg-slate-700 mx-1"></div>

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
                                    <>
                                        <button 
                                            onClick={() => activeDealList && handleSync(activeDealList)} 
                                            disabled={isSyncing || activeDealList?.source === 'excel'}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold hover:border-primary-500 hover:text-white hover:shadow-glow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                        >
                                            <SyncIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
                                        </button>

                                        <button
                                            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                                            className={`p-2.5 rounded-xl transition-all border ${isInspectorOpen ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-white'}`}
                                            title={isInspectorOpen ? 'Ẩn công cụ tính' : 'Hiện công cụ tính'}
                                        >
                                            <SidebarIcon className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                <div className="flex-grow"></div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <ThemeSelector currentTheme={theme} onChange={setTheme} />

                                {user && (
                                    <div className="flex items-center gap-4 flex-shrink-0 pr-2">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs font-bold text-white">{user.displayName || 'User'}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-primary-900/50 ring-2 ring-white/10">
                                            {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <button onClick={handleLogout} className="p-2 rounded-full text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors" aria-label="Đăng xuất">
                                            <LogoutIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {error && <p className="text-red-400 text-xs font-bold mt-2 text-center bg-red-900/20 p-2 rounded-lg animate-pulse border border-red-800/50">{error}</p>}
                    </header>

                    {/* Main Content Area (Split View) */}
                    <div className="flex flex-grow min-h-0 overflow-hidden relative">
                         {activeDealListId ? (
                            <>
                                {/* Left Sidebar: Calculator (Inspector Panel) */}
                                <div className={`h-full border-r border-white/5 bg-slate-950/20 backdrop-blur-sm flex flex-col z-10 transition-all duration-300 ease-in-out overflow-hidden ${isInspectorOpen ? 'w-[400px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full'}`}>
                                    <div className="w-[400px] h-full"> {/* Fixed width container to prevent content squishing during animation */}
                                        <Calculator 
                                            selectedProduct={selectedProduct} 
                                            dealListName={activeDealList?.name || ''} 
                                            products={products}
                                            onProductSelect={setSelectedProduct}
                                            onFocusSearch={() => searchInputRef.current?.focus()}
                                            presetVouchers={calculatorPresets}
                                            onSavePresets={handleSavePresets}
                                        />
                                    </div>
                                </div>

                                {/* Right Content: Table / Creator List */}
                                <div className="flex-1 min-w-0 h-full flex flex-col bg-transparent overflow-hidden relative z-0">
                                     <div className="flex-shrink-0 border-b border-white/5 px-6 pt-4 bg-slate-900/10">
                                        <nav className="flex space-x-4" aria-label="Tabs">
                                            <button
                                                onClick={() => setActiveViewDataTab('products')}
                                                className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all border-b-2 ${
                                                    activeViewDataTab === 'products'
                                                        ? 'border-primary-500 text-primary-400'
                                                        : 'border-transparent text-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                <SheetIcon className="w-4 h-4" />
                                                Sản phẩm
                                            </button>
                                            <button
                                                onClick={() => setActiveViewDataTab('creators')}
                                                className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all border-b-2 ${
                                                    activeViewDataTab === 'creators'
                                                        ? 'border-primary-500 text-primary-400'
                                                        : 'border-transparent text-slate-500 hover:text-slate-300'
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
                             <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center text-slate-500 max-w-md">
                                    <div className="w-24 h-24 bg-slate-800/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg border border-white/5">
                                        <SheetIcon className="w-10 h-10 text-primary-400" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-200 mb-3 tracking-tight">Chưa chọn danh sách</h2>
                                    <p className="text-slate-500 font-medium">Vui lòng chọn một Deal List từ menu phía trên để bắt đầu tính toán và tra cứu.</p>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
                
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
