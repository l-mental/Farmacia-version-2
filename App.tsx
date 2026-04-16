
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';
import { useFarmaData } from '@/hooks/useFarmaData';
import Login from '@/components/Login';
import PosSystem from '@/components/PosSystem';
import InventoryManager from '@/components/InventoryManager';
import Dashboard from '@/components/Dashboard';
import Reports from '@/components/Reports';
import AIConsultant from '@/components/AIConsultant';
import StaffManager from '@/components/StaffManager';
import SuppliersManager from '@/components/SuppliersManager';
import CustomersManager from '@/components/CustomersManager';
import Sidebar from '@/components/layout/Sidebar';
import AppHeader from '@/components/layout/AppHeader';
import MobileNav from '@/components/layout/MobileNav';
import SettingsModal from '@/components/modals/SettingsModal';
import NewPatientModal from '@/components/modals/NewPatientModal';

type TabType = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'REPORTS' | 'CUSTOMERS' | 'STAFF' | 'SETTINGS' | 'SUPPLIERS';

const AppContent: React.FC = () => {
  const {
    currentUser,
    medications,
    customers,
    staff,
    sales,
    suppliers,
    currency,
    businessQR,
    isOnline,
    setMedications,
    setStaff,
    setSuppliers,
    setCurrency,
    setBusinessQR,
    handleLogin,
    handleLogout,
    handleAddPatient,
    handleCompleteSale
  } = useFarmaData();

  const [isAIConsultantOpen, setIsAIConsultantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const location = useLocation();

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const activeTab = (location.pathname.split('/')[1]?.toUpperCase() || 'DASHBOARD') as TabType;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-20 md:pb-0">
        <AppHeader 
          activeTab={activeTab}
          isOnline={isOnline}
          currency={currency}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
        />

        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard medications={medications} currencySymbol={currency.symbol} />} />
            <Route path="/pos" element={
              <PosSystem 
                medications={medications} 
                customers={customers} 
                onCompleteSale={handleCompleteSale} 
                onAddPatient={handleAddPatient} 
                currencySymbol={currency.symbol}
                businessQR={businessQR}
              />
            } />
            <Route path="/inventory" element={
               <InventoryManager 
                  medications={medications} 
                  onAdd={(m) => setMedications(prev => [...prev, m])} 
                  onUpdate={(m) => setMedications(prev => prev.map(x => x.id === m.id ? m : x))} 
                  onDelete={(id) => setMedications(prev => prev.filter(x => x.id !== id))}
                  currencySymbol={currency.symbol}
                />
            } />
            <Route path="/reports" element={<Reports sales={sales} currencySymbol={currency.symbol} />} />
            <Route path="/suppliers" element={
              <SuppliersManager 
                suppliers={suppliers}
                onAdd={(s) => setSuppliers(prev => [...prev, s])}
                onUpdate={(s) => setSuppliers(prev => prev.map(x => x.id === s.id ? s : x))}
                onDelete={(id) => setSuppliers(prev => prev.filter(x => x.id !== id))}
              />
            } />
            <Route path="/customers" element={
              <CustomersManager 
                customers={customers}
                sales={sales}
                currency={currency}
                onOpenAddModal={() => setIsNewPatientModalOpen(true)}
              />
            } />
            <Route path="/staff" element={
              currentUser.role === 'ADMIN' ? (
                <StaffManager 
                  staff={staff} 
                  onAdd={(u) => setStaff(prev => [...prev, u])} 
                  onUpdate={(u) => setStaff(prev => prev.map(x => x.id === u.id ? u : x))} 
                  onDelete={(id) => setStaff(prev => prev.filter(x => x.id !== id))}
                  sales={sales}
                />
              ) : <Navigate to="/dashboard" replace />
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <MobileNav 
        activeTab={activeTab} 
        currentUser={currentUser} 
      />

      {/* Floating AI Button */}
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
            <p className="text-sm font-bold">Asistente Bot</p>
          </div>
          <Sparkles className="w-4 h-4 text-emerald-300 hidden lg:block" />
        </button>
      )}

      {isAIConsultantOpen && currentUser && (
        <AIConsultant 
          onClose={() => setIsAIConsultantOpen(false)} 
          medications={medications}
          sales={sales}
          customers={customers}
          currentUser={currentUser}
        />
      )}

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currency={currency}
        setCurrency={setCurrency}
        businessQR={businessQR}
        setBusinessQR={setBusinessQR}
      />

      <NewPatientModal 
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onAdd={handleAddPatient}
      />

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

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
