import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = { ...process.env, ...loadEnv(mode, '.', '') };
    let supabaseUrl = 
      env.VITE_SUPABASE_URL || 
      env.SUPABASE_URL || 
      env.STORAGE_SUPABASE_URL || 
      env.STORAGE_URL || 
      env.VITE_STORAGE_URL || 
      env.NEXT_PUBLIC_SUPABASE_URL || 
      env.NEXT_PUBLIC_STORAGE_SUPABASE_URL || 
      env.FAMACIAYIREH_SUPABASE_URL || 
      '';
    let supabaseKey = 
      env.VITE_SUPABASE_ANON_KEY || 
      env.SUPABASE_ANON_KEY || 
      env.STORAGE_SUPABASE_ANON_KEY || 
      env.STORAGE_ANON_KEY || 
      env.VITE_STORAGE_ANON_KEY || 
      env.SUPABASE_KEY || 
      env.STORAGE_KEY || 
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY || 
      env.FAMACIAYIREH_SUPABASE_ANON_KEY || 
      '';

    if (!supabaseUrl) {
      for (const [, val] of Object.entries(env)) {
        if (typeof val === 'string' && val.startsWith('https://') && val.includes('.supabase.co')) {
          supabaseUrl = val.trim();
          break;
        }
      }
    }
    if (!supabaseKey) {
      for (const [k, val] of Object.entries(env)) {
        if (typeof val === 'string' && k.endsWith('_ANON_KEY') && val.length > 20) {
          supabaseKey = val.trim();
          break;
        }
      }
    }

    const localSyncMemory: Record<string, any> = {};

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      envPrefix: ['VITE_', 'STORAGE_', 'SUPABASE_', 'NEXT_PUBLIC_', 'FAMACIAYIREH_'],
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
              if (req.method === 'GET') {
                res.end(JSON.stringify({ success: true, data: localSyncMemory }));
                return;
              }
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body || '{}');
                    if (parsed.collection && parsed.data !== undefined) {
                      localSyncMemory[parsed.collection] = parsed.data;
                    } else if (parsed.allData) {
                      Object.assign(localSyncMemory, parsed.allData);
                    }
                    localSyncMemory.updatedAt = new Date().toISOString();
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
