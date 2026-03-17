import fs from 'fs';
import path from 'path';
import os from 'os';

const settingsPath = path.join(os.homedir(), 'Documents', 'Miconsola_Data', 'Config', 'settings.json');
const newAudioPath = 'c:/julian/proyectos/miconsola/src/assets/Arbol - Vomitando flores.mp3';

try {
    if (fs.existsSync(settingsPath)) {
        const content = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(content);
        
        if (settings.clocks && settings.clocks.length > 0) {
            settings.clocks.forEach((clock: any) => {
                if (clock.isPinned) {
                    clock.alarmUrl = newAudioPath;
                    console.log(`Updated clock ${clock.id} with new alarmUrl: ${newAudioPath}`);
                }
            });
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            console.log("Settings updated successfully.");
        } else {
            console.log("No clocks found in settings.");
        }
    } else {
        console.log("Settings file not found.");
    }
} catch (error) {
    console.error("Error updating settings:", error);
}
