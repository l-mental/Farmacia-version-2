
import React, { useState, useEffect } from 'react';
import { HeartPulse, Lock, User as UserIcon, ArrowRight, Key } from 'lucide-react';
import { UserRole, User } from '../types';
import { jwtDecode } from 'jwt-decode';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('CUSTOM_GEMINI_API_KEY') || '');

  useEffect(() => {
    // Initialize Google One Tap / Sign In
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: true, // This enables "automatic registration" if already logged in
      });
      window.google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", width: "100%" }
      );
      window.google.accounts.id.prompt(); // Also show One Tap
    }
  }, []);

  const handleGoogleResponse = (response: any) => {
    const decoded: any = jwtDecode(response.credential);
    onLogin({
      id: decoded.sub,
      name: decoded.name,
      role: 'EMPLOYEE', // Default role for Google users
      username: decoded.email,
      email: decoded.email
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save API key if provided
    if (apiKey) {
      localStorage.setItem('CUSTOM_GEMINI_API_KEY', apiKey);
    }

    // Simulación de login
    if (username.toLowerCase() === 'admin') {
      onLogin({ id: '1', name: 'Administrador Principal', role: 'ADMIN', username: 'admin' });
    } else {
      onLogin({ id: '2', name: 'Vendedor Juan', role: 'EMPLOYEE', username: 'empleado' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex bg-emerald-600 p-4 rounded-2xl shadow-xl shadow-emerald-200 mb-4">
            <HeartPulse className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">FarmaSalud <span className="text-emerald-600">Gestión</span></h1>
          <p className="text-slate-500 mt-2">Acceso exclusivo para personal autorizado</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Usuario</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin o empleado"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  required
                />
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              Iniciar Sesión
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">O continúa con</span></div>
            </div>

            <div id="googleBtn" className="w-full"></div>
            
            <div className="pt-4 border-t border-slate-50">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Configuración de API (Opcional)</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Tu Gemini API Key (para exportación)"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 italic">Necesario si usas la app fuera de AI Studio.</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <p className="text-xs text-slate-400 italic">
              "admin" para Panel Admin | Cualquier otro para Empleado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
