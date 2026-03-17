import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Move } from 'lucide-react';
import { storageService, type MicoClock } from '../services/storageService';

interface FloatingBubbleProps {
    clockId: string;
    onClose: () => void;
    onFocus?: () => void;
    zIndex?: number;
}

const FloatingClockBubble: React.FC<FloatingBubbleProps> = ({ clockId, onClose, onFocus, zIndex = 5000 }) => {
    const [clock, setClock] = useState<MicoClock | null>(null);
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [worldTime, setWorldTime] = useState<string>('--:--');
    const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

    // Sync logic
    useEffect(() => {
        const sync = () => {
            const settings = storageService.getSettings();
            const found = settings.clocks?.find(c => c.id === clockId) || null;
            setClock(found);
        };
        sync();
        window.addEventListener('mico-settings-updated', sync);
        return () => window.removeEventListener('mico-settings-updated', sync);
    }, [clockId]);

    // Motor de Tiempo Real para Relojes Mundiales en Burbuja
    useEffect(() => {
        if (clock?.type !== 'world_clock') return;
        const update = () => {
            try {
                const options: Intl.DateTimeFormatOptions = {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false, timeZone: String(clock.value) || 'UTC'
                };
                setWorldTime(new Intl.DateTimeFormat('en-GB', options).format(new Date()));
            } catch { setWorldTime('Error TZ'); }
        };
        update();
        const itv = setInterval(update, 1000);
        return () => clearInterval(itv);
    }, [clock?.id, clock?.value, clock?.type]);

    // Drag and Drop Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        onFocus?.();
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: position.x,
            initialY: position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragRef.current) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            setPosition({
                x: dragRef.current.initialX + dx,
                y: dragRef.current.initialY + dy
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!clock) return null;

    const formatDisplay = () => {
        if (!clock) return '';
        if (clock.type === 'world_clock') return worldTime;
        if (clock.type === 'alarm') return String(clock.value);
        
        const totalMs = clock.currentMs || 0;
        const h = Math.floor(totalMs / 3600000);
        const m = Math.floor((totalMs % 3600000) / 60000);
        const s = Math.floor((totalMs % 60000) / 1000);
        
        return h > 0 
            ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const settings = storageService.getSettings();
        const newClocks = settings.clocks.map(c => 
            c.id === clock.id ? { ...c, isRunning: !c.isRunning, lastUpdateAt: Date.now() } : c
        );
        storageService.saveSettings({ clocks: newClocks });
    };

    const reset = (e: React.MouseEvent) => {
        e.stopPropagation();
        let initialMs = 0;
        const val = String(clock.value);
        if (val.includes(':')) {
            const [m, s] = val.split(':').map(Number);
            initialMs = ((m || 0) * 60 + (s || 0)) * 1000;
        } else {
            initialMs = (Number(val) || 0) * 60 * 1000;
        }
        const settings = storageService.getSettings();
        const newClocks = settings.clocks.map(c => 
            c.id === clock.id ? { ...c, isRunning: false, currentMs: initialMs, lastUpdateAt: undefined } : c
        );
        storageService.saveSettings({ clocks: newClocks });
    };

    return (
        <div 
            className={`fixed group ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
            style={{ left: position.x, top: position.y, zIndex, pointerEvents: 'auto' }}
            onMouseDown={handleMouseDown}
        >
            {/* Glow Aura */}
            <div className={`absolute inset-[-10px] rounded-full blur-xl transition-all duration-500 opacity-20 ${clock.isRunning ? 'bg-teal-500 animate-pulse' : 'bg-white/10'}`} />

            {/* Main Bubble */}
            <div className="relative w-28 h-28 rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 flex flex-col items-center justify-center shadow-2xl overflow-hidden transition-transform duration-300 hover:scale-110">
                {/* Drag Handle Overlay */}
                <div className="absolute top-2 opacity-0 group-hover:opacity-40 transition-opacity">
                    <Move className="w-3 h-3 text-white" />
                </div>

                {/* Close Button - More visible on top center */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute top-1 p-1 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                    title="Cerrar Burbuja"
                >
                    <X className="w-3 h-3" />
                </button>

                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 truncate max-w-[80%] text-center px-2">
                    {clock.label}
                </span>
                
                <span className={`text-xl font-black font-mono tracking-tighter ${clock.isRunning ? (clock.type === 'alarm' ? 'text-rose-400' : 'text-teal-400') : 'text-white'}`}>
                    {formatDisplay()}
                </span>

                {/* Controls Overlay (Bottom) */}
                <div className="absolute bottom-2 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <button onClick={toggle} className="p-1.5 bg-white/10 rounded-full hover:bg-teal-500 hover:text-black transition-all">
                        {clock.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <button onClick={reset} className="p-1.5 bg-white/10 rounded-full hover:bg-white/30 transition-all">
                        <RotateCcw className="w-3 h-3" />
                    </button>
                </div>

                {/* Progress Ring (Visual Indicator) */}
                {clock.type === 'timer' && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle
                            cx="56"
                            cy="56"
                            r="54"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            className="text-white/5"
                        />
                        {/* Aquí se podría calcular el strokeDasharray basado en el tiempo inicial vs actual */}
                    </svg>
                )}
            </div>
        </div>
    );
};

export default FloatingClockBubble;
