const fs = require('fs');
const path = require('path');
const os = require('os');

const settingsPath = path.join(os.homedir(), 'Documents', 'Miconsola_Data', 'Config', 'settings.json');
const newAudioPath = 'c:/julian/proyectos/miconsola/src/assets/Arbol - Vomitando flores.mp3';

try {
    if (fs.existsSync(settingsPath)) {
        const content = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(content);
        
        if (settings.clocks && settings.clocks.length > 0) {
            settings.clocks.forEach((clock) => {
                // Reset del Pomodoro si está en 0 o bloqueado
                if (clock.id === 'default-pomodoro') {
                    clock.currentMs = 45 * 60 * 1000;
                    clock.isRunning = false;
                    clock.lastUpdateAt = undefined;
                    clock.alarmUrl = newAudioPath;
                    console.log(`Reset clock ${clock.id} to 45:00 and updated audio.`);
                } else if (clock.isPinned) {
                    clock.alarmUrl = newAudioPath;
                    console.log(`Updated pinned clock ${clock.id} audio.`);
                }
            });
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            console.log("Settings successfully reset and updated.");
        } else {
            console.log("No clocks found.");
        }
    } else {
        console.log("Settings file not found.");
    }
} catch (error) {
    console.error("Error updating settings:", error);
}
