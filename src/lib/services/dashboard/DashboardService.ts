import { apiClient } from '../core/HttpClient';
import { cache, dataCompatibility } from '../core/CacheManager';
import type { APIResponse, DashboardData, APIStats } from '$lib/types';

/**
 * Dashboard 服务
 * 
 * 职责:
 * - 获取仪表板统计数据
 * - 获取实时 API 统计
 * - Dashboard 相关缓存管理
 * - 数据预加载
 */
export class DashboardService {
    /**
     * 获取仪表板统计数据
     */
    async getStats(timeRange?: string, useCache = true): Promise<APIResponse<DashboardData>> {
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
        const cacheKey = 'dashboard:realtime:stats';

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
     * 清除 Dashboard 相关缓存
     */
    clearCache(): void {
        const stats = cache.stats();
        stats.entries.forEach(entry => {
            if (entry.key.startsWith('dashboard:')) {
                cache.delete(entry.key);
            }
        });
    }

    /**
     * 预加载关键数据
     */
    async preloadData(): Promise<void> {
        try {
            // 并行预加载关键数据
            await Promise.allSettled([
                this.getStats(),
                this.getRealtimeStats()
            ]);

            console.info('[Dashboard] Data preloaded successfully');
        } catch (error) {
            console.warn('[Dashboard] Failed to preload some data:', error);
        }
    }
}

// 创建默认服务实例
export const dashboardService = new DashboardService();

// 导出便捷方法
export const dashboard = {
    // 数据获取
    getStats: (timeRange?: string, useCache = true) =>
        dashboardService.getStats(timeRange, useCache),

    getRealtimeStats: (useCache = true) =>
        dashboardService.getRealtimeStats(useCache),

    // 缓存管理
    clearCache: () =>
        dashboardService.clearCache(),

    // 数据预加载
    preloadData: () =>
        dashboardService.preloadData()
};
