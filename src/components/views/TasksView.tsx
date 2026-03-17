import React from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react';

const TasksView: React.FC = () => {
    return (
        <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Tasks_Board</h3>
                    <p className="text-sm text-gray-500">Gestión de flujo y prioridades críticas.</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest">3 Completas</span>
                    <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full text-[10px] font-bold border border-rose-500/20 uppercase tracking-widest">2 Urgentes</span>
                </div>
            </div>

            <div className="space-y-4">
                {[
                    { task: 'Terminar diseño de paneles flotantes', status: 'done', priority: 'high' },
                    { task: 'Conectar backend SQL Server', status: 'pending', priority: 'critical' },
                    { task: 'Implementar login con Google', status: 'pending', priority: 'medium' },
                    { task: 'Escribir documentación inicial', status: 'pending', priority: 'low' },
                ].map((item, i) => (
                    <div key={i} className="glass-panel p-4 rounded-2xl flex items-center justify-between border-white/5 hover:bg-white/5 transition-all group">
                        <div className="flex items-center gap-4">
                            {item.status === 'done' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <Circle className="w-5 h-5 text-gray-700 group-hover:text-purple-500 transition-colors" />
                            )}
                            <span className={`text-sm ${item.status === 'done' ? 'text-gray-600 line-through' : 'text-gray-300'}`}>
                                {item.task}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            {item.priority === 'critical' && <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />}
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${item.priority === 'critical' ? 'text-rose-500' :
                                    item.priority === 'high' ? 'text-purple-400' : 'text-gray-600'
                                }`}>
                                {item.priority}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TasksView;
