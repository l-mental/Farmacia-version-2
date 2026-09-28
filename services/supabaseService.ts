import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncAt: string | null;
}

export const SUPABASE_SETUP_SQL = `-- Script de configuración para Farmacia Yireh en Supabase
-- Pega esto en el "SQL Editor" de tu proyecto de Supabase (gratuito) y haz clic en "RUN":

CREATE TABLE IF NOT EXISTS farma_sync (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE farma_sync ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'farma_sync' AND policyname = 'Permiso Completo FarmaPOS'
  ) THEN
    CREATE POLICY "Permiso Completo FarmaPOS" ON farma_sync FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Activar sincronización en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE farma_sync;
`;

export const normalizeSupabaseUrl = (rawUrl: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';

  // Automatically prepend https:// if missing
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname && parsed.hostname.includes('.')) {
      return parsed.origin;
    }
  } catch {
    return '';
  }
  return '';
};

export const isValidSupabaseConfig = (url: string, anonKey: string): boolean => {
  if (!url || !anonKey) return false;
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = anonKey.trim();
  return Boolean(cleanUrl && cleanKey && cleanKey.length >= 10 && cleanUrl.startsWith('http'));
};

let clientInstance: SupabaseClient | null = null;
let realtimeChannel: any = null;

export const getStoredSupabaseConfig = (): { url: string; anonKey: string } => {
  let localUrlRaw = '';
  let localKey = '';
  try {
    localUrlRaw = localStorage.getItem('FARMA_SUPABASE_URL') || '';
    localKey = localStorage.getItem('FARMA_SUPABASE_KEY') || '';
  } catch {
    // ignore
  }
  
  const env = (import.meta as any).env || {};
  const envUrlRaw = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.STORAGE_URL || env.VITE_STORAGE_URL || '';
  const envKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.STORAGE_ANON_KEY || env.SUPABASE_KEY || env.STORAGE_KEY || '';

  const normalizedLocal = normalizeSupabaseUrl(localUrlRaw);
  const normalizedEnv = normalizeSupabaseUrl(envUrlRaw);

  const finalUrl = normalizedLocal || normalizedEnv;
  const finalKey = (localKey && localKey.trim()) || (envKey && envKey.trim()) || '';

  // If localUrl was stored as an invalid URL or placeholder, clean it up so it never causes errors
  if (localUrlRaw && !normalizedLocal) {
    try {
      localStorage.removeItem('FARMA_SUPABASE_URL');
      localStorage.removeItem('FARMA_SUPABASE_KEY');
    } catch {}
  }

  return {
    url: finalUrl,
    anonKey: finalKey
  };
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (clientInstance) return clientInstance;
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!isValidSupabaseConfig(url, anonKey)) {
    return null;
  }
  try {
    clientInstance = createClient(url, anonKey, {
      auth: { persistSession: false }
    });
    return clientInstance;
  } catch (e) {
    console.warn('Supabase no inicializado (usando modo automático local y tiempo real):', e);
    return null;
  }
};

export const saveSupabaseCredentials = (url: string, anonKey: string): SupabaseClient => {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = anonKey.trim();

  if (!cleanUrl) {
    throw new Error('La URL de Supabase no es válida. Debe ser una dirección como https://xxxx.supabase.co');
  }
  if (!cleanKey || cleanKey.length < 10) {
    throw new Error('La clave anónima (anon key) no es válida.');
  }

  localStorage.setItem('FARMA_SUPABASE_URL', cleanUrl);
  localStorage.setItem('FARMA_SUPABASE_KEY', cleanKey);

  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }

  clientInstance = createClient(cleanUrl, cleanKey, {
    auth: { persistSession: false }
  });

  return clientInstance;
};

export const removeSupabaseCredentials = () => {
  localStorage.removeItem('FARMA_SUPABASE_URL');
  localStorage.removeItem('FARMA_SUPABASE_KEY');
  localStorage.removeItem('FARMA_SUPABASE_LAST_SYNC');
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }
  clientInstance = null;
};

export const testSupabaseConnection = async (url: string, anonKey: string): Promise<{ success: boolean; message: string; tableReady: boolean }> => {
  try {
    const cleanUrl = normalizeSupabaseUrl(url);
    const cleanKey = anonKey ? anonKey.trim() : '';

    if (!cleanUrl) {
      return { 
        success: false, 
        message: 'URL inválida. Debe ser una dirección web válida como https://xxxx.supabase.co', 
        tableReady: false 
      };
    }
    if (!cleanKey || cleanKey.length < 10) {
      return { 
        success: false, 
        message: 'Clave anónima vacía o demasiado corta.', 
        tableReady: false 
      };
    }

    const testClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await testClient
      .from('farma_sync')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('farma_sync') || error.message.includes('does not exist')) {
        return {
          success: true,
          tableReady: false,
          message: 'Conexión exitosa a Supabase, pero falta crear la tabla "farma_sync". Copia el script SQL y ejecútalo en el SQL Editor de Supabase.'
        };
      }
      return { success: false, message: error.message, tableReady: false };
    }

    return {
      success: true,
      tableReady: true,
      message: '¡Conexión exitosa y tabla farma_sync lista para sincronizar!'
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error de red al conectar.', tableReady: false };
  }
};

export const pushCollectionToSupabase = async (collectionId: string, data: any): Promise<boolean> => {
  // 1. Probar endpoint serverless /api/sync (Postgres en Vercel con creación automática de tablas)
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection: collectionId, data })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        localStorage.setItem('FARMA_SUPABASE_LAST_SYNC', new Date().toISOString());
        broadcastViaSupabase(collectionId === 'staff' ? 'STAFF_UPDATED' : 'MED_UPDATED', { [collectionId]: data });
        return true;
      }
    }
  } catch {
    // Si no está disponible /api/sync (ej. entorno Vite local), pasa al cliente Supabase
  }

  // 2. Cliente directo de Supabase
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('farma_sync')
      .upsert({
        id: collectionId,
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn(`Error al subir ${collectionId} a Supabase:`, error.message);
      return false;
    }

    localStorage.setItem('FARMA_SUPABASE_LAST_SYNC', new Date().toISOString());
    broadcastViaSupabase(collectionId === 'staff' ? 'STAFF_UPDATED' : 'MED_UPDATED', { [collectionId]: data });
    return true;
  } catch (e) {
    console.warn(`Excepción al subir ${collectionId}:`, e);
    return false;
  }
};

export const pullAllFromSupabase = async (): Promise<{ success: boolean; data?: Record<string, any>; error?: string }> => {
  // 1. Probar endpoint serverless /api/sync (Postgres en Vercel)
  try {
    const res = await fetch('/api/sync');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && Object.keys(json.data).length > 0) {
        localStorage.setItem('FARMA_SUPABASE_LAST_SYNC', new Date().toISOString());
        return { success: true, data: json.data };
      }
    }
  } catch {
    // Pasa al cliente Supabase
  }

  // 2. Cliente directo de Supabase
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no configurado.' };

  try {
    const { data, error } = await client
      .from('farma_sync')
      .select('id, data, updated_at');

    if (error) {
      return { success: false, error: error.message };
    }

    const result: Record<string, any> = {};
    if (Array.isArray(data)) {
      data.forEach(item => {
        result[item.id] = item.data;
      });
    }

    localStorage.setItem('FARMA_SUPABASE_LAST_SYNC', new Date().toISOString());
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al descargar datos.' };
  }
};

export const checkSupabaseTableReady = async (): Promise<{ ready: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { ready: false, error: 'No configurado' };

  try {
    const { error } = await client
      .from('farma_sync')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('farma_sync') || error.message.includes('does not exist')) {
        return { ready: false, error: 'TABLE_NOT_CREATED' };
      }
      return { ready: false, error: error.message };
    }
    return { ready: true };
  } catch (err: any) {
    return { ready: false, error: err.message };
  }
};

let broadcastChannelInstance: any = null;

export const broadcastViaSupabase = (type: string, payload: any) => {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    if (!broadcastChannelInstance) {
      broadcastChannelInstance = client.channel('farma-global-live');
      broadcastChannelInstance.subscribe();
    }
    broadcastChannelInstance.send({
      type: 'broadcast',
      event: 'farma_event',
      payload: {
        type,
        payload,
        timestamp: Date.now()
      }
    });
  } catch (e) {
    console.debug('Error broadcasting via Supabase:', e);
  }
};

export const subscribeToRealtimeChanges = (
  onRemoteChange: (collectionId: string, data: any) => void,
  onBroadcastEvent?: (type: string, payload: any) => void
): (() => void) => {
  const client = getSupabaseClient();
  if (!client) return () => {};

  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }

  try {
    realtimeChannel = client
      .channel('farma-global-live')
      // 1. Mensajería instantánea directa (funciona sin tablas)
      .on('broadcast', { event: 'farma_event' }, (payload: any) => {
        if (payload?.payload) {
          const { type, payload: eventPayload } = payload.payload;
          if (type && onBroadcastEvent) {
            onBroadcastEvent(type, eventPayload);
          }
        }
      })
      // 2. Cambios en base de datos Postgres (cuando la tabla farma_sync está creada)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'farma_sync' },
        (payload: any) => {
          if (payload.new && payload.new.id && payload.new.data) {
            onRemoteChange(payload.new.id, payload.new.data);
          }
        }
      )
      .subscribe();

    broadcastChannelInstance = realtimeChannel;

    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
      }
      broadcastChannelInstance = null;
    };
  } catch (e) {
    console.error('Error creando suscripción en tiempo real:', e);
    return () => {};
  }
};
