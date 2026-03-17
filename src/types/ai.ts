export interface AIAgent {
    id: string;
    name: string;
    role: string;
    prompt: string;
    icon: string;
    model: string;
    isCustom?: boolean;
}

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'mistral';

export interface AIConfig {
    id: string;
    label: string;
    apiKey: string;
    provider: AIProvider;
    defaultModel?: string;
    whitelistedModels?: string[];
    isActive: boolean;
}

export interface Message {
    role: 'user' | 'model';
    text: string;
}
