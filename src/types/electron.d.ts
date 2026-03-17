export interface ElectronAPI {
    send: (channel: string, data: any) => void;
    receive: (channel: string, func: (...args: any[]) => void) => void;
    fs: {
        saveData: (module: string, filename: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        readData: (module: string, filename: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        readDir: (module: string) => Promise<{ success: boolean; files?: string[]; error?: string }>;
        deleteFile: (module: string, filename: string) => Promise<{ success: boolean; error?: string }>;
    }
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
