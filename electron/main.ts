import { app, BrowserWindow, shell, ipcMain, protocol, net, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { pathToFileURL } from 'url'

// Desactiva advertencias de seguridad en desarrollo
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Registrar esquema mico-media al inicio de la app para que Chrome permita cargar recursos locales
protocol.registerSchemesAsPrivileged([
    { scheme: 'mico-media', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, corsEnabled: true } }
])

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 450,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        center: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    // En desarrollo y producción cargamos desde la raíz del proyecto
    splashWindow.loadFile(path.join(__dirname, '../splash.html'))
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        frame: true,
        show: false, // Se oculta inicialmente
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            autoplayPolicy: 'no-user-gesture-required' // PERMITIR ALARMAS AUTOMÁTICAS
        }
    })

    mainWindow.on('ready-to-show', () => {
        // Cerramos el splash y mostramos la principal tras un breve delay visual
        setTimeout(() => {
            splashWindow?.close()
            mainWindow?.show()
        }, 2500)
    })

    // Permite abrir enlaces externos en el navegador por defecto
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // Carga de la aplicación (URL en desarrollo, archivo en producción)
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

// Auxiliar para detectar tipos de archivos (MIME Types) de forma robusta
function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg'
    };
    return map[ext] || 'application/octet-stream';
}

// --- CONFIGURACIÓN DE FILTRADO DE MEDIA LOCAL (Bypass Seguridad) ---
function setupProtocols() {
    protocol.handle('mico-media', async (request) => {
        try {
            const rawUrl = request.url;
            console.log(`[MICO_PROTOCOL] Inbound: ${rawUrl}`);
            
            // Extracción manual limpia: quitar mico-media:// y mico-media:///
            let urlPath = rawUrl.replace(/^mico-media:[\/]+/, '');
            urlPath = decodeURIComponent(urlPath);
            
            // Quitar host si Chrome lo inyectó (mico-media://local-file/...)
            if (urlPath.startsWith('local-file/')) {
                urlPath = urlPath.replace('local-file/', '');
            }

            let finalPath = urlPath;
            // Saneamiento para Windows
            if (process.platform === 'win32') {
                // Caso 1: /C:/Datos -> C:/Datos
                if (finalPath.startsWith('/') && finalPath.match(/^\/[a-zA-Z]:/)) {
                    finalPath = finalPath.slice(1);
                }
                // Caso 2: C/Datos -> C:/Datos
                else if (finalPath.length > 1 && finalPath[1] !== ':' && finalPath[1] === '/' && finalPath[0].match(/[a-zA-Z]/)) {
                    finalPath = finalPath[0].toUpperCase() + ":" + finalPath.slice(1);
                }
            }

            finalPath = path.normalize(finalPath);
            console.log(`[MICO_PROTOCOL] Resolved: ${finalPath}`);

            if (!fs.existsSync(finalPath)) {
                return new Response("Not Found", { status: 404 });
            }

            // CARGA CRÍTICA: Debemos inyectar MIME Type y Content-Length para que Chrome acepte el audio
            const fileUrl = pathToFileURL(finalPath).toString();
            const response = await net.fetch(fileUrl);
            const contentType = getMimeType(finalPath);
            const stats = fs.statSync(finalPath);

            return new Response(response.body, {
                status: response.status,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': stats.size.toString(),
                    'Accept-Ranges': 'bytes',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        } catch (error: any) {
            console.error("[MICO_PROTOCOL] Error:", error);
            return new Response(error.message, { status: 500 });
        }
    });
}

// --- CONFIGURACIÓN DE FILE SYSTEM (TRUE OS STORAGE) ---
function setupIPC() {
    const baseDir = path.join(os.homedir(), 'Documents', 'Miconsola_Data');

    // Módulos base
    const getModulePath = (module: string) => path.join(baseDir, module);

    ipcMain.handle('fs:saveData', async (_, module: string, filename: string, content: string) => {
        try {
            const dir = getModulePath(module);
            await fs.promises.mkdir(dir, { recursive: true });
            const filePath = path.join(dir, filename);
            await fs.promises.writeFile(filePath, content, 'utf-8');
            return { success: true, path: filePath };
        } catch (error: any) {
            console.error('IPC Save Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('fs:readData', async (_, module: string, filename: string) => {
        try {
            const filePath = path.join(getModulePath(module), filename);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return { success: true, content };
        } catch (error: any) {
            if (error.code !== 'ENOENT') console.error('IPC Read Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('fs:readDir', async (_, module: string) => {
        try {
            const dir = getModulePath(module);
            await fs.promises.mkdir(dir, { recursive: true });
            const files = await fs.promises.readdir(dir);
            return { success: true, files };
        } catch (error: any) {
            console.error('IPC ReadDir Error:', error);
            return { success: false, error: error.message, files: [] };
        }
    });

    ipcMain.handle('fs:deleteFile', async (_, module: string, filename: string) => {
        try {
            const filePath = path.join(getModulePath(module), filename);
            await fs.promises.unlink(filePath);
            return { success: true };
        } catch (error: any) {
            console.error('IPC Delete Error:', error);
            return { success: false, error: error.message };
        }
    });

    // --- DIÁLOGOS NATIVOS ---
    ipcMain.handle('os:selectFile', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            title: 'Seleccionar Alarma Sonora',
            filters: [
                { name: 'Media (MP3, MP4, WAV, AAC)', extensions: ['mp3', 'mp4', 'wav', 'm4a', 'aac'] },
                { name: 'Todos los archivos', extensions: ['*'] }
            ]
        });
        if (result.canceled) return null;
        console.log("MICO_OS: File selected ->", result.filePaths[0]);
        return result.filePaths[0]; // C:\ruta\archivo.mp3
    });
}

// -----------------------------------------------------

app.whenReady().then(() => {
    setupProtocols()
    setupIPC()
    createSplashWindow()
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
