import { apiClient } from './api';
import { API_BASE_URL } from '$lib/utils/constants';
import type { APIResponse } from '$lib/types';

/**
 * Statistics API 接口类型定义
 */
export interface UsageStatistics {
	total_calls: number;
	successful_calls: number;
	failed_calls: number;
	total_input_tokens: number;
	total_output_tokens: number;
	total_tokens: number;
	total_cost: number;
	stream_calls: number;
	non_stream_calls: number;
}

export interface KeyStatistics {
	api_key_name: string;
	statistics: UsageStatistics;
}

export interface ApiCallLog {
	id: number;
	timestamp: string;
	api_key_name: string;
	endpoint: string;
	method: string;
	status_code: number | null;
	model_name: string | null;
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	cost: number;
	latency_ms: number | null;
	error_message: string | null;
	is_stream: boolean;
}

export interface LogsResponse {
	logs: ApiCallLog[];
	total: number;
	page: number;
	page_size: number;
	total_pages: number;
}

export interface StatisticsApiParams {
	start_date?: string;
	end_date?: string;
}

export interface LogsApiParams extends StatisticsApiParams {
	key_name?: string;
	model_name?: string;
	page?: number;
	page_size?: number;
}

/**
 * Statistics API 客户端
 */
export class StatisticsApiClient {
	private apiKey: string | null = null;
	private isAdmin: boolean = false;

	constructor(apiKey?: string) {
		if (apiKey) {
			this.setApiKey(apiKey);
		}
	}

	/**
	 * 设置 API Key
	 */
	setApiKey(apiKey: string) {
		this.apiKey = apiKey;
		// 不在前端预判管理员权限，完全由后台API决定
		this.isAdmin = false;
	}

	/**
	 * 获取请求头
	 */
	private getHeaders(): Record<string, string> {
		if (!this.apiKey) {
			throw new Error('API Key is required');
		}
		return {
			'X-API-Key': this.apiKey
		};
	}

	/**
	 * 检查管理员权限 - 通过尝试访问管理员端点来判断
	 */
	async checkAdminStatus(): Promise<boolean> {
		try {
			const response = await apiClient.request<UsageStatistics>(
				'/statistics/overview',
				{
					method: 'GET',
					headers: this.getHeaders()
				},
				{ timeout: 5000 }
			);
			this.isAdmin = response.success;
			return response.success;
		} catch (error) {
			this.isAdmin = false;
			return false;
		}
	}

	/**
	 * 获取我的统计数据
	 */
	async getMyStatistics(params?: StatisticsApiParams): Promise<APIResponse<UsageStatistics>> {
		const queryParams = new URLSearchParams();
		if (params?.start_date) queryParams.append('start_date', params.start_date);
		if (params?.end_date) queryParams.append('end_date', params.end_date);

		const endpoint = `/statistics/my${queryParams.toString() ? `?${queryParams}` : ''}`;
		
		return apiClient.request<UsageStatistics>(endpoint, {
			method: 'GET',
			headers: this.getHeaders()
		});
	}

	/**
	 * 获取总体统计（仅管理员）
	 */
	async getOverviewStatistics(params?: StatisticsApiParams): Promise<APIResponse<UsageStatistics>> {
		if (!this.isAdmin) {
			return {
				data: null as any,
				success: false,
				error: '只有管理员可以查看总体统计',
				timestamp: new Date()
			};
		}

		const queryParams = new URLSearchParams();
		if (params?.start_date) queryParams.append('start_date', params.start_date);
		if (params?.end_date) queryParams.append('end_date', params.end_date);

		const endpoint = `/statistics/overview${queryParams.toString() ? `?${queryParams}` : ''}`;
		
		return apiClient.request<UsageStatistics>(endpoint, {
			method: 'GET',
			headers: this.getHeaders()
		});
	}

	/**
	 * 获取指定 Key 的统计（仅管理员）
	 */
	async getKeyStatistics(keyName: string, params?: StatisticsApiParams): Promise<APIResponse<UsageStatistics>> {
		if (!this.isAdmin) {
			return {
				data: null as any,
				success: false,
				error: '只有管理员可以查看指定 Key 的统计',
				timestamp: new Date()
			};
		}

		const queryParams = new URLSearchParams();
		if (params?.start_date) queryParams.append('start_date', params.start_date);
		if (params?.end_date) queryParams.append('end_date', params.end_date);

		const endpoint = `/statistics/by-key/${keyName}${queryParams.toString() ? `?${queryParams}` : ''}`;
		
		return apiClient.request<UsageStatistics>(endpoint, {
			method: 'GET',
			headers: this.getHeaders()
		});
	}

	/**
	 * 获取所有 Key 的统计列表（仅管理员）
	 */
	async getAllKeysStatistics(params?: StatisticsApiParams): Promise<APIResponse<KeyStatistics[]>> {
		if (!this.isAdmin) {
			return {
				data: null as any,
				success: false,
				error: '只有管理员可以查看所有 Key 的统计',
				timestamp: new Date()
			};
		}

		const queryParams = new URLSearchParams();
		if (params?.start_date) queryParams.append('start_date', params.start_date);
		if (params?.end_date) queryParams.append('end_date', params.end_date);

		const endpoint = `/statistics/all-keys${queryParams.toString() ? `?${queryParams}` : ''}`;
		
		return apiClient.request<KeyStatistics[]>(endpoint, {
			method: 'GET',
			headers: this.getHeaders()
		});
	}

	/**
	 * 查询调用日志
	 */
	async getLogs(params?: LogsApiParams): Promise<APIResponse<LogsResponse>> {
		const queryParams = new URLSearchParams();
		if (params?.key_name) queryParams.append('key_name', params.key_name);
		if (params?.model_name) queryParams.append('model_name', params.model_name);
		if (params?.start_date) queryParams.append('start_date', params.start_date);
		if (params?.end_date) queryParams.append('end_date', params.end_date);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

		const endpoint = `/statistics/logs${queryParams.toString() ? `?${queryParams}` : ''}`;
		
		return apiClient.request<LogsResponse>(endpoint, {
			method: 'GET',
			headers: this.getHeaders()
		});
	}

	/**
	 * 健康检查 - 通过尝试获取统计数据来检查连接
	 */
	async healthCheck(): Promise<APIResponse<{ status: string; timestamp: string }>> {
		try {
			// 使用 /statistics/my 端点来检查连接
			const response = await apiClient.request<UsageStatistics>(
				'/statistics/my',
				{
					method: 'GET',
					headers: this.getHeaders()
				}
			);
			
			if (response.success) {
				return {
					data: {
						status: 'healthy',
						timestamp: new Date().toISOString()
					},
					success: true,
					timestamp: new Date()
				};
			} else {
				throw new Error(response.error || 'Health check failed');
			}
		} catch (error) {
			return {
				data: null as any,
				success: false,
				error: error instanceof Error ? error.message : 'Health check failed',
				timestamp: new Date()
			};
		}
	}

	/**
	 * 导出统计数据
	 */
	async exportStatistics(format: 'csv' | 'json' = 'csv', params?: StatisticsApiParams): Promise<Blob> {
		const queryParams = new URLSearchParams();
		queryParams.append('format', format);
		if (params?.start_date) queryParams.append('start_date', params.start_date);
		if (params?.end_date) queryParams.append('end_date', params.end_date);

		const endpoint = `/statistics/export?${queryParams}`;
		
		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			headers: this.getHeaders()
		});

		if (!response.ok) {
			throw new Error(`Export failed: ${response.statusText}`);
		}

		return response.blob();
	}

	/**
	 * 清理旧记录（仅管理员）
	 */
	async cleanupOldRecords(days: number): Promise<APIResponse<{ message: string; deleted_count: number; retention_days: number }>> {
		if (!this.isAdmin) {
			return {
				data: null as any,
				success: false,
				error: '只有管理员可以清理旧记录',
				timestamp: new Date()
			};
		}

		return apiClient.request<{ message: string; deleted_count: number; retention_days: number }>(
			`/statistics/cleanup?days=${days}`,
			{
				method: 'POST',
				headers: this.getHeaders()
			}
		);
	}

	/**
	 * 获取当前用户权限信息
	 */
	getPermissions() {
		return {
			isAdmin: this.isAdmin,
			hasApiKey: !!this.apiKey
		};
	}
}

// 创建默认实例（需要设置 API Key）
export const statisticsApi = new StatisticsApiClient();

// 便捷方法
export const statsApi = {
	setApiKey: (apiKey: string) => statisticsApi.setApiKey(apiKey),
	checkAdmin: () => statisticsApi.checkAdminStatus(),
	getMyStats: (params?: StatisticsApiParams) => statisticsApi.getMyStatistics(params),
	getOverview: (params?: StatisticsApiParams) => statisticsApi.getOverviewStatistics(params),
	getAllKeys: (params?: StatisticsApiParams) => statisticsApi.getAllKeysStatistics(params),
	getLogs: (params?: LogsApiParams) => statisticsApi.getLogs(params),
	healthCheck: () => statisticsApi.healthCheck(),
	export: (format: 'csv' | 'json', params?: StatisticsApiParams) => 
		statisticsApi.exportStatistics(format, params),
	cleanup: (days: number) => statisticsApi.cleanupOldRecords(days),
	getPermissions: () => statisticsApi.getPermissions()
};