// Core services - HTTP Client, Cache Manager, and WebSocket
export { APIClient, apiClient, api } from './HttpClient';
export { APICache, apiCache, cache, dataCompatibility } from './CacheManager';
export { WebSocketClient } from './WebSocketClient';
export type { WebSocketConfig } from './WebSocketClient';

// Types
export type { APIClientConfig, APIResponse, APIError } from '$lib/types';
