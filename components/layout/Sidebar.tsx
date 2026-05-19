
import React from 'react';
import { NavLink } from 'react-router-dom';
import { HeartPulse, LayoutDashboard, ShoppingCart, Pill, BarChart3, Users, Truck, UserCog, LogOut, ShoppingBag, Lock } from 'lucide-react';
import { User } from '@/types';

interface SidebarProps {
  activeTab: string;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, currentUser, onLogout }) => {
  const isEmployee = currentUser.role !== 'ADMIN';

  return (
    <aside className="hidden md:flex w-64 lg:w-72 bg-slate-900 flex-col shrink-0 transition-all duration-300 z-50 h-screen border-r border-white/5">
      <div className="p-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2.5 rounded-2xl shrink-0 shadow-xl shadow-emerald-900/40">
            <HeartPulse className="text-white w-7 h-7" />
          </div>
          <span className="text-white font-black text-xl hidden md:block tracking-tight">
            FarmaPOS <span className="text-emerald-500 text-[10px] block uppercase font-bold tracking-widest">Enterprise ERP</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
        <NavButton to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
        <NavButton to="/pos" icon={<ShoppingCart />} label="Punto de Venta" />
        <NavButton to="/inventory" icon={<Pill />} label="Inventario" />
        {!isEmployee && <NavButton to="/reports" icon={<BarChart3 />} label="Reportes" />}
        <NavButton to="/customers" icon={<Users />} label="Pacientes" />
        <NavButton to="/suppliers" icon={<Truck />} label="Proveedores" />
        <NavButton to="/purchases" icon={<ShoppingBag />} label="Compras" />
        {!isEmployee && <NavButton to="/staff" icon={<UserCog />} label="Personal" />}
      </nav>

      <div className="p-6 mt-auto border-t border-white/5">
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[1.5rem] mb-4 hidden md:flex">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-lg">
            {currentUser.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
            <p className="text-emerald-500 text-[10px] uppercase font-black">{currentUser.role === 'ADMIN' ? 'ADMINISTRADOR' : 'EMPLEADO'}</p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-rose-400 hover:bg-rose-400/10 transition-all font-bold group">
          <LogOut className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="hidden md:block">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

const NavButton = ({ to, icon, label, isLocked }: { to: string, icon: any, label: string, isLocked?: boolean }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => 
      `w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${isActive ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40 translate-x-1' : 'text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1'}`
    }
  >
    {React.cloneElement(icon, { className: 'w-6 h-6 shrink-0' })}
    <span className="font-bold hidden md:block text-sm tracking-tight flex-1">{label}</span>
    {isLocked && (
      <Lock className="w-3.5 h-3.5 text-amber-500/80 group-hover:text-amber-400 hidden md:block" />
    )}
  </NavLink>
);

export default Sidebar;
