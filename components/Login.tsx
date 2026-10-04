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
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasGoogleClient, setHasGoogleClient] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [remoteStaff, setRemoteStaff] = useState<User[]>(staff);

  useEffect(() => {
    if (staff && staff.length > 0) {
      setRemoteStaff(staff);
    }
  }, [staff]);

  // Al abrir la pantalla de login (ej. en un celular nuevo), consultar inmediatamente la base de datos
  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      // 1. Consultar directo /api/sync y Supabase en la nube
      const res = await pullAllFromSupabase();
      if (res.success && res.data?.staff && Array.isArray(res.data.staff) && res.data.staff.length > 0) {
        setRemoteStaff(res.data.staff);
        try {
          localStorage.setItem('FARMA_STAFF', JSON.stringify(res.data.staff));
        } catch {}
        return;
      }

      // 2. Probar callback si existe
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
    // Auto-detección en segundo plano: si un administrador crea un usuario en la PC,
    // aparece automáticamente en la pantalla del celular sin tener que recargar
    const interval = setInterval(() => {
      handleRefresh();
    }, 3500);
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
    // Asegurar que el admin maestro siempre esté disponible
    if (!list.some(u => u.username.toLowerCase() === 'admin')) {
      list = [MASTER_ADMIN, ...list];
    }
    // Asegurar que Josue Balboa esté disponible por defecto
    if (!list.some(u => u.username.toLowerCase() === 'josue')) {
      list = [...list, JOSUE_DEFAULT];
    }
    return list;
  }, [remoteStaff]);

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
      setErrorMsg('Por favor ingrese el nombre de usuario.');
      return;
    }

    // Check Master Admin
    if (cleanUser === 'admin') {
      if (cleanPass === 'admin' || cleanPass === 'admin123' || cleanPass === 'admin2026' || cleanPass === (MASTER_ADMIN.password || 'admin')) {
        onLogin(MASTER_ADMIN);
        return;
      } else {
        setErrorMsg('Contraseña incorrecta para el usuario "admin". (Por defecto es: admin)');
        return;
      }
    }

    // 1. Buscar en personal cargado en memoria
    let foundUser = allStaff.find(u => u.username.toLowerCase() === cleanUser);

    // 2. Si no se encuentra en memoria (ej. el usuario fue recién creado desde la PC),
    // consultar inmediatamente la base de datos en la nube antes de fallar
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
      setErrorMsg(`El usuario "${username}" no fue encontrado en la base de datos. Verifica que el nombre esté bien escrito o haz clic en "Actualizar Cuentas".`);
      return;
    }

    // Validate password if configured
    if (foundUser.password && foundUser.password.trim() !== '') {
      if (foundUser.password.trim() !== cleanPass) {
        setErrorMsg(`Contraseña o PIN incorrecto para el usuario "${foundUser.name}".`);
        return;
      }
    }

    // Login successful
    onLogin(foundUser);
  };

  const selectUserPreset = (user: User) => {
    setUsername(user.username);
    setPassword(user.password || '');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full my-8">
        <div className="text-center mb-8">
          <div className="inline-flex bg-emerald-500 p-4 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-4 ring-4 ring-emerald-500/20">
            <HeartPulse className="text-slate-950 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Farmacia <span className="text-emerald-400">Yireh</span>
          </h1>
          <p className="text-emerald-200/70 mt-1 text-xs font-semibold tracking-wider uppercase">
            Sistema FarmaPOS • Control de Acceso por Rol
          </p>
        </div>

        <div className="bg-white p-7 sm:p-9 rounded-[2.5rem] shadow-2xl border border-white/10 space-y-6">
          {/* Selector Rápido de Cuentas Registradas con Botón de Actualizar */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Personal Registrado en la Base de Datos
              </label>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isSyncing}
                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200"
                title="Buscar nuevos usuarios creados desde la PC"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{isSyncing ? 'Buscando...' : 'Actualizar Cuentas'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {allStaff.map(u => {
                const isSelected = username.toLowerCase() === u.username.toLowerCase();
                const roleBadge = u.role === 'ADMIN' 
                  ? { label: 'Administrador', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Shield }
                  : u.role === 'PHARMACIST'
                  ? { label: 'Farmacéutico', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Pill }
                  : { label: 'Cajero / Ventas', bg: 'bg-sky-100 text-sky-800 border-sky-200', icon: ShoppingCart };

                const Icon = roleBadge.icon;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectUserPreset(u)}
                    className={`text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm' 
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">@{u.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${roleBadge.bg}`}>
                        <Icon className="w-2.5 h-2.5" />
                        {roleBadge.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold leading-relaxed">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Usuario</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="admin o tu usuario registrado"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm font-medium"
                  required
                />
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Contraseña / PIN</label>
                <span className="text-[10px] font-bold text-slate-400">admin por defecto: <span className="font-mono text-emerald-600">admin</span></span>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm font-medium"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-600/25 active:scale-95 cursor-pointer mt-2"
            >
              <span>Ingresar al Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {hasGoogleClient && (
            <div className="space-y-4 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider"><span className="bg-white px-2 text-slate-400 font-bold">O continúa con</span></div>
              </div>
              <div id="googleBtn" className="w-full"></div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Farmacia Yireh • Desarrollado por <span className="font-black text-emerald-400">SoftPlus</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
