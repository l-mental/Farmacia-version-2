import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Cache pool across serverless invocations
let pool: Pool | null = null;

function getPostgresPool(): Pool | null {
  if (pool) return pool;

  const env = process.env;
  const connStr = 
    env.POSTGRES_URL || 
    env.DATABASE_URL || 
    env.STORAGE_POSTGRES_URL || 
    env.SUPABASE_POSTGRES_URL ||
    env.POSTGRES_PRISMA_URL;

  if (connStr) {
    try {
      pool = new Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
      });
      return pool;
    } catch (e) {
      console.error('Error creating PG pool:', e);
    }
  }
  return null;
}

function getSupabaseClient() {
  const env = process.env;
  const url = 
    env.SUPABASE_URL || 
    env.VITE_SUPABASE_URL || 
    env.STORAGE_URL || 
    env.VITE_STORAGE_URL;
  const key = 
    env.SUPABASE_SERVICE_ROLE_KEY || 
    env.STORAGE_SERVICE_ROLE_KEY || 
    env.SUPABASE_ANON_KEY || 
    env.VITE_SUPABASE_ANON_KEY || 
    env.STORAGE_ANON_KEY;

  if (url && key) {
    try {
      return createClient(url, key, { auth: { persistSession: false } });
    } catch (e) {
      console.error('Error creating Supabase client:', e);
    }
  }
  return null;
}

async function ensureTable(p: Pool) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS farma_sync (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

export default async function handler(req: any, res: any) {
  // Configuración de CORS universal para PC y celular
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

  const pgPool = getPostgresPool();
  const supabase = getSupabaseClient();

  // 1. MÉTODO GET: Retorna todas las colecciones (staff, medications, sales, etc.)
  if (req.method === 'GET') {
    if (pgPool) {
      try {
        await ensureTable(pgPool);
        const { rows } = await pgPool.query('SELECT id, data FROM farma_sync;');
        const result: Record<string, any> = {};
        for (const row of rows) {
          result[row.id] = row.data;
        }
        return res.status(200).json({ success: true, source: 'postgres', data: result });
      } catch (err: any) {
        console.error('Error querying Postgres:', err);
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('farma_sync').select('id, data');
        if (!error && Array.isArray(data)) {
          const result: Record<string, any> = {};
          for (const item of data) {
            result[item.id] = item.data;
          }
          return res.status(200).json({ success: true, source: 'supabase', data: result });
        }
      } catch (err: any) {
        console.error('Error querying Supabase:', err);
      }
    }

    return res.status(200).json({ 
      success: false, 
      error: 'Base de datos no disponible aún en el servidor.',
      data: {} 
    });
  }

  // 2. MÉTODO POST: Guarda una o múltiples colecciones
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { collection, data, allData } = body || {};

    if (pgPool) {
      try {
        await ensureTable(pgPool);
        if (collection && data !== undefined) {
          await pgPool.query(
            `INSERT INTO farma_sync (id, data, updated_at) 
             VALUES ($1, $2, now()) 
             ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now();`,
            [collection, JSON.stringify(data)]
          );
        } else if (allData && typeof allData === 'object') {
          for (const [colId, colData] of Object.entries(allData)) {
            await pgPool.query(
              `INSERT INTO farma_sync (id, data, updated_at) 
               VALUES ($1, $2, now()) 
               ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now();`,
              [colId, JSON.stringify(colData)]
            );
          }
        }
        return res.status(200).json({ success: true, source: 'postgres' });
      } catch (err: any) {
        console.error('Error saving to Postgres:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (supabase) {
      try {
        if (collection && data !== undefined) {
          const { error } = await supabase.from('farma_sync').upsert({
            id: collection,
            data: data,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          if (error) throw error;
        } else if (allData && typeof allData === 'object') {
          for (const [colId, colData] of Object.entries(allData)) {
            await supabase.from('farma_sync').upsert({
              id: colId,
              data: colData,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          }
        }
        return res.status(200).json({ success: true, source: 'supabase' });
      } catch (err: any) {
        console.error('Error saving to Supabase:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    return res.status(503).json({ success: false, error: 'Sin conexión a base de datos en servidor.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
