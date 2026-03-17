import React from 'react';
import { Rnd } from 'react-rnd';
import { Maximize2, X, Minus } from 'lucide-react';

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
    return (
        <Rnd
            default={{
                x: defaultPosition.x,
                y: defaultPosition.y,
                width: defaultSize.width,
                height: defaultSize.height,
            }}
            minWidth={200}
            minHeight={150}
            bounds="parent"
            dragHandleClassName="handle"
            onDragStart={() => onFocus(id)}
            onResizeStart={() => onFocus(id)}
            style={{ zIndex }}
            className="group"
        >
            <div className="glass-panel border-white/10 rounded-[1.5rem] overflow-hidden flex flex-col h-full shadow-2xl transition-shadow duration-300 hover:shadow-purple-500/10 active:scale-[0.99] border-2">
                {/* Title Bar / Drag Handle */}
                <div className="h-10 border-b border-white/5 bg-black/40 flex items-center px-4 justify-between cursor-grab active:cursor-grabbing handle">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                            <div
                                className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-400 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); onClose(id); }}
                            />
                            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        </div>
                        <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
                        <span className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-2 tracking-widest truncate max-w-[150px]">
                            {icon} {title}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Minus className="w-3.5 h-3.5 text-gray-500 hover:text-white cursor-pointer" />
                        <Maximize2 className="w-3.5 h-3.5 text-gray-500 hover:text-white cursor-pointer" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-black/20 overflow-hidden relative">
                    {children}
                </div>
            </div>

            <style>{`
        .glass-panel {
          backdrop-filter: blur(25px);
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>
        </Rnd>
    );
};

export default FloatingPanel;
