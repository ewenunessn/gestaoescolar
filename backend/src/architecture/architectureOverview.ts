import { getBffRouteDefinitions } from "../gateway/clientChannel";
import { CACHE_STRATEGY_BY_MODULE } from "./cacheStrategy";
import { REALTIME_CONTRACTS } from "./realtimeContract";
import { STORAGE_PROVIDER_NAMES } from "../storage/storageProvider";

export function buildArchitectureOverview() {
  return {
    bff: getBffRouteDefinitions(),
    cache: CACHE_STRATEGY_BY_MODULE,
    realtime: REALTIME_CONTRACTS,
    storage: {
      providers: [...STORAGE_PROVIDER_NAMES],
      env: "STORAGE_PROVIDER=local|s3|supabase",
    },
  };
}
