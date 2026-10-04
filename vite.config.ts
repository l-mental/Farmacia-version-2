import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = { ...process.env, ...loadEnv(mode, '.', '') };
    const supabaseUrl = 
      env.VITE_SUPABASE_URL || 
      env.SUPABASE_URL || 
      env.STORAGE_URL || 
      env.VITE_STORAGE_URL || 
      env.NEXT_PUBLIC_SUPABASE_URL || 
      '';
    const supabaseKey = 
      env.VITE_SUPABASE_ANON_KEY || 
      env.SUPABASE_ANON_KEY || 
      env.STORAGE_ANON_KEY || 
      env.VITE_STORAGE_ANON_KEY || 
      env.SUPABASE_KEY || 
      env.STORAGE_KEY || 
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      envPrefix: ['VITE_', 'STORAGE_', 'SUPABASE_', 'NEXT_PUBLIC_'],
      plugins: [
        react(), 
        tailwindcss(),
        {
          name: 'api-sync-dev-handler',
          configureServer(server) {
            server.middlewares.use('/api/sync', async (req, res) => {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');
              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }
              const CLOUD_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a0f067f7b646ce';
              if (req.method === 'GET') {
                try {
                  const cloudRes = await fetch(CLOUD_URL, { cache: 'no-store' });
                  const cloudJson = await cloudRes.json();
                  res.end(JSON.stringify({ success: true, data: cloudJson?.data || {} }));
                } catch {
                  res.end(JSON.stringify({ success: true, data: {} }));
                }
                return;
              }
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body || '{}');
                    const getRes = await fetch(CLOUD_URL, { cache: 'no-store' });
                    const getJson = await getRes.json();
                    const currentData = getJson?.data || {};
                    if (parsed.collection && parsed.data !== undefined) {
                      currentData[parsed.collection] = parsed.data;
                    } else if (parsed.allData) {
                      Object.assign(currentData, parsed.allData);
                    }
                    currentData.updatedAt = new Date().toISOString();
                    await fetch(CLOUD_URL, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: 'farmasalud_yireh_sync', data: currentData })
                    });
                    res.end(JSON.stringify({ success: true }));
                  } catch (e) {
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                  }
                });
                return;
              }
              res.end(JSON.stringify({ success: true }));
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
