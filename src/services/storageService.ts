import type { AIAgent, AIConfig } from "../types/ai";
import { AGENTS } from "../config/agents";

const MODULES = {
    AGENTS: 'MisAgentes',
    NOTES: 'MisNotas',
    TASKS: 'MisTareas',
    CONFIG: 'Config',
};


export type ClockType = 'timer' | 'stopwatch' | 'world_clock' | 'alarm';

export interface MicoClock {
    id: string;
    type: ClockType;
    label: string;
    value: number | string; // Valor base (ej: '5:00' o 'America/Jamaica')
    isPinned: boolean;
    alarmUrl?: string;
    // Estado Dinámico de Ejecución (Para 2do plano)
    isRunning?: boolean;
    currentMs?: number;    // Tiempo actual en ms (cuenta atrás o adelante)
    lastUpdateAt?: number; // Timestamp de la última vez que computó el motor
    isFloating?: boolean;  // Si está en modo burbuja
    floatingPos?: { x: number, y: number };
}

export interface MicoSettings {
    clocks: MicoClock[];
}

export interface MicoNote {
    id: string;
    title: string;
    content: string;
    date: string;
    category?: string;
}

export interface TaskItem {
    id: string;
    text: string;
    status: 'pending' | 'done';
    priority: 'low' | 'medium' | 'high' | 'critical';
}

class PersistentStorageService {
    // Cachés en memoria para respuestas síncronas de React
    private cache = {
        configs: [] as AIConfig[],
        agents: [] as AIAgent[],
        notes: [] as MicoNote[],
        tasks: [] as TaskItem[],
        settings: { 
            clocks: [
                {
                    id: 'default-pomodoro',
                    type: 'timer',
                    label: 'Pomodoro Global',
                    value: '45:00',
                    isPinned: true,
                    isRunning: false,
                    currentMs: 45 * 60 * 1000
                }
            ]
        } as MicoSettings,
        isLoaded: false
    };
    private initializingPromise: Promise<void> | null = null;

    /**
     * Inicialización asíncrona que lee el disco duro y carga el caché al arrancar.
     */
    async initialize() {
        if (this.cache.isLoaded) return;
        if (this.initializingPromise) return this.initializingPromise;

        this.initializingPromise = (async () => {
            if (!window.electronAPI) {
                console.warn("electronAPI no detectada. Operando en vacio o modo Web no soportado por True OS Storage.");
                return;
            }

            try {
                console.log("MICO_STORAGE: Iniciando carga de datos... 📂");
                // 1. Cargar Configuración General y APIs
            const settingsRes = await window.electronAPI.fs.readData(MODULES.CONFIG, 'settings.json');
            if (settingsRes.success && settingsRes.content) {
                this.cache.settings = { ...this.cache.settings, ...JSON.parse(settingsRes.content) };
            }

            const configsRes = await window.electronAPI.fs.readData(MODULES.CONFIG, 'apis.json');
            if (configsRes.success && configsRes.content) {
                this.cache.configs = JSON.parse(configsRes.content);
            }

            // 2. Cargar Agentes Personalizados
            const agentsDir = await window.electronAPI.fs.readDir(MODULES.AGENTS);
            if (agentsDir.success && agentsDir.files) {
                this.cache.agents = []; // Limpieza atómica
                for (const file of agentsDir.files) {
                    if (file.endsWith('.json')) {
                        const fileRes = await window.electronAPI.fs.readData(MODULES.AGENTS, file);
                        if (fileRes.success && fileRes.content) {
                            const agent = JSON.parse(fileRes.content);
                            if (agent && agent.id && !this.cache.agents.some(a => a.id === agent.id)) {
                                this.cache.agents.push(agent);
                            }
                        }
                    }
                }
            }

            // 3. Cargar Notas
            const notesDir = await window.electronAPI.fs.readDir(MODULES.NOTES);
            if (notesDir.success && notesDir.files) {
                this.cache.notes = [];
                for (const file of notesDir.files) {
                    if (file.endsWith('.md')) {
                        const fileRes = await window.electronAPI.fs.readData(MODULES.NOTES, file);
                        if (fileRes.success && fileRes.content) {
                            try {
                                const noteObj = JSON.parse(fileRes.content);
                                if (noteObj && noteObj.id && !this.cache.notes.some(n => n.id === noteObj.id)) {
                                    this.cache.notes.push(noteObj);
                                }
                            } catch (e) {
                                // RECUPERACIÓN INTELIGENTE: Si el JSON está mal, intentamos extraer el texto
                                const fallbackId = file.replace('.md', '');
                                if (this.cache.notes.some(n => n.id === fallbackId)) continue;
                                let content = fileRes.content;
                                // Intento de extraer campo "content" si parece un JSON roto
                                const match = fileRes.content.match(/"content":\s*"([\s\S]*?)"/);
                                if (match) content = match[1].replace(/\\n/g, '\n');

                                this.cache.notes.push({
                                    id: fallbackId,
                                    title: "Nota_Recuperada",
                                    content: content,
                                    date: new Date().toISOString(),
                                    category: 'Recuperado'
                                });
                            }
                        }
                    }
                }
            }

            // 3.5 Cargar Tareas
            const tasksDir = await window.electronAPI.fs.readDir(MODULES.TASKS);
            if (tasksDir.success && tasksDir.files) {
                this.cache.tasks = [];
                for (const file of tasksDir.files) {
                    if (file.endsWith('.json')) {
                        const fileRes = await window.electronAPI.fs.readData(MODULES.TASKS, file);
                        if (fileRes.success && fileRes.content) {
                            try {
                                const taskObj = JSON.parse(fileRes.content);
                                if (taskObj && taskObj.id && !this.cache.tasks.some(t => t.id === taskObj.id)) {
                                    this.cache.tasks.push(taskObj);
                                }
                            } catch (e) {
                                console.error(`Error parseando tarea ${file}`, e);
                            }
                        }
                    }
                }
            }

            // 4. MIGRACIÓN TRANSPARENTE DESDE LOCALSTORAGE (Si es la primera vez)
            const legacyAgents = localStorage.getItem('MICO_CUSTOM_AGENTS');
            if (legacyAgents) {
                const parsedAgents = JSON.parse(legacyAgents);
                for (const agent of parsedAgents) {
                    if (!this.cache.agents.some(a => a.id === agent.id)) {
                        this.saveCustomAgent(agent);
                    }
                }
                localStorage.removeItem('MICO_CUSTOM_AGENTS');
                console.log('Migración de Agentes completada.');
            }

            const legacyNotes = localStorage.getItem('MICO_NOTES');
            if (legacyNotes) {
                const parsedNotes = JSON.parse(legacyNotes);
                for (const note of parsedNotes) {
                    if (!this.cache.notes.some(n => n.id === note.id)) {
                        this.saveNote(note);
                    }
                }
                localStorage.removeItem('MICO_NOTES');
                console.log('Migración de Notas completada.');
            }

            const legacyConfigs = localStorage.getItem('MICO_AI_CONFIGS');
            if (legacyConfigs) {
                const parsedConfigs = JSON.parse(legacyConfigs);
                for (const config of parsedConfigs) {
                    if (!this.cache.configs.some(c => c.id === config.id)) {
                        this.saveConfig(config);
                    }
                }
                localStorage.removeItem('MICO_AI_CONFIGS');
                console.log('Migración de Configs completada.');
            }

            const legacySettings = localStorage.getItem('MICO_SETTINGS');
            if (legacySettings) {
                this.saveSettings(JSON.parse(legacySettings));
                localStorage.removeItem('MICO_SETTINGS');
            }

            this.cache.isLoaded = true;
            this.initializingPromise = null;
            console.log("True OS Storage Inicializado", this.cache);
            
            // Iniciar Motor de Tiempo Global
            this.startMasterMotor();

            // Disparar eventos para que la UI se renderice con los nuevos datos
            window.dispatchEvent(new Event('mico-storage-ready'));
            window.dispatchEvent(new Event('mico-settings-updated'));
            window.dispatchEvent(new Event('mico-configs-updated'));
            window.dispatchEvent(new Event('mico-notes-updated'));
            window.dispatchEvent(new Event('mico-tasks-updated'));
        } catch (error) {
            console.error("Error inicializando True OS Storage:", error);
            this.initializingPromise = null;
        }
    })();

    return this.initializingPromise;
}

    // --- Agentes ---
    getAgents(): AIAgent[] {
        const agentsMap = new Map<string, AIAgent>();
        AGENTS.forEach(a => agentsMap.set(a.id, a));
        this.cache.agents.forEach((a: AIAgent) => agentsMap.set(a.id, a));
        return Array.from(agentsMap.values());
    }

    saveCustomAgent(agent: AIAgent) {
        // Actualizar caché
        const index = this.cache.agents.findIndex((a: AIAgent) => a.id === agent.id);
        const agentToSave = { ...agent };
        if (index >= 0) this.cache.agents[index] = agentToSave;
        else this.cache.agents.push(agentToSave);

        // Guardar físicamente
        if (window.electronAPI) {
            const filename = `${agentToSave.id}.json`;
            window.electronAPI.fs.saveData(MODULES.AGENTS, filename, JSON.stringify(agentToSave, null, 2));
        }
    }

    deleteCustomAgent(id: string) {
        this.cache.agents = this.cache.agents.filter((a: AIAgent) => a.id !== id);
        if (window.electronAPI) {
             window.electronAPI.fs.deleteFile(MODULES.AGENTS, `${id}.json`);
        }
    }

    // --- APIs ---
    getConfigs(): AIConfig[] {
        return Array.isArray(this.cache.configs) ? [...this.cache.configs] : [];
    }

    saveConfig(config: AIConfig) {
        const index = this.cache.configs.findIndex(c => c.id === config.id);
        if (index >= 0) this.cache.configs[index] = config;
        else this.cache.configs.push(config);

        if (window.electronAPI) {
            window.electronAPI.fs.saveData(MODULES.CONFIG, 'apis.json', JSON.stringify(this.cache.configs, null, 2));
        }
        window.dispatchEvent(new Event('mico-configs-updated'));
    }

    getActiveConfig(): AIConfig | null {
        return this.getConfigs().find(c => c.isActive) || null;
    }

    deleteConfig(id: string) {
        this.cache.configs = this.cache.configs.filter(c => c.id !== id);
        if (window.electronAPI) {
             window.electronAPI.fs.saveData(MODULES.CONFIG, 'apis.json', JSON.stringify(this.cache.configs, null, 2));
        }
        window.dispatchEvent(new Event('mico-configs-updated'));
    }

    // --- Notas ---
    /**
     * Obtiene todas las notas guardadas (Caché síncrono)
     */
    getNotes(): MicoNote[] {
        return Array.isArray(this.cache.notes) ? [...this.cache.notes] : [];
    }

    saveNote(note: MicoNote) {
        const index = this.cache.notes.findIndex(n => n.id === note.id);
        if (index >= 0) this.cache.notes[index] = note;
        else this.cache.notes.push(note);

        if (window.electronAPI) {
            window.electronAPI.fs.saveData(MODULES.NOTES, `${note.id}.md`, JSON.stringify(note, null, 2));
        }
        window.dispatchEvent(new Event('mico-notes-updated'));
    }

    deleteNote(id: string) {
        this.cache.notes = this.cache.notes.filter(n => n.id !== id);
        if (window.electronAPI) {
            window.electronAPI.fs.deleteFile(MODULES.NOTES, `${id}.md`);
        }
        window.dispatchEvent(new Event('mico-notes-updated'));
    }

    // --- Tareas ---
    getTasks(): TaskItem[] {
        return Array.isArray(this.cache.tasks) ? [...this.cache.tasks] : [];
    }

    saveTask(task: TaskItem) {
        const index = this.cache.tasks.findIndex(t => t.id === task.id);
        if (index >= 0) this.cache.tasks[index] = task;
        else this.cache.tasks.unshift(task); // Add to beginning

        if (window.electronAPI) {
            window.electronAPI.fs.saveData(MODULES.TASKS, `${task.id}.json`, JSON.stringify(task, null, 2));
        }
        window.dispatchEvent(new Event('mico-tasks-updated'));
    }

    deleteTask(id: string) {
        this.cache.tasks = this.cache.tasks.filter(t => t.id !== id);
        if (window.electronAPI) {
            window.electronAPI.fs.deleteFile(MODULES.TASKS, `${id}.json`);
        }
        window.dispatchEvent(new Event('mico-tasks-updated'));
    }

    // --- Configuraciones Globales ---
    getSettings(): MicoSettings {
        // Asegurar que siempre haya un array de clocks
        if (!this.cache.settings.clocks) this.cache.settings.clocks = [];
        return { ...this.cache.settings, clocks: [...this.cache.settings.clocks] };
    }

    saveSettings(settings: Partial<MicoSettings>) {
        this.cache.settings = { ...this.cache.settings, ...settings };
        if (window.electronAPI) {
            window.electronAPI.fs.saveData(MODULES.CONFIG, 'settings.json', JSON.stringify(this.cache.settings, null, 2));
        }
        window.dispatchEvent(new Event('mico-settings-updated'));
    }

    /**
     * Motor Maestro de Tiempo (Segunda Capa) 🛰️
     * Se encarga de actualizar todos los relojes que estén 'isRunning'.
     */
    private startMasterMotor() {
        console.log("MICO_SYSTEM: Motor Maestro Iniciado. 🚀");
        setInterval(() => {
            try {
                const now = Date.now();
                let stateWasModified = false;

                if (!Array.isArray(this.cache.settings.clocks)) {
                    this.cache.settings.clocks = [];
                    return;
                }

                const newClocks = this.cache.settings.clocks.map(clock => {
                    if (!clock || !clock.id) return clock;
                    
                    if (clock.isRunning) {
                        stateWasModified = true;
                        const lastUpdate = clock.lastUpdateAt || now;
                        const delta = now - lastUpdate;
                        const updatedClock = { ...clock, lastUpdateAt: now };

                        if (clock.type === 'timer') {
                            const next = (clock.currentMs || 0) - delta;
                            if (next <= 0) {
                                updatedClock.currentMs = 0;
                                updatedClock.isRunning = false;
                                window.dispatchEvent(new CustomEvent('mico-alarm-triggered', {
                                    detail: { label: clock.label, id: clock.id, alarmUrl: clock.alarmUrl }
                                }));
                            } else {
                                updatedClock.currentMs = next;
                            }
                        } else if (clock.type === 'stopwatch') {
                            updatedClock.currentMs = (clock.currentMs || 0) + delta;
                        } else if (clock.type === 'alarm' && typeof clock.value === 'string') {
                            const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                            if (nowTime === clock.value) {
                                updatedClock.isRunning = false;
                                updatedClock.currentMs = 0;
                                updatedClock.lastUpdateAt = now;
                                window.dispatchEvent(new CustomEvent('mico-alarm-triggered', {
                                    detail: { label: clock.label, id: clock.id, alarmUrl: clock.alarmUrl }
                                }));
                            }
                        }
                        return updatedClock;
                    }

                    if (clock.lastUpdateAt !== undefined) {
                        stateWasModified = true;
                        return { ...clock, lastUpdateAt: undefined };
                    }
                    return clock;
                });

                if (stateWasModified) {
                    this.cache.settings = { ...this.cache.settings, clocks: newClocks };
                    window.dispatchEvent(new Event('mico-settings-updated'));
                }
            } catch (err) {
                console.error("MICO_SYSTEM_FATAL: Error en motor maestro:", err);
            }
        }, 100); 
    }
}

export const storageService = new PersistentStorageService();
