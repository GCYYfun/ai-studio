/**
 * 环境配置
 * 
 * 统一管理所有环境变量和配置
 */

export const env = {
    // 环境标识
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    mode: import.meta.env.MODE,

    // API 配置
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
    apiRetryAttempts: Number(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    apiRetryDelay: Number(import.meta.env.VITE_API_RETRY_DELAY) || 1000,

    // 日志配置
    logLevel: import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'debug' : 'warn'),
    enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || import.meta.env.DEV,

    // 缓存配置
    cacheDefaultTTL: Number(import.meta.env.VITE_CACHE_DEFAULT_TTL) || 300000, // 5分钟
    cacheMaxSize: Number(import.meta.env.VITE_CACHE_MAX_SIZE) || 100,
    cacheCleanupInterval: Number(import.meta.env.VITE_CACHE_CLEANUP_INTERVAL) || 60000, // 1分钟

    // 功能开关
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableServiceWorker: import.meta.env.VITE_ENABLE_SERVICE_WORKER === 'true',

    // 应用信息
    appName: 'AI Studio',
    appVersion: import.meta.env.VITE_APP_VERSION || '0.0.1'
};

// 类型导出
export type Environment = typeof env;
