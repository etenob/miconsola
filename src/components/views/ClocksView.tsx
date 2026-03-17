import React, { useState, useEffect } from 'react';
import { Timer, Globe, Pin, Music, Trash2, Clock, Hourglass, Play, Pause, RotateCcw, ExternalLink, Bell } from 'lucide-react';
import { storageService, type MicoClock, type ClockType } from '../../services/storageService';

const ClocksView: React.FC = () => {
    const [clocks, setClocks] = useState<MicoClock[]>([]);

    // Cargar relojes al montar y cuando el storage emita cambios
    useEffect(() => {
        const loadClocks = () => {
            const settings = storageService.getSettings();
            setClocks(settings.clocks || []);
        };
        loadClocks();
        window.addEventListener('mico-settings-updated', loadClocks);
        return () => window.removeEventListener('mico-settings-updated', loadClocks);
    }, []);

    const updateClock = (id: string, updates: Partial<MicoClock>) => {
        const settings = storageService.getSettings();
        const newClocks = settings.clocks.map((c: MicoClock) => c.id === id ? { ...c, ...updates } : c);
        setClocks(newClocks);
        storageService.saveSettings({ clocks: newClocks }); // Auto-Save
    };

    const handlePin = (id: string) => {
        const settings = storageService.getSettings();
        const newClocks = settings.clocks.map((c: MicoClock) => ({
            ...c,
            isPinned: c.id === id
        }));
        setClocks(newClocks);
        storageService.saveSettings({ clocks: newClocks }); // Auto-Save
    };

    const handleAddClock = (type: ClockType) => {
        const newClock: MicoClock = {
            id: `${type}_${Date.now()}`,
            type: type,
            label: `Nuevo ${type === 'timer' ? 'Temporizador' : type === 'stopwatch' ? 'Cronómetro' : type === 'alarm' ? 'Alarma' : 'Reloj'}`,
            value: type === 'timer' ? '15:00' : type === 'world_clock' ? 'UTC' : type === 'alarm' ? '08:00' : '00:00',
            currentMs: type === 'timer' ? 15 * 60 * 1000 : 0,
            isRunning: false,
            isPinned: clocks.length === 0 
        };
        const settings = storageService.getSettings();
        const newClocks = [...settings.clocks, newClock];
        setClocks(newClocks);
        storageService.saveSettings({ clocks: newClocks }); 
    };

    const handleDeleteClock = (id: string) => {
        const settings = storageService.getSettings();
        const newClocks = settings.clocks.filter((c: MicoClock) => c.id !== id);
        setClocks(newClocks);
        storageService.saveSettings({ clocks: newClocks });
    };

    const getIcon = (type: ClockType) => {
        switch (type) {
            case 'timer': return <Timer className="w-4 h-4" />;
            case 'stopwatch': return <Hourglass className="w-4 h-4" />;
            case 'alarm': return <Bell className="w-4 h-4" />;
            case 'world_clock': return <Globe className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 font-mono tracking-tight">
                        <Clock className="w-6 h-6 text-teal-400" /> Centro de Tiempo
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Sincronización Global en 2do Plano (MM:SS)</p>
                </div>
                
                <div className="flex gap-2">
                    <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
                        {[
                            { type: 'timer', icon: <Timer className="w-4 h-4" />, label: 'Timer', color: 'text-teal-400' },
                            { type: 'stopwatch', icon: <Hourglass className="w-4 h-4" />, label: 'Crono', color: 'text-amber-400' },
                            { type: 'alarm', icon: <Bell className="w-4 h-4" />, label: 'Alarma', color: 'text-rose-400' },
                            { type: 'world_clock', icon: <Globe className="w-4 h-4" />, label: 'Global', color: 'text-purple-400' }
                        ].map((item) => (
                            <button 
                                key={item.type}
                                onClick={() => handleAddClock(item.type as ClockType)} 
                                className={`p-2.5 px-4 hover:bg-white/5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mx-0.5 ${item.color} border border-transparent hover:border-white/10`}
                            >
                                {item.icon} <span className="hidden lg:inline">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>
            
            <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="p-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest pl-8 w-12">PIN</th>
                            <th className="p-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest w-12 text-center">TIPO</th>
                            <th className="p-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest pl-6">ETIQUETA</th>
                            <th className="p-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest w-32 text-center">CONFIG (MM:SS)</th>
                            <th className="p-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest w-40 text-center text-teal-500/50">TIEMPO REAL</th>
                            <th className="p-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">CONTROL / AUDIO</th>
                            <th className="p-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest w-20 text-right pr-8">FIN</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {clocks.map((clock: MicoClock) => {
                            const formatTime = (totalMs: number) => {
                                const h = Math.floor(totalMs / 3600000);
                                const m = Math.floor((totalMs % 3600000) / 60000);
                                const s = Math.floor((totalMs % 60000) / 1000);
                                const ms = Math.floor((totalMs % 1000) / 10);
                                const base = h > 0 
                                    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                                    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                                return (
                                    <span className="flex items-baseline justify-center tabular-nums">
                                        {base}
                                        <span className="text-[9px] opacity-20 ml-0.5 font-normal tracking-tighter">.{String(ms).padStart(2, '0')}</span>
                                    </span>
                                );
                            };

                            return (
                                <tr key={clock.id} className={`group transition-colors hover:bg-white/[0.02] ${clock.isPinned ? 'bg-teal-400/[0.05]' : ''}`}>
                                    <td className="p-4 pl-8">
                                        <button onClick={() => handlePin(clock.id)} title="Fijar en barra">
                                            <Pin className={`w-4 h-4 ${clock.isPinned ? 'text-teal-400 fill-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]' : 'text-gray-700 hover:text-white'}`} />
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className={`p-2 rounded-lg ${
                                            clock.type === 'timer' ? 'text-teal-400' : 
                                            clock.type === 'stopwatch' ? 'text-amber-400' : 
                                            clock.type === 'alarm' ? 'text-rose-400' : 'text-purple-400'
                                        }`}>
                                            {getIcon(clock.type)}
                                        </div>
                                    </td>
                                    <td className="p-4 pl-6">
                                        <input 
                                            type="text"
                                            value={clock.label}
                                            onChange={(e) => updateClock(clock.id, { label: e.target.value })}
                                            className="bg-transparent border-none p-0 text-xs font-bold text-white tracking-tight focus:outline-none w-full"
                                        />
                                    </td>
                                    <td className="p-4 text-center">
                                        {clock.type === 'stopwatch' ? (
                                            <div className="text-[9px] font-mono text-gray-700 uppercase italic">Base: 00:00</div>
                                        ) : clock.type === 'world_clock' ? (
                                            <select
                                                value={clock.value}
                                                onChange={(e) => updateClock(clock.id, { value: e.target.value })}
                                                className="bg-[#1a1c23] border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono text-teal-400 focus:border-purple-500/50 focus:outline-none shadow-xl w-44 cursor-pointer appearance-none"
                                                style={{ colorScheme: 'dark' }}
                                            >
                                                <optgroup label="🇦🇷 Argentina" className="bg-[#1a1c23] text-gray-500">
                                                    <option value="America/Argentina/Buenos_Aires" className="bg-[#0d0f14] text-white">Buenos Aires</option>
                                                    <option value="America/Argentina/Cordoba" className="bg-[#0d0f14] text-white">Córdoba</option>
                                                    <option value="America/Argentina/Mendoza" className="bg-[#0d0f14] text-white">Mendoza</option>
                                                </optgroup>
                                                <optgroup label="🌎 Latinoamérica" className="bg-[#1a1c23] text-gray-500">
                                                    <option value="America/Santiago" className="bg-[#0d0f14] text-white">Santiago (Chile)</option>
                                                    <option value="America/Sao_Paulo" className="bg-[#0d0f14] text-white">São Paulo (Brasil)</option>
                                                    <option value="America/Montevideo" className="bg-[#0d0f14] text-white">Montevideo (Uruguay)</option>
                                                    <option value="America/La_Paz" className="bg-[#0d0f14] text-white">La Paz (Bolivia)</option>
                                                    <option value="America/Lima" className="bg-[#0d0f14] text-white">Lima (Perú)</option>
                                                    <option value="America/Bogota" className="bg-[#0d0f14] text-white">Bogotá (Colombia)</option>
                                                    <option value="America/Mexico_City" className="bg-[#0d0f14] text-white">Ciudad de México</option>
                                                    <option value="America/Caracas" className="bg-[#0d0f14] text-white">Caracas (Venezuela)</option>
                                                    <option value="America/Panama" className="bg-[#0d0f14] text-white">Panamá</option>
                                                </optgroup>
                                                <optgroup label="🇺🇸 Estados Unidos" className="bg-[#1a1c23] text-gray-500">
                                                    <option value="America/New_York" className="bg-[#0d0f14] text-white">Nueva York (ET)</option>
                                                    <option value="America/Chicago" className="bg-[#0d0f14] text-white">Chicago (CT)</option>
                                                    <option value="America/Denver" className="bg-[#0d0f14] text-white">Denver (MT)</option>
                                                    <option value="America/Los_Angeles" className="bg-[#0d0f14] text-white">Los Angeles (PT)</option>
                                                </optgroup>
                                                <optgroup label="🌍 Europa" className="bg-[#1a1c23] text-gray-500">
                                                    <option value="Europe/Madrid" className="bg-[#0d0f14] text-white">Madrid / Barcelona</option>
                                                    <option value="Europe/London" className="bg-[#0d0f14] text-white">Londres (GMT)</option>
                                                    <option value="Europe/Paris" className="bg-[#0d0f14] text-white">París</option>
                                                    <option value="Europe/Berlin" className="bg-[#0d0f14] text-white">Berlín</option>
                                                    <option value="Europe/Moscow" className="bg-[#0d0f14] text-white">Moscú</option>
                                                </optgroup>
                                                <optgroup label="🌏 Asia / Oceanía" className="bg-[#1a1c23] text-gray-500">
                                                    <option value="Asia/Tokyo" className="bg-[#0d0f14] text-white">Tokio</option>
                                                    <option value="Asia/Shanghai" className="bg-[#0d0f14] text-white">Shanghái</option>
                                                    <option value="Asia/Dubai" className="bg-[#0d0f14] text-white">Dubái</option>
                                                    <option value="Asia/Kolkata" className="bg-[#0d0f14] text-white">Mumbai / Delhi</option>
                                                    <option value="Australia/Sydney" className="bg-[#0d0f14] text-white">Sydney</option>
                                                </optgroup>
                                                <optgroup label="🌐 Global" className="bg-[#1a1c23] text-gray-500">
                                                    <option value="UTC" className="bg-[#0d0f14] text-white">UTC</option>
                                                </optgroup>
                                            </select>
                                        ) : (
                                            <input 
                                                type={clock.type === 'alarm' ? "time" : "text"}
                                                placeholder={clock.type === 'timer' ? "MM:SS" : ""}
                                                value={clock.value}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    let ms = clock.currentMs;
                                                    if (clock.type === 'timer' && newVal.includes(':')) {
                                                        const [m, s] = newVal.split(':').map(Number);
                                                        ms = ((m || 0) * 60 + (s || 0)) * 1000;
                                                    }
                                                    updateClock(clock.id, { value: newVal, currentMs: ms });
                                                }}
                                                className={`bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-center font-mono text-gray-400 focus:border-teal-500/50 focus:outline-none shadow-inner ${clock.type === 'alarm' ? 'w-24' : 'w-20'}`}
                                            />
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {clock.type === 'alarm' ? (
                                            <div className={`font-mono text-sm tracking-wider ${clock.isRunning ? 'text-rose-400' : 'text-gray-600'}`}>
                                                {clock.value}
                                            </div>
                                        ) : clock.type !== 'world_clock' ? (
                                            <div className={`font-mono text-sm tracking-wider ${clock.isRunning ? 'text-teal-400' : 'text-gray-600'}`}>
                                                {formatTime(clock.currentMs || 0)}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-mono text-purple-400/50 uppercase">En vivo</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {clock.type !== 'world_clock' && (
                                                <div className="flex gap-1 bg-black/20 p-0.5 rounded-lg border border-white/5 flex-shrink-0">
                                                    <button 
                                                        onClick={() => updateClock(clock.id, { isRunning: !clock.isRunning, lastUpdateAt: Date.now() })}
                                                        className={`p-1 rounded transition-colors ${clock.isRunning ? 'text-amber-400 hover:bg-amber-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                                                    >
                                                        {clock.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            let ms = 0;
                                                            if (clock.type === 'timer') {
                                                                const parts = String(clock.value).split(':');
                                                                ms = ((parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)) * 1000;
                                                            }
                                                            updateClock(clock.id, { isRunning: false, currentMs: ms, lastUpdateAt: undefined });
                                                        }}
                                                        className="p-1 rounded text-gray-600 hover:text-white hover:bg-white/5 transition-colors"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <button 
                                                    onClick={() => window.dispatchEvent(new CustomEvent('mico-open-bubble', { detail: { clockId: clock.id } }))}
                                                    className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-gray-500 hover:text-teal-400 hover:border-teal-400/30 transition-all flex-shrink-0"
                                                    title="Lanzar Burbuja Flotante"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </button>

                                                {clock.type !== 'world_clock' && clock.type !== 'stopwatch' && (
                                                    <>
                                                        <button 
                                                            onClick={async () => {
                                                                const filePath = await (window as any).electronAPI.ui.selectFile();
                                                                if (filePath) updateClock(clock.id, { alarmUrl: filePath });
                                                            }}
                                                            className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-500 hover:text-purple-400 hover:border-purple-500/30 transition-all flex-1 min-w-0"
                                                            title={clock.alarmUrl || "Configurar Audio"}
                                                        >
                                                            <Music className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate text-[9px]">
                                                                {clock.alarmUrl ? clock.alarmUrl.split(/[/\\]/).pop() : "-- Audio --"}
                                                            </span>
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                if (!clock.alarmUrl) return;
                                                                const cleanPath = clock.alarmUrl.replace(/\\/g, '/');
                                                                const url = `mico-media:///${cleanPath}`;
                                                                window.dispatchEvent(new CustomEvent('mico-alarm-triggered', { 
                                                                    detail: { label: `TEST: ${clock.label}`, id: clock.id, alarmUrl: clock.alarmUrl } 
                                                                }));
                                                            }}
                                                            className={`p-1.5 rounded-lg border border-white/5 transition-all flex-shrink-0 ${clock.alarmUrl ? 'text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/30' : 'text-gray-800 pointer-events-none'}`}
                                                            title="Probar Sonido"
                                                        >
                                                            <Play className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                )}
                                                
                                                { (clock.type === 'world_clock' || clock.type === 'stopwatch') && (
                                                    <div className="flex-1 text-[9px] text-gray-700 font-mono uppercase italic px-2">Sin Audio</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right pr-8">
                                        {!clock.isPinned && (
                                            <button onClick={() => handleDeleteClock(clock.id)} className="p-2 text-gray-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all" title="Eliminar Reloj">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClocksView;
