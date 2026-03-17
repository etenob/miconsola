const fs = require('fs');
const path = require('path');
const os = require('os');

function searchFile(dir, fileName) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        for (let file of list) {
            const fullPath = path.join(dir, file);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch (e) { continue; }
            
            if (stat.isDirectory()) {
                results = results.concat(searchFile(fullPath, fileName));
            } else if (file.toLowerCase().includes(fileName.toLowerCase())) {
                results.push(fullPath);
            }
        }
    } catch (e) {}
    return results;
}

console.log('--- INICIO DE BÚSQUEDA EXHAUSTIVA ---');
const searchTerms = ['Arbol', 'Vomitando'];
const startDirs = ['C:\\Datos', 'C:\\Users\\' + os.userInfo().username + '\\OneDrive', 'C:\\julian\\proyectos\\miconsola\\src\\assets'];

searchTerms.forEach(term => {
    startDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            console.log(`Buscando "${term}" en ${dir}...`);
            const found = searchFile(dir, term);
            found.forEach(f => console.log('¡ENCONTRADO!: ' + f));
        }
    });
});
console.log('--- FIN DE BÚSQUEDA ---');
