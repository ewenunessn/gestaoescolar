import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { cacheService } from "../../../utils/cacheService";

export interface TokenBlacklistCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttlSeconds: number): Promise<void>;
}

function tokenKey(token: string): string {
  const digest = crypto.createHash("sha256").update(token).digest("hex");
  return `auth:token:blacklist:${digest}`;
}

function getTokenTtlSeconds(token: string, nowSeconds: number): number {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string" || typeof decoded.exp !== "number") {
    return 0;
  }

  return Math.max(0, decoded.exp - nowSeconds);
}

export class TokenBlacklistService {
  constructor(
    private readonly cache: TokenBlacklistCache = cacheService,
    private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  async blacklist(token: string): Promise<void> {
    const ttlSeconds = getTokenTtlSeconds(token, this.nowSeconds());
    if (ttlSeconds <= 0) return;

    await this.cache.set(tokenKey(token), true, ttlSeconds);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return (await this.cache.get<boolean>(tokenKey(token))) === true;
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
