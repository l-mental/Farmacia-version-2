import React from 'react';
import { 
  AlertTriangle, Bell, X, ArrowRight, BatteryCharging, 
  Volume2, Vibrate, CheckCircle2, ShieldAlert, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActiveSystemAlert } from '@/hooks/usePeriodicAlerts';

interface SystemNotificationBannerProps {
  alert: ActiveSystemAlert | null;
  onDismiss: () => void;
  permissionStatus: NotificationPermission | 'unsupported';
  onRequestPermission: () => void;
  intervalMinutes: number;
}

const SystemNotificationBanner: React.FC<SystemNotificationBannerProps> = ({
  alert,
  onDismiss,
  permissionStatus,
  onRequestPermission,
  intervalMinutes
}) => {
  const navigate = useNavigate();

  if (!alert && permissionStatus !== 'default') {
    return null;
  }

  return (
    <div className="fixed top-3 left-0 right-0 z-[200] px-3 sm:px-6 pointer-events-none flex flex-col items-center gap-2">
      {/* 1. Browser Native Notification Permission Prompt (if not granted yet) */}
      {permissionStatus === 'default' && (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center justify-between gap-3 max-w-lg w-full animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-amber-500 text-slate-900 rounded-xl shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-100 truncate">
                ¿Activar avisos en la pantalla de tu celular y PC?
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                Te notificará cada {intervalMinutes} min como aviso de batería baja cuando haya stock crítico.
              </p>
            </div>
          </div>
          <button
            onClick={onRequestPermission}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] rounded-xl shrink-0 transition-all active:scale-95 shadow"
          >
            Permitir
          </button>
        </div>
      )}

      {/* 2. Active Critical System Alert Banner (Styled like mobile low-battery / desktop notification) */}
      {alert && (
        <div className="pointer-events-auto bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 text-white rounded-3xl shadow-2xl border-2 border-amber-500/60 p-4 max-w-lg w-full animate-in slide-in-from-top-6 duration-300 ring-4 ring-amber-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900 animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full font-mono">
                    Aviso de Sistema
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {alert.timestamp} • cada {intervalMinutes} min
                  </span>
                </div>
                <h4 className="text-sm font-black text-white mt-0.5 leading-snug">
                  {alert.title}
                </h4>
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of critical items */}
          <div className="mt-3 bg-black/30 rounded-2xl p-2.5 space-y-1.5 border border-white/5 max-h-32 overflow-y-auto no-scrollbar">
            {alert.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'LOW_STOCK' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                  <span className="font-bold text-slate-200 truncate">{item.name}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300 font-semibold shrink-0">
                  {item.detail}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                onDismiss();
                navigate('/inventory');
              }}
              className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <span>Ir a Reabastecer Inventario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDismiss}
              className="py-2 px-4 bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemNotificationBanner;
