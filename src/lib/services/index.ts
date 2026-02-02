/**
 * Services Module
 * 
 * Modular service architecture with clear separation of concerns:
 * - core: Shared HTTP client and cache manager
 * - dashboard: Dashboard-specific services and APIs
 * - playground: Playground-specific services and APIs
 */

// Core services (shared)
export * from './core';

// Dashboard module
export * from './dashboard';

// Playground module
export * from './playground';