
import React from 'react';
import { HeartPulse, LayoutDashboard, ShoppingCart, Pill, BarChart3, Users, Truck, UserCog, LogOut } from 'lucide-react';
import { User } from '@/types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, onLogout }) => {
  return (
    <aside className="hidden md:flex w-64 lg:w-72 bg-slate-900 flex-col shrink-0 transition-all duration-300 z-50 h-screen border-r border-white/5">
      <div className="p-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2.5 rounded-2xl shrink-0 shadow-xl shadow-emerald-900/40">
            <HeartPulse className="text-white w-7 h-7" />
          </div>
          <span className="text-white font-black text-xl hidden md:block tracking-tight">
            FarmaSalud <span className="text-emerald-500 text-[10px] block uppercase font-bold tracking-widest">Enterprise ERP</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
        <NavButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} label="Dashboard" />
        <NavButton active={activeTab === 'POS'} onClick={() => setActiveTab('POS')} icon={<ShoppingCart />} label="Punto de Venta" />
        <NavButton active={activeTab === 'INVENTORY'} onClick={() => setActiveTab('INVENTORY')} icon={<Pill />} label="Inventario" />
        <NavButton active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} icon={<BarChart3 />} label="Reportes" />
        <NavButton active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} label="Pacientes" />
        <NavButton active={activeTab === 'SUPPLIERS'} onClick={() => setActiveTab('SUPPLIERS')} icon={<Truck />} label="Proveedores" />
        {currentUser.role === 'ADMIN' && (
          <NavButton active={activeTab === 'STAFF'} onClick={() => setActiveTab('STAFF')} icon={<UserCog />} label="Personal" />
        )}
      </nav>

      <div className="p-6 mt-auto border-t border-white/5">
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[1.5rem] mb-4 hidden md:flex">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-lg">
            {currentUser.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
            <p className="text-emerald-500 text-[10px] uppercase font-black">{currentUser.role}</p>
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

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40 translate-x-1' : 'text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1'}`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6 shrink-0' })}
    <span className="font-bold hidden md:block text-sm tracking-tight">{label}</span>
  </button>
);

export default Sidebar;
