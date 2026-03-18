import React from 'react';
import { Database, Table, Search, RefreshCcw, Wifi, ChevronRight, Server, Box, LogIn, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { storageService, type DbConnectionItem } from '../../services/storageService';

const DatabaseView: React.FC = () => {
    const [sqliteStatus, setSqliteStatus] = React.useState<{ connected: boolean, version?: string }>({ connected: false });
    const [connections, setConnections] = React.useState<DbConnectionItem[]>([]);
    const [newConnForm, setNewConnForm] = React.useState(false);
    const [sqlCreds, setSqlCreds] = React.useState({ server: 'BUNJR-L5', user: 'sa', password: 'sa2017.1' });
    
    // key es connId_dbName, value es un array de "schema.table"
    const [sqlTables, setSqlTables] = React.useState<Record<string, string[]>>({});
    
    const [selectedTable, setSelectedTable] = React.useState<{server: string, id: string, db: string, name: string} | null>(null);
    const [tableData, setTableData] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [expandedServers, setExpandedServers] = React.useState<string[]>(['SQLite', 'SQLServer']);
    
    // keys son de la forma connId_dbName
    const [expandedDbs, setExpandedDbs] = React.useState<string[]>([]);

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

        const handleConnections = () => setConnections(storageService.getConnections());
        handleConnections(); // initial load
        window.addEventListener('mico-connections-updated', handleConnections);
        return () => window.removeEventListener('mico-connections-updated', handleConnections);
    }, []);

    const toggleServer = (server: string) => {
        setExpandedServers(prev => 
            prev.includes(server) ? prev.filter(s => s !== server) : [...prev, server]
        );
    };

    const toggleDb = async (connId: string, dbName: string) => {
        const key = `${connId}_${dbName}`;
        const isExpanded = expandedDbs.includes(key);
        if (isExpanded) {
            setExpandedDbs(prev => prev.filter(db => db !== key));
        } else {
            setExpandedDbs(prev => [...prev, key]);
            if (!sqlTables[key]) {
                await loadSqlTables(connId, dbName);
            }
        }
    };

    const handleAddConnection = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sqlCreds.server || !sqlCreds.user) return;
        const id = `${sqlCreds.server}_${sqlCreds.user}`;
        const newConn: DbConnectionItem = {
            id,
            server: sqlCreds.server,
            user: sqlCreds.user,
            password: sqlCreds.password
        };
        storageService.saveConnection(newConn);
        setNewConnForm(false);
        setSqlCreds({ server: '', user: '', password: '' });
    };

    const handleDeleteConnection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        storageService.deleteConnection(id);
    };

    const connectSQLServer = async (conn: DbConnectionItem) => {
        setIsLoading(true);
        const updatedConn = { ...conn, status: 'connected', errorMsg: undefined } as DbConnectionItem;
        
        // Lo actualizamos en UI con status conectando para que rote el icono, aunque isLoading hace de semaforo global tb.
        setConnections(prev => prev.map(c => c.id === conn.id ? updatedConn : c));

        try {
            const config = {
                user: conn.user,
                password: conn.password,
                server: conn.server,
                options: {
                    encrypt: false,
                    trustServerCertificate: true
                }
            };
            const result = await (window as any).electronAPI.sqlserver.connect(conn.id, config);
            if (result.success) {
                const dbResult = await (window as any).electronAPI.sqlserver.query(conn.id, 'SELECT name FROM sys.databases WHERE state = 0 AND database_id > 4');
                if (dbResult.success) {
                    updatedConn.databases = dbResult.recordset.map((r: any) => r.name).sort();
                    updatedConn.status = 'connected';
                } else {
                    updatedConn.status = 'error';
                    updatedConn.errorMsg = 'Conectado pero falló al listar BBDDs';
                }
            } else {
                updatedConn.status = 'error';
                updatedConn.errorMsg = result.error;
            }
        } catch(err: any) {
            updatedConn.status = 'error';
            updatedConn.errorMsg = err.message;
        } finally {
            setIsLoading(false);
            setConnections(prev => prev.map(c => c.id === conn.id ? updatedConn : c));
        }
    };

    const loadSqlTables = async (connId: string, dbName: string) => {
        const key = `${connId}_${dbName}`;
        try {
            const result = await (window as any).electronAPI.sqlserver.query(connId, `SELECT TABLE_SCHEMA, TABLE_NAME FROM [${dbName}].INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`);
            if (result.success) {
                setSqlTables(prev => ({
                    ...prev,
                    [key]: result.recordset.map((r: any) => `${r.TABLE_SCHEMA}.${r.TABLE_NAME}`)
                }));
            }
        } catch(err) {
            console.error(err);
        }
    };

    const fetchTableData = async (type: 'SQLite'|'SQLServer', id: string, dbName: string, tableName: string) => {
        setSelectedTable({ server: type, id, db: dbName, name: tableName });
        setIsLoading(true);
        try {
            if (type === 'SQLite') {
                const result = await (window as any).electronAPI.sqlite.query(`SELECT * FROM ${tableName}`);
                if (result.success) {
                    setTableData(result.rows);
                }
            } else {
                const splitIdx = tableName.indexOf('.');
                const schema = splitIdx > -1 ? tableName.substring(0, splitIdx) : 'dbo';
                const name = splitIdx > -1 ? tableName.substring(splitIdx + 1) : tableName;
                
                const query = `SELECT TOP 200 * FROM [${dbName}].[${schema}].[${name}]`;
                const result = await (window as any).electronAPI.sqlserver.query(id, query);
                if (result.success) {
                    setTableData(result.recordset);
                } else {
                    setTableData([]);
                    console.error("MICO_DB_VIEW: SQL Error", result.error);
                }
            }
        } catch (err) {
            console.error("MICO_DB_VIEW: Failed to fetch table data", err);
        } finally {
            setIsLoading(false);
        }
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
                                    <span className={selectedTable.server === 'SQLite' ? 'text-purple-400' : 'text-teal-400'}>{selectedTable.server}</span>
                                    {selectedTable.server === 'SQLServer' && (
                                        <>
                                            <ChevronRight className="w-3 h-3" />
                                            <span className="text-gray-400">{selectedTable.db}</span>
                                        </>
                                    )}
                                    <ChevronRight className="w-3 h-3" />
                                    <span className="text-white">{selectedTable.name}</span>
                                </>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Arquitectura de Datos</h3>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
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
                                <Server className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
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
                                                onClick={() => fetchTableData('SQLite', 'local', 'mico.db', table)}
                                                className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${selectedTable?.name === table && selectedTable.server === 'SQLite' ? 'bg-purple-500/20 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                            >
                                                <Table className={`w-3.5 h-3.5 ${selectedTable?.name === table && selectedTable.server === 'SQLite' ? 'text-purple-400' : 'text-gray-700'}`} />
                                                <span className="text-[11px] font-medium tracking-wide">{table}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SQL SERVER (Multi Connections) */}
                        <div className="space-y-1 mt-6">
                            <div className="flex items-center justify-between pr-2">
                                <div 
                                    onClick={() => toggleServer('SQLServer')}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group flex-1"
                                >
                                    <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${expandedServers.includes('SQLServer') ? 'rotate-90 text-teal-400' : ''}`} />
                                    <Server className="w-4 h-4 text-gray-400 group-hover:text-teal-400 transition-colors" />
                                    <span className="text-xs font-bold text-white tracking-wide">SQL Server Remotos</span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setNewConnForm(true); }}
                                    className="p-1.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-lg transition-colors border border-teal-500/20"
                                    title="Añadir Conexión"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            {expandedServers.includes('SQLServer') && (
                                <div className="ml-6 space-y-4 border-l border-white/5 pl-4 py-2">
                                    
                                    {/* Lista de Conexiones */}
                                    {connections.map(conn => (
                                        <div key={conn.id} className="space-y-2">
                                            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                                                <div 
                                                    className="flex items-center gap-2 cursor-pointer flex-1"
                                                    onClick={() => !conn.status || conn.status === 'error' ? connectSQLServer(conn) : null}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${conn.status === 'connected' ? 'bg-teal-400 animate-pulse' : conn.status === 'error' ? 'bg-red-400' : 'bg-gray-600'}`}></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-300 group-hover:text-teal-400 transition-colors">{conn.server}</p>
                                                        <p className="text-[9px] text-gray-600 tracking-wider uppercase">{conn.user}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {(!conn.status || conn.status === 'error') && (
                                                        <button 
                                                            onClick={() => connectSQLServer(conn)}
                                                            className="p-1.5 text-teal-400 hover:bg-teal-400/10 rounded-lg"
                                                            title="Conectar"
                                                        >
                                                            <RefreshCcw className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={(e) => handleDeleteConnection(e, conn.id)}
                                                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Manejo de Error */}
                                            {conn.status === 'error' && conn.errorMsg && (
                                                <div className="px-2 pb-2">
                                                    <div className="flex items-start gap-2 bg-red-500/10 text-red-400 p-2 rounded-lg text-[10px]">
                                                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                                        <p className="break-all">{conn.errorMsg}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Listado de Bases de Datos Si Está Conectado */}
                                            {conn.status === 'connected' && conn.databases && (
                                                <div className="pl-6 space-y-1">
                                                    {conn.databases.map(db => {
                                                        const key = `${conn.id}_${db}`;
                                                        return (
                                                        <div key={key} className="space-y-1">
                                                            <div 
                                                                onClick={() => toggleDb(conn.id, db)}
                                                                className="flex items-center gap-2 p-2 text-[11px] text-gray-400 font-mono hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                                                            >
                                                                <ChevronRight className={`w-3 h-3 transition-transform ${expandedDbs.includes(key) ? 'rotate-90 text-teal-400' : ''}`} />
                                                                <Database className={`w-3.5 h-3.5 ${expandedDbs.includes(key) ? 'text-teal-400' : 'text-gray-600'}`} />
                                                                {db}
                                                            </div>
                                                            
                                                            {expandedDbs.includes(key) && (
                                                                <div className="ml-5 pl-3 border-l border-white/5 relative">
                                                                    {sqlTables[key] ? (
                                                                        <div className="py-1">
                                                                            {sqlTables[key].length === 0 ? (
                                                                                <span className="text-[10px] text-gray-600 italic px-2">Sin tablas accesibles</span>
                                                                            ) : (
                                                                                sqlTables[key].map(table => (
                                                                                    <div 
                                                                                        key={table}
                                                                                        onClick={() => fetchTableData('SQLServer', conn.id, db, table)}
                                                                                        className={`flex items-center gap-3 p-1.5 rounded-lg transition-all cursor-pointer ${selectedTable?.name === table && selectedTable.id === conn.id ? 'bg-teal-500/20 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                                                                    >
                                                                                        <span className="w-2 h-2 border border-current rounded-[2px] opacity-40 ml-1"></span>
                                                                                        <span className="text-[10px] font-medium tracking-wide truncate max-w-[120px]" title={table}>{table}</span>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 p-2 px-3 text-[10px] text-gray-600">
                                                                            <RefreshCcw className="w-3 h-3 animate-spin" />
                                                                            Cargando tablas...
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )})}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Formulario de Nueva Conexión */}
                                    {newConnForm && (
                                        <form onSubmit={handleAddConnection} className="bg-black/40 rounded-xl p-4 border border-teal-500/20 space-y-3 mt-4 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Database className="w-3.5 h-3.5 text-teal-400" />
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Nueva Conexión MSSQL</span>
                                                </div>
                                                <button type="button" onClick={() => setNewConnForm(false)} className="text-gray-500 hover:text-white">✕</button>
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="Servidor (Ej: BUNJR-L5)" 
                                                required
                                                value={sqlCreds.server}
                                                onChange={e => setSqlCreds({...sqlCreds, server: e.target.value})}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50"
                                            />
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Usuario" 
                                                    required
                                                    value={sqlCreds.user}
                                                    onChange={e => setSqlCreds({...sqlCreds, user: e.target.value})}
                                                    className="w-1/2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50"
                                                />
                                                <input 
                                                    type="password" 
                                                    placeholder="Clave" 
                                                    value={sqlCreds.password}
                                                    onChange={e => setSqlCreds({...sqlCreds, password: e.target.value})}
                                                    className="w-1/2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50"
                                                />
                                            </div>
                                            <button 
                                                type="submit" 
                                                className="w-full flex justify-center items-center gap-2 bg-teal-500/20 border border-teal-500/50 hover:bg-teal-500 hover:text-black text-teal-400 font-bold text-[11px] uppercase tracking-wide py-2 rounded-lg transition-colors"
                                            >
                                                Guardar Credenciales
                                            </button>
                                        </form>
                                    )}

                                    {connections.length === 0 && !newConnForm && (
                                        <div className="p-4 text-center text-xs text-gray-600 italic border border-dashed border-white/10 rounded-xl">
                                            No hay conexiones guardadas.
                                        </div>
                                    )}
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
                                    <p className="text-[10px] text-gray-600">Conexiones Guardadas: {connections.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* VISTA DE DATOS (Preview) */}
                <div className="col-span-12 lg:col-span-8 glass-panel rounded-[2rem] border-white/5 p-0 overflow-hidden flex flex-col h-[600px]">
                    <div className="h-12 border-b border-white/5 bg-black/40 flex items-center px-6 justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <Table className={`w-4 h-4 ${selectedTable?.server === 'SQLServer' ? 'text-teal-400' : 'text-purple-400'}`} />
                            <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest truncate max-w-lg">
                                {selectedTable ? `${selectedTable.server} > ${selectedTable.db} > ${selectedTable.name}` : 'Visor de Registros'}
                            </span>
                        </div>
                        {selectedTable && (
                            <div className="flex items-center gap-4 shrink-0">
                                <span className="text-[9px] font-mono text-gray-600 uppercase">Top Filas: {tableData.length}</span>
                                <RefreshCcw 
                                    className={`w-4 h-4 text-gray-600 hover:text-white cursor-pointer transition-all ${isLoading ? 'animate-spin text-purple-400' : ''}`} 
                                    onClick={() => fetchTableData(selectedTable.server as 'SQLite'|'SQLServer', selectedTable.id, selectedTable.db, selectedTable.name)}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar bg-black/20">
                        {isLoading && !tableData.length ? (
                             <div className="h-full flex items-center justify-center">
                                 <RefreshCcw className="w-8 h-8 text-gray-600 animate-spin" />
                             </div>
                        ) : selectedTable ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#0d0f14] z-10 border-b border-white/10">
                                    <tr>
                                        {tableData.length > 0 && Object.keys(tableData[0]).map(key => (
                                            <th key={key} className="p-4 text-[9px] font-mono text-gray-500 uppercase tracking-widest whitespace-nowrap bg-[#0d0f14] border-x border-white/5">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {tableData.map((row, i) => (
                                        <tr key={i} className={`transition-colors group ${selectedTable.server === 'SQLServer' ? 'hover:bg-teal-500/5' : 'hover:bg-purple-500/5'}`}>
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="p-4 text-[11px] text-gray-400 font-mono italic group-hover:text-gray-200 border-x border-white/5 whitespace-nowrap max-w-xs truncate" title={String(val)}>{String(val)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {tableData.length === 0 && !isLoading && (
                                        <tr>
                                            <td className="p-20 text-center text-xs text-gray-600" colSpan={30}>
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
                                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Explorador de Datos Universal</p>
                                        <p className="text-xs text-gray-600 italic max-w-xs mx-auto">Selecciona una tabla local (SQLite) o remota (SQL Server) para realizar una lectura en vivo.</p>
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
