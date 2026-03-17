import React, { useState } from 'react';
import { aiService } from '../services/aiService';
import {
    FolderGit2,
    Bot,
    Database,
    ListTodo,
    ChevronRight,
    Code,
    Terminal as TerminalIcon,
    Send,
    Sparkles,
    Zap,
    User as UserIcon
} from 'lucide-react';
import mushroom from '../assets/mushroom.png';
import ProjectsView from './views/ProjectsView';
import AgentsView from './views/AgentsView';
import DatabaseView from './views/DatabaseView';
import NotesView from './views/NotesView';
import TerminalView from './views/TerminalView';
import TasksView from './views/TasksView';
import ClocksView from './views/ClocksView';
import PinnedClockWidget from './PinnedClockWidget';
import AlarmOverlay from './AlarmOverlay';
import FloatingClockBubble from './FloatingClockBubble';

const Dashboard: React.FC = () => {
    // --- UI States ---
    const [activeTab, setActiveTab] = useState('projects');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showAIChat, setShowAIChat] = useState(true);

    // --- AI Chat States ---
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
        { role: 'model', text: 'Hola Julian. Soy MICO, tu Agente Maestro. ¿En qué puedo ayudarte hoy con tus proyectos?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showKeyPrompt, setShowKeyPrompt] = useState(!aiService.isConfigured());
    const [activeBubbles, setActiveBubbles] = useState<string[]>([]);

    // --- Bubble Handlers ---
    React.useEffect(() => {
        const handleOpenBubble = (e: any) => {
            const id = e.detail.clockId;
            setActiveBubbles(prev => {
                if (!prev.includes(id)) return [...prev, id];
                return prev;
            });
        };
        window.addEventListener('mico-open-bubble' as any, handleOpenBubble);
        return () => window.removeEventListener('mico-open-bubble' as any, handleOpenBubble);
    }, []);

    const closeBubble = (id: string) => {
        setActiveBubbles(prev => prev.filter(b => b !== id));
    };

    const navItems = [
        { id: 'projects', icon: <FolderGit2 className="w-5 h-5" />, label: 'Proyectos' },
        { id: 'agents', icon: <Bot className="w-5 h-5" />, label: 'Laboratorio IA' },
        { id: 'db', icon: <Database className="w-5 h-5" />, label: 'Bases de Datos' },
        { id: 'notes', icon: <Code className="w-5 h-5" />, label: 'Notas' },
        { id: 'terminal', icon: <TerminalIcon className="w-5 h-5" />, label: 'Terminales' },
        { id: 'tasks', icon: <ListTodo className="w-5 h-5" />, label: 'Tareas Pendientes' },
        { id: 'clocks', icon: <div className="p-1 bg-teal-500/10 rounded-lg text-teal-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>, label: 'Relojes' },
    ];

    // --- AI Handlers ---
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isTyping) return;

        const userText = inputValue;
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setInputValue('');
        setIsTyping(true);

        try {
            const response = await aiService.sendMessage(userText);
            setMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'model', text: `Mico_System_Error: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSaveKey = async () => {
        if (!apiKeyInput.trim()) return;
        aiService.init(apiKeyInput);
        const models = await aiService.getAvailableModels();
        console.log("MODELOS PARA JULIAN:", models);
        setShowKeyPrompt(false);
    };

    return (
        <div className="flex h-screen w-full bg-[#0d0f14] text-gray-300 font-sans overflow-hidden selection:bg-purple-500/30">

            {/* Background Effects */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#2dd4bf 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }}></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

            {/* Sidebar */}
            <aside className="w-20 lg:w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col justify-between z-30 transition-all duration-300 relative">
                <div>
                    <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-white/5">
                        <img src={mushroom} alt="Mico Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                        <span className="hidden lg:block ml-4 text-xl font-bold text-white tracking-widest font-mono italic">mico.</span>
                    </div>

                    <nav className="p-4 space-y-2 mt-6">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 group relative ${activeTab === item.id
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {activeTab === item.id && (
                                    <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl shadow-[inset_0_0_10px_rgba(255,255,255,0.02)] animate-in fade-in duration-300"></div>
                                )}
                                <div className={`flex-shrink-0 relative z-10 transition-colors duration-300 ${activeTab === item.id ? 'text-purple-400' : 'group-hover:text-purple-300'}`}>
                                    {item.icon}
                                </div>
                                <span className="hidden lg:block ml-4 text-sm font-medium relative z-10 tracking-tight">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 p-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5">
                            <div className="w-full h-full rounded-[6px] bg-black/40 flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="hidden lg:block">
                            <p className="text-xs font-bold text-white leading-none tracking-tighter">MICO_USER</p>
                            <div className="flex items-center gap-1 mt-1">
                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                <p className="text-[8px] text-gray-500 uppercase font-mono">Status: Online</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col relative z-20 overflow-hidden bg-gradient-to-br from-transparent to-black/20">
                {/* Header */}
                <header className="h-20 border-b border-white/5 bg-black/10 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">
                            <ChevronRight className="w-3 h-3" />
                            <span>System</span>
                            <span className="text-gray-800">/</span>
                            <span className="text-purple-400 uppercase">{activeTab}</span>
                            {selectedProjectId && (
                                <>
                                    <span className="text-gray-800">/</span>
                                    <span className="text-teal-500 font-bold tracking-normal">{selectedProjectId}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <PinnedClockWidget />
                        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                            <div className={`w-1.5 h-1.5 rounded-full ${aiService.isConfigured() ? 'bg-teal-500 animate-pulse' : 'bg-rose-500'}`}></div>
                            <span className={`text-[10px] uppercase font-mono tracking-widest leading-none ${aiService.isConfigured() ? 'text-teal-500/80' : 'text-rose-500/80'}`}>
                                {aiService.isConfigured() ? 'Cerebro_Ready' : 'Cerebro_Offline'}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowAIChat(!showAIChat)}
                            className={`p-2 rounded-lg transition-colors border ${showAIChat ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-white/5 border-white/5 text-gray-600 hover:text-gray-400'}`}
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* View Port */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                        <div className="max-w-7xl mx-auto">
                            {activeTab === 'projects' && (
                                <ProjectsView onSelectProject={(id) => setSelectedProjectId(id)} />
                            )}
                            {activeTab === 'agents' && <AgentsView />}
                            {activeTab === 'db' && <DatabaseView />}
                            {activeTab === 'notes' && <NotesView />}
                            {activeTab === 'terminal' && <TerminalView />}
                            {activeTab === 'tasks' && <TasksView />}
                            {activeTab === 'clocks' && <ClocksView />}
                        </div>
                    </div>

                    {/* Integrated AI Side Chat (El motor de la app) */}
                    {showAIChat && (
                        <div className="w-80 border-l border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-500 shrink-0">
                            <div className="h-16 border-b border-white/5 flex items-center px-6 justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-bold text-white uppercase tracking-tighter italic">Cerebro_IA</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            aiService.clearConfig();
                                            setShowKeyPrompt(true);
                                        }}
                                        className="text-[9px] text-gray-500 hover:text-rose-400 uppercase font-mono transition-colors"
                                        title="Limpiar API Key"
                                    >
                                        [Reset]
                                    </button>
                                    <span className="text-[10px] text-gray-600 font-mono">v4.0.2</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-[11px]">
                                {showKeyPrompt ? (
                                    <div className="bg-rose-950/20 p-5 rounded-2xl border border-rose-500/10 space-y-4">
                                        <p className="text-rose-200/80 leading-relaxed italic">
                                            Se requiere una <span className="text-rose-400 font-bold uppercase">Gemini API Key</span> para activar el Cerebro Maestro.
                                        </p>
                                        <input
                                            type="password"
                                            value={apiKeyInput}
                                            onChange={(e) => setApiKeyInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                                            placeholder="Introduce tu API Key..."
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500/40"
                                        />
                                        <button
                                            onClick={handleSaveKey}
                                            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-bold transition-all shadow-lg"
                                        >
                                            ACTIVAR CEREBRO
                                        </button>
                                        <p className="text-[9px] text-gray-500 leading-none text-center">
                                            Consíguela en <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-purple-400 underline">Google AI Studio</a>.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-purple-600/20 text-purple-100 border border-purple-500/20 rounded-tr-none'
                                                    : 'bg-white/5 text-gray-400 border border-white/5 rounded-tl-none italic'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/5 p-3 rounded-2xl animate-pulse text-purple-400 px-4">
                                                    ...
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {!showKeyPrompt && (
                                <div className="p-4 border-t border-white/5 shrink-0">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            disabled={isTyping}
                                            placeholder="Comando rápido..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:border-purple-500/40 transition-all font-mono italic disabled:opacity-50"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={isTyping}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-purple-400 transition-colors disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <AlarmOverlay 
                onStop={() => {
                    console.log("MICO_UI: Alarm Stopped by User");
                    window.dispatchEvent(new CustomEvent('mico-stop-alarm'));
                }} 
            />

            {activeBubbles.map(id => (
                <FloatingClockBubble 
                    key={id} 
                    clockId={id} 
                    onClose={() => closeBubble(id)} 
                />
            ))}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(168, 85, 247, 0.2);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
