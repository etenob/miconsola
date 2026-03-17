import { app, BrowserWindow, shell, ipcMain, protocol, net, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { pathToFileURL } from 'url'
import Database from 'better-sqlite3'

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
            webviewTag: true,
            autoplayPolicy: 'no-user-gesture-required' // PERMITIR ALARMAS AUTOMÁTICAS
        }
    })

    mainWindow.on('ready-to-show', () => {
        // Cerramos el splash y mostramos la principal tras un breve delay visual
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close()
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.show()
            }
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

// --- DEFINICIÓN DE MÓDULOS DE ALMACENAMIENTO ---
const MODULES = {
    AGENTS: 'MisAgentes',
    NOTES: 'MisNotas',
    CONFIG: 'Config',
    DB: 'Database',
};

// --- CONFIGURACIÓN DE SQLITE 🗄️ ---
let db: Database.Database | null = null;
let dbError: string | null = null;

function setupSQLite() {
    console.log('MICO_SQLITE: Iniciando motor...');
    try {
        const baseDir = path.join(os.homedir(), 'Documents', 'Miconsola_Data');
        const dbDir = path.join(baseDir, MODULES.DB);
        
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        const dbPath = path.join(dbDir, 'mico.db');
        db = new Database(dbPath);
        console.log(`MICO_SQLITE: Base de datos abierta en -> ${dbPath}`);

        // Crear esquema inicial y tablas de chat
        db.exec(`
            CREATE TABLE IF NOT EXISTS SYSTEM_INFO (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT,
                last_connection DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conv_id TEXT,
                role TEXT,
                content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conv_id) REFERENCES conversations(id) ON DELETE CASCADE
            );
        `);

        // Insertar versión si no existe
        const info = db.prepare('SELECT id FROM SYSTEM_INFO WHERE id = 1').get();
        if (!info) {
            db.prepare('INSERT INTO SYSTEM_INFO (version) VALUES (?)').run('1.0.0-PRO_SQLITE');
        }
        dbError = null;

    } catch (err: any) {
        dbError = err.message;
        console.error('MICO_SQLITE_FATAL:', err);
    }
}

function registerSQLiteHandlers() {
    // Registrar Handlers de IPC para DB (Siempre registrados)
    ipcMain.handle('db:query', async (_, sql: string, params: any[] = []) => {
        if (!db) return { success: false, error: dbError || 'Database not initialized' };
        try {
            const stmt = db.prepare(sql);
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
                const rows = stmt.all(...params);
                return { success: true, rows };
            } else {
                const info = stmt.run(...params);
                return { success: true, changes: info.changes };
            }
        } catch (err: any) {
            console.error(`MICO_SQLITE_ERROR: ${err.message}`);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('db:status', async () => {
        if (!db) return { connected: false, error: dbError };
        try {
            const info: any = db.prepare('SELECT version FROM SYSTEM_INFO WHERE id = 1').get();
            return { connected: true, version: info.version };
        } catch (err: any) {
            return { connected: false, error: err.message };
        }
    });
}

// --- CONFIGURACIÓN DE FILE SYSTEM (TRUE OS STORAGE) ---
function setupIPC() {
    const baseDir = path.join(os.homedir(), 'Documents', 'Miconsola_Data');

    // Módulo de ayuda para rutas
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
        return result.filePaths[0];
    });
}

// -----------------------------------------------------

app.whenReady().then(() => {
    registerSQLiteHandlers() // Registrar canales IPC siempre
    setupSQLite() // Intentar abrir DB
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
