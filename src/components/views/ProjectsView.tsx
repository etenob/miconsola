import React, { useState, useEffect } from 'react';
import { Folder, GitBranch, Share2, ExternalLink, Plus, FolderKanban, Globe, Layout, MoreVertical, Trash2, StickyNote, Clock } from 'lucide-react';
import { storageService } from '../../services/storageService';
import type { MicoNote } from '../../services/storageService';

interface Project {
    id: string;
    name: string;
    type: 'web' | 'app' | 'script';
    status: 'active' | 'archived';
}

const ProjectsView: React.FC<{ onSelectProject: (id: string) => void }> = ({ onSelectProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [recentNotes, setRecentNotes] = useState<MicoNote[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('MICO_PROJECTS');
        if (saved) setProjects(JSON.parse(saved));
        else {
            const initial: Project[] = [
                { id: '1', name: 'Miconsola_Master', type: 'app', status: 'active' },
                { id: '2', name: 'Landing_Mico', type: 'web', status: 'active' }
            ];
            setProjects(initial);
            localStorage.setItem('MICO_PROJECTS', JSON.stringify(initial));
        }

        // Cargar notas recientes
        setRecentNotes(storageService.getNotes().slice(-3).reverse());
    }, []);

    return (
        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h3 className="text-2xl font-black text-white italic tracking-tighter">Active_Projects</h3>
                    <p className="text-sm text-gray-500 mt-1">Gestión de repositorios y entornos de desarrollo.</p>
                </div>
                <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Importar Proyecto
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Projects Section */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projects.map(project => (
                            <div 
                                key={project.id}
                                onClick={() => onSelectProject(project.id)}
                                className="glass-panel p-8 rounded-[2.5rem] border-white/5 bg-black/40 hover:border-indigo-500/30 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/10 group-hover:scale-110 transition-transform duration-500">
                                        <FolderKanban className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <button className="text-gray-700 hover:text-indigo-400 transition-colors">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2 italic tracking-tighter uppercase">{project.name}</h4>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                        <span className="text-[9px] text-gray-500 uppercase font-mono">{project.type}</span>
                                    </div>
                                    {project.status === 'active' && (
                                        <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest font-mono">LIVE_SYSTEM</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="glass-panel p-8 rounded-[2.5rem] border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-all cursor-pointer group border-2">
                            <Plus className="w-8 h-8 text-gray-600 group-hover:text-indigo-400 transition-colors mb-4" />
                            <p className="text-xs font-mono uppercase tracking-[0.2em]">Cargar_Proyecto</p>
                        </div>
                    </div>
                </div>

                {/* Quick Access/Notes Sidebar on Dashboard */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-[2rem] border-white/5 bg-black/60">
                        <div className="flex items-center justify-between mb-6">
                            <h5 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <StickyNote className="w-4 h-4 text-amber-500" />
                                Notas_Rápidas
                            </h5>
                        </div>
                        <div className="space-y-3">
                            {recentNotes.length > 0 ? (
                                recentNotes.map(note => (
                                    <div key={note.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/20 transition-all">
                                        <p className="text-[10px] font-bold text-white truncate mb-1">{note.title}</p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-gray-600" />
                                            <span className="text-[8px] text-gray-600 font-mono italic">{note.date}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[9px] text-gray-600 italic text-center py-4">Sin memorias recientes...</p>
                            )}
                        </div>
                        <button className="w-full mt-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[9px] font-bold rounded-xl border border-amber-500/20 transition-all uppercase tracking-widest">
                            Ir_al_Archivo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectsView;
