import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useFarmaData } from '@/hooks/useFarmaData';
import { usePeriodicAlerts } from '@/hooks/usePeriodicAlerts';
import Login from '@/components/Login';
import PosSystem from '@/components/PosSystem';
import InventoryManager from '@/components/InventoryManager';
import Dashboard from '@/components/Dashboard';
import Reports from '@/components/Reports';
import StaffManager from '@/components/StaffManager';
import SuppliersManager from '@/components/SuppliersManager';
import CustomersManager from '@/components/CustomersManager';
import PurchasesManager from '@/components/PurchasesManager';
import Sidebar from '@/components/layout/Sidebar';
import AppHeader from '@/components/layout/AppHeader';
import MobileNav from '@/components/layout/MobileNav';
import SettingsModal from '@/components/modals/SettingsModal';
import NewPatientModal from '@/components/modals/NewPatientModal';
import SystemNotificationBanner from '@/components/SystemNotificationBanner';
import { canUserAccessSection } from '@/types';

type TabType = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'REPORTS' | 'CUSTOMERS' | 'STAFF' | 'SETTINGS' | 'SUPPLIERS' | 'PURCHASES';

const AppContent: React.FC = () => {
  const {
    currentUser,
    pharmacyInfo,
    medications,
    customers,
    staff,
    sales,
    suppliers,
    purchases,
    currency,
    activeCashRegister,
    businessQR,
    isOnline,
    darkMode,
    setPharmacyInfo,
    setMedications,
    setStaff,
    setSuppliers,
    setPurchases,
    setCurrency,
    setActiveCashRegister,
    setBusinessQR,
    setDarkMode,
    handleLogin,
    handleLogout,
    handleSwitchRole,
    handleAddPatient,
    handleCompleteSale,
    handleRegisterPurchase,
    resetToMockData
  } = useFarmaData();

  // Periodic System Alerts Hook (Native OS Notifications, Audio Chime, Vibration every 5 mins)
  const {
    settings: notificationSettings,
    updateSettings: updateNotificationSettings,
    activeAlert,
    dismissAlert,
    triggerTestAlert,
    permissionStatus,
    requestPermission
  } = usePeriodicAlerts(medications);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const location = useLocation();

  // Apply dark mode class
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const activeTab = (location.pathname.split('/')[1]?.toUpperCase() || 'DASHBOARD') as TabType;

  // Determine user's primary allowed route based on their permissions
  const defaultPath = canUserAccessSection(currentUser, 'DASHBOARD') 
    ? '/dashboard' 
    : canUserAccessSection(currentUser, 'POS') 
    ? '/pos' 
    : canUserAccessSection(currentUser, 'INVENTORY') 
    ? '/inventory' 
    : canUserAccessSection(currentUser, 'CUSTOMERS')
    ? '/customers'
    : '/pos';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-hidden">
      {/* Floating System Alert Banner (Low battery / urgent alert style) */}
      <SystemNotificationBanner 
        alert={activeAlert}
        onDismiss={dismissAlert}
        permissionStatus={permissionStatus}
        onRequestPermission={requestPermission}
        intervalMinutes={notificationSettings.intervalMinutes}
      />

      <Sidebar 
        activeTab={activeTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-24 md:pb-0">
        <AppHeader 
          activeTab={activeTab}
          isOnline={isOnline}
          currency={currency}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
          currentUserRole={currentUser.role}
          currentUserOriginalRole={currentUser.originalRole}
          onSwitchRole={handleSwitchRole}
          medications={medications}
          notificationSettings={notificationSettings}
          onUpdateNotificationSettings={updateNotificationSettings}
          onTriggerTestAlert={triggerTestAlert}
          permissionStatus={permissionStatus}
          onRequestPermission={requestPermission}
        />

        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />

            <Route path="/dashboard" element={
              canUserAccessSection(currentUser, 'DASHBOARD') ? (
                <Dashboard medications={medications} sales={sales} currencySymbol={currency.symbol} />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="/pos" element={
              canUserAccessSection(currentUser, 'POS') ? (
                <PosSystem 
                  medications={medications} 
                  customers={customers} 
                  onCompleteSale={handleCompleteSale} 
                  onAddPatient={handleAddPatient} 
                  currencySymbol={currency.symbol}
                  businessQR={businessQR}
                  pharmacyInfo={pharmacyInfo}
                  currentUser={currentUser}
                  activeCashRegister={activeCashRegister}
                  onChangeCashRegister={setActiveCashRegister}
                />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="/inventory" element={
              canUserAccessSection(currentUser, 'INVENTORY') ? (
                <InventoryManager 
                  medications={medications} 
                  onAdd={(m) => setMedications(prev => [...prev, m])} 
                  onUpdate={(m) => setMedications(prev => prev.map(x => x.id === m.id ? m : x))} 
                  onDelete={(id) => setMedications(prev => prev.filter(x => x.id !== id))}
                  currencySymbol={currency.symbol}
                  currentUser={currentUser}
                  currentUserRole={currentUser.role}
                />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="/reports" element={
              canUserAccessSection(currentUser, 'REPORTS') ? (
                <Reports 
                  sales={sales} 
                  currencySymbol={currency.symbol} 
                  currentUserRole={currentUser.role}
                  pharmacyInfo={pharmacyInfo}
                  staff={staff}
                />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="/suppliers" element={
              canUserAccessSection(currentUser, 'SUPPLIERS') ? (
                <SuppliersManager 
                  suppliers={suppliers}
                  onAdd={(s) => setSuppliers(prev => [...prev, s])}
                  onUpdate={(s) => setSuppliers(prev => prev.map(x => x.id === s.id ? s : x))}
                  onDelete={(id) => setSuppliers(prev => prev.filter(x => x.id !== id))}
                />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="/purchases" element={
              canUserAccessSection(currentUser, 'PURCHASES') ? (
                <PurchasesManager 
                  purchases={purchases}
                  suppliers={suppliers}
                  medications={medications}
                  onRegister={handleRegisterPurchase}
                  currencySymbol={currency.symbol}
                />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="/customers" element={
              canUserAccessSection(currentUser, 'CUSTOMERS') ? (
                <CustomersManager 
                  customers={customers}
                  sales={sales}
                  currency={currency}
                  onOpenAddModal={() => setIsNewPatientModalOpen(true)}
                />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="/staff" element={
              canUserAccessSection(currentUser, 'STAFF') ? (
                <StaffManager 
                  staff={staff} 
                  onAdd={(u) => setStaff(prev => [...prev, u])} 
                  onUpdate={(u) => setStaff(prev => prev.map(x => x.id === u.id ? u : x))} 
                  onDelete={(id) => setStaff(prev => prev.filter(x => x.id !== id))}
                  sales={sales}
                  currentUserRole={currentUser.role}
                />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        </div>
      </main>

      <MobileNav 
        activeTab={activeTab} 
        currentUser={currentUser} 
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currency={currency}
        setCurrency={setCurrency}
        businessQR={businessQR}
        setBusinessQR={setBusinessQR}
        pharmacyInfo={pharmacyInfo}
        setPharmacyInfo={setPharmacyInfo}
        onResetData={resetToMockData}
        currentUserRole={currentUser.role}
        notificationSettings={notificationSettings}
        onUpdateNotificationSettings={updateNotificationSettings}
        onTriggerTestAlert={triggerTestAlert}
        permissionStatus={permissionStatus}
        onRequestPermission={requestPermission}
      />

      <NewPatientModal 
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onAdd={handleAddPatient}
      />
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
