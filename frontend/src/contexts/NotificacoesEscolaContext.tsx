import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  Notificacao,
  listarNotificacoes as apiListar,
  marcarLida as apiMarcarLida,
  marcarTodasLidas as apiMarcarTodas,
  deletarNotificacao as apiDeletar,
} from '../services/notificacoes';
import {
  REALTIME_BROWSER_EVENT,
  RealtimeEvent,
  shouldRefreshForRealtimeEvent,
} from '../services/realtime';

interface NotificacoesEscolaCtx {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  recarregar: () => void;
  marcarLida: (id: number) => Promise<void>;
  marcarTodasLidas: () => Promise<void>;
  deletar: (id: number) => Promise<void>;
  abrirNotificacao: (n: Notificacao) => void;
}

const Ctx = createContext<NotificacoesEscolaCtx | null>(null);

export const NotificacoesEscolaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevNaoLidasRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const recarregar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiListar();
      setNotificacoes(res.data);

      if (prevNaoLidasRef.current !== null && res.nao_lidas > prevNaoLidasRef.current) {
        const novas = res.data.filter(n => !n.lida).slice(0, res.nao_lidas - prevNaoLidasRef.current);
        novas.forEach(n => {
          toast.info(`🔔 ${n.titulo}: ${n.mensagem}`, {
            onClick: () => { if (n.link) navigate(n.link); },
            autoClose: 6000,
          });
        });
      }
      prevNaoLidasRef.current = res.nao_lidas;
      setNaoLidas(res.nao_lidas);
    } catch {
      // silencioso — não quebrar o layout por falha de notificação
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const realtimeEvent = (event as CustomEvent<RealtimeEvent>).detail;
      if (shouldRefreshForRealtimeEvent(realtimeEvent, { domains: ['notificacoes'] })) {
        recarregar();
      }
    };

    window.addEventListener(REALTIME_BROWSER_EVENT, handleRealtime);
    return () => window.removeEventListener(REALTIME_BROWSER_EVENT, handleRealtime);
  }, [recarregar]);

  const marcarLida = async (id: number) => {
    await apiMarcarLida(id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    setNaoLidas(prev => Math.max(0, prev - 1));
  };

  const marcarTodasLidas = async () => {
    await apiMarcarTodas();
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    setNaoLidas(0);
  };

  const deletar = async (id: number) => {
    const era = notificacoes.find(n => n.id === id);
    await apiDeletar(id);
    setNotificacoes(prev => prev.filter(n => n.id !== id));
    if (era && !era.lida) setNaoLidas(prev => Math.max(0, prev - 1));
  };

  const abrirNotificacao = (n: Notificacao) => {
    if (!n.lida) marcarLida(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Ctx.Provider value={{ notificacoes, naoLidas, loading, recarregar, marcarLida, marcarTodasLidas, deletar, abrirNotificacao }}>
      {children}
    </Ctx.Provider>
  );
};

export const useNotificacoesEscola = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotificacoesEscola deve ser usado dentro de NotificacoesEscolaProvider');
  return ctx;
};
