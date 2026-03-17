import React, { useState, useEffect } from 'react';
import { Bot, Send, Zap, BrainCircuit, Plus, Trash2, Edit3, Save, X, Key, AlertCircle, Loader2, ExternalLink, RefreshCw, Compass } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { aiService } from '../../services/aiService';
import type { AIAgent, AIConfig, AIProvider, Message } from '../../types/ai';
import { AGENTS as BASE_AGENTS } from '../../config/agents';

const AgentsView: React.FC = () => {
    const [configs, setConfigs] = useState<AIConfig[]>([]);
    const [activeAgent, setActiveAgent] = useState<AIAgent | null>(null);
    const [view, setView] = useState<'chat' | 'apis' | 'agents' | 'explorer'>('chat');

    // Form states
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [editingAgent, setEditingAgent] = useState<Partial<AIAgent> | null>(null);
    const [editingConfig, setEditingConfig] = useState<Partial<AIConfig> | null>(null);
    const [testingApiId, setTestingApiId] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'none'>>({});
    
    // Model Explorer states
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isExploring, setIsExploring] = useState(false);
    const [currentExploringConfig, setCurrentExploringConfig] = useState<AIConfig | null>(null);
    const [testingModel, setTestingModel] = useState<string | null>(null);
    const [testMessages, setTestMessages] = useState<Record<string, string>>({});

    // Chat states for Lab View
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activeModel, setActiveModel] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const allAgents = storageService.getAgents();
        const allConfigs = storageService.getConfigs();
        setAgents(allAgents);
        setConfigs(allConfigs);
        const currentAgent = aiService.getCurrentAgent();
        setActiveAgent(currentAgent);
        setActiveModel(aiService.getCurrentModel());
    };

    const handleSaveAgent = () => {
        if (editingAgent?.name && editingAgent?.prompt) {
            const newAgent: AIAgent = {
                id: editingAgent.id || `custom_${Date.now()}`,
                name: editingAgent.name,
                role: editingAgent.role || 'Asistente personalizado',
                prompt: editingAgent.prompt,
                model: editingAgent.model || 'gemini-flash-latest',
                icon: editingAgent.icon || 'Bot',
                isCustom: editingAgent.isCustom ?? true
            };
            storageService.saveCustomAgent(newAgent);
            setEditingAgent(null);
            loadData();
        }
    };

    const handleSaveConfig = () => {
        if (editingConfig?.label && editingConfig?.apiKey) {
            const provider = editingConfig.provider || 'gemini';
            
            const newConfig: AIConfig = {
                id: editingConfig.id || `api_${Date.now()}`,
                label: editingConfig.label,
                apiKey: editingConfig.apiKey,
                provider: provider,
                whitelistedModels: editingConfig.whitelistedModels || [],
                isActive: editingConfig.isActive ?? configs.length === 0
            };
            storageService.saveConfig(newConfig);
            setEditingConfig(null);
            loadData();
            aiService.loadActiveConfig();
        }
    };

    const handleSwitchConfig = (id: string) => {
        aiService.setConfig(id);
        const config = configs.find(c => c.id === id);
        // Marcamos en storage solo para recordar la "preferida" en el próximo arranque, 
        // pero aiService ya está sincronizado.
        if (config) {
            storageService.saveConfig({ ...config, isActive: true });
        }
        loadData();
    };


    const handleTestApi = async (id: string, key: string, provider: AIProvider = 'gemini') => {
        setTestingApiId(id);
        const result = await aiService.validateApiKey(key, provider);
        
        setTestResults(prev => ({ ...prev, [id]: result.success ? 'success' : 'error' }));
        setTestMessages(prev => ({ ...prev, [id]: result.message }));
        
        setTestingApiId(null);
        // Mantener el mensaje por 5 segundos para que Julian pueda leerlo
        setTimeout(() => {
            setTestResults(prev => ({ ...prev, [id]: 'none' }));
            setTestMessages(prev => ({ ...prev, [id]: '' }));
        }, 5000);
    };

    const handleChatSend = async (overrideText?: string) => {
        const textToSend = overrideText || chatInput;
        if (!textToSend.trim() || isTyping) return;
        
        const userMsg = { role: 'user' as const, text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        if (!overrideText) setChatInput('');
        setIsTyping(true);

        try {
            const response = await aiService.sendMessage(textToSend);
            setMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'model', text: `Mico_System_Error: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleRegenerate = async () => {
        if (messages.length < 1 || isTyping) return;
        
        // Buscar el último mensaje del usuario
        const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user');
        if (lastUserMsgIndex === -1) return;
        
        const realIndex = messages.length - 1 - lastUserMsgIndex;
        const lastUserText = messages[realIndex].text;

        // Limpiar el historial desde ese mensaje hacia adelante
        const newMessages = messages.slice(0, realIndex);
        setMessages(newMessages);
        
        // Re-enviar
        handleChatSend(lastUserText);
    };

    const handleEditMessage = (index: number) => {
        const msg = messages[index];
        if (msg.role !== 'user') return;
        
        setChatInput(msg.text);
        // Opcional: eliminar el mensaje y su respuesta del historial
        setMessages(prev => prev.slice(0, index));
    };

    const handleExploreModels = async (config: AIConfig) => {
        setIsExploring(true);
        setAvailableModels([]);
        setCurrentExploringConfig(config);
        
        const models = await aiService.getAvailableModels(config);
        setAvailableModels(models);
        setIsExploring(false);
    };

    const handleTestOneModel = async (modelId: string) => {
        if (!currentExploringConfig) return;
        setTestingModel(modelId);
        
        const result = await aiService.testSpecificModel(currentExploringConfig, modelId);
        
        setTestResults(prev => ({ ...prev, [modelId]: result.success ? 'success' : 'error' }));
        setTestMessages(prev => ({ ...prev, [modelId]: result.message }));
        setTestingModel(null);
    };

    const handleApplyModel = (modelId: string) => {
        if (!currentExploringConfig) return;
        const whitelist = currentExploringConfig.whitelistedModels || [];
        const isWhitelisted = whitelist.includes(modelId);
        
        let newWhitelist;
        if (isWhitelisted) {
            newWhitelist = whitelist.filter(m => m !== modelId);
        } else {
            newWhitelist = [...whitelist, modelId];
        }

        const updatedConfig = { 
            ...currentExploringConfig, 
            whitelistedModels: newWhitelist,
            // Si habilitamos el primero, lo ponemos como default por si acaso
            defaultModel: newWhitelist.length > 0 ? newWhitelist[0] : ''
        };
        
        storageService.saveConfig(updatedConfig);
        setCurrentExploringConfig(updatedConfig); // Update local explorer state
        loadData();
    }

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tighter italic">Laboratorio_IA</h2>
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mt-1">Gestión de Agentes y Protocolos Neuronales</p>
                </div>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {[
                        { id: 'chat', label: 'INTERFAZ_CHAT' },
                        { id: 'apis', label: 'GESTION_APIS' },
                        { id: 'agents', label: 'GESTION_AGENTES' },
                        { id: 'explorer', label: 'EXPLORADOR_MODELOS' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${view === tab.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'chat' ? (
                <div className="grid grid-cols-12 gap-8 h-[650px]">
                    {/* Chat Column */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col glass-panel rounded-[2.5rem] border-white/5 overflow-hidden">
                        <div className="h-16 border-b border-white/5 bg-black/20 flex items-center px-8 justify-between gap-4">
                            <div className="flex items-center gap-6 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${aiService.isConfigured() ? 'bg-teal-400 animate-pulse' : 'bg-rose-500'}`}></div>
                                    <select
                                        className="bg-transparent text-[10px] font-mono text-gray-400 uppercase tracking-widest outline-none border-none cursor-pointer hover:text-teal-400 transition-colors max-w-[150px] truncate"
                                        value={aiService.getActiveConfig()?.id || ''}
                                        onChange={(e) => handleSwitchConfig(e.target.value)}
                                    >
                                        {configs.length > 0 ? (
                                            configs.map(c => (
                                                <option key={c.id} value={c.id} className="bg-[#0d0f14] text-gray-300 italic font-mono">
                                                    KEY: {c.label}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">SIN_API_KEY</option>
                                        )}
                                    </select>
                                </div>

                                <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                                <div className="flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 text-teal-400 opacity-50" />
                                    <select
                                        className="bg-transparent text-[10px] font-mono text-teal-400 uppercase tracking-widest outline-none border-none cursor-pointer hover:text-teal-300 transition-colors max-w-[120px] truncate"
                                        value={activeModel}
                                        onChange={(e) => {
                                            const model = e.target.value;
                                            aiService.setCurrentModel(model);
                                            setActiveModel(model);
                                        }}
                                    >
                                        <optgroup label="HABILITADOS" className="bg-[#0d0f14] text-teal-400">
                                            {aiService.getActiveConfig()?.whitelistedModels?.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="SUGERIDO" className="bg-[#0d0f14] text-gray-500">
                                            <option value={activeAgent?.model}>{activeAgent?.model} (Default)</option>
                                        </optgroup>
                                    </select>
                                </div>

                                <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                                <div className="flex items-center gap-2">
                                    <Bot className="w-3.5 h-3.5 text-purple-400 opacity-50" />
                                    <select
                                        className="bg-transparent text-[10px] font-mono text-purple-400 uppercase tracking-widest outline-none border-none cursor-pointer hover:text-purple-300 transition-colors max-w-[120px] truncate"
                                        value={activeAgent?.id || ''}
                                        onChange={(e) => {
                                            const agentId = e.target.value;
                                            aiService.setAgent(agentId);
                                            setActiveAgent(agents.find(a => a.id === agentId) || null);
                                            setActiveModel(aiService.getCurrentModel());
                                        }}
                                    >
                                        {agents.map(a => (
                                            <option key={a.id} value={a.id} className="bg-[#0d0f14] text-purple-300">
                                                AGENT: {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar text-sm">
                            {messages.length === 0 ? (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                                        <Bot className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5 max-w-[80%]">
                                        <p className="text-gray-300 leading-relaxed italic">
                                            Terminal de Agentes operativa. Conectado vía <span className="text-teal-400 font-mono">[{configs.find(c => c.isActive)?.label || 'NULL'}]</span> usando el protocolo <span className="text-purple-400 font-bold uppercase tracking-tighter">[{activeAgent?.name}]</span>.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${msg.role === 'user' ? 'bg-indigo-600/20 border-indigo-500/20' : 'bg-purple-600/20 border-purple-500/20'}`}>
                                            {msg.role === 'user' ? <Key className="w-4 h-4 text-indigo-400" /> : <Bot className="w-4 h-4 text-purple-400" />}
                                        </div>
                                        <div className="flex flex-col gap-2 max-w-[80%]">
                                            <div className={`p-4 rounded-2xl border ${msg.role === 'user' ? 'bg-indigo-500/10 border-indigo-500/20 rounded-tr-none' : 'bg-white/5 border-white/5 rounded-tl-none italic'}`}>
                                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                            
                                            <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {msg.role === 'user' ? (
                                                    <button 
                                                        onClick={() => handleEditMessage(i)}
                                                        className="p-1 px-2 rounded-md bg-white/5 hover:bg-white/10 text-[8px] text-gray-500 hover:text-indigo-400 font-mono flex items-center gap-1 border border-white/5"
                                                    >
                                                        <Edit3 className="w-2.5 h-2.5" /> EDITAR
                                                    </button>
                                                ) : i === messages.length - 1 ? (
                                                    <button 
                                                        onClick={handleRegenerate}
                                                        className="p-1 px-2 rounded-md bg-white/5 hover:bg-white/10 text-[8px] text-gray-500 hover:text-teal-400 font-mono flex items-center gap-1 border border-white/5"
                                                    >
                                                        <RefreshCw className="w-2.5 h-2.5" /> REGENERAR
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {isTyping && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center border border-purple-500/20">
                                        <Bot className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-purple-400">...</div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-black/40 border-t border-white/5">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={`Ejecutar comando para ${activeAgent?.name}...`}
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-20 py-4 text-sm text-white focus:outline-none focus:border-purple-500/40 transition-all font-mono italic"
                                />
                                <button 
                                    onClick={() => handleChatSend()}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/40"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="glass-panel p-6 rounded-[2rem] border-white/5 flex flex-col items-center justify-center text-center py-10">
                            <div className="relative mb-6">
                                <BrainCircuit className="w-12 h-12 text-teal-400 opacity-20 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.6)]"></div>
                                </div>
                            </div>
                            <h5 className="text-xs font-bold text-white mb-4 italic tracking-widest uppercase opacity-80">Estado_Conexión</h5>
                            
                            <div className="space-y-3 w-full px-4">
                                <div className="flex flex-col items-center p-3 rounded-2xl bg-black/20 border border-white/5">
                                    <span className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mb-1">Modelo_Activo</span>
                                    <p className="text-[10px] text-teal-400 font-bold font-mono truncate max-w-full">
                                        {activeModel || 'DEF_AGENT'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center p-3 rounded-2xl bg-black/20 border border-white/5">
                                    <span className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mb-1">Agente_Cargado</span>
                                    <p className="text-[10px] text-purple-400 font-bold font-mono truncate max-w-full">
                                        {activeAgent?.name || 'GENERIC_MICO'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setView('apis')}
                                className="mt-8 text-[9px] text-gray-500 hover:text-white uppercase font-mono tracking-widest border border-white/5 px-6 py-2 rounded-full hover:bg-white/5 transition-all"
                            >
                                Gestionar_Nucleos
                            </button>
                        </div>
                    </div>
                </div>
            ) : view === 'apis' ? (
                <div className="grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="col-span-12 lg:col-span-8 lg:col-start-3">
                        <div className="glass-panel p-10 rounded-[3rem] border-white/5 bg-black/40 relative">
                            <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                        <Key className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white italic tracking-tighter">Protocolos de Acceso (APIs)</h3>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase mt-1">Nodos de Red_Neuronal Activos</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingConfig({ 
                                        label: '', 
                                        apiKey: '', 
                                        provider: 'gemini', 
                                        defaultModel: 'gemini-1.5-flash',
                                        isActive: false 
                                    })}
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-all shadow-lg shadow-indigo-900/40 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> NUEVA_KEY
                                </button>
                            </div>

                            {editingConfig && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-10 space-y-6 animate-in zoom-in-95 duration-300">
                                    <h4 className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.3em] mb-4">Configurador_de_Acceso</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono">Nombre del Nodo</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Cerebro_Pruebas"
                                                value={editingConfig.label || ''}
                                                onChange={e => setEditingConfig({ ...editingConfig, label: e.target.value })}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500/50 outline-none font-mono italic"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono">Proveedor de IA</label>
                                            <select
                                                value={editingConfig.provider || 'gemini'}
                                                onChange={e => {
                                                    const provider = e.target.value as AIProvider;
                                                    setEditingConfig({ ...editingConfig, provider });
                                                }}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500/50 outline-none font-mono"
                                            >
                                                <option value="gemini">Google Gemini</option>
                                                <option value="groq">Groq (Ultra-Fast)</option>
                                                <option value="mistral">Mistral AI</option>
                                                <option value="openrouter">OpenRouter (Claude/Multi)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono">Token de Acceso (API Key)</label>
                                        <input
                                            type="password"
                                            placeholder="sk-..."
                                            value={editingConfig.apiKey || ''}
                                            onChange={e => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500/50 outline-none font-mono"
                                        />
                                    </div>
                                    <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="w-4 h-4 text-indigo-400 opacity-50" />
                                            <p className="text-[9px] text-gray-400 font-mono italic uppercase tracking-tighter">
                                                Obtén tu llave en: <span className="text-white italic">[{editingConfig.provider === 'gemini' ? 'AI Studio' : editingConfig.provider === 'groq' ? 'Groq Cloud' : editingConfig.provider === 'mistral' ? 'Mistral Console' : 'OpenRouter Key'}]</span>
                                            </p>
                                        </div>
                                        <a
                                            href={
                                                editingConfig.provider === 'gemini' ? 'https://aistudio.google.com/app/apikey' :
                                                    editingConfig.provider === 'groq' ? 'https://console.groq.com/keys' :
                                                        editingConfig.provider === 'mistral' ? 'https://console.mistral.ai/api-keys/' :
                                                            'https://openrouter.ai/keys'
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[9px] font-bold text-indigo-400 hover:text-white transition-colors underline decoration-indigo-500/30 underline-offset-4"
                                        >
                                            IR_A_LA_CONSOLA
                                        </a>
                                    </div>
                                    <div className="flex gap-2 pt-6">
                                        <button
                                            onClick={() => handleTestApi('editing', editingConfig.apiKey || '', editingConfig.provider || 'gemini')}
                                            disabled={testingApiId === 'editing'}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                                                testResults['editing'] === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                                                testResults['editing'] === 'error' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' :
                                                'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            {testingApiId === 'editing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                            {testResults['editing'] === 'success' ? 'CONEXIÓN_OK' : testResults['editing'] === 'error' ? 'ERROR_DE_NODO' : 'PROBAR_CONEXIÓN'}
                                        </button>
                                        <button
                                            onClick={handleSaveConfig}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
                                        >
                                            <Save className="w-4 h-4" /> GUARDAR_NUCLEO
                                        </button>
                                        <button
                                            onClick={() => setEditingConfig(null)}
                                            className="w-14 bg-white/5 hover:bg-white/10 py-3 rounded-xl flex items-center justify-center transition-all border border-white/5"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                    {testMessages['editing'] && (
                                        <p className={`text-[10px] font-mono text-center p-3 rounded-lg ${testResults['editing'] === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'}`}>
                                            {testMessages['editing']}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                {configs.map(config => (
                                    <div key={config.id} className={`p-6 rounded-[1.5rem] border flex items-center justify-between transition-all group ${config.isActive ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-black/40 border-white/5 hover:border-white/10'}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`w-3 h-3 rounded-full ${config.isActive ? 'bg-indigo-400 animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'bg-gray-800'}`}></div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white uppercase tracking-tighter italic">{config.label}</span>
                                                    <span className="text-[7px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase">{config.provider}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] text-indigo-300 font-mono opacity-60 uppercase">{config.defaultModel || 'Default'}</span>
                                                    <span className="text-gray-700">•</span>
                                                    <span className="text-[9px] text-gray-500 font-mono italic">****{config.apiKey.slice(-4)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setEditingConfig({ ...config })}
                                                className="p-3 bg-white/5 text-gray-600 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => {
                                                    storageService.deleteConfig(config.id);
                                                    loadData();
                                                }}
                                                className="p-3 bg-white/5 text-gray-700 hover:text-rose-400 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : view === 'explorer' ? (
                <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="glass-panel p-10 rounded-[3rem] border-white/5 bg-black/40">
                        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                                    <ExternalLink className="w-6 h-6 text-teal-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white italic tracking-tighter">Brújula de Modelos (Discovery)</h3>
                                    <p className="text-[10px] text-gray-500 font-mono uppercase mt-1">Exploración de Nodos Neuronales en Tiempo Real</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] text-gray-500 font-mono italic">Selecciona un nodo para explorar:</span>
                                <select 
                                    className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-teal-400 font-mono outline-none"
                                    onChange={(e) => {
                                        const config = configs.find(c => c.id === e.target.value);
                                        if (config) handleExploreModels(config);
                                    }}
                                >
                                    <option value="">ELEGIR_NODO...</option>
                                    {configs.map(c => (
                                        <option key={c.id} value={c.id}>{c.label} ({c.provider})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {isExploring ? (
                            <div className="flex flex-col items-center justify-center py-20 text-teal-500/40 animate-pulse">
                                <RefreshCw className="w-10 h-10 animate-spin mb-4" />
                                <p className="text-xs font-mono uppercase tracking-[0.5em]">Escaneando_Red...</p>
                            </div>
                        ) : availableModels.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableModels.map(model => (
                                    <div key={model} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-teal-500/30 transition-all group">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]"></div>
                                                <span className="text-[10px] font-bold text-white truncate max-w-[150px] font-mono">{model}</span>
                                            </div>
                                            {testResults[model] === 'success' && <div className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">OK</div>}
                                            {testResults[model] === 'error' && <div className="text-[8px] text-rose-400 font-bold uppercase tracking-widest">ERROR</div>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleTestOneModel(model)}
                                                disabled={testingModel === model}
                                                className="flex-1 py-2 bg-black/40 hover:bg-teal-500/10 text-[9px] font-bold text-gray-500 hover:text-teal-400 rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2"
                                            >
                                                {testingModel === model ? <Loader2 className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3" />}
                                                PROBAR
                                            </button>
                                            <button 
                                                onClick={() => handleApplyModel(model)}
                                                className={`px-3 py-2 text-[9px] font-bold rounded-lg border transition-all ${
                                                    currentExploringConfig?.whitelistedModels?.includes(model)
                                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20'
                                                        : 'bg-white/5 text-gray-400 hover:text-white border-white/5'
                                                }`}
                                                title={currentExploringConfig?.whitelistedModels?.includes(model) ? "Deshabilitar modelo" : "Habilitar para usar en Chat"}
                                            >
                                                {currentExploringConfig?.whitelistedModels?.includes(model) ? 'ELIMINAR' : 'HABILITAR'}
                                            </button>
                                        </div>
                                        {testMessages[model] && (
                                            <p className={`mt-2 text-[8px] font-mono p-2 rounded bg-black/40 truncate ${testResults[model] === 'success' ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                                                {testMessages[model]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-600 opacity-20">
                                <Compass className="w-16 h-16 mb-4" />
                                <p className="text-xs font-mono uppercase tracking-[0.2em]">Selecciona un nodo activo para iniciar el escaneo</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="col-span-12 lg:col-span-8 lg:col-start-3">
                        <div className="glass-panel p-10 rounded-[3rem] border-white/5 bg-black/40">
                            <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                        <Bot className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white italic tracking-tighter">Gestión de Agentes (Prompts)</h3>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase mt-1">Personalidades del Cerebro Neuronales</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingAgent({ name: '', prompt: '', role: '', model: 'gemini-flash-latest', isCustom: true })}
                                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition-all shadow-lg shadow-purple-900/40 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> NUEVO_PROTOCOL
                                </button>
                            </div>

                            {editingAgent && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-10 space-y-6 animate-in zoom-in-95 duration-300">
                                    <h4 className="text-[10px] font-mono text-purple-400 uppercase tracking-[0.3em] mb-4">Editor_de_Nucleo</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono">Nombre del Agente</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Mico_Estratega"
                                                value={editingAgent.name || ''}
                                                onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500/50 outline-none font-sans italic"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono">Rol de Sistema</label>
                                            <input
                                                type="text"
                                                placeholder="Especialidad..."
                                                value={editingAgent.role || ''}
                                                onChange={e => setEditingAgent({ ...editingAgent, role: e.target.value })}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500/50 outline-none font-sans italic"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] text-gray-500 uppercase ml-2 font-mono italic underline">Instrucción_Neuron (System Prompt)</label>
                                        <textarea
                                            rows={8}
                                            placeholder="Define el comportamiento base de este agente..."
                                            value={editingAgent.prompt || ''}
                                            onChange={e => setEditingAgent({ ...editingAgent, prompt: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-5 text-xs text-white focus:border-purple-500/50 outline-none font-mono resize-none leading-relaxed"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-6">
                                        <button
                                            onClick={handleSaveAgent}
                                            className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save className="w-4 h-4" /> COMPILAR_PROTOCOLO
                                        </button>
                                        <button
                                            onClick={() => setEditingAgent(null)}
                                            className="w-14 bg-white/5 hover:bg-white/10 py-3 rounded-xl flex items-center justify-center transition-all border border-white/5"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {agents.map(agent => (
                                    <div key={agent.id} className="p-6 rounded-[2rem] border bg-black/40 border-white/5 hover:border-purple-500/30 transition-all group relative overflow-hidden">
                                        {activeAgent?.id === agent.id && (
                                            <div className="absolute top-0 right-0 p-3">
                                                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/10 group-hover:bg-purple-500/20 transition-all">
                                                <Bot className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-white uppercase tracking-tighter truncate">{agent.name}</span>
                                                    {!BASE_AGENTS.find(b => b.id === agent.id) ? (
                                                        <span className="text-[7px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full font-bold">USER_SPEC</span>
                                                    ) : (
                                                        <span className="text-[7px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full font-bold">KERNEL</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-600 italic truncate">{agent.role}</p>
                                                <div className="mt-4 flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingAgent(agent)}
                                                        className="px-3 py-1.5 bg-white/5 text-[9px] text-gray-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all border border-white/5 font-bold uppercase tracking-widest"
                                                    >
                                                        EDITAR
                                                    </button>
                                                    {agent.isCustom && (
                                                        <button
                                                            onClick={() => {
                                                                storageService.deleteCustomAgent(agent.id);
                                                                loadData();
                                                            }}
                                                            className="p-1.5 text-gray-700 hover:text-rose-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentsView;
