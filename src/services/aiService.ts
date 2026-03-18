import { GoogleGenerativeAI } from "@google/generative-ai";
import { AGENTS } from "../config/agents";
import type { AIAgent, AIConfig, AIProvider } from "../types/ai";
import { storageService } from "./storageService";

class AIService {
    private genAI: GoogleGenerativeAI | null = null;
    private currentAgent: AIAgent = AGENTS[0];
    private activeConfig: AIConfig | null = null;
    private currentModel: string | null = null;
    private chatHistory: { role: string; content: string }[] = [];
    private currentConvId: string = 'global-chat'; // ID por defecto para el chat principal
    private notesContext: string = ''; // Caché del contexto de notas
    private appContext: string = ''; // Tareas, Relojes, Conexiones

    // Gemini specifics
    private geminiChat: any = null;

    constructor() {
        this.loadActiveConfig();
    }

    // Alias para compatibilidad con Dashboard antiguo
    init(_apiKey?: string) {
        this.loadActiveConfig();
    }

    loadActiveConfig(configId?: string) {
        const configs = storageService.getConfigs();
        const config = configId 
            ? configs.find(c => c.id === configId) 
            : (configs.find(c => c.isActive) || configs[0]);

        if (config) {
            this.activeConfig = config;
            // Solo reseteamos el modelo si cambiamos de config y el modelo actual no es válido
            if (!this.currentModel || !config.whitelistedModels?.includes(this.currentModel)) {
                this.currentModel = config.defaultModel || (config.whitelistedModels?.[0]) || null;
            }

            if (config.provider === 'gemini') {
                this.genAI = new GoogleGenerativeAI(config.apiKey);
            } else {
                this.genAI = null;
            }
            this.initGeminiChat();
        } else {
            this.activeConfig = null;
            this.genAI = null;
            this.currentModel = null;
        }
    }

    setConfig(configId: string) {
        this.loadActiveConfig(configId);
    }

    setCurrentModel(model: string) {
        this.currentModel = model;
        // Si cambiamos de modelo en Gemini, reseteamos la sesión para aplicar cambios de sistema o modelo
        if (this.activeConfig?.provider === 'gemini') {
            this.geminiChat = null;
            this.updateAppContext();
            this.initGeminiChat();
        }
    }

    private updateAppContext() {
        const notes = storageService.getNotes();
        const tasks = storageService.getTasks();
        const settings = storageService.getSettings();
        const connections = storageService.getConnections();

        let context = "\n\n=== CONTEXTO_GLOBAL_DE_MICONSOLA ===\n";

        if (notes.length > 0) {
            context += "\n[NOTAS_GUARDADAS]:\n" + notes.map(n => `- ${n.title}: ${n.content}`).join('\n') + "\n";
        }

        if (tasks.length > 0) {
            context += "\n[TAREAS_PENDIENTES]:\n" + tasks.map(t => `- [${t.status === 'done' ? 'X' : ' '}] ${t.text} (${t.priority})`).join('\n') + "\n";
        }

        if (settings.clocks && settings.clocks.length > 0) {
            context += "\n[RELOJES_Y_ALARMAS]:\n" + settings.clocks.map(c => `- ${c.label} (${c.type}): ${c.value} [${c.isRunning ? 'ACTIVO' : 'PAUSADO'}]`).join('\n') + "\n";
        }

        if (connections.length > 0) {
            context += "\n[CONEXIONES_A_BASES_DE_DATOS_CONFIGURADAS]:\n" + connections.map(c => `- ${c.server} (Usuario: ${c.user})`).join('\n') + "\n";
        }

        context += "\n=== INSTRUCCIONES_DE_ACCION ===\n" +
            "Puedes ejecutar acciones usando etiquetas especiales al FINAL de tu respuesta. REGLAS CRÍTICAS:\n" +
            "1. MULTI-ACCION: Puedes (y debes) usar múltiples etiquetas seguidas si el usuario pide varias cosas (ej: buscar, anotar y cambiar tema en un solo paso).\n" +
            "2. NO EJECUTES nada si estás pidiendo permiso o confirmación. Espera a que el usuario diga 'sí'.\n" +
            "3. Navegación: [MICO_ACTION:OPEN_VIEW]{\"view\": \"projects|agents|database|notes|tasks|terminal|clocks\"}[/MICO_ACTION]\n" +
            "   (IMPORTANTE: 'Laboratorio' o 'IA' es la vista 'agents').\n" +
            "- Estética: [MICO_ACTION:THEME_MORPH]{\"theme\": \"original|matrix|cyberpunk|gold|neon_red\"}[/MICO_ACTION]\n" +
            "- Tareas: [MICO_ACTION:CREATE_TASK]{\"text\": \"...\", \"priority\": \"low|medium|high|critical\"}[/MICO_ACTION]\n" +
            "- Tareas: [MICO_ACTION:COMPLETE_TASK]{\"id\": \"...\", \"text\": \"...\"}[/MICO_ACTION]\n" +
            "- Tareas: [MICO_ACTION:DELETE_TASK]{\"id\": \"...\", \"text\": \"...\"}[/MICO_ACTION]\n" +
            "- Notas: [MICO_ACTION:CREATE_NOTE]{\"title\": \"...\", \"content\": \"...\", \"category\": \"...\"}[/MICO_ACTION]\n" +
            "- Notas: [MICO_ACTION:UPDATE_NOTE]{\"id\": \"...\", \"title\": \"...\", \"category\": \"...\", \"archived\": true|false}[/MICO_ACTION]\n" +
            "- Notas: [MICO_ACTION:DELETE_NOTE]{\"id\": \"...\", \"title\": \"...\"}[/MICO_ACTION]\n" +
            "- Web Search (IMPERATIVO si piden buscar): [MICO_ACTION:SEARCH_WEB]{\"query\": \"...\"}[/MICO_ACTION]\n" +
            "   (REGLA: Si lanzas esto, tu texto DEBE ser declarativo: 'Buscando...' o 'Abriendo navegador...'. NO pidas permiso si ya lo estás haciendo).\n" +
            "- Web Browser (IMPERATIVO si piden abrir web): [MICO_ACTION:BROWSE_URL]{\"url\": \"...\"}[/MICO_ACTION]\n";

        this.appContext = context;
    }

    getCurrentModel() {
        return this.currentModel || this.activeConfig?.defaultModel || this.currentAgent.model;
    }

    private initGeminiChat() {
        if (this.activeConfig?.provider === 'gemini' && this.genAI) {
            this.updateAppContext(); // Asegurar contexto fresco
            const modelToUse = this.getCurrentModel() || "gemini-1.5-flash";
            const model = this.genAI.getGenerativeModel({
                model: modelToUse,
                systemInstruction: this.currentAgent.prompt + this.appContext
            });
            this.geminiChat = model.startChat({
                history: [],
                generationConfig: { maxOutputTokens: 4000 },
            });
        }
    }

    async setAgent(agentId: string) {
        const agents = storageService.getAgents();
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;

        this.currentAgent = agent;
        this.chatHistory = []; // Limpiamos buffer para recargar
        this.geminiChat = null;

        await this.syncHistoryFromDB();
        this.initGeminiChat();
    }

    private async syncHistoryFromDB(convId: string = 'global-chat') {
        const history = await this.getHistory(convId);
        this.chatHistory = history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.text
        }));
    }

    async sendMessage(text: string, convId?: string): Promise<string> {
        if (!this.activeConfig) {
            throw new Error("Sistema no configurado. Asegúrate de tener una API Key activa.");
        }

        const activeConvId = convId || this.currentConvId;

        // Sincronizar historial si el buffer está vacío o cambió de conversación
        if (this.chatHistory.length === 0) {
            await this.syncHistoryFromDB(activeConvId);
        }
        const lowerText = text.toLowerCase();
        let contextPrefix = "";
        const keywords = ['nota', 'idea', 'propuesta', 'tarea', 'pendiente', 'reloj', 'alarma', 'base de datos', 'crear', 'anota', 'busca', 'search', 'web', 'url', 'google', 'navega', 'abre'];
        
        if (keywords.some(k => lowerText.includes(k))) {
            this.updateAppContext();
            if (this.appContext) {
                contextPrefix = `[MICO_SYSTEM_CONTEXT_UPDATE: ${this.appContext}]\n\n`;
            }
        }

        const provider = this.activeConfig.provider;

        // Persistir mensaje del usuario (SIN el prefijo de contexto)
        await this.persistMessage(activeConvId, 'user', text);

        let response: string;
        if (provider === 'gemini') {
            if (!this.geminiChat) this.initGeminiChat();
            // Para Gemini, el sistema ya tiene el contexto base, el prefix es solo para actualizaciones en tiempo real
            response = await this.sendGeminiMessage(contextPrefix + text);
        } else {
            response = await this.sendOpenAIMessage(text, contextPrefix, provider);
        }

        // Persistir respuesta de la IA
        await this.persistMessage(activeConvId, 'model', response);
        this.chatHistory.push({ role: 'assistant', content: response });

        // Mantener el buffer manejable (últimos 20 mensajes)
        if (this.chatHistory.length > 20) {
            this.chatHistory = this.chatHistory.slice(-20);
        }

        return response;
    }

    // --- SQLite Persistence Methods ---
    async getHistory(convId: string = 'global-chat'): Promise<{ role: 'user' | 'model', text: string }[]> {
        const response = await (window as any).electronAPI.sqlite.query(
            'SELECT role, content as text FROM messages WHERE conv_id = ? ORDER BY timestamp ASC',
            [convId]
        );
        if (response.success) {
            return response.rows.map((r: any) => ({
                role: r.role === 'model' ? 'model' : 'user',
                text: r.text
            }));
        }
        return [];
    }

    private async persistMessage(convId: string, role: 'user' | 'model', content: string) {
        // Asegurar que la conversación existe (UPSERT simple)
        await (window as any).electronAPI.sqlite.query(
            'INSERT OR IGNORE INTO conversations (id, title) VALUES (?, ?)',
            [convId, convId === 'global-chat' ? 'Chat Principal' : `Agente: ${this.currentAgent.name}`]
        );

        // Guardar mensaje
        await (window as any).electronAPI.sqlite.query(
            'INSERT INTO messages (conv_id, role, content) VALUES (?, ?, ?)',
            [convId, role, content]
        );
    }

    async clearHistory(convId: string = 'global-chat') {
        await (window as any).electronAPI.sqlite.query(
            'DELETE FROM messages WHERE conv_id = ?',
            [convId]
        );
    }

    private async sendGeminiMessage(text: string): Promise<string> {
        if (!this.geminiChat) throw new Error("Gemini Chat no inicializado");
        try {
            const result = await this.geminiChat.sendMessage(text);
            return result.response.text();
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async transcribeAudio(audioBlob: Blob): Promise<string> {
        if (!this.activeConfig) throw new Error("Sistema no configurado.");
        const provider = this.activeConfig.provider;

        if (provider === 'groq') {
            const formData = new FormData();
            formData.append("file", audioBlob, "audio.webm");
            formData.append("model", "whisper-large-v3-turbo");
            formData.append("response_format", "json");
            
            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.activeConfig.apiKey}` },
                body: formData
            });
            if (!response.ok) throw new Error("Mico_System_Error: Groq Whisper falló al procesar el audio.");
            const data = await response.json();
            return data.text;
        } else if (provider === 'gemini') {
            const buffer = await audioBlob.arrayBuffer();
            const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            
            const tempAI = new GoogleGenerativeAI(this.activeConfig.apiKey);
            const modelToUse = this.getCurrentModel() || "gemini-1.5-flash";
            const tempModel = tempAI.getGenerativeModel({ 
                model: modelToUse,
            });
            const prompt = "Transcribe este audio EXACTAMENTE como se escucha. Si hay puro silencio o ruido, devuelve UNICAMENTE la frase [SILENCIO]. No agregues puntuación inventada, introducciones como 'Aquí está la transcripción:', ni frases por defecto. Tu única salida debe ser el texto hablado literal.";
            
            const inlineData = {
                inlineData: {
                    data: base64,
                    mimeType: audioBlob.type || "audio/webm"
                }
            };
            
            const result = await tempModel.generateContent([prompt, inlineData]);
            return result.response.text().trim();
        } else {
            throw new Error("La transcripción de voz está soportada nativamente con llaves de Groq (Whisper) o Gemini.");
        }
    }

    private async sendOpenAIMessage(text: string, contextPrefix: string, provider: AIProvider): Promise<string> {
        const baseUrl = this.getProviderUrl(provider);
        const model = this.getCurrentModel();

        // Solo tomamos los últimos 10 mensajes para evitar Error 413 "Request Entity Too Large"
        const recentHistory = this.chatHistory.slice(-10);

        const messages = [
            { role: 'system', content: this.currentAgent.prompt + this.appContext },
            ...recentHistory
        ];

        // Inyectar el prefijo de contexto solo en el último mensaje
        if (contextPrefix) {
            messages[messages.length - 1].content = contextPrefix + text;
        }

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.activeConfig?.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Error API ${response.status}`);
            }

            const data = await response.json();
            const reply = data.choices[0].message.content;
            this.chatHistory.push({ role: 'assistant', content: reply });
            return reply;
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    private getProviderUrl(provider: AIProvider): string {
        switch (provider) {
            case 'groq': return 'https://api.groq.com/openai/v1';
            case 'mistral': return 'https://api.mistral.ai/v1';
            case 'openrouter': return 'https://openrouter.ai/api/v1';
            default: return '';
        }
    }

    private handleError(error: any): never {
        console.error("AI Error:", error);
        const errorMessage = error.message || "Error desconocido";
        if (errorMessage.includes("API key not valid")) throw new Error("API Key inválida.");
        if (errorMessage.includes("quota")) throw new Error("Cuota excedida.");
        throw new Error(`Error técnico: ${errorMessage}`);
    }

    async getAvailableModels(config?: AIConfig): Promise<string[]> {
        const configToUse = config || this.activeConfig;
        if (!configToUse) return [];
        const { provider, apiKey } = configToUse;
        
        try {
            if (provider === 'gemini') {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const data = await response.json();
                return data.models?.filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
                            .map((m: any) => m.name.replace('models/', '')) || [];
            } else {
                const baseUrl = this.getProviderUrl(provider);
                const response = await fetch(`${baseUrl}/models`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const data = await response.json();
                if (data.data) {
                    return data.data.map((m: any) => m.id);
                }
                return [];
            }
        } catch (error) {
            console.error("Error fetching models:", error);
            return [];
        }
    }

    async testSpecificModel(config: AIConfig, model: string): Promise<{ success: boolean; message: string }> {
        const { provider, apiKey } = config;
        
        try {
            if (provider === 'gemini') {
                const tempAI = new GoogleGenerativeAI(apiKey);
                const tempModel = tempAI.getGenerativeModel({ model });
                const result = await tempModel.generateContent("ping");
                return { success: !!result.response.text(), message: "Respuesta recibida OK" };
            } else {
                const baseUrl = this.getProviderUrl(provider);
                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: 'say ping' }],
                        max_tokens: 10
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    return { success: false, message: errorData.error?.message || `Error ${response.status}` };
                }
                return { success: true, message: "Respuesta recibida OK" };
            }
        } catch (error: any) {
            return { success: false, message: error.message || "Error de conexión" };
        }
    }

    async validateApiKey(key: string, provider: AIProvider = 'gemini'): Promise<{ success: boolean; message: string }> {
        if (provider === 'gemini') {
            try {
                const tempAI = new GoogleGenerativeAI(key);
                const tempModel = tempAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await tempModel.generateContent("Hola");
                const text = result.response.text();
                return { success: !!text, message: text ? "Conexión exitosa con Gemini" : "Respuesta vacía" };
            } catch (error: any) {
                const msg = error.message || "";
                if (msg.includes("quota")) return { success: false, message: "Mico_System_Error: Cuota excedida." };
                if (msg.includes("API key not valid")) return { success: false, message: "Clave API inválida." };
                return { success: false, message: `Mico_System_Error: ${msg.substring(0, 50)}...` };
            }
        } else {
            const baseUrl = this.getProviderUrl(provider);
            try {
                const response = await fetch(`${baseUrl}/models`, {
                    headers: { 'Authorization': `Bearer ${key}` }
                });
                if (response.status === 429) return { success: false, message: "Mico_System_Error: Cuota excedida." };
                if (response.status === 401) return { success: false, message: "Clave no autorizada (401)." };
                return { 
                    success: response.ok, 
                    message: response.ok ? `Conexión con ${provider} OK` : `Mico_System_Error: ${response.status}` 
                };
            } catch (error: any) {
                return { success: false, message: "Mico_System_Error: Red bloqueada." };
            }
        }
    }

    isConfigured(): boolean {
        return !!this.activeConfig;
    }

    getCurrentAgent() {
        return this.currentAgent;
    }

    getActiveConfig() {
        return this.activeConfig;
    }

    clearConfig() {
        this.activeConfig = null;
        this.genAI = null;
        this.currentModel = null;
        this.geminiChat = null;
        // Opcional: Limpiar también en storage si es deseado, 
        // pero aquí solo reseteamos el estado en memoria para el Dashboard.
    }
}

export const aiService = new AIService();
