
import React, { useState } from 'react';
import { MOCK_MEDICATIONS } from './constants';
import { Medication, User, SaleItem, InsurancePlan, PrescriptionData } from './types';
import Login from './components/Login';
import PosSystem from './components/PosSystem';
import InventoryManager from './components/InventoryManager';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import AIConsultant from './components/AIConsultant';
import { HeartPulse, LayoutDashboard, ShoppingCart, Pill, LogOut, Bot, BarChart3, Users, Settings, Sparkles, Menu } from 'lucide-react';

type TabType = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'REPORTS' | 'CUSTOMERS' | 'SETTINGS';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [medications, setMedications] = useState<Medication[]>(MOCK_MEDICATIONS);
  const [isAIConsultantOpen, setIsAIConsultantOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleCompleteSale = (items: SaleItem[], insurance: InsurancePlan, prescription?: PrescriptionData) => {
    const updatedMeds = medications.map(med => {
      const soldItemsForMed = items.filter(item => item.medication.id === med.id);
      if (soldItemsForMed.length > 0) {
        let newStockBoxes = med.stockBoxes;
        let newStockUnits = med.stockUnits;
        soldItemsForMed.forEach(soldItem => {
          if (soldItem.isFractional) {
            newStockUnits = Math.max(0, newStockUnits - soldItem.quantity);
          } else {
            newStockBoxes = Math.max(0, newStockBoxes - soldItem.quantity);
          }
        });
        return { ...med, stockBoxes: newStockBoxes, stockUnits: newStockUnits };
      }
      return med;
    });
    setMedications(updatedMeds);
    alert("Venta procesada con éxito y stock actualizado.");
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-20 lg:w-72 bg-slate-900 flex-col shrink-0 transition-all duration-300 z-50 h-screen">
        <div className="p-8 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-2xl shrink-0 shadow-xl shadow-emerald-900/40">
              <HeartPulse className="text-white w-7 h-7" />
            </div>
            <span className="text-white font-black text-xl hidden lg:block tracking-tight">FarmaSalud <span className="text-emerald-500 text-[10px] block uppercase font-bold tracking-widest">Enterprise ERP</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavButton active={activeTab === 'POS'} onClick={() => setActiveTab('POS')} icon={<ShoppingCart />} label="Punto de Venta" />
          <NavButton active={activeTab === 'INVENTORY'} onClick={() => setActiveTab('INVENTORY')} icon={<Pill />} label="Inventario" />
          <NavButton active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} icon={<BarChart3 />} label="Reportes" />
          <NavButton active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} label="Pacientes" />
        </nav>

        <div className="p-6 mt-auto border-t border-white/5">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[1.5rem] mb-4 hidden lg:flex">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-lg">
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
              <p className="text-emerald-500 text-[10px] uppercase font-black">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-rose-400 hover:bg-rose-400/10 transition-all font-bold">
            <LogOut className="w-6 h-6" />
            <span className="hidden lg:block">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-20 md:pb-0">
        <header className="h-16 md:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 md:h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Online</span>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="md:hidden p-2 text-rose-400">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'DASHBOARD' && <Dashboard medications={medications} />}
          {activeTab === 'POS' && <PosSystem medications={medications} onCompleteSale={handleCompleteSale} />}
          {activeTab === 'INVENTORY' && (
             <InventoryManager 
                medications={medications} 
                onAdd={(m) => setMedications([...medications, m])} 
                onUpdate={(m) => setMedications(medications.map(x => x.id === m.id ? m : x))} 
                onDelete={(id) => setMedications(medications.filter(x => x.id !== id))}
              />
          )}
          {activeTab === 'REPORTS' && <Reports />}
          {activeTab === 'CUSTOMERS' && <div className="p-20 text-center text-slate-400 italic font-bold">Módulo de Pacientes en Desarrollo...</div>}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 flex justify-around items-center h-16 px-4 z-[90]">
        <MobileTabButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} />
        <MobileTabButton active={activeTab === 'POS'} onClick={() => setActiveTab('POS')} icon={<ShoppingCart />} />
        <MobileTabButton active={activeTab === 'INVENTORY'} onClick={() => setActiveTab('INVENTORY')} icon={<Pill />} />
        <MobileTabButton active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} icon={<BarChart3 />} />
        <MobileTabButton active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} />
      </nav>

      {/* Floating AI Button - Adjusted for Mobile Nav */}
      {!isAIConsultantOpen && (
        <button 
          onClick={() => setIsAIConsultantOpen(true)}
          className="fixed bottom-20 md:bottom-8 right-6 md:right-8 z-[100] group flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white p-4 lg:px-6 lg:py-4 rounded-full lg:rounded-2xl shadow-2xl shadow-emerald-600/40 transition-all duration-300 hover:scale-105 active:scale-95 animate-bounce-subtle"
        >
          <div className="relative">
            <Bot className="w-6 h-6 md:w-7 md:h-7" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Consultas</p>
            <p className="text-sm font-bold">Asistente IA</p>
          </div>
          <Sparkles className="w-4 h-4 text-emerald-300 hidden lg:block" />
        </button>
      )}

      {/* AI Consultant Modal Overlay */}
      {isAIConsultantOpen && (
        <AIConsultant onClose={() => setIsAIConsultantOpen(false)} />
      )}

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6 shrink-0' })}
    <span className="font-bold hidden lg:block text-sm">{label}</span>
  </button>
);

const MobileTabButton = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all ${active ? 'text-emerald-500' : 'text-slate-500'}`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6' })}
  </button>
);

export default App;
