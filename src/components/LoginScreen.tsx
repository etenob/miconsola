import React from 'react';
import { LogIn, User, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
    onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    return (
        <div className="flex items-center justify-center h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#16171d] to-[#111216]">
            <div className="relative w-full max-w-md p-8 rounded-2xl glass-panel shadow-2xl border-purple-500/20">

                {/* Glow de fondo para la tarjeta */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-[#1f2028] border border-gray-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                            <ShieldCheck className="w-8 h-8 text-purple-400" />
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-white mb-2">Bienvenido a casa</h2>
                        <p className="text-gray-400 text-sm">Autentícate para cargar tus entornos de trabajo y configuraciones locales.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Botón Login Google (Placeholder robusto) */}
                        <button
                            onClick={onLogin}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transform hover:-translate-y-0.5"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continuar con Google
                        </button>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-gray-700"></div>
                            <span className="flex-shrink-0 mx-4 text-xs text-gray-600 uppercase">o perfil local</span>
                            <div className="flex-grow border-t border-gray-700"></div>
                        </div>

                        {/* Perfil Local Guardado */}
                        <button
                            onClick={onLogin}
                            className="w-full flex items-center justify-between bg-[#1f2028]/50 hover:bg-[#2e303a] border border-gray-700 p-3 rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-200">Mico (Admin)</p>
                                    <p className="text-xs text-gray-500">Última sesión: Hoy</p>
                                </div>
                            </div>
                            <LogIn className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LoginScreen;
