// Core services - HTTP Client and Cache Manager
export { APIClient, apiClient, api } from './HttpClient';
export { APICache, apiCache, cache, dataCompatibility } from './CacheManager';

// Types
export type { APIClientConfig, APIResponse, APIError } from '$lib/types';
