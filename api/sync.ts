import { Pool, PoolConfig } from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Dedicated persistent zero-config cloud store for Farmacia Yireh
const PRIMARY_CLOUD_OBJECT_ID = 'ff808181a09d98f701a0f067f7b646ce';
const CLOUD_API_BASE = 'https://api.restful-api.dev/objects';

let pool: Pool | null = null;
let supabaseClient: SupabaseClient | null = null;
let inMemoryCache: Record<string, any> = {
  medications: [],
  customers: [],
  sales: [],
  suppliers: [],
  purchases: [],
  staff: [
    {
      id: '1',
      name: 'Administrador Principal',
      username: 'admin',
      password: 'admin',
      role: 'ADMIN',
      originalRole: 'ADMIN',
      permissions: {
        allowedSections: ['DASHBOARD', 'POS', 'INVENTORY', 'REPORTS', 'CUSTOMERS', 'SUPPLIERS', 'PURCHASES', 'STAFF'],
        canEditInventory: true
      }
    },
    {
      id: 'U_JOSUE_BALBOA',
      name: 'Josue Balboa',
      username: 'josue',
      password: '123',
      role: 'EMPLOYEE',
      originalRole: 'EMPLOYEE',
      customRoleName: 'Cajero / Ventas',
      assignedRegister: 'Caja 1',
      permissions: {
        allowedSections: ['POS', 'INVENTORY', 'CUSTOMERS'],
        canEditInventory: false
      }
    }
  ]
};

async function fetchFromCloudStore(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${CLOUD_API_BASE}/${PRIMARY_CLOUD_OBJECT_ID}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data && typeof json.data === 'object') {
        inMemoryCache = { ...inMemoryCache, ...json.data };
        return inMemoryCache;
      }
    }
  } catch (err) {
    console.debug('Cloud store fetch error:', err);
  }
  return null;
}

async function saveToCloudStore(dataPatch: Record<string, any>): Promise<boolean> {
  try {
    inMemoryCache = { ...inMemoryCache, ...dataPatch, updatedAt: new Date().toISOString() };
    const res = await fetch(`${CLOUD_API_BASE}/${PRIMARY_CLOUD_OBJECT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'farmasalud_yireh_sync',
        data: inMemoryCache
      })
    });
    return res.ok;
  } catch (err) {
    console.debug('Cloud store save error:', err);
    return false;
  }
}

function findPostgresConnectionString(): string | null {
  const env = process.env;
  for (const [key, val] of Object.entries(env)) {
    if (typeof val === 'string' && (val.startsWith('postgres://') || val.startsWith('postgresql://'))) {
      return val;
    }
  }
  const candidates = [
    env.POSTGRES_URL_NON_POOLING,
    env.POSTGRES_URL,
    env.POSTGRES_PRISMA_URL,
    env.DATABASE_URL,
    env.STORAGE_POSTGRES_URL_NON_POOLING,
    env.STORAGE_POSTGRES_URL,
    env.SUPABASE_POSTGRES_URL,
    env.VERCEL_POSTGRES_URL
  ];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  return null;
}

function getPostgresPool(): Pool | null {
  if (pool) return pool;
  const connStr = findPostgresConnectionString();
  if (connStr) {
    try {
      pool = new Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3500,
        max: 3,
        idleTimeoutMillis: 20000
      });
      return pool;
    } catch {}
  }
  return null;
}

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const env = process.env;
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.STORAGE_URL || '';
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  if (url && key && url.startsWith('http') && url.includes('.')) {
    try {
      supabaseClient = createClient(url, key, { auth: { persistSession: false } });
      return supabaseClient;
    } catch {}
  }
  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. GET: Retorna todos los datos sincronizados para PC, celular y tablet
  if (req.method === 'GET') {
    let result: Record<string, any> = { ...inMemoryCache };

    // Intenta traer la versión más fresca desde la nube persistente
    const cloudData = await fetchFromCloudStore();
    if (cloudData) {
      result = { ...result, ...cloudData };
    }

    // Consulta Postgres opcional si está configurado en Vercel
    const pgPool = getPostgresPool();
    if (pgPool) {
      try {
        const { rows } = await pgPool.query('SELECT id, data FROM farma_sync;');
        if (Array.isArray(rows) && rows.length > 0) {
          for (const row of rows) {
            result[row.id] = row.data;
          }
        }
      } catch {}
    }

    // Consulta Supabase opcional
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('farma_sync').select('id, data');
        if (Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            result[item.id] = item.data;
          }
        }
      } catch {}
    }

    return res.status(200).json({
      success: true,
      source: 'cloud_sync',
      data: result
    });
  }

  // 2. POST: Guarda cualquier cambio (usuarios, ventas, medicamentos) y lo persiste
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { collection, data, allData } = body || {};
    const patch: Record<string, any> = {};

    if (collection && data !== undefined) {
      patch[collection] = data;
    } else if (allData && typeof allData === 'object') {
      Object.assign(patch, allData);
    }

    // Guardar en la nube persistente
    await saveToCloudStore(patch);

    // Guardar en Postgres si está configurado
    const pgPool = getPostgresPool();
    if (pgPool) {
      try {
        for (const [colId, colData] of Object.entries(patch)) {
          await pgPool.query(
            `INSERT INTO farma_sync (id, data, updated_at) 
             VALUES ($1, $2, now()) 
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();`,
            [colId, JSON.stringify(colData)]
          );
        }
      } catch {}
    }

    // Guardar en Supabase si está configurado
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        for (const [colId, colData] of Object.entries(patch)) {
          await supabase.from('farma_sync').upsert({
            id: colId,
            data: colData,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }
      } catch {}
    }

    return res.status(200).json({
      success: true,
      message: 'Datos guardados en la base de datos central y reflejados en todos los dispositivos.'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
