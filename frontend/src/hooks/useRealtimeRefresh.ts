import { useEffect, useMemo, useRef } from 'react';
import {
  REALTIME_BROWSER_EVENT,
  type RealtimeDomain,
  type RealtimeEvent,
  shouldRefreshForRealtimeEvent,
} from '../services/realtime';

interface UseRealtimeRefreshOptions {
  domains: RealtimeDomain[];
  escolaId?: number | null;
  entityId?: number | null;
  onRefresh: (event: RealtimeEvent) => void;
}

export function useRealtimeRefresh({
  domains,
  escolaId,
  entityId,
  onRefresh,
}: UseRealtimeRefreshOptions): void {
  const onRefreshRef = useRef(onRefresh);
  const domainsKey = useMemo(() => domains.join('|'), [domains]);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const subscribedDomains = domainsKey.split('|').filter(Boolean) as RealtimeDomain[];
    if (subscribedDomains.length === 0) {
      return;
    }

    const handleRealtime = (event: Event) => {
      const realtimeEvent = (event as CustomEvent<RealtimeEvent>).detail;
      if (shouldRefreshForRealtimeEvent(realtimeEvent, {
        domains: subscribedDomains,
        escolaId,
        entityId,
      })) {
        onRefreshRef.current(realtimeEvent);
      }
    };

    window.addEventListener(REALTIME_BROWSER_EVENT, handleRealtime);
    return () => window.removeEventListener(REALTIME_BROWSER_EVENT, handleRealtime);
  }, [domainsKey, escolaId, entityId]);
}

export default useRealtimeRefresh;
