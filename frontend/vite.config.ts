import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  // Carregar variáveis de ambiente baseadas no modo
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  // Determinar se é desenvolvimento ou produção
  const isDev = mode === 'development';
  const isProd = mode === 'production';
  
  // URLs da API baseadas no ambiente
  const apiUrl = env.VITE_API_URL || (isDev ? 'http://localhost:3000' : 'https://gestaoescolar-backend.vercel.app');
  
  const apiConfig = {
    apiUrl,
    secure: isProd
  };
  
  return {
    plugins: [react()],
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
          secure: apiConfig.secure
        },
        '/health': {
          target: apiConfig.apiUrl,
          changeOrigin: true,
          secure: apiConfig.secure,
          rewrite: (path) => path.replace(/^\/health/, '/health')
        }
      }
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: isDev,
      minify: isProd,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            router: ['react-router-dom'],
            utils: ['axios', 'date-fns']
          }
        }
      }
    },
    base: '/',
    define: {
      global: 'globalThis',
      __DEV__: isDev,
      __PROD__: isProd
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@mui/material', '@mui/icons-material']
    }
  };
});
