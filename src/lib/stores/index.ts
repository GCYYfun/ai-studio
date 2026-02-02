/**
 * Store exports
 * 
 * Re-exports from modular store files for backward compatibility
 */

// Connection store
export { apiConnection, type APIConnectionState } from './connection';

// Theme store
export { themeStore } from './theme';

// Legacy api.ts exports (for backward compatibility)
// Note: api.ts includes its own playground state which may conflict
export * from './api';
