import React from 'react';
import { Terminal as TerminalIcon, Plus, ChevronRight, Hash } from 'lucide-react';

const TerminalView: React.FC = () => {
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Terminal_Cluster</h3>
                    <p className="text-sm text-gray-500">Acceso directo a shells del sistema y scripts de automatización.</p>
                </div>
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all text-white flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Shell
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { name: 'PowerShell', shell: 'pwsh.exe', color: 'blue' },
                    { name: 'Git Bash', shell: 'bash.exe', color: 'orange' },
                    { name: 'CMD', shell: 'cmd.exe', color: 'gray' },
                ].map((term, i) => (
                    <div key={i} className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-white/20 transition-all bg-black/40 group relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${term.color === 'blue' ? 'bg-blue-500' : term.color === 'orange' ? 'bg-orange-500' : 'bg-gray-500'}`}></div>
                        <div className="flex items-center justify-between mb-4">
                            <TerminalIcon className={`w-6 h-6 ${term.color === 'blue' ? 'text-blue-400' : term.color === 'orange' ? 'text-orange-400' : 'text-gray-400'}`} />
                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{term.name}</h4>
                        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{term.shell}</p>

                        <div className="mt-8 pt-4 border-t border-white/5 flex gap-2 overflow-hidden">
                            <span className="text-[9px] bg-white/5 px-2 py-1 rounded text-gray-500 font-mono">npm run dev</span>
                            <span className="text-[9px] bg-white/5 px-2 py-1 rounded text-gray-500 font-mono">git commit</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TerminalView;
