
import React, { useState, useEffect } from 'react';
import { HeartPulse, Lock, User as UserIcon, ArrowRight, Key } from 'lucide-react';
import { UserRole, User } from '@/types';
import { jwtDecode } from 'jwt-decode';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasGoogleClient, setHasGoogleClient] = useState(false);

  useEffect(() => {
    // Initialize Google One Tap / Sign In if configured
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google) {
      setHasGoogleClient(true);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        use_fedcm_for_prompt: false,
        itp_support: true,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  const handleGoogleResponse = (response: any) => {
    const decoded: any = jwtDecode(response.credential);
    onLogin({
      id: decoded.sub,
      name: decoded.name,
      role: 'EMPLOYEE',
      originalRole: 'EMPLOYEE',
      username: decoded.email,
      email: decoded.email
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim().toLowerCase();
    
    // Buscar usuario en el personal guardado
    const savedStaffStr = localStorage.getItem('FARMA_STAFF');
    let foundUser: User | null = null;
    if (savedStaffStr) {
      try {
        const staffList: User[] = JSON.parse(savedStaffStr);
        foundUser = staffList.find(u => u.username.toLowerCase() === cleanUser) || null;
      } catch (err) {
        console.error(err);
      }
    }

    if (cleanUser === 'admin') {
      onLogin({ 
        id: '1', 
        name: 'Administrador Principal', 
        role: 'ADMIN', 
        originalRole: 'ADMIN', 
        username: 'admin' 
      });
    } else if (foundUser) {
      onLogin(foundUser);
    } else {
      setErrorMsg('Usuario o contraseña no encontrados. Ingrese con la cuenta "admin" o solicite su usuario en Gestión de Personal.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex bg-emerald-600 p-4 rounded-2xl shadow-xl shadow-emerald-200 mb-4">
            <HeartPulse className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">Farmacia <span className="text-emerald-600">Yireh</span></h1>
          <p className="text-slate-500 mt-2 text-xs font-semibold">Sistema FarmaPOS • Acceso exclusivo para personal</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Usuario</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="admin o tu usuario asignado"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm"
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
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              Iniciar Sesión
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {hasGoogleClient && (
            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">O continúa con</span></div>
              </div>

              <div id="googleBtn" className="w-full"></div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Desarrollado por <span className="font-black text-slate-700">SoftPlus</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
