import React from 'react';
import { Database, Table, Search, RefreshCcw, Wifi, ChevronRight, Server, Box } from 'lucide-react';

const DatabaseView: React.FC = () => {
    const [sqliteStatus, setSqliteStatus] = React.useState<{ connected: boolean, version?: string }>({ connected: false });
    const [selectedTable, setSelectedTable] = React.useState<{server: string, db: string, name: string} | null>(null);
    const [tableData, setTableData] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [expandedServers, setExpandedServers] = React.useState<string[]>(['SQLite']);

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const status = await (window as any).electronAPI.sqlite.status();
                setSqliteStatus(status);
            } catch (err) {
                console.error("MICO_DB_VIEW: Failed to fetch SQLite status", err);
            }
        };
        checkStatus();
    }, []);

    const fetchTableData = async (server: string, dbName: string, tableName: string) => {
        setSelectedTable({ server, db: dbName, name: tableName });
        setIsLoading(true);
        try {
            if (server === 'SQLite') {
                const result = await (window as any).electronAPI.sqlite.query(`SELECT * FROM ${tableName}`);
                if (result.success) {
                    setTableData(result.rows);
                }
            } else {
                // Simulación para SQL Server (Placeholder)
                setTableData([]);
            }
        } catch (err) {
            console.error("MICO_DB_VIEW: Failed to fetch table data", err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleServer = (server: string) => {
        setExpandedServers(prev => 
            prev.includes(server) ? prev.filter(s => s !== server) : [...prev, server]
        );
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-purple-500/20 p-3 rounded-2xl">
                        <Server className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">
                            <span>Mico_Admin</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>Explorador</span>
                            {selectedTable && (
                                <>
                                    <ChevronRight className="w-3 h-3" />
                                    <span className="text-purple-400">{selectedTable.server}</span>
                                    <ChevronRight className="w-3 h-3" />
                                    <span className="text-white">{selectedTable.name}</span>
                                </>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Arquitectura de Datos</h3>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-teal-400 bg-teal-400/5 px-4 py-2 rounded-full border border-teal-400/10">
                        <Wifi className="w-3 h-3" /> SQL_SERVER_ONLINE
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-full border ${sqliteStatus.connected ? 'text-purple-400 bg-purple-400/5 border-purple-400/10' : 'text-gray-600 bg-white/5 border-white/5'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${sqliteStatus.connected ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
                        SQLITE_LOCAL: {sqliteStatus.connected ? 'OK' : 'OFF'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
                {/* EXPLORADOR JERÁRQUICO (Sidebar) */}
                <div className="col-span-12 lg:col-span-4 glass-panel rounded-[2rem] border-white/5 p-6 flex flex-col h-[600px]">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Servidores Activos</span>
                        <RefreshCcw className="w-3 h-3 text-gray-600 hover:text-white transition-colors cursor-pointer" />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                        {/* SQLITE SERVER */}
                        <div className="space-y-1">
                            <div 
                                onClick={() => toggleServer('SQLite')}
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
                            >
                                <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${expandedServers.includes('SQLite') ? 'rotate-90 text-purple-400' : ''}`} />
                                <Server className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-bold text-white tracking-wide">Mico_Local (SQLite)</span>
                            </div>
                            
                            {expandedServers.includes('SQLite') && (
                                <div className="ml-6 space-y-1 border-l border-white/5 pl-4 py-2">
                                    <div className="flex items-center gap-2 p-2 text-[11px] text-gray-500 font-mono">
                                        <Database className="w-3.5 h-3.5" /> mico.db
                                    </div>
                                    <div className="space-y-1">
                                        {['SYSTEM_INFO', 'conversations', 'messages'].map((table) => (
                                            <div 
                                                key={table}
                                                onClick={() => fetchTableData('SQLite', 'mico.db', table)}
                                                className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${selectedTable?.name === table ? 'bg-purple-500/20 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                            >
                                                <Table className={`w-3.5 h-3.5 ${selectedTable?.name === table ? 'text-purple-400' : 'text-gray-700'}`} />
                                                <span className="text-[11px] font-medium tracking-wide">{table}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SQL SERVER */}
                        <div className="space-y-1">
                            <div 
                                onClick={() => toggleServer('SQLServer')}
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
                            >
                                <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${expandedServers.includes('SQLServer') ? 'rotate-90 text-teal-400' : ''}`} />
                                <Server className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-bold text-white tracking-wide">Producción (SQL Server)</span>
                            </div>
                            
                            {expandedServers.includes('SQLServer') && (
                                <div className="ml-6 space-y-1 border-l border-white/5 pl-4 py-2">
                                    <div className="flex items-center gap-2 p-2 text-[11px] text-gray-500 font-mono">
                                        <Database className="w-3.5 h-3.5" /> Mico_ERP
                                    </div>
                                    <div className="opacity-40">
                                        {['Usuarios', 'Pedidos', 'Productos'].map((table) => (
                                            <div key={table} className="flex items-center gap-3 p-2 text-gray-600 cursor-not-allowed">
                                                <Table className="w-3.5 h-3.5" />
                                                <span className="text-[11px] font-medium tracking-wide">{table}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/5">
                            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Box className="w-3 h-3 text-purple-400" />
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Metadata de Sesión</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-600">Esquema: {sqliteStatus.version || 'Cargando...'}</p>
                                    <p className="text-[10px] text-gray-600">Tablas Locales: 3</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* VISTA DE DATOS (Preview) */}
                <div className="col-span-12 lg:col-span-8 glass-panel rounded-[2rem] border-white/5 p-0 overflow-hidden flex flex-col h-[600px]">
                    <div className="h-12 border-b border-white/5 bg-black/40 flex items-center px-6 justify-between">
                        <div className="flex items-center gap-3">
                            <Table className="w-4 h-4 text-purple-400" />
                            <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest">
                                {selectedTable ? `${selectedTable.server} > ${selectedTable.name}` : 'Visor de Registros'}
                            </span>
                        </div>
                        {selectedTable && (
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-mono text-gray-600 uppercase">Filas: {tableData.length}</span>
                                <RefreshCcw 
                                    className={`w-4 h-4 text-gray-600 hover:text-white cursor-pointer transition-all ${isLoading ? 'animate-spin text-purple-400' : ''}`} 
                                    onClick={() => fetchTableData(selectedTable.server, selectedTable.db, selectedTable.name)}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar bg-black/20">
                        {selectedTable ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#0d0f14] z-10 border-b border-white/10">
                                    <tr>
                                        {tableData.length > 0 && Object.keys(tableData[0]).map(key => (
                                            <th key={key} className="p-4 text-[9px] font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap bg-[#0d0f14]">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {tableData.map((row, i) => (
                                        <tr key={i} className="hover:bg-purple-500/5 transition-colors group">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="p-4 text-[11px] text-gray-400 font-mono italic group-hover:text-gray-200">{String(val)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {tableData.length === 0 && !isLoading && (
                                        <tr>
                                            <td className="p-20 text-center text-xs text-gray-600" colSpan={10}>
                                                <div className="space-y-4">
                                                    <Box className="w-8 h-8 text-gray-800 mx-auto" />
                                                    <p>No se encontraron registros en {selectedTable.name}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center p-10">
                                <div className="space-y-6">
                                    <div className="relative">
                                        <Database className="w-16 h-16 text-white opacity-5 mx-auto" />
                                        <Search className="w-6 h-6 text-purple-400 absolute bottom-0 right-1/2 translate-x-8 opacity-20" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Explorador de Datos v1.2</p>
                                        <p className="text-xs text-gray-600 italic max-w-xs mx-auto">Selecciona una tabla en la jerarquía del servidor para realizar una lectura en vivo.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseView;
