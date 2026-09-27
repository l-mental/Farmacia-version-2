import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Trash2, Plus, Building2, Store, QrCode, 
  Bell, Volume2, Vibrate, Smartphone, Monitor, Sparkles, Check,
  Percent, Tag, Download, Upload, Database, RefreshCw, CheckCircle2, Shield,
  Cloud, Copy, ExternalLink, Key, Info
} from 'lucide-react';
import { Currency, PharmacyInfo, InsurancePlan } from '@/types';
import { SUPPORTED_CURRENCIES } from '@/constants';
import { NotificationSettings } from '@/services/notificationService';
import { SUPABASE_SETUP_SQL, getStoredSupabaseConfig } from '@/services/supabaseService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  businessQR: string | null;
  setBusinessQR: (qr: string | null) => void;
  pharmacyInfo?: PharmacyInfo;
  setPharmacyInfo?: (info: PharmacyInfo) => void;
  discountPlans?: InsurancePlan[];
  onAddDiscountPlan?: (plan: Omit<InsurancePlan, 'id'>) => void;
  onDeleteDiscountPlan?: (id: string) => void;
  onClearDemoData?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (data: any) => void;
  currentUserRole?: string;
  notificationSettings?: NotificationSettings;
  onUpdateNotificationSettings?: (settings: Partial<NotificationSettings>) => void;
  onTriggerTestAlert?: () => void;
  permissionStatus?: NotificationPermission | 'unsupported';
  onRequestPermission?: () => void;
  isCloudConnected?: boolean;
  cloudLastSync?: string | null;
  isSyncingWithCloud?: boolean;
  onConnectCloud?: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  onDisconnectCloud?: () => void;
  onManualCloudSync?: () => Promise<{ success: boolean; message: string }>;
  onTestCloudConnection?: (url: string, key: string) => Promise<{ success: boolean; message: string; tableReady: boolean }>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, currency, setCurrency, businessQR, setBusinessQR, 
  pharmacyInfo, setPharmacyInfo, discountPlans = [], onAddDiscountPlan, onDeleteDiscountPlan,
  onClearDemoData, onExportBackup, onImportBackup, currentUserRole = 'ADMIN',
  notificationSettings, onUpdateNotificationSettings, onTriggerTestAlert,
  permissionStatus, onRequestPermission,
  isCloudConnected = false,
  cloudLastSync = null,
  isSyncingWithCloud = false,
  onConnectCloud,
  onDisconnectCloud,
  onManualCloudSync,
  onTestCloudConnection
}) => {
  const [testSent, setTestSent] = useState(false);
  const [demoClearedMsg, setDemoClearedMsg] = useState(false);
  const [backupImportMsg, setBackupImportMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPercent, setNewDiscPercent] = useState<number | ''>(5);
  const [discSuccessMsg, setDiscSuccessMsg] = useState(false);

  // Cloud Supabase State
  const storedCfg = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(storedCfg.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(storedCfg.anonKey);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudTestResult, setCloudTestResult] = useState<{ success: boolean; message: string; tableReady?: boolean } | null>(null);
  const [cloudConnectMsg, setCloudConnectMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);
  const [manualSyncMsg, setManualSyncMsg] = useState<string | null>(null);
  const [localPharmacy, setLocalPharmacy] = useState<PharmacyInfo>(pharmacyInfo || {
    name: 'FARMASALUD S.R.L.',
    commercialName: 'FARMACIA FARMASALUD BOLIVIA',
    nit: '1020304050',
    address: 'Av. 16 de Julio #1490, El Prado',
    phone: '2-2445566 / 71523456',
    city: 'La Paz - Bolivia',
    authorizationNumber: '29040011007'
  });
  const [savedPharmacyMsg, setSavedPharmacyMsg] = useState(false);

  if (!isOpen) return null;

  const handleSavePharmacy = (e: React.FormEvent) => {
    e.preventDefault();
    if (setPharmacyInfo) {
      setPharmacyInfo(localPharmacy);
      setSavedPharmacyMsg(true);
      setTimeout(() => setSavedPharmacyMsg(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-black">Configuración</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Farmacia, Avisos, Moneda & Pagos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 md:p-8 space-y-8 overflow-y-auto max-h-[75vh] no-scrollbar">
          
          {/* Pharmacy Info Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-emerald-600" />
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Datos de la Farmacia (Encabezado Factura y Recibo)
              </label>
            </div>

            <form onSubmit={handleSavePharmacy} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Nombre Comercial de la Farmacia</label>
                <input 
                  type="text"
                  value={localPharmacy.commercialName}
                  onChange={(e) => setLocalPharmacy({ ...localPharmacy, commercialName: e.target.value })}
                  placeholder="Ej: FARMACIA FARMASALUD CENTRAL"
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Razón Social Legal</label>
                  <input 
                    type="text"
                    value={localPharmacy.name}
                    onChange={(e) => setLocalPharmacy({ ...localPharmacy, name: e.target.value })}
                    placeholder="Ej: FARMASALUD S.R.L."
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">NIT de Farmacia</label>
                  <input 
                    type="text"
                    value={localPharmacy.nit}
                    onChange={(e) => setLocalPharmacy({ ...localPharmacy, nit: e.target.value })}
                    placeholder="1020304050"
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Dirección</label>
                  <input 
                    type="text"
                    value={localPharmacy.address}
                    onChange={(e) => setLocalPharmacy({ ...localPharmacy, address: e.target.value })}
                    placeholder="Av. 16 de Julio #1490"
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Ciudad / País</label>
                  <input 
                    type="text"
                    value={localPharmacy.city}
                    onChange={(e) => setLocalPharmacy({ ...localPharmacy, city: e.target.value })}
                    placeholder="La Paz - Bolivia"
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Teléfono / WhatsApp</label>
                <input 
                  type="text"
                  value={localPharmacy.phone}
                  onChange={(e) => setLocalPharmacy({ ...localPharmacy, phone: e.target.value })}
                  placeholder="2-2445566 / 71523456"
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                {savedPharmacyMsg && (
                  <span className="text-xs text-emerald-600 font-bold">¡Datos guardados!</span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-4 py-2 bg-emerald-600 text-white font-black text-xs rounded-xl shadow hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Guardar Datos de Farmacia
                </button>
              </div>
            </form>
          </div>

          {/* NOTIFICATION SETTINGS (CELULAR Y PC) */}
          {notificationSettings && (
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-indigo-600" />
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Notificaciones de Stock y Vencimiento (Celular y PC)
                </label>
              </div>

              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-800">Avisos periódicos estilo batería baja</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Notifica con sonido y vibración cuando un producto baje del stock mínimo.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.enabled}
                      onChange={(e) => onUpdateNotificationSettings?.({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {notificationSettings.enabled && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Frecuencia de Repetición</label>
                        <select
                          value={notificationSettings.intervalMinutes}
                          onChange={(e) => onUpdateNotificationSettings?.({ intervalMinutes: parseInt(e.target.value) || 5 })}
                          className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                        >
                          <option value={1}>Cada 1 minuto (Modo prueba)</option>
                          <option value={5}>Cada 5 minutos (Predeterminado)</option>
                          <option value={10}>Cada 10 minutos</option>
                          <option value={15}>Cada 15 minutos</option>
                          <option value={30}>Cada 30 minutos</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-center gap-1.5 pt-2 sm:pt-0">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={notificationSettings.soundEnabled}
                            onChange={(e) => onUpdateNotificationSettings?.({ soundEnabled: e.target.checked })}
                            className="rounded text-emerald-600"
                          />
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Sonido Chime de Sistema</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={notificationSettings.vibrationEnabled}
                            onChange={(e) => onUpdateNotificationSettings?.({ vibrationEnabled: e.target.checked })}
                            className="rounded text-emerald-600"
                          />
                          <Vibrate className="w-3.5 h-3.5 text-slate-400" />
                          <span>Vibración en el Celular</span>
                        </label>
                      </div>
                    </div>

                    {permissionStatus !== 'granted' && onRequestPermission && (
                      <button
                        type="button"
                        onClick={onRequestPermission}
                        className="w-full py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <Bell className="w-4 h-4 text-amber-700" />
                        <span>Permitir Notificaciones en este Navegador</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onTriggerTestAlert?.();
                        setTestSent(true);
                        setTimeout(() => setTestSent(false), 2500);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      {testSent ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>¡Notificación de prueba disparada!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Probar Notificación Ahora (Celular y PC)</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Currency Section */}
          <div className="pt-6 border-t border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Símbolo de Moneda</label>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  onClick={() => setCurrency(curr)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currency.code === curr.code ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                >
                  <div className="text-left">
                    <p className="font-black text-slate-800 text-sm">{curr.code}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{curr.name}</p>
                  </div>
                  <span className="text-xl font-black text-emerald-600">{curr.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* QR Section */}
          <div className="pt-6 border-t border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">QR de Pago del Negocio</label>
            <div className="flex flex-col gap-4">
              {businessQR ? (
                <div className="relative w-full aspect-square max-w-[200px] mx-auto bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden group">
                  <img src={businessQR} alt="Business QR" className="w-full h-full object-contain p-4" />
                  <button 
                    onClick={() => {
                      setBusinessQR(null);
                      localStorage.removeItem('FARMA_QR');
                    }}
                    className="absolute inset-0 bg-rose-600/80 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-8 h-8 mb-2" />
                    <span className="text-xs font-black uppercase">Eliminar QR</span>
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-square max-w-[200px] mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-2">
                  <QrCode className="w-10 h-10 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin QR configurado</p>
                </div>
              )}
              
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = reader.result as string;
                        setBusinessQR(base64);
                        localStorage.setItem('FARMA_QR', base64);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden" 
                  id="qr-upload"
                />
                <label 
                  htmlFor="qr-upload"
                  className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-700 transition-all text-sm uppercase tracking-widest"
                >
                  <Plus className="w-5 h-5" /> {businessQR ? 'Cambiar QR' : 'Subir QR de Pago'}
                </label>
              </div>
              <p className="text-[9px] text-slate-400 text-center italic">Este QR se mostrará a los clientes cuando elijan pago por QR.</p>
            </div>
          </div>

          {/* Descuentos de Venta Personalizados */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Descuentos de Venta Personalizados
                </label>
                <p className="text-[11px] text-slate-400">
                  Crea y personaliza los descuentos para tu farmacia (sin planes ajenos o innecesarios).
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              {/* List of existing discounts */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {discountPlans.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">No hay descuentos activos. Las ventas se cobrarán sin descuento.</p>
                ) : (
                  discountPlans.map(plan => (
                    <div key={plan.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/70 text-xs">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800">{plan.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-black rounded-lg text-[10px]">
                          {plan.coveragePercent}%
                        </span>
                        {plan.id !== 'NONE' && onDeleteDiscountPlan && (
                          <button
                            type="button"
                            onClick={() => onDeleteDiscountPlan(plan.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Eliminar este descuento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Custom Discount Form */}
              <div className="pt-2 border-t border-slate-200/60">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">+ Agregar Nuevo Descuento Personalizado</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <input 
                      type="text"
                      placeholder="Nombre (ej. Cliente Frecuente, Amigos)"
                      value={newDiscName}
                      onChange={(e) => setNewDiscName(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-3 relative">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      placeholder="%"
                      value={newDiscPercent}
                      onChange={(e) => setNewDiscPercent(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 pr-6"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!newDiscName.trim()) {
                          alert('Escribe el nombre del descuento.');
                          return;
                        }
                        const pct = Number(newDiscPercent) || 0;
                        if (pct < 0 || pct > 100) {
                          alert('El porcentaje debe estar entre 0% y 100%.');
                          return;
                        }
                        onAddDiscountPlan?.({
                          name: `${newDiscName.trim()} (${pct}%)`,
                          coveragePercent: pct
                        });
                        setNewDiscName('');
                        setNewDiscPercent(5);
                        setDiscSuccessMsg(true);
                        setTimeout(() => setDiscSuccessMsg(false), 2000);
                      }}
                      className="w-full h-full py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl flex items-center justify-center transition-all"
                    >
                      Crear
                    </button>
                  </div>
                </div>
                {discSuccessMsg && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Descuento creado y disponible en caja.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* NUBE GRATUITA SUPABASE (PERMANENTE 2+ AÑOS) */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  Base de Datos en la Nube (Supabase - Gratuita y Permanente)
                </label>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                2+ Años Gratis
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Conecta tu proyecto gratuito de Supabase para que las 4 computadoras sincronicen cambios en tiempo real sin límites de 30 días.
            </p>

            {isCloudConnected ? (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-black text-emerald-950">Nube Activa y Sincronizada</h4>
                      <p className="text-[10px] text-emerald-700 font-medium">
                        URL: <span className="font-mono">{supabaseUrl.replace(/https?:\/\//, '').slice(0, 24)}...</span>
                      </p>
                      {cloudLastSync && (
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          Última sincronización: {cloudLastSync}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-emerald-200/60">
                  <button
                    type="button"
                    disabled={isSyncingWithCloud}
                    onClick={async () => {
                      if (onManualCloudSync) {
                        const res = await onManualCloudSync();
                        setManualSyncMsg(res.message);
                        setTimeout(() => setManualSyncMsg(null), 3000);
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWithCloud ? 'animate-spin' : ''}`} />
                    <span>{isSyncingWithCloud ? 'Sincronizando...' : 'Sincronizar Todo Ahora'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Deseas desconectar la sincronización de Supabase? Los datos locales se conservarán intactos.')) {
                        onDisconnectCloud?.();
                      }
                    }}
                    className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Desconectar</span>
                  </button>
                </div>

                {manualSyncMsg && (
                  <p className="text-[10px] text-emerald-800 font-bold text-center bg-white/80 py-1 rounded-lg">
                    {manualSyncMsg}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      URL del Proyecto Supabase
                    </label>
                    <input 
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://abcdefghijklmn.supabase.co"
                      className="w-full text-xs font-mono font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Clave Pública (Anon Key)
                    </label>
                    <input 
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full text-xs font-mono font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isTestingCloud || !supabaseUrl || !supabaseAnonKey}
                    onClick={async () => {
                      if (!onTestCloudConnection) return;
                      setIsTestingCloud(true);
                      setCloudTestResult(null);
                      try {
                        const result = await onTestCloudConnection(supabaseUrl, supabaseAnonKey);
                        setCloudTestResult(result);
                      } finally {
                        setIsTestingCloud(false);
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingCloud ? 'animate-spin text-slate-600' : ''}`} />
                    <span>{isTestingCloud ? 'Probando...' : 'Probar Conexión'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isTestingCloud || !supabaseUrl || !supabaseAnonKey}
                    onClick={async () => {
                      if (!onConnectCloud) return;
                      setIsTestingCloud(true);
                      try {
                        const res = await onConnectCloud(supabaseUrl, supabaseAnonKey);
                        setCloudConnectMsg(res.message);
                      } finally {
                        setIsTestingCloud(false);
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Conectar y Activar Nube</span>
                  </button>
                </div>

                {cloudTestResult && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold ${cloudTestResult.success ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'}`}>
                    {cloudTestResult.message}
                  </div>
                )}

                {cloudConnectMsg && (
                  <div className="p-2.5 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-950">
                    {cloudConnectMsg}
                  </div>
                )}

                {/* Guía Rápida de Configuración */}
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                      Guía de 2 Minutos para Supabase Gratis:
                    </span>
                    <a 
                      href="https://supabase.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                    >
                      <span>Abrir supabase.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="mt-2 space-y-1.5 text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
                    <p><strong>1.</strong> Crea una cuenta gratis en <strong>supabase.com</strong> y crea un nuevo proyecto.</p>
                    <p><strong>2.</strong> En el menú izquierdo ve a <strong>SQL Editor</strong>, pega el script de abajo y haz clic en <strong>RUN</strong>.</p>
                    <p><strong>3.</strong> En <strong>Project Settings &gt; API</strong> copia la <strong>URL</strong> y la <strong>anon public key</strong>, pégalas aquí arriba y haz clic en <em>Conectar</em>.</p>
                    
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                          setCopiedSql(true);
                          setTimeout(() => setCopiedSql(false), 2500);
                        }}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSql ? '¡Copiado al portapapeles!' : 'Copiar Script SQL para Supabase'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSqlCode(!showSqlCode)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                      >
                        {showSqlCode ? 'Ocultar código' : 'Ver código SQL'}
                      </button>
                    </div>

                    {showSqlCode && (
                      <pre className="mt-2 p-2.5 bg-slate-900 text-emerald-400 rounded-lg text-[10px] font-mono overflow-x-auto max-h-40">
                        {SUPABASE_SETUP_SQL}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sincronización y Respaldo Multi-Dispositivo (Vercel) */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Sincronización y Respaldo Multi-Dispositivo (Vercel)
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Permite respaldar, compartir y sincronizar inventario, ventas, pacientes y precios entre tus 4 computadoras sin costo.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                {onExportBackup && (
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                    title="Descargar archivo JSON con toda la base de datos de la farmacia"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Exportar Respaldo (JSON)</span>
                  </button>
                )}

                {onImportBackup && (
                  <>
                    <input 
                      type="file"
                      ref={backupFileInputRef}
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            try {
                              const content = evt.target?.result as string;
                              const parsed = JSON.parse(content);
                              if (confirm('¿Deseas restaurar este respaldo? Esta acción actualizará los datos locales con la información del archivo.')) {
                                onImportBackup(parsed);
                                setBackupImportMsg('¡Datos sincronizados y actualizados con éxito!');
                                setBackupErrorMsg(null);
                                setTimeout(() => setBackupImportMsg(null), 4000);
                              }
                            } catch (err: any) {
                              setBackupErrorMsg('Error al leer el archivo JSON: ' + (err.message || 'formato no válido'));
                            }
                          };
                          reader.readAsText(file);
                        }
                        if (e.target) e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                      title="Cargar respaldo desde otra computadora"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>Cargar / Sincronizar</span>
                    </button>
                  </>
                )}
              </div>

              {backupImportMsg && (
                <div className="p-3 bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{backupImportMsg}</span>
                </div>
              )}

              {backupErrorMsg && (
                <div className="p-3 bg-rose-100 text-rose-900 font-bold rounded-xl text-xs">
                  {backupErrorMsg}
                </div>
              )}

              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/60 text-[10px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">💡 Cómo trabajar entre varias computadoras:</p>
                <p>1. En la computadora principal, haz clic en <span className="font-semibold text-slate-700">Exportar Respaldo</span>.</p>
                <p>2. Envía o comparte el archivo generado a tus colaboradores.</p>
                <p>3. En sus computadoras, usan <span className="font-semibold text-slate-700">Cargar / Sincronizar</span> para tener exactamente la misma información actualizada.</p>
              </div>
            </div>
          </div>

          {/* Gestión de Datos / Inicio Limpio para Farmacia Real */}
          {onClearDemoData && (
            <div className="pt-6 border-t border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Gestión de Datos (Para Farmacia en Producción)
              </label>
              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800">Limpieza de Datos de Prueba</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Si vas a usar el sistema para tu farmacia real en Vercel, puedes vaciar todos los datos demo de prueba (medicamentos, ventas de ejemplo y pacientes ficticios) para iniciar con tu inventario 100% limpio.
                  </p>
                </div>

                {demoClearedMsg ? (
                  <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold text-center">
                    ¡Datos demo eliminados! Tu farmacia está limpia y lista.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Estás seguro de que deseas vaciar todos los datos demo de prueba? Esta acción te permitirá iniciar con tu farmacia completamente en blanco.')) {
                        onClearDemoData();
                        setDemoClearedMsg(true);
                        setTimeout(() => setDemoClearedMsg(false), 3000);
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Vaciar Datos Demo (Iniciar Farmacia en Blanco)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
