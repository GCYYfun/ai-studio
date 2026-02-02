import type { APIResponse } from '$lib/types';

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
	key: string;
}

/**
 * 缓存配置接口
 */
interface CacheConfig {
	defaultTTL: number; // 默认缓存时间 (毫秒)
	maxSize: number; // 最大缓存条目数
	cleanupInterval: number; // 清理间隔 (毫秒)
}

/**
 * API响应缓存管理器
 * 提供内存缓存、TTL管理和自动清理功能
 */
export class APICache {
	private cache: Map<string, CacheEntry<any>>;
	private config: CacheConfig;
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor(config?: Partial<CacheConfig>) {
		this.config = {
			defaultTTL: 5 * 60 * 1000, // 5分钟
			maxSize: 100,
			cleanupInterval: 60 * 1000, // 1分钟
			...config
		};

		this.cache = new Map();
		this.startCleanupTimer();
	}

	/**
	 * 设置缓存
	 */
	set<T>(key: string, data: T, ttl?: number): void {
		// 如果缓存已满，删除最旧的条目
		if (this.cache.size >= this.config.maxSize) {
			this.evictOldest();
		}

		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			ttl: ttl || this.config.defaultTTL,
			key
		};

		this.cache.set(key, entry);
	}

	/**
	 * 获取缓存
	 */
	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		
		if (!entry) {
			return null;
		}

		// 检查是否过期
		if (this.isExpired(entry)) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	/**
	 * 检查缓存是否存在且未过期
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key);
		
		if (!entry) {
			return false;
		}

		if (this.isExpired(entry)) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * 删除缓存
	 */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
	 * 清空所有缓存
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * 获取缓存统计信息
	 */
	getStats(): {
		size: number;
		maxSize: number;
		hitRate: number;
		entries: Array<{ key: string; age: number; ttl: number }>;
	} {
		const entries = Array.from(this.cache.values()).map(entry => ({
			key: entry.key,
			age: Date.now() - entry.timestamp,
			ttl: entry.ttl
		}));

		return {
			size: this.cache.size,
			maxSize: this.config.maxSize,
			hitRate: 0, // 可以通过添加计数器来实现
			entries
		};
	}

	/**
	 * 检查条目是否过期
	 */
	private isExpired(entry: CacheEntry<any>): boolean {
		return Date.now() - entry.timestamp > entry.ttl;
	}

	/**
	 * 删除最旧的条目
	 */
	private evictOldest(): void {
		let oldestKey: string | null = null;
		let oldestTimestamp = Date.now();

		for (const [key, entry] of this.cache.entries()) {
			if (entry.timestamp < oldestTimestamp) {
				oldestTimestamp = entry.timestamp;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	/**
	 * 清理过期条目
	 */
	private cleanup(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach(key => this.cache.delete(key));

		if (expiredKeys.length > 0) {
			console.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
		}
	}

	/**
	 * 启动清理定时器
	 */
	private startCleanupTimer(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		this.cleanupTimer = setInterval(() => {
			this.cleanup();
		}, this.config.cleanupInterval);
	}

	/**
	 * 停止清理定时器
	 */
	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
		this.clear();
	}
}

/**
 * 数据格式兼容性处理器
 */
export class DataCompatibilityHandler {
	private versionHandlers: Map<string, (data: any) => any>;

	constructor() {
		this.versionHandlers = new Map();
		this.initializeHandlers();
	}

	/**
	 * 初始化版本处理器
	 */
	private initializeHandlers(): void {
		// API v1 到 v2 的数据转换
		this.versionHandlers.set('v1-to-v2', (data: any) => {
			if (data && typeof data === 'object') {
				// 处理字段名变更
				if ('request_count' in data) {
					data.requestCount = data.request_count;
					delete data.request_count;
				}
				
				if ('response_time' in data) {
					data.responseTime = data.response_time;
					delete data.response_time;
				}

				if ('error_rate' in data) {
					data.errorRate = data.error_rate;
					delete data.error_rate;
				}
			}
			return data;
		});

		// 处理时间戳格式变更
		this.versionHandlers.set('timestamp-format', (data: any) => {
			if (data && typeof data === 'object') {
				// 将字符串时间戳转换为Date对象
				Object.keys(data).forEach(key => {
					if (key.includes('timestamp') || key.includes('time')) {
						const value = data[key];
						if (typeof value === 'string' && !isNaN(Date.parse(value))) {
							data[key] = new Date(value);
						}
					}
				});

				// 递归处理嵌套对象
				Object.values(data).forEach(value => {
					if (value && typeof value === 'object' && !Array.isArray(value)) {
						this.versionHandlers.get('timestamp-format')!(value);
					}
				});
			}
			return data;
		});

		// 处理数组数据结构变更
		this.versionHandlers.set('array-structure', (data: any) => {
			if (data && Array.isArray(data)) {
				return data.map(item => {
					if (item && typeof item === 'object') {
						// 确保每个数组项都有必需的字段
						if (!item.id && item.key) {
							item.id = item.key;
						}
						if (!item.timestamp) {
							item.timestamp = new Date();
						}
					}
					return item;
				});
			}
			return data;
		});
	}

	/**
	 * 处理API响应数据兼容性
	 */
	processResponse<T>(response: APIResponse<T>): APIResponse<T> {
		try {
			let processedData = response.data;

			// 应用所有兼容性处理器
			for (const handler of this.versionHandlers.values()) {
				processedData = handler(processedData);
			}

			return {
				...response,
				data: processedData
			};
		} catch (error) {
			console.warn('Data compatibility processing failed:', error);
			// 返回原始数据，确保系统继续工作
			return response;
		}
	}

	/**
	 * 添加自定义兼容性处理器
	 */
	addHandler(name: string, handler: (data: any) => any): void {
		this.versionHandlers.set(name, handler);
	}

	/**
	 * 移除兼容性处理器
	 */
	removeHandler(name: string): boolean {
		return this.versionHandlers.delete(name);
	}

	/**
	 * 获取所有处理器名称
	 */
	getHandlerNames(): string[] {
		return Array.from(this.versionHandlers.keys());
	}
}

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
	/**
	 * 为API请求生成缓存键
	 */
	static forApiRequest(endpoint: string, params?: Record<string, any>): string {
		const baseKey = `api:${endpoint}`;
		
		if (!params || Object.keys(params).length === 0) {
			return baseKey;
		}

		// 对参数进行排序以确保一致性
		const sortedParams = Object.keys(params)
			.sort()
			.map(key => `${key}=${JSON.stringify(params[key])}`)
			.join('&');

		return `${baseKey}?${sortedParams}`;
	}

	/**
	 * 为仪表板数据生成缓存键
	 */
	static forDashboard(timeRange?: string, filters?: Record<string, any>): string {
		let key = 'dashboard:stats';
		
		if (timeRange) {
			key += `:${timeRange}`;
		}

		if (filters && Object.keys(filters).length > 0) {
			const filterStr = Object.keys(filters)
				.sort()
				.map(k => `${k}=${filters[k]}`)
				.join(',');
			key += `:${filterStr}`;
		}

		return key;
	}

	/**
	 * 为用户会话生成缓存键
	 */
	static forUserSession(userId: string, sessionType: string): string {
		return `session:${userId}:${sessionType}`;
	}

	/**
	 * 为模型配置生成缓存键
	 */
	static forModelConfig(modelName: string): string {
		return `model:config:${modelName}`;
	}
}

// 创建默认缓存实例
export const apiCache = new APICache();
export const dataCompatibility = new DataCompatibilityHandler();

// 导出便捷方法
export const cache = {
	set: <T>(key: string, data: T, ttl?: number) => apiCache.set(key, data, ttl),
	get: <T>(key: string) => apiCache.get<T>(key),
	has: (key: string) => apiCache.has(key),
	delete: (key: string) => apiCache.delete(key),
	clear: () => apiCache.clear(),
	stats: () => apiCache.getStats(),
	
	// 缓存键生成
	keyFor: CacheKeyGenerator,
	
	// 数据兼容性处理
	processResponse: <T>(response: APIResponse<T>) => dataCompatibility.processResponse(response)
};