import { apiClient } from './api';
import { cache, dataCompatibility } from './cache';
import type { APIResponse, DashboardData, APIStats, ModelTest, PlaygroundSession } from '$lib/types';

/**
 * 高级API服务
 * 集成缓存、数据兼容性处理和特定业务逻辑
 */
export class APIService {
	/**
	 * 获取仪表板统计数据
	 */
	async getDashboardStats(timeRange?: string, useCache = true): Promise<APIResponse<DashboardData>> {
		const cacheKey = cache.keyFor.forDashboard(timeRange);
		
		// 尝试从缓存获取
		if (useCache && cache.has(cacheKey)) {
			const cachedData = cache.get<DashboardData>(cacheKey);
			if (cachedData) {
				return {
					data: cachedData,
					success: true,
					timestamp: new Date()
				};
			}
		}

		// 从API获取数据
		const endpoint = timeRange ? `/dashboard/stats?range=${timeRange}` : '/dashboard/stats';
		const response = await apiClient.get<DashboardData>(endpoint);

		if (response.success && response.data) {
			// 处理数据兼容性
			const processedResponse = dataCompatibility.processResponse(response);
			
			// 缓存处理后的数据 (缓存30秒)
			if (useCache) {
				cache.set(cacheKey, processedResponse.data, 30 * 1000);
			}
			
			return processedResponse;
		}

		return response;
	}

	/**
	 * 获取实时API统计
	 */
	async getRealtimeStats(useCache = true): Promise<APIResponse<APIStats>> {
		const cacheKey = 'api:realtime:stats';
		
		// 实时数据缓存时间较短 (10秒)
		if (useCache && cache.has(cacheKey)) {
			const cachedData = cache.get<APIStats>(cacheKey);
			if (cachedData) {
				return {
					data: cachedData,
					success: true,
					timestamp: new Date()
				};
			}
		}

		const response = await apiClient.get<APIStats>('/stats/realtime');

		if (response.success && response.data) {
			const processedResponse = dataCompatibility.processResponse(response);
			
			if (useCache) {
				cache.set(cacheKey, processedResponse.data, 10 * 1000);
			}
			
			return processedResponse;
		}

		return response;
	}

	/**
	 * 提交模型测试
	 */
	async submitModelTest(
		input: string, 
		parameters: Record<string, any>, 
		model = 'default'
	): Promise<APIResponse<ModelTest>> {
		const testData = {
			input,
			parameters,
			model,
			timestamp: new Date()
		};

		const response = await apiClient.post<ModelTest>('/playground/test', testData);

		if (response.success && response.data) {
			// 清除相关缓存，因为有新的测试数据
			this.invalidatePlaygroundCache();
			return dataCompatibility.processResponse(response);
		}

		return response;
	}

	/**
	 * 获取测试历史
	 */
	async getTestHistory(sessionId?: string, useCache = true): Promise<APIResponse<ModelTest[]>> {
		const cacheKey = sessionId 
			? `playground:history:${sessionId}` 
			: 'playground:history:default';
		
		if (useCache && cache.has(cacheKey)) {
			const cachedData = cache.get<ModelTest[]>(cacheKey);
			if (cachedData) {
				return {
					data: cachedData,
					success: true,
					timestamp: new Date()
				};
			}
		}

		const endpoint = sessionId 
			? `/playground/history?session=${sessionId}` 
			: '/playground/history';
		
		const response = await apiClient.get<ModelTest[]>(endpoint);

		if (response.success && response.data) {
			const processedResponse = dataCompatibility.processResponse(response);
			
			if (useCache) {
				// 历史数据缓存较长时间 (5分钟)
				cache.set(cacheKey, processedResponse.data, 5 * 60 * 1000);
			}
			
			return processedResponse;
		}

		return response;
	}

	/**
	 * 获取用户会话
	 */
	async getPlaygroundSessions(useCache = true): Promise<APIResponse<PlaygroundSession[]>> {
		const cacheKey = 'playground:sessions';
		
		if (useCache && cache.has(cacheKey)) {
			const cachedData = cache.get<PlaygroundSession[]>(cacheKey);
			if (cachedData) {
				return {
					data: cachedData,
					success: true,
					timestamp: new Date()
				};
			}
		}

		const response = await apiClient.get<PlaygroundSession[]>('/playground/sessions');

		if (response.success && response.data) {
			const processedResponse = dataCompatibility.processResponse(response);
			
			if (useCache) {
				cache.set(cacheKey, processedResponse.data, 2 * 60 * 1000);
			}
			
			return processedResponse;
		}

		return response;
	}

	/**
	 * 创建新的测试会话
	 */
	async createSession(name: string, model: string): Promise<APIResponse<PlaygroundSession>> {
		const sessionData = {
			name,
			model,
			createdAt: new Date()
		};

		const response = await apiClient.post<PlaygroundSession>('/playground/sessions', sessionData);

		if (response.success) {
			// 清除会话列表缓存
			cache.delete('playground:sessions');
			return dataCompatibility.processResponse(response);
		}

		return response;
	}

	/**
	 * 健康检查
	 */
	async healthCheck(): Promise<APIResponse<{ status: string; timestamp: Date }>> {
		// 健康检查不使用缓存
		return apiClient.get<{ status: string; timestamp: Date }>('/health');
	}

	/**
	 * 清除特定类型的缓存
	 */
	invalidateCache(type: 'dashboard' | 'playground' | 'stats' | 'all'): void {
		switch (type) {
			case 'dashboard':
				this.invalidateDashboardCache();
				break;
			case 'playground':
				this.invalidatePlaygroundCache();
				break;
			case 'stats':
				this.invalidateStatsCache();
				break;
			case 'all':
				cache.clear();
				break;
		}
	}

	/**
	 * 清除仪表板相关缓存
	 */
	private invalidateDashboardCache(): void {
		const stats = cache.stats();
		stats.entries.forEach(entry => {
			if (entry.key.startsWith('dashboard:')) {
				cache.delete(entry.key);
			}
		});
	}

	/**
	 * 清除playground相关缓存
	 */
	private invalidatePlaygroundCache(): void {
		const stats = cache.stats();
		stats.entries.forEach(entry => {
			if (entry.key.startsWith('playground:')) {
				cache.delete(entry.key);
			}
		});
	}

	/**
	 * 清除统计数据相关缓存
	 */
	private invalidateStatsCache(): void {
		const stats = cache.stats();
		stats.entries.forEach(entry => {
			if (entry.key.includes('stats') || entry.key.includes('realtime')) {
				cache.delete(entry.key);
			}
		});
	}

	/**
	 * 获取缓存统计信息
	 */
	getCacheStats() {
		return cache.stats();
	}

	/**
	 * 预加载关键数据
	 */
	async preloadData(): Promise<void> {
		try {
			// 并行预加载关键数据
			await Promise.allSettled([
				this.getDashboardStats(),
				this.getRealtimeStats(),
				this.getPlaygroundSessions()
			]);
			
			console.info('API data preloaded successfully');
		} catch (error) {
			console.warn('Failed to preload some API data:', error);
		}
	}
}

// 创建默认服务实例
export const apiService = new APIService();

// 导出便捷方法
export const api = {
	// 仪表板相关
	getDashboardStats: (timeRange?: string, useCache = true) => 
		apiService.getDashboardStats(timeRange, useCache),
	
	getRealtimeStats: (useCache = true) => 
		apiService.getRealtimeStats(useCache),

	// Playground相关
	submitTest: (input: string, parameters: Record<string, any>, model?: string) => 
		apiService.submitModelTest(input, parameters, model),
	
	getTestHistory: (sessionId?: string, useCache = true) => 
		apiService.getTestHistory(sessionId, useCache),
	
	getSessions: (useCache = true) => 
		apiService.getPlaygroundSessions(useCache),
	
	createSession: (name: string, model: string) => 
		apiService.createSession(name, model),

	// 系统相关
	healthCheck: () => apiService.healthCheck(),
	
	// 缓存管理
	invalidateCache: (type: 'dashboard' | 'playground' | 'stats' | 'all') => 
		apiService.invalidateCache(type),
	
	getCacheStats: () => apiService.getCacheStats(),
	
	preloadData: () => apiService.preloadData()
};