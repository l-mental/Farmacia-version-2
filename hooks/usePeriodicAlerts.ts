import { useState, useEffect, useRef, useCallback } from 'react';
import { Medication } from '@/types';
import { 
  getNotificationSettings, 
  saveNotificationSettings,
  NotificationSettings, 
  sendNativeNotification, 
  playAlertSound, 
  triggerVibration,
  getNotificationPermission,
  requestNotificationPermission
} from '@/services/notificationService';

export interface ActiveSystemAlert {
  id: string;
  title: string;
  message: string;
  items: { name: string; detail: string; type: 'LOW_STOCK' | 'EXPIRED' }[];
  timestamp: string;
}

export const usePeriodicAlerts = (medications: Medication[]) => {
  const [settings, setSettings] = useState<NotificationSettings>(() => getNotificationSettings());
  const [activeAlert, setActiveAlert] = useState<ActiveSystemAlert | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermission());
  const timerRef = useRef<any>(null);

  // Update permission status
  useEffect(() => {
    setPermissionStatus(getNotificationPermission());
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      saveNotificationSettings(merged);
      return merged;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    const perm = await requestNotificationPermission();
    setPermissionStatus(perm);
    return perm;
  }, []);

  const prevAlertSignatureRef = useRef<string>('');

  // Compute alert-worthy items
  const getAlertItems = useCallback(() => {
    const now = Date.now();
    const safeMeds = Array.isArray(medications) ? medications.filter(Boolean) : [];
    const lowStock = safeMeds.filter(m => {
      const isUnit = m.isUnitOnly || m.unitsPerBox === 1;
      const current = isUnit ? (m.stockUnits ?? m.stockBoxes ?? 0) : (m.stockBoxes ?? 0);
      return current <= (m.minStock ?? 0);
    });
    const expired = safeMeds.filter(m => {
      const exp = m.batches?.[0]?.expiryDate;
      if (!exp) return false;
      const t = new Date(exp).getTime();
      return !isNaN(t) && t < now;
    });

    const items: { name: string; detail: string; type: 'LOW_STOCK' | 'EXPIRED' }[] = [];

    if (settings.notifyLowStock) {
      lowStock.forEach(m => {
        const isUnit = m.isUnitOnly || m.unitsPerBox === 1;
        const current = isUnit ? (m.stockUnits ?? m.stockBoxes ?? 0) : (m.stockBoxes ?? 0);
        const unitLabel = isUnit ? 'unidades' : 'cajas';
        items.push({
          name: m.name || 'Producto',
          detail: `Stock crítico: ${current} ${unitLabel} (Mínimo: ${m.minStock ?? 0} ${unitLabel})`,
          type: 'LOW_STOCK'
        });
      });
    }

    if (settings.notifyExpiry) {
      expired.forEach(m => {
        items.push({
          name: m.name || 'Producto',
          detail: `Producto Vencido (Lote: ${m.batches?.[0]?.lotNumber || 'S/L'})`,
          type: 'EXPIRED'
        });
      });
    }

    return { lowStock, expired, items };
  }, [medications, settings.notifyLowStock, settings.notifyExpiry]);

  // Dispatch the system alert (Sound, Vibration, Native OS Notification, and In-App Banner)
  const fireAlert = useCallback((isTest = false) => {
    const { lowStock, expired, items } = getAlertItems();

    if (items.length === 0 && !isTest) {
      return;
    }

    const title = isTest 
      ? '🔔 Notificación de Prueba FarmaPOS (Celular y PC)'
      : lowStock.length > 0 && expired.length > 0
      ? `⚠️ Alerta: ${lowStock.length} productos bajo stock y ${expired.length} vencidos`
      : lowStock.length > 0
      ? `⚠️ Alerta de Stock Mínimo (${lowStock.length} productos críticos)`
      : `🚨 Alerta de Vencimiento (${expired.length} productos expirados)`;

    const bodyText = isTest
      ? 'Las notificaciones del sistema están funcionando correctamente en tu dispositivo.'
      : items.slice(0, 3).map(i => `• ${i.name}: ${i.detail}`).join('\n') + 
        (items.length > 3 ? `\n...y ${items.length - 3} productos más.` : '');

    // 1. Play Audio Chime if enabled
    if (settings.soundEnabled) {
      playAlertSound();
    }

    // 2. Trigger Haptic Vibration on mobile
    if (settings.vibrationEnabled) {
      triggerVibration([200, 100, 200, 100, 300]);
    }

    // 3. Send Native OS Notification (for Android mobile notification drawer and Windows/Mac desktop)
    sendNativeNotification({
      title,
      body: bodyText,
      tag: 'farmapos-periodic-alert',
      requireInteraction: true
    });

    // 4. Show In-App System Banner
    setActiveAlert({
      id: Date.now().toString(),
      title,
      message: bodyText,
      items: isTest ? [{ name: 'Prueba de Sistema', detail: 'Sonido, vibración y notificación activa', type: 'LOW_STOCK' }] : items,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }, [getAlertItems, settings.soundEnabled, settings.vibrationEnabled]);

  // Immediate trigger when a new medication falls into low stock or minStock is updated to trigger low stock
  useEffect(() => {
    if (!settings.enabled) return;
    const { lowStock, expired, items } = getAlertItems();
    const signature = [
      ...lowStock.map(m => `L:${m.id}:${m.isUnitOnly || m.unitsPerBox === 1 ? (m.stockUnits ?? m.stockBoxes ?? 0) : (m.stockBoxes ?? 0)}:${m.minStock ?? 0}`),
      ...expired.map(m => `E:${m.id}`)
    ].join('|');

    if (prevAlertSignatureRef.current && signature !== prevAlertSignatureRef.current && items.length > 0) {
      fireAlert(false);
    }
    prevAlertSignatureRef.current = signature;
  }, [medications, settings.enabled, getAlertItems, fireAlert]);

  // Periodic interval (e.g. every 5 minutes)
  useEffect(() => {
    if (!settings.enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(1, settings.intervalMinutes) * 60 * 1000;

    // Check on startup after 3 seconds if there are critical items
    const initialTimeout = setTimeout(() => {
      const { items } = getAlertItems();
      if (items.length > 0) {
        fireAlert(false);
      }
    }, 3000);

    // Setup periodic interval (every 5 minutes)
    timerRef.current = setInterval(() => {
      fireAlert(false);
    }, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [settings.enabled, settings.intervalMinutes, fireAlert, getAlertItems]);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const triggerTestAlert = useCallback(() => {
    fireAlert(true);
  }, [fireAlert]);

  return {
    settings,
    updateSettings,
    activeAlert,
    dismissAlert,
    triggerTestAlert,
    permissionStatus,
    requestPermission
  };
};
