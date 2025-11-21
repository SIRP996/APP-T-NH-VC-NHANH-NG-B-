import React, { useState, useMemo, useEffect } from 'react';
import { Creator, DealList } from '../types';
import { SearchIcon, CopyIcon, CheckIcon, PlusIcon, EditIcon, TrashIcon, SpinnerIcon } from './Icons';

const ModalInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; required?: boolean }> = ({ label, value, onChange, placeholder, required }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e)}
            placeholder={placeholder}
            required={required}
            className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-white placeholder:text-slate-600 hover:border-primary-400 hover:shadow-glow-hover hover:bg-slate-900/80 transition-all"
        />
    </div>
);

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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white">{creator ? 'Chỉnh sửa Creator' : 'Thêm Creator Mới'}</h3>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <ModalInput label="Tên KOL" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên KOL..." required />
                    <ModalInput label="ID Kênh TikTok" value={tiktokId} onChange={e => setTiktokId(e.target.value)} placeholder="Nhập ID kênh..." required />
                    
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-300">Gán Deal Lists</label>
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-2 rounded-md border border-slate-800 p-3 bg-slate-950">
                            {dealLists.length > 0 ? (
                                dealLists.map(list => (
                                    <label key={list.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={assignedIds.includes(list.id)}
                                            onChange={() => handleDealListToggle(list.id)}
                                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-slate-300">{list.name}</span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-2">Không có deal list nào để gán.</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-slate-300 bg-transparent border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50">Hủy</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 w-28 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-500 disabled:opacity-50 flex items-center justify-center hover:shadow-glow-hover hover:border-primary-400">
                            {isSaving ? <SpinnerIcon /> : 'Lưu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteCreatorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    creator: Creator | null;
    isDeleting: boolean;
}> = ({ isOpen, onClose, onConfirm, creator, isDeleting }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white">Xác nhận xóa</h3>
                <p className="mt-2 text-sm text-slate-400">Bạn có chắc chắn muốn xóa creator <strong className="font-semibold text-white">{creator?.name}</strong>?</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-slate-300 bg-transparent border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50">Hủy</button>
                    <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 w-28 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center">
                        {isDeleting ? <SpinnerIcon /> : 'Xóa'}
                    </button>
                </div>
            </div>
        </div>
    );
}

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
        <div className="bg-transparent w-full h-full flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center gap-4">
                <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="w-5 h-5 text-slate-500" />
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm theo tên KOL..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-600 hover:border-primary-400 hover:shadow-glow-hover hover:bg-slate-900/80 transition-all"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500 flex-shrink-0 hover:shadow-glow-hover transition-all"
                >
                    <PlusIcon className="w-5 h-5" />
                    Thêm mới
                </button>
            </div>
            <div className="flex-grow overflow-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-slate-800/50">
                    <thead className="bg-slate-900/50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tên KOL</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ID Kênh TikTok</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {isLoading ? (
                            <tr><td colSpan={3} className="text-center py-10 text-slate-500">Đang tải danh sách...</td></tr>
                        ) : filteredCreators.length > 0 ? (
                            filteredCreators.map(creator => (
                                <tr key={creator.id} className="hover:bg-slate-800/90 hover:shadow-glow-inset hover:shadow-[inset_0_0_0_1px_rgba(var(--primary-500),0.3)] transition-all duration-200 group">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200 group-hover:text-white">{creator.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                                        <div className="flex items-center gap-2">
                                            <span>{creator.tiktokId}</span>
                                            <button onClick={() => handleCopy(creator.tiktokId)} className="p-1.5 rounded-md hover:bg-primary-500/20 text-slate-500 hover:text-primary-400">
                                                {copiedId === creator.tiktokId ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleOpenModal(creator)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-md"><EditIcon className="w-4 h-4"/></button>
                                            <button onClick={() => setDeletingCreator(creator)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md"><TrashIcon className="w-4 h-4"/></button>
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