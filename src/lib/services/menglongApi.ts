import { api } from './api';
import { API_BASE_URL } from '$lib/utils/constants';
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
			baseURL: API_BASE_URL,
			headers
		});
	}

	/**
	 * 获取指定模型信息
	 */
	async getModel(modelId: string): Promise<APIResponse<ModelInfo>> {
		const headers = this.getHeaders();
		return api.get<ModelInfo>(`/menglong/models/${modelId}`, {
			baseURL: API_BASE_URL,
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

		// Debug: Log the request
		console.log('[menglongApi.chat] Request:', JSON.stringify(requestWithAuth, null, 2));

		const headers = this.getHeaders();
		const response = await api.post<ChatResponse>('/menglong/chat', requestWithAuth, {
			baseURL: API_BASE_URL,
			headers
		});

		// Debug: Log the response
		console.log('[menglongApi.chat] Response:', JSON.stringify(response, null, 2));

		return response;
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
		// Create AbortController for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
			onError?.('Request timeout after 120 seconds');
		}, 120000); // 120 seconds timeout

		try {
			const requestWithAuth = {
				...request,
				stream: true
			};

			console.log('[menglongApi.streamChat] Starting stream request:', JSON.stringify(requestWithAuth, null, 2));

			const response = await fetch(`${API_BASE_URL}/menglong/chat`, {
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(requestWithAuth),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || `HTTP ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('Response body is not readable');
			}

			const decoder = new TextDecoder();
			let chunkCount = 0;

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					console.log('[menglongApi.streamChat] Stream completed, total chunks:', chunkCount);
					break;
				}

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n').filter(line => line.trim());

				for (const line of lines) {
					try {
						const data: StreamResponse = JSON.parse(line);
						
						if (data.delta?.content) {
							chunkCount++;
							onChunk(data.delta.content);
						}

						if (data.finish_reason && data.usage) {
							console.log('[menglongApi.streamChat] Stream finished:', data.finish_reason, 'Usage:', data.usage);
							onComplete?.(data.usage);
						}
					} catch (e) {
						console.warn('Failed to parse stream chunk:', e, 'Line:', line);
					}
				}
			}
		} catch (error) {
			clearTimeout(timeoutId);
			
			if (error instanceof Error && error.name === 'AbortError') {
				console.error('[menglongApi.streamChat] Request aborted (timeout)');
				onError?.('Request timeout - the server took too long to respond');
			} else {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				console.error('[menglongApi.streamChat] Stream error:', errorMessage);
				onError?.(errorMessage);
			}
		}
	}

	/**
	 * 检查API连接状态
	 */
	async checkConnection(): Promise<APIResponse<any>> {
		const headers = this.getHeaders();
		return api.get('/menglong/', {
			baseURL: API_BASE_URL,
			headers
		});
	}
}

// 创建默认实例
export const menglongApi = new MengLongAPIService();