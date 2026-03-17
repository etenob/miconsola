import React from 'react';
import { Database, Table, Search, RefreshCcw, Wifi } from 'lucide-react';

const DatabaseView: React.FC = () => {
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-teal-500/20 p-3 rounded-2xl">
                        <Database className="w-6 h-6 text-teal-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Data_Explorer</h3>
                        <p className="text-sm text-gray-500">Conexiones activas a SQL Server y SQLite.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-teal-400 bg-teal-400/5 px-4 py-2 rounded-full border border-teal-400/10">
                        <Wifi className="w-3 h-3" /> SQL_SERVER_LOCAL:CONNECTED
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-4 glass-panel rounded-[2rem] border-white/5 p-6 h-[500px] flex flex-col">
                    <div className="relative mb-6">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-300 focus:outline-none" placeholder="Buscar tablas..." />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {['Usuarios', 'Pedidos', 'Productos', 'Log_Errores', 'Configuraciones', 'Ventas'].map((table, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                                <Table className="w-4 h-4 text-gray-600 group-hover:text-teal-400 transition-colors" />
                                <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest">{table}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-8 glass-panel rounded-[2rem] border-white/5 p-0 overflow-hidden flex flex-col h-[500px]">
                    <div className="h-12 border-b border-white/5 bg-black/40 flex items-center px-6 justify-between">
                        <span className="text-[10px] font-mono text-gray-500 uppercase flex items-center gap-2">
                            <Table className="w-3 h-3 text-teal-400" /> Vista previa: Usuarios
                        </span>
                        <RefreshCcw className="w-4 h-4 text-gray-600 hover:text-white cursor-pointer" />
                    </div>
                    <div className="flex-1 flex items-center justify-center text-center p-10">
                        <div className="space-y-4">
                            <Database className="w-12 h-12 text-white opacity-5 mx-auto" />
                            <p className="text-xs text-gray-600 italic">Selecciona una tabla para visualizar los datos . . .</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseView;
