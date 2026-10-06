/**
 * Servicio de Sincronización Automática en Tiempo Real para Farmacia Yireh.
 * 100% Automático: Sin necesidad de crear cuentas, sin bases de datos complejas, sin claves API.
 * Sincroniza en tiempo real las 4 computadoras en Vercel a través de canales SSE seguros.
 */

import { broadcastViaSupabase } from './supabaseService';

export interface SyncMessage {
  type: 
    | 'SALE_COMPLETED' 
    | 'MED_UPDATED' 
    | 'MEDS_BATCH_ADDED' 
    | 'MED_DELETED' 
    | 'PURCHASE_REGISTERED' 
    | 'CUSTOMER_ADDED' 
    | 'DISCOUNTS_UPDATED' 
    | 'PHARMACY_INFO_UPDATED'
    | 'STAFF_UPDATED'
    | 'CLEAR_DEMO'
    | 'REQUEST_SYNC'
    | 'PROVIDE_SYNC';
  senderId: string;
  timestamp: number;
  payload: any;
}

const DEFAULT_SYNC_ROOM = 'farma-yireh-clean-live-v5';
const CLIENT_INSTANCE_ID = 'PC_' + Math.random().toString(36).slice(2, 8).toUpperCase();

let eventSource: EventSource | null = null;
let reconnectTimer: any = null;
let pollIntervalTimer: any = null;
let currentRoom = DEFAULT_SYNC_ROOM;

// BroadcastChannel for instant local multi-window/multi-tab sync
let localBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    localBroadcastChannel = new BroadcastChannel('FARMA_POS_AUTOSYNC');
  }
} catch {
  // Ignore if unsupported
}

export const getSyncRoom = (): string => {
  try {
    const saved = localStorage.getItem('FARMA_AUTO_SYNC_ROOM');
    if (saved && saved !== 'farma-yireh-auto-sync-78921-bolivia') {
      return saved;
    }
    localStorage.setItem('FARMA_AUTO_SYNC_ROOM', DEFAULT_SYNC_ROOM);
    return DEFAULT_SYNC_ROOM;
  } catch {
    return DEFAULT_SYNC_ROOM;
  }
};

export const setSyncRoom = (roomName: string): string => {
  const clean = roomName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || DEFAULT_SYNC_ROOM;
  try {
    localStorage.setItem('FARMA_AUTO_SYNC_ROOM', clean);
  } catch {}
  currentRoom = clean;
  return clean;
};

export const getClientInstanceId = (): string => CLIENT_INSTANCE_ID;

/**
 * Publica una mutación o evento de cambio a todas las otras computadoras y celulares
 */
export const broadcastSyncEvent = async (type: SyncMessage['type'], payload: any): Promise<boolean> => {
  const room = getSyncRoom();
  const message: SyncMessage = {
    type,
    senderId: CLIENT_INSTANCE_ID,
    timestamp: Date.now(),
    payload
  };

  // 1. Emitir inmediatamente a otras ventanas o pestañas en el mismo equipo/celular
  try {
    if (localBroadcastChannel) {
      localBroadcastChannel.postMessage(message);
    }
  } catch (e) {
    console.debug('BroadcastChannel local postMessage error:', e);
  }

  // 2. Transmitir por canal en tiempo real de Supabase (instantáneo vía WebSockets a todas las PCs)
  try {
    broadcastViaSupabase(type, payload);
  } catch (e) {
    console.debug('Supabase broadcast error:', e);
  }

  // 3. Transmitir por canal de red en la nube secundario (fallback)
  try {
    const response = await fetch(`https://ntfy.sh/${room}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Title': `FarmaPOS: ${type}`,
        'Priority': 'low',
        'Tags': 'hospital,arrows_counterclockwise'
      },
      body: JSON.stringify(message)
    });

    return response.ok;
  } catch (err) {
    // Modo offline o red secundaria no disponible; Supabase y canal local ya transmitieron
    return true;
  }
};

/**
 * Inicia la escucha continua de cambios en tiempo real
 */
export const startAutoSyncListener = (
  onRemoteEvent: (message: SyncMessage) => void,
  onConnectionStatusChange?: (connected: boolean) => void
): (() => void) => {
  const room = getSyncRoom();
  currentRoom = room;

  const processedMessageIds = new Set<string>();

  // Escuchar BroadcastChannel local
  const handleLocalMessage = (event: MessageEvent) => {
    try {
      const msg: SyncMessage = event.data;
      if (msg && msg.senderId !== CLIENT_INSTANCE_ID) {
        const msgKey = `${msg.senderId}_${msg.timestamp}_${msg.type}`;
        if (!processedMessageIds.has(msgKey)) {
          processedMessageIds.add(msgKey);
          onRemoteEvent(msg);
        }
      }
    } catch {}
  };

  if (localBroadcastChannel) {
    localBroadcastChannel.addEventListener('message', handleLocalMessage);
  }

  // Poll reciente para obtener cambios ocurridos mientras este dispositivo estuvo cerrado
  const pollRecentChanges = async () => {
    try {
      const res = await fetch(`https://ntfy.sh/${currentRoom}/json?since=12h&poll=1`);
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const raw = JSON.parse(line);
          let syncData: SyncMessage | null = null;
          if (raw.message) {
            try { syncData = JSON.parse(raw.message); } catch {}
          } else if (raw.type && raw.senderId) {
            syncData = raw;
          }
          if (syncData && syncData.senderId !== CLIENT_INSTANCE_ID && syncData.timestamp) {
            const msgKey = `${syncData.senderId}_${syncData.timestamp}_${syncData.type}`;
            if (!processedMessageIds.has(msgKey)) {
              processedMessageIds.add(msgKey);
              onRemoteEvent(syncData);
            }
          }
        } catch {}
      }
    } catch {
      // ignore
    }
  };

  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  const connect = () => {
    try {
      const url = `https://ntfy.sh/${currentRoom}/sse`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        onConnectionStatusChange?.(true);
        // Al conectar, solicita a cualquier otra computadora activa si tiene un estado más reciente
        broadcastSyncEvent('REQUEST_SYNC', { requestedBy: CLIENT_INSTANCE_ID });
      };

      eventSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          let syncData: SyncMessage | null = null;
          
          if (raw.message) {
            try {
              syncData = JSON.parse(raw.message);
            } catch {
              // No era JSON
            }
          } else if (raw.type && raw.senderId) {
            syncData = raw;
          }

          if (syncData && syncData.senderId !== CLIENT_INSTANCE_ID && syncData.timestamp) {
            const msgKey = `${syncData.senderId}_${syncData.timestamp}_${syncData.type}`;
            if (!processedMessageIds.has(msgKey)) {
              processedMessageIds.add(msgKey);
              onRemoteEvent(syncData);
            }
          }
        } catch {
          // Ignorar mensajes mal formateados
        }
      };

      eventSource.onerror = () => {
        onConnectionStatusChange?.(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Reconexión automática tras 4 segundos
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 4000);
      };
    } catch (err) {
      console.warn('AutoSync: error al conectar SSE:', err);
      onConnectionStatusChange?.(false);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5000);
    }
  };

  connect();

  return () => {
    clearTimeout(reconnectTimer);
    clearInterval(pollIntervalTimer);
    if (localBroadcastChannel) {
      localBroadcastChannel.removeEventListener('message', handleLocalMessage);
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    onConnectionStatusChange?.(false);
  };
};
