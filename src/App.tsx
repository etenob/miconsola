import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { storageService } from './services/storageService';
import { Loader2 } from 'lucide-react';

type ScreenState = 'login' | 'dashboard';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('login');
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    // Inicializar el puente IPC y leer los archivos locales al arrancar la app
    storageService.initialize().then(() => {
      setIsStorageReady(true);
    });
  }, []);

  if (!isStorageReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#111216] text-white">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
          <p className="text-gray-500 font-mono tracking-widest text-xs uppercase animate-pulse">Sincronizando Archivos OS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#111216] text-white selection:bg-purple-500/30">
        {currentScreen === 'login' && <LoginScreen onLogin={() => setCurrentScreen('dashboard')} />}
        {currentScreen === 'dashboard' && <Dashboard />}
    </div>
  );
}

export default App;
