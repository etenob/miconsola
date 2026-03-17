import type { AIAgent, AIConfig } from "../types/ai";
import { AGENTS } from "../config/agents";

// Definición de las carpetas locales OS (Módulos)
const MODULES = {
    AGENTS: 'MisAgentes',
    NOTES: 'MisNotas',
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

class PersistentStorageService {
    // Cachés en memoria para respuestas síncronas de React
    private cache = {
        configs: [] as AIConfig[],
        agents: [] as AIAgent[],
        notes: [] as MicoNote[],
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

    /**
     * Inicialización asíncrona que lee el disco duro y carga el caché al arrancar.
     */
    async initialize() {
        if (!window.electronAPI) {
            console.warn("electronAPI no detectada. Operando en vacio o modo Web no soportado por True OS Storage.");
            return;
        }

        try {
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
                for (const file of agentsDir.files) {
                    if (file.endsWith('.json')) {
                        const fileRes = await window.electronAPI.fs.readData(MODULES.AGENTS, file);
                        if (fileRes.success && fileRes.content) {
                            this.cache.agents.push(JSON.parse(fileRes.content));
                        }
                    }
                }
            }

            // 3. Cargar Notas
            const notesDir = await window.electronAPI.fs.readDir(MODULES.NOTES);
            if (notesDir.success && notesDir.files) {
                for (const file of notesDir.files) {
                    if (file.endsWith('.md')) {
                        const fileRes = await window.electronAPI.fs.readData(MODULES.NOTES, file);
                        if (fileRes.success && fileRes.content) {
                            try {
                                const noteObj = JSON.parse(fileRes.content);
                                this.cache.notes.push(noteObj);
                            } catch (e) {
                                this.cache.notes.push({
                                    id: file.replace('.md', ''),
                                    title: file.replace('.md', ''),
                                    content: fileRes.content,
                                    date: new Date().toISOString()
                                });
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
            console.log("True OS Storage Inicializado", this.cache);
            
            // Iniciar Motor de Tiempo Global
            this.startMasterMotor();

            // Disparar eventos para que la UI se renderice con los nuevos datos
            window.dispatchEvent(new Event('mico-storage-ready'));
            window.dispatchEvent(new Event('mico-settings-updated'));
            window.dispatchEvent(new Event('mico-configs-updated'));
        } catch (error) {
            console.error("Error inicializando True OS Storage:", error);
        }
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
        return this.cache.configs;
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
     * Obtiene todas las notas guardadas
     */
    getNotes(): MicoNote[] {
        const notes = this.cache.notes || [];
        // Saneamiento de seguridad: asegurar IDs únicos si hubo colisiones previas
        const seen = new Set();
        return notes.map(n => {
            const newNote = { ...n }; // Create a new object to ensure immutability if ID is changed
            if (seen.has(newNote.id)) {
                newNote.id = `${newNote.id}_FIX_${Math.random().toString(36).substr(2, 5)}`;
            }
            seen.add(newNote.id);
            return newNote;
        });
    }

    saveNote(note: MicoNote) {
        const index = this.cache.notes.findIndex(n => n.id === note.id);
        if (index >= 0) this.cache.notes[index] = note;
        else this.cache.notes.push(note);

        if (window.electronAPI) {
            // Guardamos el objeto entero serializado en MD (Nota: Esto podría mejorarse usando Frontmatter en el futuro)
            window.electronAPI.fs.saveData(MODULES.NOTES, `${note.id}.md`, JSON.stringify(note, null, 2));
        }
    }

    deleteNote(id: string) {
        this.cache.notes = this.cache.notes.filter(n => n.id !== id);
        if (window.electronAPI) {
            window.electronAPI.fs.deleteFile(MODULES.NOTES, `${id}.md`);
        }
    }

    // --- Configuraciones Globales ---
    getSettings(): MicoSettings {
        return this.cache.settings;
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
        console.log("MICO_MOTOR: Iniciando motor maestro...");
        setInterval(() => {
            const now = Date.now();
            let stateWasModified = false;

            const newClocks = this.cache.settings.clocks.map(clock => {
                // Si está corriendo, computar delta y actualizar currentMs
                if (clock.isRunning) {
                    stateWasModified = true;
                    const lastUpdate = clock.lastUpdateAt || now;
                    const delta = now - lastUpdate;
                    
                    // Clonar objeto para inmutabilidad reactiva
                    const updatedClock = { ...clock, lastUpdateAt: now };

                    if (clock.type === 'timer') {
                        const next = (clock.currentMs || 0) - delta;
                        if (next <= 0) {
                            updatedClock.currentMs = 0;
                            updatedClock.isRunning = false;
                            // 🚨 DISPARO: Notificar overlay y audio desde el motor
                            window.dispatchEvent(new CustomEvent('mico-alarm-triggered', {
                                detail: { label: clock.label, id: clock.id, alarmUrl: clock.alarmUrl }
                            }));
                        } else {
                            updatedClock.currentMs = next;
                        }
                    } else if (clock.type === 'stopwatch') {
                        updatedClock.currentMs = (clock.currentMs || 0) + delta;
                    } else if (clock.type === 'alarm' && typeof clock.value === 'string') {
                        // Lógica de Alarma: Comprobar si la hora actual (HH:mm) coincide con el target
                        const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                        if (nowTime === clock.value) {
                            updatedClock.isRunning = false; // Se desarma
                            updatedClock.currentMs = 0;
                            updatedClock.lastUpdateAt = now;
                            // 🚨 DISPARO: Notificar overlay y audio desde el motor
                            window.dispatchEvent(new CustomEvent('mico-alarm-triggered', {
                                detail: { label: clock.label, id: clock.id, alarmUrl: clock.alarmUrl }
                            }));
                        }
                    }
                    return updatedClock;
                }

                // Si NO está corriendo pero aún tiene un lastUpdateAt, lo limpiamos una vez
                if (clock.lastUpdateAt !== undefined) {
                    stateWasModified = true;
                    return { ...clock, lastUpdateAt: undefined };
                }

                return clock;
            });

            if (stateWasModified) {
                // Actualizar jerarquía completa para forzar re-render de React
                this.cache.settings = { 
                    ...this.cache.settings, 
                    clocks: newClocks 
                };
                window.dispatchEvent(new Event('mico-settings-updated'));
            }
        }, 100); 
    }
}

export const storageService = new PersistentStorageService();
