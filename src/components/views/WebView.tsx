import React, { useState } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, ExternalLink } from 'lucide-react';

interface WebViewProps {
    initialUrl?: string;
}

const WebView: React.FC<WebViewProps> = ({ initialUrl }) => {
    const defaultUrl = 'https://www.google.com/search?igu=1';
    const [url, setUrl] = useState(initialUrl || defaultUrl);
    const [inputUrl, setInputUrl] = useState(initialUrl || 'https://www.google.com');
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    const handleNavigate = (e: React.FormEvent) => {
        e.preventDefault();
        let targetUrl = inputUrl;
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
        }
        setUrl(targetUrl);
    };

    const reload = () => {
        const webview = iframeRef.current as any;
        if (webview) {
            webview.reload();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d0f14]">
            {/* Address Bar */}
            <div className="h-12 border-b border-white/5 bg-black/40 flex items-center px-4 gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => (iframeRef.current as any)?.goBack()}
                        className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => (iframeRef.current as any)?.goForward()}
                        className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-all"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={reload} className="p-1.5 text-gray-600 hover:text-purple-400 hover:bg-white/5 rounded-lg transition-all">
                        <RotateCw className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleNavigate} className="flex-1 relative group">
                    <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                    <input 
                        type="text" 
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all font-mono"
                        placeholder="Introduce una URL o busca..."
                    />
                </form>

                <div className="flex items-center gap-2">
                    <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-600 hover:text-teal-400 hover:bg-white/5 rounded-lg transition-all"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* WebView Area (Nativo de Electron) */}
            <div className="flex-1 bg-white relative overflow-hidden">
                <webview 
                    ref={iframeRef as any}
                    src={url} 
                    className="w-full h-full border-none"
                    {...({ 
                        allowpopups: "true", 
                        useragent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
                    } as any)}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            <style>{`
                webview {
                    display: flex;
                    width: 100%;
                    height: 100%;
                    background: white;
                }
            `}</style>
        </div>
    );
};

export default WebView;
