
const os = require('os');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(os.homedir(), 'Documents', 'Miconsola_Data', 'MisNotas');

if (fs.existsSync(baseDir)) {
    const files = fs.readdirSync(baseDir);
    files.forEach(file => {
        if (file.endsWith('.md')) {
            const raw = fs.readFileSync(path.join(baseDir, file), 'utf-8');
            try {
                const note = JSON.parse(raw);
                console.log(`TITLE: ${note.title}`);
                console.log(`CONTENT: ${note.content}`);
                console.log('-------------------');
            } catch(e) {
                console.log(`RAW FILE ${file}: ${raw}`);
            }
        }
    });
}
