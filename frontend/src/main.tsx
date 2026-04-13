import React, { startTransition } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/transitions.css";

// ─── Handler para ChunkLoadError após deploy no Vercel ─────────────
// Quando um novo deploy é feito, os hashes dos chunks mudam.
// O navegador pode tentar carregar um chunk antigo que não existe mais (404).
// Este handler detecta o erro e força um reload para baixar os novos chunks.
let chunkReloadAttempted = false;

window.addEventListener('error', (event) => {
  const target = event.target as HTMLElement;
  const isChunkFile = target?.tagName === 'SCRIPT' && 
                      (target as HTMLScriptElement)?.src?.includes('/assets/');
  
  if (isChunkFile && !chunkReloadAttempted) {
    chunkReloadAttempted = true;
    console.warn('⚠️ Chunk load error detectado — recarregando página...');
    window.location.reload();
  }
}, true); // capture phase — script load errors don't bubble

// Fallback para erros de import dinâmico (React Router lazy routes)
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  const msg = String(args[0] || '');
  if (msg.includes('Failed to fetch dynamically imported module') || 
      msg.includes('ChunkLoadError')) {
    if (!chunkReloadAttempted) {
      chunkReloadAttempted = true;
      console.warn('⚠️ Import dinâmico falhou — recarregando página...');
      window.location.reload();
    }
  }
  originalConsoleError.apply(console, args);
};
// ─────────────────────────────────────────────────────────────────────

// Configuração para compatibilidade com React Router v7
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App routerConfig={router} />
  </React.StrictMode>
);
