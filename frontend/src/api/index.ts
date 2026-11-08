// Picks the adapter from VITE_USE_MOCK. Components import `api` from here and nowhere else.

import { mockApi } from './mock';
import { httpApi } from './http';
import type { FraudApi } from './types';

export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true').toLowerCase() !== 'false';

export const api: FraudApi = USE_MOCK ? mockApi : httpApi;

export * from './types';
