import React, { useEffect, useState } from 'react';
import { Bell, BellOff, X, AlertTriangle, Music } from 'lucide-react';

interface AlarmOverlayProps {
    onStop: () => void;
}

const AlarmOverlay: React.FC<AlarmOverlayProps> = ({ onStop }) => {
    const [activeAlarm, setActiveAlarm] = useState<{ label: string; id: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleTrigger = (e: any) => {
            setActiveAlarm({ label: e.detail.label, id: e.detail.id });
            setIsVisible(true);
        };

        window.addEventListener('mico-alarm-triggered' as any, handleTrigger);
        return () => window.removeEventListener('mico-alarm-triggered' as any, handleTrigger);
    }, []);

    if (!isVisible || !activeAlarm) return null;

    const stopHandler = () => {
        setIsVisible(false);
        setActiveAlarm(null);
        onStop();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto overflow-hidden">
            {/* Fondo con Blur y Animación Pulsante */}
            <div className="absolute inset-0 bg-red-950/40 backdrop-blur-xl animate-pulse duration-[2000ms]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-red-600/20" />
            
            {/* Luces de Emergencia Giratorias (CSS puro) */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse" />
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse" />

            <div className="relative z-10 max-w-lg w-full px-6 flex flex-col items-center text-center animate-in zoom-in-90 fade-in duration-500">
                {/* Icono de Campana con Rebote */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 animate-ping" />
                    <div className="relative bg-red-600 p-8 rounded-full shadow-[0_0_50px_rgba(220,38,38,0.5)] border-4 border-white/20 animate-bounce">
                        <Bell className="w-16 h-16 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-white text-red-600 p-2 rounded-full shadow-lg border-2 border-red-600">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                </div>

                <div className="space-y-4 mb-12">
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl">
                        ¡TIEMPO AGOTADO!
                    </h1>
                    <div className="flex items-center justify-center gap-3 py-2 px-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                        <Music className="w-5 h-5 text-teal-400" />
                        <span className="text-2xl font-mono font-bold text-teal-400 tracking-wider">
                            {activeAlarm.label}
                        </span>
                    </div>
                    <p className="text-gray-400 font-mono text-sm tracking-widest uppercase opacity-70">
                        La alarma configurada ha finalizado con éxito
                    </p>
                </div>

                {/* Botón de Parada Maestro */}
                <button 
                    onClick={stopHandler}
                    className="group relative flex items-center justify-center gap-4 bg-white text-black px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-tighter hover:bg-teal-400 hover:text-black transition-all transform active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <BellOff className="w-6 h-6" />
                    DETENER ALARMA
                    <X className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                </button>

                <button 
                   onClick={() => setIsVisible(false)}
                   className="mt-8 text-white/30 hover:text-white/100 text-[10px] font-mono uppercase tracking-[0.3em] transition-all"
                >
                    Descartar visualmente (Esc)
                </button>
            </div>
            
            {/* Efecto de Viñeta */}
            <div className="absolute inset-0 border-[40px] border-red-600/10 pointer-events-none" />
        </div>
    );
};

export default AlarmOverlay;
