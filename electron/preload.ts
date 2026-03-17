import { contextBridge, ipcRenderer } from 'electron'

// Exponemos una API segura que los paneles de React (WebView) podrán consumir
contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel: string, data: any) => {
        ipcRenderer.send(channel, data)
    },
    receive: (channel: string, func: (...args: any[]) => void) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args))
    },
    fs: {
        saveData: (module: string, filename: string, content: string) => 
            ipcRenderer.invoke('fs:saveData', module, filename, content),
        readData: (module: string, filename: string) => 
            ipcRenderer.invoke('fs:readData', module, filename),
        readDir: (module: string) => 
            ipcRenderer.invoke('fs:readDir', module),
        deleteFile: (module: string, filename: string) => 
            ipcRenderer.invoke('fs:deleteFile', module, filename)
    },
    ui: {
        selectFile: () => ipcRenderer.invoke('os:selectFile')
    },
    sqlite: {
        query: (sql: string, params: any[] = []) => ipcRenderer.invoke('db:query', sql, params),
        status: () => ipcRenderer.invoke('db:status')
    }
})
