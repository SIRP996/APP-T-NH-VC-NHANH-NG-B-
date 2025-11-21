
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { SpinnerIcon } from './Icons';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Omit<Product, 'docId'>) => Promise<void>;
    product: Product | null; // If null, it's Add mode. If set, it's Edit mode.
    isSaving: boolean;
}

const InputField: React.FC<{
    label: string;
    value: string | number;
    onChange: (val: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
}> = ({ label, value, onChange, type = "text", placeholder, required, className = "" }) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full px-4 py-3 bg-slate-100 text-slate-900 border border-transparent rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white focus:border-violet-500 outline-none transition-all text-sm font-medium placeholder:text-slate-400"
        />
    </div>
);

const TextAreaField: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    required?: boolean;
}> = ({ label, value, onChange, placeholder, required }) => (
    <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            rows={3}
            className="w-full px-4 py-3 bg-slate-100 text-slate-900 border border-transparent rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white focus:border-violet-500 outline-none transition-all text-sm font-medium resize-none placeholder:text-slate-400"
        />
    </div>
);

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, isSaving }) => {
    const [formData, setFormData] = useState<Omit<Product, 'docId'>>({
        id: '',
        name: '',
        exclusiveId: '',
        modelId: '',
        displayPrice: 0,
        finalPrice: '',
        gift: '',
        originalPrice: 0,
    });

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setFormData({
                    id: product.id || '',
                    name: product.name || '',
                    exclusiveId: product.exclusiveId || '',
                    modelId: product.modelId || '',
                    displayPrice: product.displayPrice || 0,
                    finalPrice: product.finalPrice || '',
                    gift: product.gift || '',
                    originalPrice: product.originalPrice || 0
                });
            } else {
                // Reset for Add mode
                setFormData({
                    id: '',
                    name: '',
                    exclusiveId: '',
                    modelId: '',
                    displayPrice: 0,
                    finalPrice: '',
                    gift: '',
                    originalPrice: 0,
                });
            }
        }
    }, [isOpen, product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    const handleChange = (field: keyof Omit<Product, 'docId'>, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-8 pb-6 pt-6 custom-scrollbar">
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField 
                                label="Mã sản phẩm (ID/SKU)" 
                                value={formData.id} 
                                onChange={v => handleChange('id', v)} 
                                required 
                                placeholder="Ví dụ: SPA001"
                            />
                            <InputField 
                                label="ID Độc quyền" 
                                value={formData.exclusiveId || ''} 
                                onChange={v => handleChange('exclusiveId', v)} 
                                placeholder="Không bắt buộc"
                            />
                        </div>

                        <TextAreaField 
                            label="Tên sản phẩm" 
                            value={formData.name} 
                            onChange={v => handleChange('name', v)} 
                            required 
                            placeholder="Nhập tên đầy đủ của sản phẩm..."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField 
                                label="Giá hiển thị (VND)" 
                                type="number"
                                value={formData.displayPrice} 
                                onChange={v => handleChange('displayPrice', Number(v))} 
                                required 
                                placeholder="0"
                            />
                             <InputField 
                                label="Giá cuối (Text/VND)" 
                                value={formData.finalPrice || ''} 
                                onChange={v => handleChange('finalPrice', v)} 
                                placeholder="Ví dụ: 299.000"
                            />
                        </div>
                         
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <InputField 
                                label="Model ID" 
                                value={formData.modelId || ''} 
                                onChange={v => handleChange('modelId', v)} 
                                placeholder="Mã model..."
                            />
                             <InputField 
                                label="Quà tặng" 
                                value={formData.gift || ''} 
                                onChange={v => handleChange('gift', v)} 
                                placeholder="Thông tin quà tặng..."
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-6 flex justify-end gap-3 bg-slate-50 border-t border-slate-100">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isSaving}
                        className="px-6 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm hover:shadow"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-6 py-3 text-sm font-bold text-white bg-[#8B5CF6] rounded-2xl hover:bg-[#7C3AED] disabled:opacity-50 shadow-lg shadow-violet-200 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isSaving && <SpinnerIcon className="w-4 h-4" />}
                        {product ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                    </button>
                </div>
            </div>
        </div>
    );
};
