import React, { useState, useEffect } from 'react';
import { HeartPulse, Lock, User as UserIcon, ArrowRight, Shield, ShoppingCart, Pill, Eye, EyeOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { UserRole, User } from '@/types';
import { jwtDecode } from 'jwt-decode';
import { pullAllFromSupabase } from '@/services/supabaseService';

interface LoginProps {
  onLogin: (user: User) => void;
  staff?: User[];
  onRefreshStaff?: () => Promise<User[]>;
}

const MASTER_ADMIN: User = {
  id: '1',
  name: 'Administrador Principal',
  username: 'admin',
  password: 'admin',
  role: 'ADMIN',
  originalRole: 'ADMIN',
  permissions: {
    allowedSections: ['DASHBOARD', 'POS', 'INVENTORY', 'REPORTS', 'CUSTOMERS', 'SUPPLIERS', 'PURCHASES', 'STAFF'],
    canEditInventory: true
  }
};

const JOSUE_DEFAULT: User = {
  id: 'U_JOSUE_BALBOA',
  name: 'Josue Balboa',
  username: 'josue',
  password: '123',
  role: 'EMPLOYEE',
  originalRole: 'EMPLOYEE',
  customRoleName: 'Cajero / Ventas',
  assignedRegister: 'Caja 1',
  permissions: {
    allowedSections: ['POS', 'INVENTORY', 'CUSTOMERS'],
    canEditInventory: false
  }
};

const Login: React.FC<LoginProps> = ({ onLogin, staff = [], onRefreshStaff }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasGoogleClient, setHasGoogleClient] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [remoteStaff, setRemoteStaff] = useState<User[]>(staff);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (staff && staff.length > 0) {
      setRemoteStaff(staff);
    }
  }, [staff]);

  // Consultar la base de datos para mantener la lista de usuarios sincronizada
  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      const res = await pullAllFromSupabase();
      if (res.success && res.data?.staff && Array.isArray(res.data.staff) && res.data.staff.length > 0) {
        setRemoteStaff(res.data.staff);
        try {
          localStorage.setItem('FARMA_STAFF', JSON.stringify(res.data.staff));
        } catch {}
        return;
      }

      if (onRefreshStaff) {
        const refreshed = await onRefreshStaff();
        if (Array.isArray(refreshed) && refreshed.length > 0) {
          setRemoteStaff(refreshed);
          return;
        }
      }
    } catch (e) {
      console.debug('Error refreshing staff in login:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
    const interval = setInterval(() => {
      handleRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Combinar admin maestro y Josue con el personal cargado
  const allStaff: User[] = React.useMemo(() => {
    let list: User[] = [...remoteStaff];
    if (list.length === 0) {
      try {
        const saved = localStorage.getItem('FARMA_STAFF');
        if (saved) {
          list = JSON.parse(saved);
        }
      } catch {}
    }
    if (!list.some(u => u.username.toLowerCase() === 'admin')) {
      list = [MASTER_ADMIN, ...list];
    }
    if (!list.some(u => u.username.toLowerCase() === 'josue')) {
      list = [...list, JOSUE_DEFAULT];
    }
    return list;
  }, [remoteStaff]);

  useEffect(() => {
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
      email: decoded.email,
      permissions: {
        allowedSections: ['POS', 'INVENTORY', 'CUSTOMERS'],
        canEditInventory: false
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMsg('Por favor ingrese su usuario.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Por favor ingrese su contraseña.');
      return;
    }

    // Check Master Admin
    if (cleanUser === 'admin') {
      const adminInList = allStaff.find(u => u.username.toLowerCase() === 'admin');
      const validAdminPass = adminInList?.password || MASTER_ADMIN.password || 'admin';
      if (cleanPass === validAdminPass || cleanPass === 'admin') {
        onLogin(adminInList || MASTER_ADMIN);
        return;
      } else {
        setErrorMsg('Contraseña incorrecta.');
        return;
      }
    }

    // 1. Buscar en personal cargado en memoria
    let foundUser = allStaff.find(u => u.username.toLowerCase() === cleanUser);

    // 2. Si no se encuentra en memoria, consultar base de datos en la nube
    if (!foundUser) {
      setIsSyncing(true);
      try {
        const res = await pullAllFromSupabase();
        if (res.success && res.data?.staff && Array.isArray(res.data.staff)) {
          setRemoteStaff(res.data.staff);
          try {
            localStorage.setItem('FARMA_STAFF', JSON.stringify(res.data.staff));
          } catch {}
          foundUser = res.data.staff.find((u: User) => u.username.toLowerCase() === cleanUser);
        }
      } catch (err) {
        console.debug('Error verificando usuario remoto en handleLogin:', err);
      } finally {
        setIsSyncing(false);
      }
    }

    if (!foundUser) {
      setErrorMsg('Usuario no encontrado.');
      return;
    }

    // Validar contraseña sin mostrarla nunca
    if (foundUser.password && foundUser.password.trim() !== '') {
      if (foundUser.password.trim() !== cleanPass) {
        setErrorMsg('Contraseña incorrecta.');
        return;
      }
    }

    onLogin(foundUser);
  };

  const selectUserPreset = (user: User) => {
    setUsername(user.username);
    setPassword('');
    setErrorMsg('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 space-y-6">
          {/* Encabezado limpio y formal */}
          <div className="text-center space-y-2">
            <div className="inline-flex bg-emerald-600 p-3 rounded-xl shadow-sm">
              <HeartPulse className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Farmacia Yireh
              </h1>
              <p className="text-slate-500 text-xs">
                Inicia sesión para continuar
              </p>
            </div>
          </div>

          {/* Formulario normal de inicio de sesión */}
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium text-center">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all outline-none text-sm text-slate-800"
                  required
                />
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input 
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all outline-none text-sm text-slate-800"
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
            >
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Lista discreta de usuarios (solo selecciona el nombre de usuario, nunca la contraseña) */}
          {allStaff.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400">
                  Usuarios registrados
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isSyncing}
                  className="text-[11px] text-slate-400 hover:text-emerald-600 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Actualizar lista de usuarios"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {allStaff.map(u => {
                  const isSelected = username.toLowerCase() === u.username.toLowerCase();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUserPreset(u)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <UserIcon className="w-3 h-3 opacity-60" />
                      <span>{u.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasGoogleClient && (
            <div className="space-y-3 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-slate-400">O continúa con</span></div>
              </div>
              <div id="googleBtn" className="w-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
