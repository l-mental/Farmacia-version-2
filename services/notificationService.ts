// Service for managing system notifications on PC and Mobile (Web Notifications API, Audio Chime, Vibration)

export interface NotificationSettings {
  enabled: boolean;
  intervalMinutes: number; // default 5
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notifyLowStock: boolean;
  notifyExpiry: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  intervalMinutes: 5,
  soundEnabled: true,
  vibrationEnabled: true,
  notifyLowStock: true,
  notifyExpiry: true
};

export const getNotificationSettings = (): NotificationSettings => {
  try {
    const saved = localStorage.getItem('FARMA_NOTIFICATION_SETTINGS');
    if (saved) return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) };
  } catch (err) {
    console.error('Error reading notification settings', err);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
};

export const saveNotificationSettings = (settings: NotificationSettings) => {
  try {
    localStorage.setItem('FARMA_NOTIFICATION_SETTINGS', JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving notification settings', err);
  }
};

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission', err);
    return 'denied';
  }
};

// High-fidelity synthesized Alert Chime (Web Audio API - no external file needed)
// Sounds like a system warning (low battery / critical alert chime)
export const playAlertSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: 520 Hz (alert ding)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 784 Hz (accent tone)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);

    // Tone 3: 1046.5 Hz (high attention ping)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1046.5, now + 0.25); // C6
    gain3.gain.setValueAtTime(0.25, now + 0.25);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.25);
    osc3.stop(now + 0.7);

  } catch (e) {
    console.warn('Audio playback not permitted or not supported', e);
  }
};

// Haptic vibration for mobile phones (mimics low battery pulse)
export const triggerVibration = (pattern: number[] = [200, 100, 200]) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Vibration not supported or blocked
  }
};

export interface AlertPayload {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
}

// Sends native OS push/browser notification to Mobile Notification Shade or Desktop PC Notification Center
export const sendNativeNotification = (payload: AlertPayload): boolean => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=192',
      badge: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=96',
      tag: payload.tag || 'farmapos-alert',
      requireInteraction: payload.requireInteraction ?? false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.error('Error firing native notification', err);
    return false;
  }
};
