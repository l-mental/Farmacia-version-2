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
import { SupabaseSetupModal } from '@/components/modals/SupabaseSetupModal';
import { getStoredSupabaseConfig, pullAllFromSupabase } from '@/services/supabaseService';
import { canUserAccessSection } from '@/types';
import { Database } from 'lucide-react';

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
    discountPlans,
    setPharmacyInfo,
    setMedications,
    setCustomers,
    setStaff,
    setSales,
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
    handleAddMedication,
    handleUpdateMedication,
    handleDeleteMedication,
    handleBatchAddMeds,
    handleReplaceMeds,
    handleClearDemoData,
    handleClearAllInventory,
    handleExportFullBackup,
    handleImportFullBackup,
    handleAddDiscountPlan,
    handleDeleteDiscountPlan,
    isCloudConnected,
    isCloudTableReady,
    checkSupabaseTableReady,
    cloudLastSync,
    isSyncingWithCloud,
    handleConnectCloud,
    handleDisconnectCloud,
    handleManualCloudSync,
    handleTestCloudConnection,
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
  const [isSupabaseSetupOpen, setIsSupabaseSetupOpen] = useState(false);
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
    return (
      <Login 
        onLogin={handleLogin} 
        staff={staff} 
        onRefreshStaff={async () => {
          const res = await pullAllFromSupabase();
          if (res.success && res.data?.staff && Array.isArray(res.data.staff) && res.data.staff.length > 0) {
            setStaff(res.data.staff);
            return res.data.staff;
          }
          return [];
        }}
      />
    );
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
        medications={medications}
        pharmacyInfo={pharmacyInfo}
      />

      <Sidebar 
        activeTab={activeTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-24 md:pb-0">
        {isCloudConnected && isCloudTableReady === false && (
          <div className="bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black flex items-center justify-between shadow-md z-30 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-4 h-4 text-slate-950 shrink-0" />
              <span className="truncate">Base de datos Supabase conectada. Falta crear la tabla farma_sync para persistencia permanente.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSupabaseSetupOpen(true)}
              className="ml-3 px-3 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0"
            >
              Copiar SQL (1 Clic)
            </button>
          </div>
        )}

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
          pharmacyInfo={pharmacyInfo}
          notificationSettings={notificationSettings}
          onUpdateNotificationSettings={updateNotificationSettings}
          onTriggerTestAlert={triggerTestAlert}
          permissionStatus={permissionStatus}
          onRequestPermission={requestPermission}
          isCloudConnected={isCloudConnected}
          cloudLastSync={cloudLastSync}
          isSyncingWithCloud={isSyncingWithCloud}
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
                  discountPlans={discountPlans}
                  onAddDiscountPlan={handleAddDiscountPlan}
                />
              ) : <Navigate to={defaultPath} replace />
            } />

            <Route path="/inventory" element={
              canUserAccessSection(currentUser, 'INVENTORY') ? (
                <InventoryManager 
                  medications={medications} 
                  onAdd={handleAddMedication} 
                  onBatchAdd={handleBatchAddMeds}
                  onReplaceAll={handleReplaceMeds}
                  onClearInventory={handleClearAllInventory}
                  onUpdate={handleUpdateMedication} 
                  onDelete={handleDeleteMedication}
                  currencySymbol={currency.symbol}
                  currentUser={currentUser}
                  currentUserRole={currentUser.role}
                  pharmacyInfo={pharmacyInfo}
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
        discountPlans={discountPlans}
        onAddDiscountPlan={handleAddDiscountPlan}
        onDeleteDiscountPlan={handleDeleteDiscountPlan}
        onClearDemoData={handleClearDemoData}
        onExportBackup={handleExportFullBackup}
        onImportBackup={handleImportFullBackup}
        currentUserRole={currentUser.role}
        notificationSettings={notificationSettings}
        onUpdateNotificationSettings={updateNotificationSettings}
        onTriggerTestAlert={triggerTestAlert}
        permissionStatus={permissionStatus}
        onRequestPermission={requestPermission}
        isCloudConnected={isCloudConnected}
        cloudLastSync={cloudLastSync}
        isSyncingWithCloud={isSyncingWithCloud}
        onConnectCloud={handleConnectCloud}
        onDisconnectCloud={handleDisconnectCloud}
        onManualCloudSync={handleManualCloudSync}
        onTestCloudConnection={handleTestCloudConnection}
      />

      <NewPatientModal 
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onAdd={handleAddPatient}
      />

      <SupabaseSetupModal 
        isOpen={isSupabaseSetupOpen}
        onClose={() => setIsSupabaseSetupOpen(false)}
        onVerify={async () => {
          const res = await checkSupabaseTableReady();
          return res.ready;
        }}
        supabaseUrl={getStoredSupabaseConfig().url}
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
