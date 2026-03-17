const { URL } = require('url');
const path = require('path');
const fs = require('fs');

const rawUrl = 'mico-media://local-file/C:/Datos/Arbol-VomitandoFlores.mp3';
console.log('--- TEST DE PROTOCOLO ---');
console.log('Original:', rawUrl);

try {
    const parsed = new URL(rawUrl);
    console.log('Pathname Original:', parsed.pathname);
    
    let finalPath = decodeURIComponent(parsed.pathname);
    console.log('Pathname Decoded:', finalPath);
    
    if (process.platform === 'win32') {
        if (finalPath.startsWith('/') && finalPath.match(/^\/[a-zA-Z]:/)) {
            finalPath = finalPath.substring(1);
        }
    }
    
    const normalized = path.normalize(finalPath);
    console.log('Final Path Normalized:', normalized);
    
    // Test de existencia (esto fallará en mi entorno pero me sirve para ver la lógica)
    console.log('¿Existe?:', fs.existsSync(normalized));

} catch (e) {
    console.error('Error:', e);
}
