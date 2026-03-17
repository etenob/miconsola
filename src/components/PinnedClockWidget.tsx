import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Globe, Hourglass, Bell } from 'lucide-react';
import { storageService, type MicoClock } from '../services/storageService';

const PinnedClockWidget: React.FC = () => {
    const [pinnedClock, setPinnedClock] = useState<MicoClock | null>(null);
    const [worldTime, setWorldTime] = useState<string>('--:--');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Sincronizar con el storage (Motor Maestro) - Simple y limpio
    useEffect(() => {
        const sync = () => {
            const settings = storageService.getSettings();
            const pinned = settings.clocks?.find(c => c.isPinned) || null;
            // ELIMINADO: stopAlarm() aquí causaba AbortError cada 100ms
            setPinnedClock(pinned);
        };
        sync();
        window.addEventListener('mico-settings-updated', sync);
        window.addEventListener('mico-storage-ready', sync);
        return () => {
            window.removeEventListener('mico-settings-updated', sync);
            window.removeEventListener('mico-storage-ready', sync);
        };
    }, []);

    // Escuchar disparos de alarma del motor central
    useEffect(() => {
        const handleAlarm = (e: any) => {
            const { alarmUrl } = e.detail || {};
            if (alarmUrl) playAlarmUrl(alarmUrl);
        };
        const handleStop = () => stopAlarm();
        window.addEventListener('mico-alarm-triggered' as any, handleAlarm);
        window.addEventListener('mico-stop-alarm' as any, handleStop);
        return () => {
            window.removeEventListener('mico-alarm-triggered' as any, handleAlarm);
            window.removeEventListener('mico-stop-alarm' as any, handleStop);
        };
    }, []);

    // Motor de Tiempo Real para Relojes Mundiales (Independiente)
    useEffect(() => {
        if (pinnedClock?.type !== 'world_clock') return;
        const update = () => {
            try {
                const options: Intl.DateTimeFormatOptions = {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false, timeZone: String(pinnedClock.value) || 'UTC'
                };
                setWorldTime(new Intl.DateTimeFormat('en-GB', options).format(new Date()));
            } catch { setWorldTime('Error TZ'); }
        };
        update();
        const itv = setInterval(update, 1000);
        return () => clearInterval(itv);
    }, [pinnedClock?.id, pinnedClock?.value]);

    const playAlarmUrl = (alarmUrl: string) => {
        try {
            stopAlarm();
            let rawPath = alarmUrl.replace(/^file:\/+/i, '');
            const cleanPath = rawPath.replace(/\\/g, '/');
            const url = `mico-media:///${cleanPath}`;
            
            const audio = new Audio(url);
            audio.loop = true; // Alarmas infinitas hasta que se detengan
            audioRef.current = audio;
            
            // Usar promesa para evitar AbortError si se pausa rápido
            audio.play().catch(e => {
                if (e.name !== 'AbortError') {
                    console.error('MICO_AUDIO: ❌ Error real:', e);
                }
            });
        } catch (e) { console.error('Alarm error', e); }
    };

    const stopAlarm = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
    };

    const toggle = () => {
        if (!pinnedClock) return;
        const settings = storageService.getSettings();
        const newClocks = settings.clocks.map(c => 
            c.id === pinnedClock.id ? { ...c, isRunning: !c.isRunning, lastUpdateAt: Date.now() } : c
        );
        storageService.saveSettings({ clocks: newClocks });
    };

    const reset = () => {
        if (!pinnedClock) return;
        stopAlarm();
        const settings = storageService.getSettings();
        
        // Calcular tiempo inicial desde .value (MM:SS)
        let initialMs = 0;
        const val = String(pinnedClock.value);
        if (val.includes(':')) {
            const [m, s] = val.split(':').map(Number);
            initialMs = ((m || 0) * 60 + (s || 0)) * 1000;
        } else {
            initialMs = (Number(val) || 0) * 60 * 1000;
        }

        const newClocks = settings.clocks.map(c => 
            c.id === pinnedClock.id ? { ...c, isRunning: false, currentMs: initialMs, lastUpdateAt: undefined } : c
        );
        storageService.saveSettings({ clocks: newClocks });
    };

    if (!pinnedClock) return null;

    const formatTime = (totalMs: number) => {
        const h = Math.floor(totalMs / 3600000);
        const m = Math.floor((totalMs % 3600000) / 60000);
        const s = Math.floor((totalMs % 60000) / 1000);
        const ms = Math.floor((totalMs % 1000) / 10);
        
        const base = h > 0 
            ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        
        return (
            <span className="flex items-baseline tabular-nums">
                {base}
                <span className="text-[9px] opacity-20 ml-0.5 font-normal tracking-tighter">.{String(ms).padStart(2, '0')}</span>
            </span>
        );
    };

    return (
        <div key={pinnedClock.id} className="flex items-center animate-in zoom-in-95 duration-300">
            {pinnedClock.type === 'timer' && (
                <div className="flex items-center gap-2 bg-black/40 pl-3 pr-2 py-1.5 rounded-full border border-teal-500/20 group transition-all" title={pinnedClock.label}>
                    <Timer className={`w-3.5 h-3.5 ${pinnedClock.isRunning ? 'text-teal-400 animate-pulse' : 'text-gray-500 hover:text-teal-400/50'}`} />
                    <span className={`text-[12px] font-mono tracking-widest font-bold ${pinnedClock.isRunning ? 'text-teal-400' : 'text-gray-400 group-hover:text-gray-300'}`}>
                        {formatTime(pinnedClock.currentMs || 0)}
                    </span>
                    <div className="flex items-center gap-1 ml-2 opacity-20 group-hover:opacity-100 transition-opacity">
                        <button onClick={toggle} className={`p-1 rounded-md transition-colors ${pinnedClock.isRunning ? 'text-amber-400 hover:bg-amber-400/20' : 'text-emerald-400 hover:bg-emerald-400/20'}`}>
                            {pinnedClock.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={reset} className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {pinnedClock.type === 'stopwatch' && (
                <div className="flex items-center gap-2 bg-black/40 pl-3 pr-2 py-1.5 rounded-full border border-amber-500/20 group transition-all" title={pinnedClock.label}>
                    <Hourglass className={`w-3.5 h-3.5 ${pinnedClock.isRunning ? 'text-amber-400 animate-spin-slow' : 'text-gray-500'}`} />
                    <span className={`text-[12px] font-mono tracking-widest font-bold ${pinnedClock.isRunning ? 'text-amber-400' : 'text-gray-400 group-hover:text-amber-300'}`}>
                        {formatTime(pinnedClock.currentMs || 0)}
                    </span>
                    <div className="flex items-center gap-1 ml-2 opacity-20 group-hover:opacity-100 transition-opacity">
                        <button onClick={toggle} className="p-1 rounded-md text-amber-400 hover:bg-amber-400/20 transition-colors">
                            {pinnedClock.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={reset} className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {pinnedClock.type === 'alarm' && (
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-rose-500/20 group transition-all" title={pinnedClock.label}>
                    <Bell className={`w-3.5 h-3.5 ${pinnedClock.isRunning ? 'text-rose-400 animate-pulse' : 'text-gray-500'}`} />
                    <span className={`text-[12px] font-mono tracking-widest font-bold ${pinnedClock.isRunning ? 'text-rose-400' : 'text-gray-400'}`}>
                        {String(pinnedClock.value)}
                    </span>
                    <div className="flex items-center gap-1 ml-2 opacity-20 group-hover:opacity-100 transition-opacity">
                        <button onClick={toggle} className="p-1 rounded-md text-rose-400 hover:bg-rose-400/20 transition-colors">
                            {pinnedClock.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            )}

            {pinnedClock.type === 'world_clock' && (
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-purple-500/20 group hover:border-purple-500/30 transition-all" title={`${pinnedClock.label} (${pinnedClock.value})`}>
                    <Globe className="w-3.5 h-3.5 text-purple-400/70 group-hover:text-purple-400 group-hover:rotate-12 transition-transform" />
                    <span className="text-[12px] font-mono tracking-widest font-bold text-gray-300 group-hover:text-purple-300">
                        {worldTime}
                    </span>
                    <span className="text-[9px] font-mono text-purple-500/50 uppercase ml-1 group-hover:text-purple-400/70 transition-colors">
                        {String(pinnedClock.value).split('/').pop()?.replace('_', ' ')}
                    </span>
                </div>
            )}
        </div>
    );
};

export default PinnedClockWidget;
