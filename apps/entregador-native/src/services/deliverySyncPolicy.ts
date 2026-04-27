export const ROUTES_REFRESH_MS = 10 * 60 * 1000;
export const ROUTE_SCHOOLS_REFRESH_MS = 10 * 60 * 1000;
export const SCHOOL_ITEMS_REFRESH_MS = 5 * 60 * 1000;
export const COMPROVANTES_REFRESH_MS = 2 * 60 * 1000;

export function shouldRefreshCache({
  timestamp,
  now = Date.now(),
  maxAgeMs,
  force = false,
}: {
  timestamp?: number;
  now?: number;
  maxAgeMs: number;
  force?: boolean;
}): boolean {
  if (force || !timestamp) {
    return true;
  }

  return now - timestamp > maxAgeMs;
}
