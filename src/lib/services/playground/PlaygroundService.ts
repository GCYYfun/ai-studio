import { apiClient } from '../core/HttpClient';
import { cache, dataCompatibility } from '../core/CacheManager';
import type { APIResponse, ModelTest, PlaygroundSession } from '$lib/types';

/**
 * Playground 服务
 * 
 * 职责:
 * - 模型测试提交
 * - 测试历史管理
 * - 会话管理
 * - Playground 相关缓存管理
 */
export class PlaygroundService {
    /**
     * 提交模型测试
     */
    async submitTest(
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
            this.clearHistoryCache();
            return dataCompatibility.processResponse(response);
        }

        return response;
    }

    /**
     * 获取测试历史
     */
    async getHistory(sessionId?: string, useCache = true): Promise<APIResponse<ModelTest[]>> {
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
    async getSessions(useCache = true): Promise<APIResponse<PlaygroundSession[]>> {
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
     * 清除历史缓存
     */
    private clearHistoryCache(): void {
        const stats = cache.stats();
        stats.entries.forEach(entry => {
            if (entry.key.startsWith('playground:history')) {
                cache.delete(entry.key);
            }
        });
    }

    /**
     * 清除所有 Playground 缓存
     */
    clearCache(): void {
        const stats = cache.stats();
        stats.entries.forEach(entry => {
            if (entry.key.startsWith('playground:')) {
                cache.delete(entry.key);
            }
        });
    }

    /**
     * 预加载关键数据
     */
    async preloadData(): Promise<void> {
        try {
            await Promise.allSettled([
                this.getSessions()
            ]);

            console.info('[Playground] Data preloaded successfully');
        } catch (error) {
            console.warn('[Playground] Failed to preload some data:', error);
        }
    }
}

// 创建默认服务实例
export const playgroundService = new PlaygroundService();

// 导出便捷方法
export const playground = {
    // 测试相关
    submitTest: (input: string, parameters: Record<string, any>, model?: string) =>
        playgroundService.submitTest(input, parameters, model),

    getHistory: (sessionId?: string, useCache = true) =>
        playgroundService.getHistory(sessionId, useCache),

    // 会话相关
    getSessions: (useCache = true) =>
        playgroundService.getSessions(useCache),

    createSession: (name: string, model: string) =>
        playgroundService.createSession(name, model),

    // 缓存管理
    clearCache: () =>
        playgroundService.clearCache(),

    // 数据预加载
    preloadData: () =>
        playgroundService.preloadData()
};
