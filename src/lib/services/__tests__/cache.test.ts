import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APICache, DataCompatibilityHandler, CacheKeyGenerator } from '../cache';

describe('APICache', () => {
	let cache: APICache;

	beforeEach(() => {
		cache = new APICache({
			defaultTTL: 1000, // 1 second for testing
			maxSize: 3,
			cleanupInterval: 500
		});
	});

	afterEach(() => {
		cache.destroy();
	});

	describe('basic operations', () => {
		it('should set and get cache entries', () => {
			const testData = { message: 'test' };
			cache.set('test-key', testData);

			const retrieved = cache.get('test-key');
			expect(retrieved).toEqual(testData);
		});

		it('should return null for non-existent keys', () => {
			const result = cache.get('non-existent');
			expect(result).toBeNull();
		});

		it('should check if key exists', () => {
			cache.set('test-key', 'test-value');
			
			expect(cache.has('test-key')).toBe(true);
			expect(cache.has('non-existent')).toBe(false);
		});

		it('should delete cache entries', () => {
			cache.set('test-key', 'test-value');
			expect(cache.has('test-key')).toBe(true);

			const deleted = cache.delete('test-key');
			expect(deleted).toBe(true);
			expect(cache.has('test-key')).toBe(false);
		});

		it('should clear all cache entries', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			
			cache.clear();
			
			expect(cache.has('key1')).toBe(false);
			expect(cache.has('key2')).toBe(false);
		});
	});

	describe('TTL functionality', () => {
		it('should expire entries after TTL', async () => {
			cache.set('test-key', 'test-value', 100); // 100ms TTL
			
			expect(cache.has('test-key')).toBe(true);
			
			// Wait for expiration
			await new Promise(resolve => setTimeout(resolve, 150));
			
			expect(cache.has('test-key')).toBe(false);
		});

		it('should use default TTL when not specified', () => {
			cache.set('test-key', 'test-value');
			
			const stats = cache.getStats();
			const entry = stats.entries.find(e => e.key === 'test-key');
			
			expect(entry?.ttl).toBe(1000); // Default TTL from config
		});
	});

	describe('size management', () => {
		it('should evict oldest entry when max size reached', () => {
			// Fill cache to max size
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.set('key3', 'value3');
			
			// Add one more to trigger eviction
			cache.set('key4', 'value4');
			
			// Oldest entry should be evicted
			expect(cache.has('key1')).toBe(false);
			expect(cache.has('key2')).toBe(true);
			expect(cache.has('key3')).toBe(true);
			expect(cache.has('key4')).toBe(true);
		});
	});

	describe('statistics', () => {
		it('should provide cache statistics', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			
			const stats = cache.getStats();
			
			expect(stats.size).toBe(2);
			expect(stats.maxSize).toBe(3);
			expect(stats.entries).toHaveLength(2);
			expect(stats.entries[0]).toHaveProperty('key');
			expect(stats.entries[0]).toHaveProperty('age');
			expect(stats.entries[0]).toHaveProperty('ttl');
		});
	});
});

describe('DataCompatibilityHandler', () => {
	let handler: DataCompatibilityHandler;

	beforeEach(() => {
		handler = new DataCompatibilityHandler();
	});

	describe('version handling', () => {
		it('should convert v1 field names to v2', () => {
			const v1Data = {
				request_count: 100,
				response_time: 250,
				error_rate: 0.05
			};

			const response = {
				data: v1Data,
				success: true,
				timestamp: new Date()
			};

			const processed = handler.processResponse(response);

			expect(processed.data).toEqual({
				requestCount: 100,
				responseTime: 250,
				errorRate: 0.05
			});
		});

		it('should handle timestamp format conversion', () => {
			const data = {
				created_timestamp: '2023-01-01T00:00:00Z',
				updated_time: '2023-01-02T12:00:00Z'
			};

			const response = {
				data,
				success: true,
				timestamp: new Date()
			};

			const processed = handler.processResponse(response);

			expect(processed.data.created_timestamp).toBeInstanceOf(Date);
			expect(processed.data.updated_time).toBeInstanceOf(Date);
		});

		it('should handle array structure changes', () => {
			const arrayData = [
				{ key: 'item1', value: 'test1' },
				{ key: 'item2', value: 'test2' }
			];

			const response = {
				data: arrayData,
				success: true,
				timestamp: new Date()
			};

			const processed = handler.processResponse(response);

			expect(processed.data[0]).toHaveProperty('id', 'item1');
			expect(processed.data[0]).toHaveProperty('timestamp');
			expect(processed.data[1]).toHaveProperty('id', 'item2');
			expect(processed.data[1]).toHaveProperty('timestamp');
		});
	});

	describe('custom handlers', () => {
		it('should allow adding custom handlers', () => {
			const customHandler = (data: any) => {
				if (data && data.customField) {
					data.processedCustomField = data.customField.toUpperCase();
				}
				return data;
			};

			handler.addHandler('custom-test', customHandler);

			const response = {
				data: { customField: 'hello' },
				success: true,
				timestamp: new Date()
			};

			const processed = handler.processResponse(response);

			expect(processed.data.processedCustomField).toBe('HELLO');
		});

		it('should allow removing handlers', () => {
			handler.addHandler('test-handler', (data) => data);
			
			expect(handler.getHandlerNames()).toContain('test-handler');
			
			const removed = handler.removeHandler('test-handler');
			
			expect(removed).toBe(true);
			expect(handler.getHandlerNames()).not.toContain('test-handler');
		});
	});

	describe('error handling', () => {
		it('should return original data if processing fails', () => {
			const originalData = { test: 'data' };
			const response = {
				data: originalData,
				success: true,
				timestamp: new Date()
			};

			// Add a handler that throws an error
			handler.addHandler('error-handler', () => {
				throw new Error('Processing failed');
			});

			const processed = handler.processResponse(response);

			// Should return original data when processing fails
			expect(processed.data).toEqual(originalData);
		});
	});
});

describe('CacheKeyGenerator', () => {
	describe('API request keys', () => {
		it('should generate simple endpoint key', () => {
			const key = CacheKeyGenerator.forApiRequest('/users');
			expect(key).toBe('api:/users');
		});

		it('should generate key with parameters', () => {
			const params = { page: 1, limit: 10 };
			const key = CacheKeyGenerator.forApiRequest('/users', params);
			expect(key).toBe('api:/users?limit=10&page=1');
		});

		it('should sort parameters for consistency', () => {
			const params1 = { b: 2, a: 1 };
			const params2 = { a: 1, b: 2 };
			
			const key1 = CacheKeyGenerator.forApiRequest('/test', params1);
			const key2 = CacheKeyGenerator.forApiRequest('/test', params2);
			
			expect(key1).toBe(key2);
		});
	});

	describe('dashboard keys', () => {
		it('should generate dashboard key without filters', () => {
			const key = CacheKeyGenerator.forDashboard();
			expect(key).toBe('dashboard:stats');
		});

		it('should generate dashboard key with time range', () => {
			const key = CacheKeyGenerator.forDashboard('7d');
			expect(key).toBe('dashboard:stats:7d');
		});

		it('should generate dashboard key with filters', () => {
			const filters = { type: 'error', severity: 'high' };
			const key = CacheKeyGenerator.forDashboard('1d', filters);
			expect(key).toBe('dashboard:stats:1d:severity=high,type=error');
		});
	});

	describe('specialized keys', () => {
		it('should generate user session key', () => {
			const key = CacheKeyGenerator.forUserSession('user123', 'playground');
			expect(key).toBe('session:user123:playground');
		});

		it('should generate model config key', () => {
			const key = CacheKeyGenerator.forModelConfig('gpt-4');
			expect(key).toBe('model:config:gpt-4');
		});
	});
});