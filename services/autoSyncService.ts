/**
 * Servicio de Sincronización Automática en Tiempo Real para Farmacia Yireh.
 * 100% Automático: Sin necesidad de crear cuentas, sin bases de datos complejas, sin claves API.
 * Sincroniza en tiempo real las 4 computadoras en Vercel a través de canales SSE seguros.
 */

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
    | 'CLEAR_DEMO'
    | 'REQUEST_SYNC'
    | 'PROVIDE_SYNC';
  senderId: string;
  timestamp: number;
  payload: any;
}

const DEFAULT_SYNC_ROOM = 'farma-yireh-auto-sync-78921-bolivia';
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
  return localStorage.getItem('FARMA_AUTO_SYNC_ROOM') || DEFAULT_SYNC_ROOM;
};

export const setSyncRoom = (roomName: string): string => {
  const clean = roomName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || DEFAULT_SYNC_ROOM;
  localStorage.setItem('FARMA_AUTO_SYNC_ROOM', clean);
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

  // 2. Transmitir por canal de red en la nube (cero configuración)
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
    console.warn('AutoSync: no se pudo transmitir el evento (posible modo offline):', err);
    return false;
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

  // Escuchar BroadcastChannel local
  const handleLocalMessage = (event: MessageEvent) => {
    try {
      const msg: SyncMessage = event.data;
      if (msg && msg.senderId !== CLIENT_INSTANCE_ID) {
        onRemoteEvent(msg);
      }
    } catch {}
  };

  if (localBroadcastChannel) {
    localBroadcastChannel.addEventListener('message', handleLocalMessage);
  }

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

          if (syncData && syncData.senderId !== CLIENT_INSTANCE_ID) {
            onRemoteEvent(syncData);
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
