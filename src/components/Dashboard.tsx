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
    User as UserIcon,
    Globe,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Settings,
    Loader2,
    RefreshCw,
    Trash2,
    X
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
import FloatingPanel from './FloatingPanel';
import WebView from './views/WebView';
import { storageService } from '../services/storageService';
import type { AIAgent, AIConfig } from '../types/ai';
import type { AIVoiceSettings } from '../services/storageService';

const Dashboard: React.FC = () => {
    // --- UI States ---
    const [activeTab, setActiveTab] = useState('projects');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showAIChat, setShowAIChat] = useState(true);
    const [currentTheme, setCurrentTheme] = useState('original');

    // --- AI Chat States ---
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [inputHistory, setInputHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // System UI States (Restaurados)
    const [activeBubbles, setActiveBubbles] = useState<string[]>([]);
    const [webWindows, setWebWindows] = useState<{id: string, url?: string}[]>([]);
    const [focusedWindow, setFocusedWindow] = useState<string | null>(null);

    // AI Config States
    const [configs, setConfigs] = useState<AIConfig[]>([]);
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [activeAgent, setActiveAgent] = useState<AIAgent | null>(null);
    const [activeModel, setActiveModel] = useState<string>('');
    
    // Voice & Audio States
    const [voiceSettings, setVoiceSettings] = useState<AIVoiceSettings>({ autoplay: false, voiceURI: null, volume: 1.0 });
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [showVoiceMenu, setShowVoiceMenu] = useState(false);

    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioChunksRef = React.useRef<Blob[]>([]);

    // --- Initial Load & Sync ---
    React.useEffect(() => {
        loadAIContext();
        
        // Load System Voices
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) setAvailableVoices(voices);
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (mediaRecorderRef.current && isListening) mediaRecorderRef.current.stop();
        };
    }, []);

    const loadAIContext = async () => {
        const allConfigs = storageService.getConfigs();
        const allAgents = storageService.getAgents();
        const settings = storageService.getSettings();
        
        setConfigs(allConfigs);
        setAgents(allAgents);
        if (settings.voiceConfigs) setVoiceSettings(settings.voiceConfigs);
        
        setActiveAgent(aiService.getCurrentAgent());
        setActiveModel(aiService.getCurrentModel());

        // Cargar historial de SQLite y limpiar etiquetas Mico-Action
        const history = await aiService.getHistory('global-chat');
        if (history.length > 0) {
            const cleanHistory = history.map(m => ({
                ...m,
                text: m.text.replace(/\[MICO_ACTION[:\s][\s\S]*?\[\/MICO_ACTION\]/gi, '').trim()
            }));
            setMessages(cleanHistory);

            // Cargar últimos 50 mensajes del usuario al historial de flechas (Up/Down)
            const userOnlyHistory = history
                .filter(m => m.role === 'user')
                .reverse()
                .map(m => m.text)
                .slice(0, 50);
            setInputHistory(userOnlyHistory);
        } else {
            setMessages([{ role: 'model', text: 'Hola Julian. Soy MICO, tu Agente Maestro. ¿En qué puedo ayudarte hoy?' }]);
        }
    };

    // --- Bubble Handlers ---
    React.useEffect(() => {
        const chatEnd = document.getElementById('chat-end');
        if (chatEnd) {
            chatEnd.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

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
        { id: 'database', icon: <Database className="w-5 h-5" />, label: 'Bases de Datos' },
        { id: 'notes', icon: <Code className="w-5 h-5" />, label: 'Notas' },
        { id: 'terminal', icon: <TerminalIcon className="w-5 h-5" />, label: 'Terminales' },
        { id: 'tasks', icon: <ListTodo className="w-5 h-5" />, label: 'Tareas Pendientes' },
        { id: 'clocks', icon: <div className="p-1 bg-teal-500/10 rounded-lg text-teal-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>, label: 'Relojes' },
        { id: 'web', icon: <Globe className="w-5 h-5" />, label: 'Navegador Web' },
    ];

    const handleAiActions = async (text: string) => {
        // Regex ultra-permisiva: Acepta variaciones con espacios, sin dos puntos, etc.
        const actionRegex = /\[MICO_ACTION[:\s]*(\w+)[\s]*\]([\s\S]*?)\[\/MICO_ACTION\]/gi;
        let match;
        let executed = false;

        while ((match = actionRegex.exec(text)) !== null) {
            const actionType = match[1].trim().toUpperCase();
            const payloadRaw = match[2].trim();
            console.log(`MICO_SYSTEM: Detectada acción ${actionType} con payload:`, payloadRaw);

            try {
                const payload = JSON.parse(payloadRaw);
                console.log(`MICO_ACTION: Parseado con éxito:`, payload);

                if (actionType === 'CREATE_TASK') {
                    storageService.saveTask({
                        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        text: payload.text,
                        status: 'pending',
                        priority: payload.priority || 'medium'
                    });
                    executed = true;
                } else if (actionType === 'COMPLETE_TASK') {
                    const tasks = storageService.getTasks();
                    const searchText = (payload.text || payload.id || '').toLowerCase();
                    const taskToComplete = tasks.find(t => 
                        t.id === payload.id || 
                        t.text.toLowerCase().includes(searchText)
                    );
                    if (taskToComplete) {
                        storageService.saveTask({ ...taskToComplete, status: 'done' });
                        executed = true;
                    }
                } else if (actionType === 'CREATE_NOTE') {
                    storageService.saveNote({
                        id: `note_${Date.now()}`,
                        title: payload.title || 'Nueva Nota (Mico)',
                        content: payload.content,
                        date: new Date().toISOString(),
                        category: payload.category || 'General'
                    });
                    executed = true;
                } else if (actionType === 'UPDATE_NOTE') {
                    const notes = storageService.getNotes();
                    const searchText = (payload.title || payload.id || '').toLowerCase();
                    const noteToUpdate = notes.find(n => n.id === payload.id || n.title.toLowerCase().includes(searchText));
                    if (noteToUpdate) {
                        const updatedNote = { ...noteToUpdate };
                        if (payload.category) updatedNote.category = payload.category;
                        if (payload.archived !== undefined) updatedNote.archived = payload.archived;
                        storageService.saveNote(updatedNote);
                        executed = true;
                    }
                } else if (actionType === 'OPEN_VIEW') {
                    const viewMapping: Record<string, string> = {
                        'laboratorio': 'agents',
                        'lab': 'agents',
                        'agentes': 'agents',
                        'ia': 'agents',
                        'dbs': 'database',
                        'db': 'database'
                    };
                    const targetView = viewMapping[payload.view?.toLowerCase()] || payload.view;
                    const validViews = ['projects', 'agents', 'database', 'notes', 'tasks', 'terminal', 'clocks'];
                    
                    if (validViews.includes(targetView)) {
                        setActiveTab(targetView);
                        executed = true;
                    }
                } else if (actionType === 'THEME_MORPH') {
                    const validThemes = ['original', 'matrix', 'cyberpunk', 'gold', 'neon_red'];
                    if (validThemes.includes(payload.theme)) {
                        setCurrentTheme(payload.theme);
                        executed = true;
                    }
                } else if (actionType === 'SEARCH_WEB') {
                    const query = payload.query || '';
                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`;
                    const newWin = { id: `web_${Date.now()}`, url: searchUrl };
                    setWebWindows(prev => [...prev, newWin]);
                    setFocusedWindow(newWin.id);
                    executed = true;
                } else if (actionType === 'BROWSE_URL') {
                    let targetUrl = payload.url || '';
                    if (targetUrl && !targetUrl.startsWith('http')) {
                        targetUrl = `https://${targetUrl}`;
                    }
                    if (targetUrl) {
                        const newWin = { id: `web_${Date.now()}`, url: targetUrl };
                        setWebWindows(prev => [...prev, newWin]);
                        setFocusedWindow(newWin.id);
                        executed = true;
                    }
                } else if (actionType === 'DELETE_NOTE') {
                    const notes = storageService.getNotes();
                    const searchText = (payload.title || payload.id || '').toLowerCase();
                    const noteToDelete = notes.find(n => n.id === payload.id || n.title.toLowerCase().includes(searchText));
                    if (noteToDelete) {
                        storageService.deleteNote(noteToDelete.id);
                        executed = true;
                    }
                } else if (actionType === 'DELETE_TASK') {
                    const tasks = storageService.getTasks();
                    const searchText = (payload.text || payload.id || '').toLowerCase();
                    const taskToDelete = tasks.find(t => t.id === payload.id || t.text.toLowerCase().includes(searchText));
                    if (taskToDelete) {
                        storageService.deleteTask(taskToDelete.id);
                        executed = true;
                    }
                } else if (actionType === 'CREATE_CLOCK') {
                    const settings = storageService.getSettings();
                    const newClock = {
                        id: `clock_${Date.now()}`,
                        type: payload.type || 'timer',
                        label: payload.label || 'Temporizador Mico',
                        value: payload.value || '05:00',
                        isPinned: true,
                        isRunning: true,
                        lastUpdateAt: Date.now(),
                        currentMs: (parseInt(payload.value?.split(':')[0] || '5') * 60 + parseInt(payload.value?.split(':')[1] || '0')) * 1000
                    };
                    storageService.saveSettings({ clocks: [...settings.clocks, newClock as any] });
                    executed = true;
                } else if (actionType === 'CREATE_CONNECTION') {
                    storageService.saveConnection({
                        id: `conn_${Date.now()}`,
                        server: payload.server,
                        user: payload.user,
                        password: payload.password
                    });
                    executed = true;
                }
            } catch (e) {
                console.error("Error procesando MICO_ACTION:", e);
            }
        }

        if (executed) {
            loadAIContext();
        }
        return executed;
    };

    // --- AI Handlers ---
    const handleSendMessage = async (overrideText?: string) => {
        const textToSend = overrideText || inputValue;
        if (!textToSend.trim() || isTyping) return;

        setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
        if (!overrideText) {
            setInputHistory(prev => [textToSend, ...prev.slice(0, 49)]);
            setHistoryIndex(-1);
            setInputValue('');
        }
        setIsTyping(true);

        try {
            const response = await aiService.sendMessage(textToSend, 'global-chat');
            console.log("MICO_SYSTEM: Raw Response ->", response);
            
            // Regex definitiva corregida: Aseguramos que [MICO_ACTION sea el inicio
            const cleanResponse = response.replace(/\[MICO_ACTION[:\s][\s\S]*?\[\/MICO_ACTION\]/gi, '').trim();
            
            setMessages(prev => [...prev, { role: 'model', text: cleanResponse }]);
            
            // Ejecutar acciones y feedback integrado
            const executed = await handleAiActions(response);
            if (executed) {
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'model') {
                        return [
                            ...prev.slice(0, -1),
                            { ...last, text: last.text + '\n\n⚡ [Sistema: Acción Ejecutada]' }
                        ];
                    }
                    return prev;
                });
            }

            if (voiceSettings.autoplay) speakText(cleanResponse);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'model', text: `Mico_System_Error: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleClearChat = async () => {
        if (confirm("¿Estás seguro de borrar el historial de este chat?")) {
            await aiService.clearHistory('global-chat');
            setMessages([{ role: 'model', text: 'Historial borrado. MICO listo para operar.' }]);
        }
    };

    const handleSwitchConfig = (id: string) => {
        aiService.setConfig(id);
        loadAIContext();
    };

    // --- Voice Handlers (Cloned from AgentsView for consistency) ---
    const speakText = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceSettings.voiceURI) {
            const voice = availableVoices.find(v => v.voiceURI === voiceSettings.voiceURI);
            if (voice) utterance.voice = voice;
        }
        utterance.volume = voiceSettings.volume;
        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = async () => {
        if (isListening && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                setIsTranscribing(true);
                stream.getTracks().forEach(track => track.stop());
                try {
                    const text = await aiService.transcribeAudio(audioBlob);
                    if (text && text.trim() !== '.' && !text.includes('[SILENCIO]')) {
                        setInputValue(prev => prev + (prev ? ' ' : '') + text);
                    }
                } catch (error: any) {
                    setMessages(prev => [...prev, { role: 'model', text: `Error STT: ${error.message}` }]);
                } finally {
                    setIsTranscribing(false);
                }
            };
            mediaRecorder.start();
            setIsListening(true);
        } catch (error) { alert("Error de micrófono"); }
    };

    return (
        <div className={`flex h-screen w-full bg-[#0d0f14] text-gray-300 font-sans overflow-hidden selection:bg-purple-500/30 transition-all duration-700 mico-theme-${currentTheme}`}>

            {/* Background Effects */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none theme-grid"
                style={{ backgroundImage: 'radial-gradient(var(--theme-accent, #2dd4bf) 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }}></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-theme-glow rounded-full blur-[150px] pointer-events-none z-0 opacity-20"></div>

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
                                onClick={() => {
                                    if (item.id === 'web') {
                                        const newWin = { id: `web-${Date.now()}`, url: 'https://www.google.com' };
                                        setWebWindows(prev => [...prev, newWin]);
                                        setFocusedWindow(newWin.id);
                                    } else {
                                        setActiveTab(item.id);
                                    }
                                }}
                                className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 group relative ${
                                    (item.id !== 'web' && activeTab === item.id) || (item.id === 'web' && webWindows.length > 0)
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {((item.id !== 'web' && activeTab === item.id) || (item.id === 'web' && webWindows.length > 0)) && (
                                    <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl shadow-[inset_0_0_10px_rgba(255,255,255,0.02)] animate-in fade-in duration-300"></div>
                                )}
                                <div className={`flex-shrink-0 relative z-10 transition-colors duration-300 ${
                                    (item.id !== 'web' && activeTab === item.id) || (item.id === 'web' && webWindows.length > 0) 
                                    ? 'text-purple-400' 
                                    : 'group-hover:text-purple-300'
                                }`}>
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

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/5 p-1 rounded-xl">
                            {['original', 'matrix', 'cyberpunk', 'gold', 'neon_red'].map((t) => (
                                <button 
                                    key={t}
                                    onClick={() => setCurrentTheme(t)}
                                    title={`Tema: ${t}`}
                                    className={`w-4 h-4 rounded-full transition-all border-2 ${
                                        currentTheme === t ? 'scale-125 border-white ring-2 ring-white/20' : 'border-transparent opacity-40 hover:opacity-100'
                                    }`}
                                    style={{ 
                                        backgroundColor: t === 'original' ? '#a855f7' : 
                                                        t === 'matrix' ? '#10b981' :
                                                        t === 'cyberpunk' ? '#06b6d4' :
                                                        t === 'gold' ? '#fbbf24' : '#ef4444'
                                    }}
                                />
                            ))}
                        </div>
                        <button className="p-2 text-gray-500 hover:text-white transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
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
                    {/* View Port - Área Dinámica (Modificable sin riesgo para el sistema) */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                        <div className="max-w-7xl mx-auto">
                            {(() => {
                                switch (activeTab) {
                                    case 'projects': return <ProjectsView onSelectProject={setSelectedProjectId} />;
                                    case 'agents': return <AgentsView />;
                                    case 'database': return <DatabaseView />;
                                    case 'notes': return <NotesView />;
                                    case 'terminal': return <TerminalView />;
                                    case 'tasks': return <TasksView />;
                                    case 'clocks': return <ClocksView />;
                                    default: return <ProjectsView onSelectProject={setSelectedProjectId} />;
                                }
                            })()}
                        </div>
                    </div>

                    {/* Integrated AI Side Chat (Rediseñado con Selectores y SQLite) */}
                    {showAIChat && (
                        <div className="w-80 border-l border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col animate-in slide-in-from-right duration-500 shrink-0">
                            {/* Chat Header: Selectores Profesionales */}
                            <div className="p-4 border-b border-white/5 bg-black/20 space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-purple-400 group-hover:animate-pulse" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter italic">Cerebro_Principal</span>
                                    </div>
                                    <button onClick={handleClearChat} className="text-gray-600 hover:text-rose-400 p-1 transition-colors" title="Borrar historial">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {/* Selector de Key/Config */}
                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${aiService.isConfigured() ? 'bg-teal-400' : 'bg-rose-500'}`}></div>
                                        <select 
                                            className="bg-transparent text-[9px] font-mono text-gray-400 uppercase outline-none border-none cursor-pointer w-full"
                                            value={aiService.getActiveConfig()?.id || ''}
                                            onChange={(e) => handleSwitchConfig(e.target.value)}
                                        >
                                            {configs.map(c => <option key={c.id} value={c.id} className="bg-[#0d0f14]">KEY: {c.label}</option>)}
                                            {configs.length === 0 && <option value="">SIN_API_KEY</option>}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Selector de Agente */}
                                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1.5 rounded-xl border border-white/5">
                                            <Bot className="w-3 h-3 text-purple-400 opacity-50" />
                                            <select 
                                                className="bg-transparent text-[8px] font-mono text-purple-400 uppercase outline-none border-none cursor-pointer w-full"
                                                value={activeAgent?.id || ''}
                                                onChange={(e) => {
                                                    const agentId = e.target.value;
                                                    aiService.setAgent(agentId);
                                                    setActiveAgent(agents.find(a => a.id === agentId) || null);
                                                    setActiveModel(aiService.getCurrentModel());
                                                }}
                                            >
                                                {agents.map(a => <option key={a.id} value={a.id} className="bg-[#0d0f14]">[{a.name}]</option>)}
                                            </select>
                                        </div>

                                        {/* Selector de Modelo */}
                                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1.5 rounded-xl border border-white/5">
                                            <Sparkles className="w-3 h-3 text-teal-400 opacity-50" />
                                            <select 
                                                className="bg-transparent text-[8px] font-mono text-teal-400 uppercase outline-none border-none cursor-pointer w-full"
                                                value={activeModel}
                                                onChange={(e) => {
                                                    aiService.setCurrentModel(e.target.value);
                                                    setActiveModel(e.target.value);
                                                }}
                                            >
                                                {aiService.getActiveConfig()?.whitelistedModels?.map(m => (
                                                    <option key={m} value={m} className="bg-[#0d0f14]">{m}</option>
                                                )) || <option value="">Default</option>}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-[11px]">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-20 filter grayscale">
                                        <Bot className="w-12 h-12 mb-4" />
                                        <p className="font-mono text-[9px] uppercase tracking-widest">Esperando señal...</p>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                                            <div className="flex flex-col gap-1 max-w-[85%]">
                                                <div className={`p-3 rounded-2xl leading-relaxed relative ${msg.role === 'user'
                                                    ? 'bg-purple-600/20 text-purple-100 border border-purple-500/20 rounded-tr-none'
                                                    : 'bg-white/5 text-gray-400 border border-white/5 rounded-tl-none italic'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                                {msg.role === 'model' && (
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                                        <button onClick={() => speakText(msg.text)} className="p-1 hover:text-purple-400"><Volume2 className="w-3 h-3" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/5 p-3 rounded-2xl animate-pulse text-purple-400 px-4">...</div>
                                    </div>
                                )}
                                <div id="chat-end" />
                            </div>

                            {/* Chat Input con Soporte de Voz */}
                            <div className="p-4 border-t border-white/5 shrink-0 bg-black/20">
                                {showVoiceMenu && (
                                    <div className="absolute bottom-24 right-4 bg-[#0d0f14] border border-white/10 p-4 rounded-2xl w-64 shadow-2xl z-50 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[9px] uppercase font-bold text-gray-500 font-mono tracking-widest">Ajustes_Voz</span>
                                            <button onClick={() => setShowVoiceMenu(false)}><X className="w-3 h-3 text-gray-500" /></button>
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer bg-white/5 p-2 rounded-lg mb-2">
                                            <input type="checkbox" checked={voiceSettings.autoplay} onChange={(e) => {
                                                const news = {...voiceSettings, autoplay: e.target.checked};
                                                setVoiceSettings(news);
                                                storageService.saveSettings({ voiceConfigs: news });
                                            }} className="sr-only" />
                                            <div className={`w-8 h-4 rounded-full transition-colors ${voiceSettings.autoplay ? 'bg-teal-500' : 'bg-gray-700'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full mt-0.5 ml-0.5 transition-transform ${voiceSettings.autoplay ? 'translate-x-4' : ''}`} />
                                            </div>
                                            <span className="text-[9px] uppercase font-mono">Autoplay</span>
                                        </label>
                                        <select 
                                            value={voiceSettings.voiceURI || ''} 
                                            onChange={(e) => {
                                                const news = {...voiceSettings, voiceURI: e.target.value};
                                                setVoiceSettings(news);
                                                storageService.saveSettings({ voiceConfigs: news });
                                            }}
                                            className="w-full bg-black border border-white/10 rounded-lg p-1.5 text-[9px] text-gray-300 outline-none"
                                        >
                                            {availableVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-purple-500/40 transition-all">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSendMessage();
                                            } else if (e.key === 'ArrowUp') {
                                                if (inputValue === '' || inputHistory.includes(inputValue)) {
                                                    e.preventDefault();
                                                    if (historyIndex < inputHistory.length - 1) {
                                                        const nextIndex = historyIndex + 1;
                                                        setHistoryIndex(nextIndex);
                                                        setInputValue(inputHistory[nextIndex]);
                                                    }
                                                }
                                            } else if (e.key === 'ArrowDown') {
                                                if (historyIndex !== -1) {
                                                    e.preventDefault();
                                                    if (historyIndex > 0) {
                                                        const nextIndex = historyIndex - 1;
                                                        setHistoryIndex(nextIndex);
                                                        setInputValue(inputHistory[nextIndex]);
                                                    } else {
                                                        setHistoryIndex(-1);
                                                        setInputValue('');
                                                    }
                                                }
                                            }
                                        }}
                                        disabled={isTyping || isTranscribing}
                                        placeholder={isListening ? "Escuchando..." : "Comando ágil..."}
                                        className="w-full bg-transparent border-none pl-4 pr-24 py-3 text-xs text-white focus:outline-none font-mono italic disabled:opacity-50"
                                    />
                                    <div className="absolute right-1.5 flex items-center gap-1">
                                        <button onClick={() => setShowVoiceMenu(!showVoiceMenu)} className={`p-1.5 rounded-lg ${voiceSettings.autoplay ? 'text-teal-400 bg-teal-500/10' : 'text-gray-600'}`}>
                                            {voiceSettings.autoplay ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                        </button>
                                        <button 
                                            onClick={toggleListening} 
                                            disabled={isTranscribing}
                                            className={`p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : (isTranscribing ? 'text-purple-400' : 'text-gray-600 hover:text-white')}`}
                                        >
                                            {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />)}
                                        </button>
                                        <button
                                            onClick={() => handleSendMessage()}
                                            disabled={isTyping || isTranscribing}
                                            className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-purple-900/40"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* BLOCK_SYSTEM_CORE: Componentes Críticos del Núcleo (Sin bloqueo de Layout) */}
            <div className="mico-system-core-container fixed inset-0 z-[1000] pointer-events-none">
                <AlarmOverlay 
                    onStop={() => {
                        console.log("MICO_UI: Alarm Stopped by User");
                        window.dispatchEvent(new CustomEvent('mico-stop-alarm'));
                    }} 
                />

                {webWindows.map((win, index) => (
                    <FloatingPanel 
                        key={win.id}
                        id={win.id}
                        title={`Mico_Browser [Nativo] - ${index + 1}`}
                        icon={<Globe className="w-3 h-3" />}
                        zIndex={focusedWindow === win.id ? 100 : 50}
                        onFocus={() => setFocusedWindow(win.id)}
                        onClose={() => setWebWindows(prev => prev.filter(w => w.id !== win.id))}
                        defaultSize={{ width: 800, height: 600 }}
                        defaultPosition={{ x: 100 + (index * 30), y: 100 + (index * 30) }}
                    >
                        <WebView initialUrl={win.url} />
                    </FloatingPanel>
                ))}

                {activeBubbles.map(id => (
                    <FloatingClockBubble 
                        key={id} 
                        clockId={id} 
                        onFocus={() => setFocusedWindow(id)}
                        zIndex={focusedWindow === id ? 100 : 50}
                        onClose={() => closeBubble(id)} 
                    />
                ))}
            </div>

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
                /* Mico-Theme System */
                .mico-theme-original { --theme-accent: #2dd4bf; --theme-glow: rgba(168, 85, 247, 0.1); }
                .mico-theme-matrix { --theme-accent: #00ff41; --theme-glow: rgba(0, 255, 65, 0.15); filter: sepia(0.2) hue-rotate(80deg) brightness(1.1); }
                .mico-theme-cyberpunk { --theme-accent: #00fbff; --theme-glow: rgba(255, 0, 255, 0.15); filter: hue-rotate(280deg) saturate(1.8); }
                .mico-theme-gold { --theme-accent: #fbbf24; --theme-glow: rgba(251, 191, 36, 0.15); filter: sepia(0.4) brightness(1.1) contrast(1.1); }
                .mico-theme-neon_red { --theme-accent: #ff0000; --theme-glow: rgba(255, 0, 0, 0.15); filter: hue-rotate(150deg) saturate(2.5) contrast(1.2); }
            `}</style>
        </div>
    );
};

export default Dashboard;
