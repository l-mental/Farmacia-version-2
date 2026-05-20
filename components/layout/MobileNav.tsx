
import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Pill, BarChart3, Users, Truck, UserCog, ShoppingBag } from 'lucide-react';
import { User } from '@/types';

interface MobileNavProps {
  activeTab: string;
  currentUser: User;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, currentUser }) => {
  const isEmployee = currentUser.role !== 'ADMIN';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Automatically scroll the active item into view on route change
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    setTimeout(() => {
      const activeElement = scrollContainerRef.current?.querySelector('.active-mobile-tab');
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 100);
  }, [location.pathname]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[76px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-white/5 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.4)] z-[90] flex items-center">
      <div 
        ref={scrollContainerRef}
        className="flex items-center gap-1 w-full h-full px-4 overflow-x-auto no-scrollbar select-none scroll-smooth"
      >
        <MobileTabButton to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
        <MobileTabButton to="/pos" icon={<ShoppingCart />} label="POS" />
        <MobileTabButton to="/inventory" icon={<Pill />} label="Inventario" />
        {!isEmployee && <MobileTabButton to="/reports" icon={<BarChart3 />} label="Reportes" />}
        <MobileTabButton to="/customers" icon={<Users />} label="Pacientes" />
        <MobileTabButton to="/suppliers" icon={<Truck />} label="Provs" />
        <MobileTabButton to="/purchases" icon={<ShoppingBag />} label="Compras" />
        {!isEmployee && <MobileTabButton to="/staff" icon={<UserCog />} label="Personal" />}
      </div>
    </nav>
  );
};

const MobileTabButton = ({ to, icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => 
      `flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 min-w-[74px] shrink-0 gap-1 select-none ${
        isActive 
          ? 'active-mobile-tab text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 font-bold scale-105 border border-emerald-100/50 dark:border-emerald-500/15' 
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-amber-500 border border-transparent'
      }`
    }
  >
    {React.cloneElement(icon, { className: 'w-5 h-5 shrink-0 transition-transform active:scale-95' })}
    <span className="text-[10px] font-black tracking-tight text-center truncate w-full uppercase">{label}</span>
  </NavLink>
);

export default MobileNav;
