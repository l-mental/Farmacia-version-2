import React, { useState } from 'react';
import { 
  X, Trash2, Plus, RotateCcw, Building2, Store, QrCode, 
  Bell, Volume2, Vibrate, Smartphone, Monitor, Sparkles, Check
} from 'lucide-react';
import { Currency, PharmacyInfo } from '@/types';
import { SUPPORTED_CURRENCIES } from '@/constants';
import { NotificationSettings } from '@/services/notificationService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  businessQR: string | null;
  setBusinessQR: (qr: string | null) => void;
  pharmacyInfo?: PharmacyInfo;
  setPharmacyInfo?: (info: PharmacyInfo) => void;
  onResetData: () => void;
  currentUserRole?: string;
  notificationSettings?: NotificationSettings;
  onUpdateNotificationSettings?: (settings: Partial<NotificationSettings>) => void;
  onTriggerTestAlert?: () => void;
  permissionStatus?: NotificationPermission | 'unsupported';
  onRequestPermission?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, currency, setCurrency, businessQR, setBusinessQR, 
  pharmacyInfo, setPharmacyInfo, onResetData, currentUserRole = 'ADMIN',
  notificationSettings, onUpdateNotificationSettings, onTriggerTestAlert,
  permissionStatus, onRequestPermission
}) => {
  const [resetSuccess, setResetSuccess] = useState(false);
  const [testSent, setTestSent] = useState(false);
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

          {/* Reset Demo Data */}
          {currentUserRole === 'ADMIN' && (
            <div className="pt-6 border-t border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mantenimiento de Datos</label>
              <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl space-y-3">
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  ¿La base de datos local no es la última versión? Restablécela para cargar instantáneamente los 15 medicamentos de La Paz, 15 clientes, 15 proveedores y 15 ventas predefinidas para la demo.
                </p>
                
                {resetSuccess ? (
                  <div className="bg-emerald-500 text-white p-3 rounded-xl text-center text-xs font-bold uppercase tracking-wider animate-pulse">
                    ✅ Datos restablecidos con éxito
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm('¿Estás seguro de restablecer todos los registros locales a su estado inicial de 15 datos demo?')) {
                        onResetData();
                        setResetSuccess(true);
                        setTimeout(() => {
                          setResetSuccess(false);
                          onClose();
                        }, 1500);
                      }
                    }}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restablecer a Datos Iniciales
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
