import React from 'react';
import { Terminal, Cpu } from 'lucide-react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#111216] relative overflow-hidden">
            {/* Fondo estético */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Contenido Central */}
            <div className="z-10 flex flex-col items-center">
                <div className="relative mb-8">
                    {/* Símbolo "Hongo Cibernético" / Mico base conceptual */}
                    <div className="w-24 h-24 rounded-full border border-purple-500/30 bg-[#1f2028]/80 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(192,132,252,0.3)]">
                        <Cpu className="w-12 h-12 text-emerald-400 animate-pulse" />
                    </div>
                    {/* Anillos animadas */}
                    <div className="absolute -inset-4 border border-purple-500/20 rounded-full animate-[spin_4s_linear_infinite]" />
                    <div className="absolute -inset-8 border border-emerald-400/10 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-mono flex items-center gap-3">
                    <Terminal className="text-purple-400" />
                    mi_consola
                </h1>

                <p className="text-sm text-gray-400 mb-8 tracking-widest uppercase font-mono">
                    <span className="text-emerald-400">Initialize</span> System Workspace
                </p>

                {/* Barra de progreso visual */}
                <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 w-full origin-left animate-[scale-x_2.5s_ease-in-out]" style={{ transformOrigin: 'left', animationName: 'progress' }} />
                </div>
            </div>

            <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.7); }
          100% { transform: scaleX(1); }
        }
      `}</style>
        </div>
    );
};

export default LoadingScreen;
