import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { storageService, type TaskItem } from '../../services/storageService';

const TasksView: React.FC = () => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<TaskItem['priority']>('medium');

    useEffect(() => {
        // Carga inicial
        setTasks(storageService.getTasks());

        // Escucha de cambios reactivos
        const handleTasksUpdated = () => setTasks(storageService.getTasks());
        window.addEventListener('mico-tasks-updated', handleTasksUpdated);
        
        return () => window.removeEventListener('mico-tasks-updated', handleTasksUpdated);
    }, []);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        
        const newTask: TaskItem = {
            id: `task_${Date.now()}`,
            text: newTaskText.trim(),
            status: 'pending',
            priority: newTaskPriority
        };
        
        storageService.saveTask(newTask); // Guarda y dispara evento
        setNewTaskText('');
    };

    const toggleTask = (id: string) => {
        const taskToToggle = tasks.find(t => t.id === id);
        if (taskToToggle) {
            storageService.saveTask({
                ...taskToToggle,
                status: taskToToggle.status === 'done' ? 'pending' : 'done'
            });
        }
    };

    const deleteTask = (id: string) => {
        storageService.deleteTask(id);
    };

    const completedCount = tasks.filter(t => t.status === 'done').length;
    const criticalCount = tasks.filter(t => t.priority === 'critical' && t.status === 'pending').length;

    // Ordenamiento: Pendientes primero, luego completadas. Dentro de pendientes, por prioridad.
    const priorityWeight = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        if (a.status === 'pending' && b.status === 'pending') {
            return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        return 0;
    });

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Tasks_Board</h3>
                    <p className="text-sm text-gray-500">Gestión de flujo y prioridades críticas.</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest">{completedCount} Completas</span>
                    {criticalCount > 0 && (
                        <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full text-[10px] font-bold border border-rose-500/20 uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]">{criticalCount} Urgentes</span>
                    )}
                </div>
            </div>

            <form onSubmit={handleAddTask} className="mb-6 flex flex-col sm:flex-row gap-3">
                <input 
                    type="text" 
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Escribe una nueva directiva aquí..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-gray-600"
                />
                <select 
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 appearance-none min-w-[120px]"
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
                <button 
                    type="submit"
                    disabled={!newTaskText.trim()}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Agregar
                </button>
            </form>

            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 pb-10">
                {sortedTasks.map((item) => (
                    <div key={item.id} className={`glass-panel p-4 rounded-xl flex items-center justify-between border-l-4 transition-all group ${
                        item.status === 'done' ? 'border-l-emerald-500/30 opacity-60 hover:opacity-100 hover:border-l-emerald-500/50 border-y-white/5 border-r-white/5' : 
                        item.priority === 'critical' ? 'border-l-rose-500 hover:border-l-rose-400 border-y-rose-500/10 border-r-rose-500/10 bg-rose-500/5' :
                        item.priority === 'high' ? 'border-l-purple-500 hover:border-l-purple-400 border-y-white/5 border-r-white/5' :
                        item.priority === 'medium' ? 'border-l-amber-500/80 hover:border-l-amber-400 border-y-white/5 border-r-white/5' :
                        'border-l-gray-600 hover:border-l-gray-400 border-y-white/5 border-r-white/5'
                    }`}>
                        <div className="flex items-center gap-4 flex-1 cursor-pointer py-1" onClick={() => toggleTask(item.id)}>
                            {item.status === 'done' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : (
                                <Circle className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0" />
                            )}
                            <span className={`text-sm select-none flex-1 pr-4 transition-colors ${item.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                {item.text}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                            <div className="flex items-center gap-2 w-20 sm:w-24 justify-end">
                                {item.priority === 'critical' && item.status === 'pending' && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
                                <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-widest ${item.status === 'done' ? 'text-gray-600' :
                                        item.priority === 'critical' ? 'text-rose-500' :
                                        item.priority === 'high' ? 'text-purple-400' : 
                                        item.priority === 'medium' ? 'text-amber-500/80' : 'text-gray-500'
                                    }`}>
                                    {item.priority}
                                </span>
                            </div>
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteTask(item.id); }}
                                className="p-1.5 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label="Eliminar tarea"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                
                {tasks.length === 0 && (
                    <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-gray-800" />
                        <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">Workspace Despejado</p>
                        <p className="text-gray-600 text-xs">Añade directivas para comenzar.</p>
                    </div>
                )}
            </div>
            
            <style>{`
                .glass-panel {
                    backdrop-filter: blur(10px);
                    background: rgba(255, 255, 255, 0.02);
                }
            `}</style>
        </div>
    );
};

export default TasksView;
