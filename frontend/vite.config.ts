import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const chunkPorDependencia = (id: string) => {
  if (!id.includes('node_modules')) return undefined;

  if (id.includes('node_modules/@pdfme/ui/')) return 'pdfme-ui';
  if (id.includes('node_modules/@pdfme/schemas/')) return 'pdfme-schemas';
  if (id.includes('node_modules/@pdfme/common/')) return 'pdfme-common';
  if (id.includes('node_modules/antd/')) return 'antd';
  if (id.includes('node_modules/@dnd-kit/')) return 'dnd-kit';
  if (id.includes('node_modules/pdfmake/build/pdfmake')) return 'pdfmake';
  if (id.includes('node_modules/pdfmake/build/vfs_fonts')) return 'pdf-fonts';
  if (id.includes('node_modules/exceljs/')) return 'exceljs';
  if (id.includes('node_modules/file-saver/')) return 'file-saver';
  if (id.includes('node_modules/xlsx/')) return 'xlsx';
  if (id.includes('node_modules/qrcode/')) return 'qrcode';

  return undefined;
};

export default defineConfig(({ mode }) => {
  // Carregar variáveis de ambiente baseadas no modo
  const env = loadEnv(mode, '.', 'VITE_');
  
  // Determinar se é desenvolvimento ou produção
  const isDev = mode === 'development';
  const isProd = mode === 'production';
  
  // URLs da API baseadas no ambiente com fallbacks seguros
  const apiUrl = env.VITE_API_URL || (isDev ? 'http://localhost:3000' : 'https://gestaoescolar-backend.vercel.app');
  
  // Validar se apiUrl não é null ou undefined
  if (!apiUrl) {
    throw new Error('API URL não configurada corretamente');
  }
  
  const apiConfig = {
    apiUrl: apiUrl.toString(),
    secure: isProd
  };
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Polyfills para módulos Node.js
        'path': 'path-browserify',
        'fs': false,
        'os': false,
        'crypto': false,
        'stream': false,
        'util': false,
        'events': false,
        // Path aliases
        '@shared': path.resolve(__dirname, '../shared')
      },
      dedupe: ['react', 'react-dom']
    },
    esbuild: {
      // Skip type checking during build for faster builds
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        '/api': {
          target: apiConfig.apiUrl,
          changeOrigin: true,
          secure: apiConfig.secure,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('Proxy error:', err);
            });
          }
        },
        '/health': {
          target: apiConfig.apiUrl,
          changeOrigin: true,
          secure: apiConfig.secure,
          rewrite: (path) => path.replace(/^\/health/, '/health'),
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('Proxy error:', err);
            });
          }
        }
      }
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: isDev,
      minify: isProd,
      chunkSizeWarningLimit: 5500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const chunkEspecial = chunkPorDependencia(id);
            if (chunkEspecial) return chunkEspecial;

            if (id.includes('node_modules/react-router-dom/')) return 'router';
            if (id.includes('node_modules/@mui/')) return 'mui';
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor';
            if (id.includes('node_modules/axios/') || id.includes('node_modules/date-fns/')) return 'utils';

            return undefined;
          }
        }
      },
      commonjsOptions: {
        transformMixedEsModules: true,
        exclude: ['node_modules/lodash-es/**', 'node_modules/@types/lodash-es/**']
      }
    },
    base: '/',
    define: {
      global: 'globalThis',
      __DEV__: isDev,
      __PROD__: isProd
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@mui/material', '@mui/icons-material'],
      exclude: ['fs', 'path', 'os', 'crypto', 'stream', 'util', 'events']
    }
  };
});
