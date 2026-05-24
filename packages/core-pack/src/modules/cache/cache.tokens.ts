import { CORE_TOKENS, createToken } from "@trinacria-cms/kernel";
import type { CacheService } from "./cache.service.js";

export const CORE_PACK_CACHE_ADAPTER_TOKEN = CORE_TOKENS.CACHE_ADAPTER;

export const CORE_PACK_CACHE_SERVICE_TOKEN = createToken<CacheService>("CORE_PACK_CACHE_SERVICE");
