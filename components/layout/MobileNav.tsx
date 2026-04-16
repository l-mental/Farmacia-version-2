
import React from 'react';
import { LayoutDashboard, ShoppingCart, Pill, BarChart3, Users, Truck, UserCog } from 'lucide-react';
import { User } from '@/types';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: User;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, currentUser }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 flex justify-around items-center h-16 px-4 z-[90]">
      <MobileTabButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} />
      <MobileTabButton active={activeTab === 'POS'} onClick={() => setActiveTab('POS')} icon={<ShoppingCart />} />
      <MobileTabButton active={activeTab === 'INVENTORY'} onClick={() => setActiveTab('INVENTORY')} icon={<Pill />} />
      <MobileTabButton active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} icon={<BarChart3 />} />
      <MobileTabButton active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} />
      <MobileTabButton active={activeTab === 'SUPPLIERS'} onClick={() => setActiveTab('SUPPLIERS')} icon={<Truck />} />
      {currentUser.role === 'ADMIN' && (
        <MobileTabButton active={activeTab === 'STAFF'} onClick={() => setActiveTab('STAFF')} icon={<UserCog />} />
      )}
    </nav>
  );
};

const MobileTabButton = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all ${active ? 'text-emerald-500' : 'text-slate-500'}`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6' })}
  </button>
);

export default MobileNav;
