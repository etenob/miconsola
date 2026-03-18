
const os = require('os');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(os.homedir(), 'Documents', 'Miconsola_Data', 'MisNotas');

if (fs.existsSync(baseDir)) {
    const files = fs.readdirSync(baseDir);
    console.log(`Files in ${baseDir}:`);
    files.forEach(file => {
        if (file.endsWith('.md')) {
            const content = fs.readFileSync(path.join(baseDir, file), 'utf-8');
            console.log(`--- ${file} ---`);
            console.log(content);
        }
    });
} else {
    console.log(`Directory not found: ${baseDir}`);
}
