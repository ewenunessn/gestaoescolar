import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  connectRealtimeEvents,
  dispatchRealtimeBrowserEvent,
  getRealtimeInvalidationKeys,
} from '../services/realtime';

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const { hasToken, isReady } = useAuth();

  useEffect(() => {
    if (!isReady || !hasToken) {
      return;
    }

    const token = localStorage.getItem('token');
    const disconnect = connectRealtimeEvents({
      token,
      onEvent: (event) => {
        for (const queryKey of getRealtimeInvalidationKeys(event)) {
          queryClient.invalidateQueries({ queryKey });
        }
        dispatchRealtimeBrowserEvent(event);
      },
      onError: () => {
        if (import.meta.env.DEV) {
          console.warn('[realtime] conexao SSE indisponivel, aguardando reconexao automatica');
        }
      },
    });

    return disconnect;
  }, [hasToken, isReady, queryClient]);

  return <>{children}</>;
}

export default RealtimeProvider;
