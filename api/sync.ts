import pg from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let tableInitialized = false;
let supabaseClient: SupabaseClient | null = null;
let inMemoryCache: Record<string, any> = {
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

function findPostgresConnectionString(): string | null {
  const env = process.env;
  const candidates = [
    env.POSTGRES_URL_NON_POOLING,
    env.STORAGE_POSTGRES_URL_NON_POOLING,
    env.SUPABASE_POSTGRES_URL_NON_POOLING,
    env.FAMACIAYIREH_POSTGRES_URL_NON_POOLING,
    env.POSTGRES_URL,
    env.STORAGE_POSTGRES_URL,
    env.SUPABASE_POSTGRES_URL,
    env.FAMACIAYIREH_POSTGRES_URL,
    env.DATABASE_URL,
    env.STORAGE_DATABASE_URL,
    env.POSTGRES_PRISMA_URL,
    env.STORAGE_POSTGRES_PRISMA_URL,
    env.VERCEL_POSTGRES_URL
  ];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  for (const [, val] of Object.entries(env)) {
    if (typeof val === 'string' && (val.startsWith('postgres://') || val.startsWith('postgresql://'))) {
      return val.trim();
    }
  }
  return null;
}

function getPostgresPool(): pg.Pool | null {
  if (pool) return pool;
  const connStr = findPostgresConnectionString();
  if (connStr) {
    try {
      pool = new Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
        max: 3,
        idleTimeoutMillis: 20000
      });
      return pool;
    } catch {}
  }
  return null;
}

async function ensurePostgresTable(pgPool: pg.Pool): Promise<void> {
  if (tableInitialized) return;
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS farma_sync (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    try {
      await pgPool.query(`
        ALTER TABLE farma_sync ENABLE ROW LEVEL SECURITY;
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'farma_sync' AND policyname = 'Permiso Completo FarmaPOS'
          ) THEN
            CREATE POLICY "Permiso Completo FarmaPOS" ON farma_sync FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `);
    } catch {}
    tableInitialized = true;
  } catch (e) {
    console.debug('Error ensuring farma_sync table:', e);
  }
}

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const env = process.env;
  let url =
    env.SUPABASE_URL ||
    env.STORAGE_SUPABASE_URL ||
    env.STORAGE_URL ||
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.NEXT_PUBLIC_STORAGE_SUPABASE_URL ||
    env.FAMACIAYIREH_SUPABASE_URL ||
    '';
  let key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    env.FAMACIAYIREH_SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.STORAGE_SUPABASE_ANON_KEY ||
    env.STORAGE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY ||
    env.FAMACIAYIREH_SUPABASE_ANON_KEY ||
    '';

  if (!url) {
    for (const [, val] of Object.entries(env)) {
      if (typeof val === 'string' && val.startsWith('https://') && val.includes('.supabase.co')) {
        url = val.trim();
        break;
      }
    }
  }
  if (!key) {
    for (const [k, val] of Object.entries(env)) {
      if (typeof val === 'string' && (k.endsWith('_SERVICE_ROLE_KEY') || k.endsWith('_ANON_KEY')) && val.length > 20) {
        key = val.trim();
        break;
      }
    }
  }

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

    // Consulta Postgres (crea automáticamente la tabla farma_sync si es una base de datos nueva)
    const pgPool = getPostgresPool();
    if (pgPool) {
      try {
        await ensurePostgresTable(pgPool);
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

    inMemoryCache = { ...inMemoryCache, ...result };

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

    inMemoryCache = { ...inMemoryCache, ...patch, updatedAt: new Date().toISOString() };

    // Guardar en Postgres si está configurado (crea tabla automáticamente si no existe)
    const pgPool = getPostgresPool();
    if (pgPool) {
      try {
        await ensurePostgresTable(pgPool);
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
