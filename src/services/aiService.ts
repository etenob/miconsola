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
            this.initGeminiChat();
        }
    }

    getCurrentModel() {
        return this.currentModel || this.activeConfig?.defaultModel || this.currentAgent.model;
    }

    private initGeminiChat() {
        if (this.activeConfig?.provider === 'gemini' && this.genAI) {
            const modelToUse = this.getCurrentModel() || "gemini-1.5-flash";
            const model = this.genAI.getGenerativeModel({
                model: modelToUse,
                systemInstruction: this.currentAgent.prompt
            });
            this.geminiChat = model.startChat({
                history: [],
                generationConfig: { maxOutputTokens: 4000 },
            });
        }
    }

    setAgent(agentId: string) {
        const agents = storageService.getAgents();
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;

        this.currentAgent = agent;
        this.chatHistory = [];
        this.geminiChat = null;

        // Limpiar el historial para otros proveedores también
        this.chatHistory = [];

        this.initGeminiChat();
    }

    async sendMessage(text: string): Promise<string> {
        if (!this.activeConfig) {
            throw new Error("Sistema no configurado. Asegúrate de tener una API Key activa.");
        }

        const provider = this.activeConfig.provider;

        if (provider === 'gemini') {
            return this.sendGeminiMessage(text);
        } else {
            return this.sendOpenAIMessage(text, provider);
        }
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

    private async sendOpenAIMessage(text: string, provider: AIProvider): Promise<string> {
        const baseUrl = this.getProviderUrl(provider);
        // Priorizar el modelo actual seleccionado dinámicamente
        const model = this.getCurrentModel();

        // Add user message to history
        this.chatHistory.push({ role: 'user', content: text });

        const messages = [
            { role: 'system', content: this.currentAgent.prompt },
            ...this.chatHistory
        ];

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.activeConfig?.apiKey}`,
                    'HTTP-Referer': 'https://miconsola.app',
                    'X-Title': 'Miconsola'
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
