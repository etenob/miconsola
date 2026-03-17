import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Trash2, Search, Save, X, Calendar, Hash } from 'lucide-react';
import { storageService } from '../../services/storageService';
import type { MicoNote } from '../../services/storageService';

const NotesView: React.FC = () => {
    const [notes, setNotes] = useState<MicoNote[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentNote, setCurrentNote] = useState<Partial<MicoNote>>({
        title: '',
        content: '',
        category: 'General'
    });

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = () => {
        setNotes(storageService.getNotes());
    };

    const handleSave = () => {
        if (!currentNote.title || !currentNote.content) return;

        const noteToSave: MicoNote = {
            id: currentNote.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: currentNote.title,
            content: currentNote.content,
            date: new Date().toLocaleDateString(),
            category: currentNote.category || 'General'
        };

        storageService.saveNote(noteToSave);
        setIsEditing(false);
        setCurrentNote({ title: '', content: '', category: 'General' });
        loadNotes();
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        storageService.deleteNote(id);
        loadNotes();
    };

    const filteredNotes = notes.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tighter italic flex items-center gap-3">
                        <StickyNote className="w-8 h-8 text-amber-400" />
                        Archivo_Notas
                    </h2>
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mt-1">Gestión de Pensamientos y Logs de Sistema</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> NUEVA_NOTA
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {!isEditing && (
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text"
                            placeholder="Buscar en el archivo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm text-white focus:outline-none focus:border-amber-500/30 transition-all font-mono italic"
                        />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isEditing ? (
                        <div className="max-w-3xl mx-auto w-full glass-panel p-10 rounded-[2.5rem] border-white/5 bg-black/40 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Editor de Nodo de Memoria</h3>
                                <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono">Título del Pensamiento</label>
                                        <input 
                                            type="text"
                                            value={currentNote.title}
                                            onChange={e => setCurrentNote({...currentNote, title: e.target.value})}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-amber-500/50 outline-none font-sans italic"
                                            placeholder="Nombre de la nota..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono">Categoría / Hash</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                                            <input 
                                                type="text"
                                                value={currentNote.category}
                                                onChange={e => setCurrentNote({...currentNote, category: e.target.value})}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-xs text-white focus:border-amber-500/50 outline-none font-mono"
                                                placeholder="General..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono italic">Contenido_Neuron (Cuerpo de la nota)</label>
                                    <textarea 
                                        rows={12}
                                        value={currentNote.content}
                                        onChange={e => setCurrentNote({...currentNote, content: e.target.value})}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-5 text-xs text-white focus:border-amber-500/50 outline-none font-sans resize-none leading-relaxed"
                                        placeholder="Escribe lo que tienes en mente..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-6">
                                    <button 
                                        onClick={handleSave}
                                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                                    >
                                        <Save className="w-4 h-4" /> PERSISTIR_MEMORIA
                                    </button>
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="px-8 bg-white/5 hover:bg-white/10 py-4 rounded-2xl flex items-center justify-center transition-all border border-white/5 text-xs font-bold text-gray-400"
                                    >
                                        CANCELAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredNotes.length > 0 ? (
                                filteredNotes.map(note => (
                                    <div 
                                        key={note.id}
                                        onClick={() => {
                                            setCurrentNote(note);
                                            setIsEditing(true);
                                        }}
                                        className="glass-panel p-6 rounded-[2rem] border-white/5 bg-black/40 hover:border-amber-500/30 transition-all group relative cursor-pointer overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[7px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                                <Hash className="w-2 h-2" /> {note.category}
                                            </div>
                                            <button 
                                                onClick={(e) => handleDelete(note.id, e)}
                                                className="p-2 text-gray-700 hover:text-rose-500 transition-colors bg-white/5 rounded-lg opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <h4 className="text-sm font-bold text-white mb-2 truncate">{note.title}</h4>
                                        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3 mb-4 font-sans opacity-80">
                                            {note.content}
                                        </p>
                                        <div className="flex items-center gap-2 text-[8px] text-gray-600 font-mono mt-auto pt-4 border-t border-white/5">
                                            <Calendar className="w-3 h-3" />
                                            {note.date}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center opacity-30">
                                    <StickyNote className="w-16 h-16 mb-4" />
                                    <p className="text-xs font-mono uppercase tracking-[0.3em]">Archivo de memoria vacío</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesView;
