import { api } from './api';
import type { 
	ModelInfo, 
	ChatRequest, 
	ChatResponse, 
	StreamResponse,
	APIResponse 
} from '$lib/types';

/**
 * MengLong API 服务
 * 提供模型列表、模型信息和对话功能
 */
export class MengLongAPIService {
	private apiKey: string | null = null;

	/**
	 * 设置API密钥
	 */
	setApiKey(apiKey: string) {
		this.apiKey = apiKey;
	}

	/**
	 * 获取请求头
	 */
	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (this.apiKey) {
			headers['X-API-Key'] = this.apiKey;
		}

		return headers;
	}

	/**
	 * 获取所有支持的模型
	 */
	async getModels(): Promise<APIResponse<ModelInfo[]>> {
		const headers = this.getHeaders();
		return api.get<ModelInfo[]>('/menglong/models', {
			baseURL: 'http://localhost:8000',
			headers
		});
	}

	/**
	 * 获取指定模型信息
	 */
	async getModel(modelId: string): Promise<APIResponse<ModelInfo>> {
		const headers = this.getHeaders();
		return api.get<ModelInfo>(`/menglong/models/${modelId}`, {
			baseURL: 'http://localhost:8000',
			headers
		});
	}

	/**
	 * 发送聊天请求（非流式）
	 */
	async chat(request: ChatRequest): Promise<APIResponse<ChatResponse>> {
		const requestWithAuth = {
			...request,
			stream: false
		};

		const headers = this.getHeaders();
		return api.post<ChatResponse>('/menglong/chat', requestWithAuth, {
			baseURL: 'http://localhost:8000',
			headers
		});
	}

	/**
	 * 发送流式聊天请求
	 */
	async streamChat(
		request: ChatRequest,
		onChunk: (content: string) => void,
		onComplete?: (usage?: any) => void,
		onError?: (error: string) => void
	): Promise<void> {
		try {
			const requestWithAuth = {
				...request,
				stream: true
			};

			const response = await fetch('http://localhost:8000/menglong/chat', {
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(requestWithAuth)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || `HTTP ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('Response body is not readable');
			}

			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n').filter(line => line.trim());

				for (const line of lines) {
					try {
						const data: StreamResponse = JSON.parse(line);
						
						if (data.delta?.content) {
							onChunk(data.delta.content);
						}

						if (data.finish_reason && data.usage) {
							onComplete?.(data.usage);
						}
					} catch (e) {
						console.warn('Failed to parse stream chunk:', e);
					}
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			onError?.(errorMessage);
		}
	}

	/**
	 * 检查API连接状态
	 */
	async checkConnection(): Promise<APIResponse<any>> {
		const headers = this.getHeaders();
		return api.get('/menglong/', {
			baseURL: 'http://localhost:8000',
			headers
		});
	}
}

// 创建默认实例
export const menglongApi = new MengLongAPIService();