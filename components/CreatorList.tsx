
import React, { useState, useMemo, useEffect } from 'react';
import { Creator, DealList } from '../types';
import { SearchIcon, CopyIcon, CheckIcon, PlusIcon, EditIcon, TrashIcon, SpinnerIcon } from './Icons';

// Reusable Input Component for Modals
const ModalInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; required?: boolean }> = ({ label, value, onChange, placeholder, required }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e)}
            placeholder={placeholder}
            required={required}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
    </div>
);

// Add/Edit Modal
const CreatorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, tiktokId: string, assignedDealListIds: string[]) => void;
    creator: Creator | null;
    isSaving: boolean;
    dealLists: DealList[];
}> = ({ isOpen, onClose, onSave, creator, isSaving, dealLists }) => {
    const [name, setName] = useState('');
    const [tiktokId, setTiktokId] = useState('');
    const [assignedIds, setAssignedIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (creator) {
                setName(creator.name);
                setTiktokId(creator.tiktokId);
                setAssignedIds(creator.assignedDealListIds || []);
            } else {
                setName('');
                setTiktokId('');
                setAssignedIds([]);
            }
        }
    }, [creator, isOpen]);
    
    if (!isOpen) return null;

    const handleDealListToggle = (listId: string) => {
        setAssignedIds(prev =>
            prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(name, tiktokId, assignedIds);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900">{creator ? 'Chỉnh sửa Creator' : 'Thêm Creator Mới'}</h3>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <ModalInput label="Tên KOL" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên KOL..." required />
                    <ModalInput label="ID Kênh TikTok" value={tiktokId} onChange={e => setTiktokId(e.target.value)} placeholder="Nhập ID kênh..." required />
                    
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700">Gán Deal Lists</label>
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-2 rounded-md border p-3 bg-slate-50">
                            {dealLists.length > 0 ? (
                                dealLists.map(list => (
                                    <label key={list.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={assignedIds.includes(list.id)}
                                            onChange={() => handleDealListToggle(list.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700">{list.name}</span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-2">Không có deal list nào để gán.</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50">Hủy</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 w-28 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center">
                            {isSaving ? <SpinnerIcon /> : 'Lưu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Delete Confirmation Modal
const DeleteCreatorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    creator: Creator | null;
    isDeleting: boolean;
}> = ({ isOpen, onClose, onConfirm, creator, isDeleting }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa</h3>
                <p className="mt-2 text-sm text-slate-800">Bạn có chắc chắn muốn xóa creator <strong className="font-semibold">{creator?.name}</strong>?</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50">Hủy</button>
                    <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 w-28 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center">
                        {isDeleting ? <SpinnerIcon /> : 'Xóa'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Main Component
export const CreatorList: React.FC<{
    creators: Creator[];
    isLoading: boolean;
    onAdd: (name: string, tiktokId: string, assignedDealListIds: string[]) => Promise<void>;
    onUpdate: (id: string, name: string, tiktokId: string, assignedDealListIds: string[]) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    dealLists: DealList[];
}> = ({ creators, isLoading, onAdd, onUpdate, onDelete, dealLists }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
    const [deletingCreator, setDeletingCreator] = useState<Creator | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredCreators = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        if (!lowercasedFilter) return creators;
        return creators.filter(c => c.name.toLowerCase().includes(lowercasedFilter));
    }, [creators, searchTerm]);

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const handleOpenModal = (creator: Creator | null = null) => {
        setEditingCreator(creator);
        setIsModalOpen(true);
    };

    const handleSave = async (name: string, tiktokId: string, assignedDealListIds: string[]) => {
        setIsSaving(true);
        try {
            if (editingCreator) {
                await onUpdate(editingCreator.id, name, tiktokId, assignedDealListIds);
            } else {
                await onAdd(name, tiktokId, assignedDealListIds);
            }
            setIsModalOpen(false);
        } catch (e) {
            console.error("Failed to save creator", e);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!deletingCreator) return;
        setIsDeleting(true);
        try {
            await onDelete(deletingCreator.id);
            setDeletingCreator(null);
        } catch(e) {
            console.error("Failed to delete creator", e);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-white shadow-lg rounded-xl border border-slate-200 w-full h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center gap-4">
                <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="w-5 h-5 text-slate-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm theo tên KOL..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 flex-shrink-0"
                >
                    <PlusIcon className="w-5 h-5" />
                    Thêm mới
                </button>
            </div>
            <div className="flex-grow overflow-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên KOL</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID Kênh TikTok</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {isLoading ? (
                            <tr><td colSpan={3} className="text-center py-10 text-slate-500">Đang tải danh sách...</td></tr>
                        ) : filteredCreators.length > 0 ? (
                            filteredCreators.map(creator => (
                                <tr key={creator.id} className="hover:bg-indigo-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{creator.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-mono">
                                        <div className="flex items-center gap-2">
                                            <span>{creator.tiktokId}</span>
                                            <button onClick={() => handleCopy(creator.tiktokId)} className="p-1.5 rounded-md hover:bg-indigo-100 text-slate-600 hover:text-indigo-700">
                                                {copiedId === creator.tiktokId ? <CheckIcon className="w-4 h-4 text-green-600" /> : <CopyIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleOpenModal(creator)} className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md"><EditIcon className="w-4 h-4"/></button>
                                            <button onClick={() => setDeletingCreator(creator)} className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-md"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={3} className="text-center py-10 text-slate-500">Không tìm thấy creator nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <CreatorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} creator={editingCreator} isSaving={isSaving} dealLists={dealLists} />
            <DeleteCreatorModal isOpen={!!deletingCreator} onClose={() => setDeletingCreator(null)} onConfirm={handleDelete} creator={deletingCreator} isDeleting={isDeleting} />
        </div>
    );
};
