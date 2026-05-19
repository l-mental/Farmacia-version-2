
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Pill, BarChart3, Users, Truck, UserCog, ShoppingBag } from 'lucide-react';
import { User } from '@/types';

interface MobileNavProps {
  activeTab: string;
  currentUser: User;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, currentUser }) => {
  const isEmployee = currentUser.role !== 'ADMIN';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 flex justify-around items-center h-16 px-1 z-[90] overflow-x-auto no-scrollbar">
      <MobileTabButton to="/dashboard" icon={<LayoutDashboard />} />
      <MobileTabButton to="/pos" icon={<ShoppingCart />} />
      <MobileTabButton to="/inventory" icon={<Pill />} />
      {!isEmployee && <MobileTabButton to="/reports" icon={<BarChart3 />} />}
      <MobileTabButton to="/customers" icon={<Users />} />
      <MobileTabButton to="/suppliers" icon={<Truck />} />
      <MobileTabButton to="/purchases" icon={<ShoppingBag />} />
      {!isEmployee && <MobileTabButton to="/staff" icon={<UserCog />} />}
    </nav>
  );
};

const MobileTabButton = ({ to, icon }: { to: string, icon: any }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => 
      `p-3 rounded-xl transition-all ${isActive ? 'text-emerald-500' : 'text-slate-500'}`
    }
  >
    {React.cloneElement(icon, { className: 'w-6 h-6' })}
  </NavLink>
);

export default MobileNav;
