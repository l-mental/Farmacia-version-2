
import React from 'react';
import { Globe, Settings, LogOut, Sun, Moon, Shield, User as UserIcon } from 'lucide-react';
import { Currency } from '@/types';

interface AppHeaderProps {
  activeTab: string;
  isOnline: boolean;
  currency: Currency;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  currentUserRole: 'ADMIN' | 'EMPLOYEE' | 'PHARMACIST';
  currentUserOriginalRole?: 'ADMIN' | 'EMPLOYEE' | 'PHARMACIST';
  onSwitchRole: (role: 'ADMIN' | 'EMPLOYEE' | 'PHARMACIST') => void;
}

const TAB_LABELS: Record<string, string> = {
  'DASHBOARD': 'Panel de Control',
  'POS': 'Punto de Venta',
  'INVENTORY': 'Inventario',
  'REPORTS': 'Reportes',
  'CUSTOMERS': 'Pacientes',
  'SUPPLIERS': 'Proveedores',
  'STAFF': 'Personal',
  'SETTINGS': 'Configuración'
};

const AppHeader: React.FC<AppHeaderProps> = ({ 
  activeTab, 
  isOnline, 
  currency, 
  darkMode,
  onToggleDarkMode,
  onOpenSettings, 
  onLogout,
  currentUserRole,
  currentUserOriginalRole = 'ADMIN',
  onSwitchRole
}) => {
  const displayTab = TAB_LABELS[activeTab] || activeTab;

  return (
    <header className="h-16 md:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-5 md:h-6 bg-emerald-500 rounded-full" />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">FarmaPOS</span>
          <h2 className="text-sm md:text-base font-bold text-slate-800 tracking-tight">{displayTab}</h2>
        </div>
      </div>
      <div className="flex items-center gap-3 md:gap-5">
        {/* Dynamic Interactive Role Switcher for the Demo (Only visible if the logged user is originally an ADMIN) */}
        {currentUserOriginalRole === 'ADMIN' && (
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => onSwitchRole('ADMIN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                currentUserRole === 'ADMIN'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cambiar a Administrador"
            >
              <Shield className="w-3 h-3" />
              <span className="hidden sm:inline">Admin</span>
            </button>
            <button
              onClick={() => onSwitchRole('EMPLOYEE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                currentUserRole === 'EMPLOYEE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cambiar a Empleado"
            >
              <UserIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Empleado</span>
            </button>
          </div>
        )}

        <button 
          onClick={onToggleDarkMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 text-amber-400 shadow-sm' 
              : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600'
          }`}
          title={darkMode ? "Activar Modo Claro" : "Activar Modo Oscuro"}
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-black uppercase tracking-wider hidden md:block">
            {darkMode ? 'M. Claro' : 'M. Oscuro'}
          </span>
        </button>

        <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${isOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
           <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
           <span className={`text-[9px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
             {isOnline ? 'Online' : 'Offline'}
           </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
           <Globe className="w-3.5 h-3.5 text-emerald-600" />
           <span className="text-[10px] font-black text-emerald-700 uppercase">{currency.code} ({currency.symbol})</span>
        </div>
        <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button onClick={onLogout} className="md:hidden p-2 text-rose-400">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
