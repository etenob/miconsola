import React from 'react';
import { Rnd } from 'react-rnd';
import { Maximize2, X, Minus, Square } from 'lucide-react';

interface FloatingPanelProps {
    id: string;
    title: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
    defaultPosition?: { x: number; y: number };
    defaultSize?: { width: number | string; height: number | string };
    zIndex: number;
    onFocus: (id: string) => void;
    onClose: (id: string) => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({
    id,
    title,
    children,
    icon,
    defaultPosition = { x: 50, y: 50 },
    defaultSize = { width: 400, height: 300 },
    zIndex,
    onFocus,
    onClose,
}) => {
    const [isInteracting, setIsInteracting] = React.useState(false);
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [isMaximized, setIsMaximized] = React.useState(false);

    return (
        <Rnd
            default={{
                x: defaultPosition.x,
                y: defaultPosition.y,
                width: defaultSize.width,
                height: defaultSize.height,
            }}
            minWidth={250}
            minHeight={isMinimized ? 40 : 150}
            bounds="parent"
            dragHandleClassName="handle"
            onDragStart={() => {
                onFocus(id);
                setIsInteracting(true);
            }}
            onDragStop={() => setIsInteracting(false)}
            onResizeStart={() => {
                onFocus(id);
                setIsInteracting(true);
            }}
            onResizeStop={() => setIsInteracting(false)}
            disableDragging={isMaximized}
            enableResizing={!isMaximized && !isMinimized ? { top:true, right:true, bottom:true, left:true, topRight:true, bottomRight:true, bottomLeft:true, topLeft:true } : false}
            resizeHandleStyles={{
                bottom: { height: '15px', bottom: '-7px', cursor: 'ns-resize' },
                right: { width: '15px', right: '-7px', cursor: 'ew-resize' },
                bottomRight: { width: '25px', height: '25px', right: '-12px', bottom: '-12px', cursor: 'nwse-resize' },
                left: { width: '15px', left: '-7px', cursor: 'ew-resize' },
                top: { height: '15px', top: '-7px', cursor: 'ns-resize' },
                topRight: { width: '25px', height: '25px', right: '-12px', top: '-12px', cursor: 'nesw-resize' },
                topLeft: { width: '25px', height: '25px', left: '-12px', top: '-12px', cursor: 'nwse-resize' },
                bottomLeft: { width: '25px', height: '25px', left: '-12px', bottom: '-12px', cursor: 'nesw-resize' }
            }}
            style={{ zIndex, pointerEvents: 'auto' }}
            className={`group transition-none ${isMaximized ? '!fixed !inset-4 !w-auto !h-auto !transform-none z-[2000]' : ''} ${isMinimized ? 'rnd-minimized' : ''}`}
        >
            <div className={`glass-panel border-white/10 rounded-[1.5rem] overflow-hidden flex flex-col shadow-2xl transition-shadow duration-300 hover:shadow-purple-500/10 active:scale-[0.99] border-2 ${isMinimized ? 'h-10' : 'h-full'}`}>
                {/* Title Bar / Drag Handle */}
                <div 
                    className={`h-10 border-b border-white/5 bg-black/60 flex items-center px-4 justify-between transition-colors handle ${isMaximized ? '' : 'cursor-grab active:cursor-grabbing'}`}
                    onDoubleClick={() => { setIsMaximized(!isMaximized); setIsMinimized(false); onFocus(id); }}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="text-purple-400 shrink-0">
                            {icon}
                        </div>
                        <span className="text-xs font-mono text-gray-300 uppercase tracking-widest truncate max-w-[200px] select-none">
                            {title}
                        </span>
                    </div>
                    
                    {/* Window Controls (Min, Max, Close) */}
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); setIsMaximized(false); onFocus(id); }} 
                            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        >
                            <Minus className="w-4 h-4 text-gray-300" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); setIsMinimized(false); onFocus(id); }} 
                            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        >
                            {isMaximized ? <Square className="w-3.5 h-3.5 text-gray-300" /> : <Maximize2 className="w-3.5 h-3.5 text-gray-300" />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClose(id); }} 
                            className="w-7 h-7 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-colors cursor-pointer text-gray-300 ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div 
                    className={`flex-1 overflow-hidden relative ${isMinimized ? 'opacity-0 pointer-events-none hidden' : 'bg-black/20'}`}
                >
                    {children}
                    
                    {/* Drag Shield: Evita que el webview capture eventos durante el arrastre */}
                    {isInteracting && (
                        <div className="absolute inset-0 z-[9999] bg-transparent cursor-grabbing" />
                    )}
                </div>
            </div>

            <style>{`
                .glass-panel {
                    backdrop-filter: blur(25px);
                    background: rgba(255, 255, 255, 0.03);
                }
                .rnd-minimized {
                    height: 40px !important;
                    min-height: 40px !important;
                }
            `}</style>
        </Rnd>
    );
};

export default FloatingPanel;
