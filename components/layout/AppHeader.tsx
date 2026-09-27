
import React, { useState } from 'react';
import { 
  Globe, Settings, LogOut, Sun, Moon, Shield, User as UserIcon, 
  Bell, AlertOctagon, Clock, X, ChevronRight, Volume2, Vibrate, 
  Smartphone, Monitor, Sparkles, Check, Printer, Cloud
} from 'lucide-react';
import { Currency, Medication, UserRole, PharmacyInfo } from '@/types';
import { NotificationSettings } from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';
import { printCriticalInventoryReport } from '@/lib/printAlertsReport';

interface AppHeaderProps {
  activeTab: string;
  isOnline: boolean;
  currency: Currency;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  currentUserRole: UserRole;
  currentUserOriginalRole?: UserRole;
  onSwitchRole: (role: UserRole) => void;
  medications?: Medication[];
  pharmacyInfo?: PharmacyInfo;
  notificationSettings?: NotificationSettings;
  onUpdateNotificationSettings?: (settings: Partial<NotificationSettings>) => void;
  onTriggerTestAlert?: () => void;
  permissionStatus?: NotificationPermission | 'unsupported';
  onRequestPermission?: () => void;
  isCloudConnected?: boolean;
  cloudLastSync?: string | null;
  isSyncingWithCloud?: boolean;
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
  onSwitchRole,
  medications = [],
  pharmacyInfo,
  notificationSettings,
  onUpdateNotificationSettings,
  onTriggerTestAlert,
  permissionStatus,
  onRequestPermission,
  isCloudConnected = false,
  cloudLastSync = null,
  isSyncingWithCloud = false
}) => {
  const displayTab = TAB_LABELS[activeTab] || activeTab;
  const navigate = useNavigate();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Compute alerts: Low stock and Expiry
  const now = new Date().getTime();
  
  // Stock minimum alerts: when current stock is equal or less than configured minimum
  const lowStockMeds = medications.filter(m => m.stockBoxes <= m.minStock);

  const expiredMeds = medications.filter(m => {
    const exp = m.batches[0]?.expiryDate;
    if (!exp) return false;
    const t = new Date(exp).getTime();
    return !isNaN(t) && t < now;
  });

  const shortExpiryMeds = medications.filter(m => {
    const exp = m.batches[0]?.expiryDate;
    if (!exp) return false;
    const t = new Date(exp).getTime();
    if (isNaN(t)) return false;
    const diff = t - now;
    return diff >= 0 && diff < (90 * 24 * 60 * 60 * 1000);
  });

  const totalAlertCount = lowStockMeds.length + expiredMeds.length + shortExpiryMeds.length;
  const [activeAlertTab, setActiveAlertTab] = useState<'ALL' | 'STOCK' | 'EXPIRED' | 'SHORT'>('ALL');

  return (
    <header className="h-16 md:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 lg:px-10 shrink-0 z-20 relative">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-5 md:h-6 bg-emerald-500 rounded-full" />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider leading-none mb-1">
            Farmacia Yireh <span className="text-slate-400 font-medium">| SoftPlus</span>
          </span>
          <h2 className="text-sm md:text-base font-bold text-slate-800 tracking-tight">{displayTab}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        {/* Stock & Expiration Alert Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className={`p-2 rounded-xl border transition-all relative ${
              totalAlertCount > 0 
                ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 shadow-sm' 
                : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600'
            }`}
            title={totalAlertCount > 0 ? `${totalAlertCount} Alertas de Stock y Vencimiento` : 'Sin alertas pendientes'}
          >
            <Bell className="w-4 h-4" />
            {totalAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 h-4 min-w-[16px] bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {totalAlertCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Modal / Popover */}
          {isAlertsOpen && (
            <div className="absolute right-0 top-12 w-84 sm:w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 p-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Centro de Notificaciones</h4>
                    <p className="text-[10px] text-slate-400 font-bold">{totalAlertCount} alertas requieren tu atención</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAlertsOpen(false)} 
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Notification Category Tabs */}
              <div className="flex items-center gap-1 py-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveAlertTab('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                    activeAlertTab === 'ALL' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({totalAlertCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAlertTab('STOCK')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeAlertTab === 'STOCK' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                  }`}
                >
                  <span>⚠️ Bajo Stock</span>
                  <span className="px-1 bg-white/20 rounded font-black">{lowStockMeds.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAlertTab('EXPIRED')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeAlertTab === 'EXPIRED' 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  <span>🚨 Vencidos</span>
                  <span className="px-1 bg-white/20 rounded font-black">{expiredMeds.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAlertTab('SHORT')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeAlertTab === 'SHORT' 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <span>⏳ Por Vencer</span>
                  <span className="px-1 bg-white/20 rounded font-black">{shortExpiryMeds.length}</span>
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto no-scrollbar py-2 space-y-2">
                {totalAlertCount === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">¡Todo en orden! No hay alertas de stock bajo ni vencimientos.</p>
                ) : (
                  <>
                    {/* Low Stock Alerts */}
                    {(activeAlertTab === 'ALL' || activeAlertTab === 'STOCK') && lowStockMeds.map(m => (
                      <div key={`stock-${m.id}`} className="p-2.5 bg-orange-50 border border-orange-200/80 rounded-xl flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full shrink-0" />
                            <p className="font-black text-slate-900 leading-tight truncate">{m.name}</p>
                          </div>
                          <p className="text-[10px] text-orange-950 font-bold mt-0.5">
                            Quedan solo <span className="underline font-black">{m.stockBoxes} cajas</span> (Mínimo: {m.minStock} cajas)
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-orange-500 text-white rounded-lg font-black text-[9px] uppercase whitespace-nowrap shrink-0">
                          Bajo Stock
                        </span>
                      </div>
                    ))}

                    {/* Expired Alerts */}
                    {(activeAlertTab === 'ALL' || activeAlertTab === 'EXPIRED') && expiredMeds.map(m => (
                      <div key={`exp-${m.id}`} className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0" />
                            <p className="font-black text-slate-900 leading-tight truncate">{m.name}</p>
                          </div>
                          <p className="text-[10px] text-rose-800 font-bold mt-0.5">
                            Lote: {m.batches[0]?.lotNumber || 'S/L'} • Venció: {m.batches[0]?.expiryDate}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-600 text-white rounded-lg font-black text-[9px] uppercase whitespace-nowrap shrink-0">
                          Vencido
                        </span>
                      </div>
                    ))}

                    {/* Short Expiry Alerts */}
                    {(activeAlertTab === 'ALL' || activeAlertTab === 'SHORT') && shortExpiryMeds.map(m => (
                      <div key={`short-${m.id}`} className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                            <p className="font-black text-slate-900 leading-tight truncate">{m.name}</p>
                          </div>
                          <p className="text-[10px] text-amber-800 font-bold mt-0.5">
                            Lote: {m.batches[0]?.lotNumber || 'S/L'} • Vence: {m.batches[0]?.expiryDate}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-900 rounded-lg font-black text-[9px] uppercase whitespace-nowrap shrink-0">
                          &lt; 90 Días
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Recurring System Notification Controls Card */}
              {notificationSettings && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                      <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                        Avisos en Celular y PC
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notificationSettings.enabled}
                        onChange={(e) => onUpdateNotificationSettings?.({ enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {notificationSettings.enabled && (
                    <div className="space-y-2 pt-1 border-t border-slate-200/60">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-bold">Frecuencia de aviso:</span>
                        <select
                          value={notificationSettings.intervalMinutes}
                          onChange={(e) => onUpdateNotificationSettings?.({ intervalMinutes: parseInt(e.target.value) || 5 })}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 font-bold outline-none cursor-pointer"
                        >
                          <option value={1}>Cada 1 minuto (Prueba rápida)</option>
                          <option value={5}>Cada 5 minutos (Recomendado)</option>
                          <option value={10}>Cada 10 minutos</option>
                          <option value={15}>Cada 15 minutos</option>
                          <option value={30}>Cada 30 minutos</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-600">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={notificationSettings.soundEnabled}
                            onChange={(e) => onUpdateNotificationSettings?.({ soundEnabled: e.target.checked })}
                            className="rounded text-emerald-600"
                          />
                          <Volume2 className="w-3 h-3 text-slate-400" />
                          <span>Sonido Chime</span>
                        </label>

                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={notificationSettings.vibrationEnabled}
                            onChange={(e) => onUpdateNotificationSettings?.({ vibrationEnabled: e.target.checked })}
                            className="rounded text-emerald-600"
                          />
                          <Vibrate className="w-3 h-3 text-slate-400" />
                          <span>Vibración Móvil</span>
                        </label>
                      </div>

                      {permissionStatus !== 'granted' && onRequestPermission && (
                        <button
                          type="button"
                          onClick={onRequestPermission}
                          className="w-full py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Bell className="w-3 h-3 text-amber-700" />
                          <span>Permitir Notificaciones en el Navegador</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onTriggerTestAlert?.();
                          setTestSent(true);
                          setTimeout(() => setTestSent(false), 2500);
                        }}
                        className="w-full py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {testSent ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">¡Alerta de prueba disparada!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>Probar Notificación Ahora (Celular y PC)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    printCriticalInventoryReport(medications, pharmacyInfo);
                  }}
                  className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Generar e imprimir lista de todos los productos vencidos y cortos de stock"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Lista (Vencidos y Bajo Stock)</span>
                </button>
                <button
                  onClick={() => {
                    setIsAlertsOpen(false);
                    navigate('/inventory');
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Ir a Gestión de Inventario</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={onToggleDarkMode}
          className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all ${
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

        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            isCloudConnected 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-sm' 
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title={isCloudConnected ? `Supabase Conectado. Sincronización en tiempo real activa. ${cloudLastSync ? `Última sinc: ${cloudLastSync}` : ''}` : 'Nube no conectada. Haz clic aquí para conectar Supabase.'}
        >
          <Cloud className={`w-3.5 h-3.5 ${isSyncingWithCloud ? 'animate-bounce text-emerald-600' : isCloudConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
            {isSyncingWithCloud ? 'Sincronizando...' : isCloudConnected ? 'Nube Activa' : 'Modo Local'}
          </span>
        </button>

        <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${isOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
           <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
           <span className={`text-[9px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
             {isOnline ? 'Online' : 'Offline'}
           </span>
        </div>
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
           <Globe className="w-3.5 h-3.5 text-emerald-600" />
           <span className="text-[10px] font-black text-emerald-700 uppercase">{currency.code} ({currency.symbol})</span>
        </div>
        {currentUserRole === 'ADMIN' && (
          <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title="Configuración">
            <Settings className="w-5 h-5" />
          </button>
        )}
        <button onClick={onLogout} className="md:hidden p-2 text-rose-400">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
