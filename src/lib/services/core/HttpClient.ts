import { ERROR_MESSAGES } from '$lib/utils/constants';
import { env } from '$lib/utils/env';
import { formatApiError } from '$lib/utils/formatters';
import type {
	APIClientConfig,
	APIResponse,
	APIError,
	ErrorType,
	ErrorHandlingStrategy,
	ErrorRecovery,
	RecoveryAction
} from '$lib/types';
import { ErrorType as ErrorTypeEnum } from '$lib/types';

/**
 * 统一的API客户端服务
 * 提供重试、超时、错误处理和恢复机制
 */
export class APIClient {
	private config: APIClientConfig;
	private errorStrategies: Map<ErrorType, ErrorHandlingStrategy>;

	constructor(config?: Partial<APIClientConfig>) {
		this.config = {
			baseURL: env.apiBaseUrl,
			timeout: env.apiTimeout,
			retryAttempts: env.apiRetryAttempts,
			retryDelay: env.apiRetryDelay,
			...config
		};

		this.errorStrategies = this.initializeErrorStrategies();
	}

	/**
	 * 初始化错误处理策略
	 */
	private initializeErrorStrategies(): Map<ErrorType, ErrorHandlingStrategy> {
		const strategies = new Map<ErrorType, ErrorHandlingStrategy>();

		strategies.set(ErrorTypeEnum.NETWORK_ERROR, {
			type: ErrorTypeEnum.NETWORK_ERROR,
			retryable: true,
			maxRetries: 3,
			retryDelay: 1000,
			userMessage: ERROR_MESSAGES.NETWORK_ERROR,
			logLevel: 'warn'
		});

		strategies.set(ErrorTypeEnum.API_ERROR, {
			type: ErrorTypeEnum.API_ERROR,
			retryable: false,
			maxRetries: 0,
			retryDelay: 0,
			userMessage: ERROR_MESSAGES.API_ERROR,
			logLevel: 'error'
		});

		strategies.set(ErrorTypeEnum.TIMEOUT_ERROR, {
			type: ErrorTypeEnum.TIMEOUT_ERROR,
			retryable: true,
			maxRetries: 2,
			retryDelay: 2000,
			userMessage: ERROR_MESSAGES.TIMEOUT_ERROR,
			logLevel: 'warn'
		});

		strategies.set(ErrorTypeEnum.AUTHENTICATION_ERROR, {
			type: ErrorTypeEnum.AUTHENTICATION_ERROR,
			retryable: false,
			maxRetries: 0,
			retryDelay: 0,
			userMessage: ERROR_MESSAGES.AUTHENTICATION_ERROR,
			logLevel: 'error'
		});

		strategies.set(ErrorTypeEnum.VALIDATION_ERROR, {
			type: ErrorTypeEnum.VALIDATION_ERROR,
			retryable: false,
			maxRetries: 0,
			retryDelay: 0,
			userMessage: ERROR_MESSAGES.VALIDATION_ERROR,
			logLevel: 'warn'
		});

		strategies.set(ErrorTypeEnum.UNKNOWN_ERROR, {
			type: ErrorTypeEnum.UNKNOWN_ERROR,
			retryable: true,
			maxRetries: 1,
			retryDelay: 1000,
			userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
			logLevel: 'error'
		});

		return strategies;
	}

	/**
	 * 执行HTTP请求
	 */
	async request<T>(
		endpoint: string,
		options: RequestInit = {},
		customConfig?: Partial<APIClientConfig & { headers?: Record<string, string> }>
	): Promise<APIResponse<T>> {
		const config = { ...this.config, ...customConfig };
		const url = this.buildUrl(endpoint);

		const requestOptions: RequestInit = {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
				...customConfig?.headers
			}
		};

		return this.executeWithRetry<T>(url, requestOptions, config);
	}

	/**
	 * GET请求
	 */
	async get<T>(endpoint: string, config?: Partial<APIClientConfig & { headers?: Record<string, string> }>): Promise<APIResponse<T>> {
		return this.request<T>(endpoint, { method: 'GET' }, config);
	}

	/**
	 * POST请求
	 */
	async post<T>(
		endpoint: string,
		data?: any,
		config?: Partial<APIClientConfig & { headers?: Record<string, string> }>
	): Promise<APIResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined
		}, config);
	}

	/**
	 * PUT请求
	 */
	async put<T>(
		endpoint: string,
		data?: any,
		config?: Partial<APIClientConfig & { headers?: Record<string, string> }>
	): Promise<APIResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined
		}, config);
	}

	/**
	 * DELETE请求
	 */
	async delete<T>(endpoint: string, config?: Partial<APIClientConfig & { headers?: Record<string, string> }>): Promise<APIResponse<T>> {
		return this.request<T>(endpoint, { method: 'DELETE' }, config);
	}

	/**
	 * 带重试机制的请求执行
	 */
	private async executeWithRetry<T>(
		url: string,
		options: RequestInit,
		config: APIClientConfig,
		attempt = 1
	): Promise<APIResponse<T>> {
		try {
			const response = await this.executeRequest<T>(url, options, config);
			return response;
		} catch (error) {
			const apiError = this.classifyError(error);
			const strategy = this.errorStrategies.get(apiError.code as ErrorType);

			if (strategy && strategy.retryable && attempt <= strategy.maxRetries) {
				console.warn(`Request failed, retrying (${attempt}/${strategy.maxRetries}):`, apiError.message);

				// 指数退避延迟
				const delay = strategy.retryDelay * Math.pow(2, attempt - 1);
				await this.sleep(delay);

				return this.executeWithRetry<T>(url, options, config, attempt + 1);
			}

			// 记录错误
			this.logError(apiError, strategy);

			// 返回错误响应
			return {
				data: null as any,
				success: false,
				error: strategy?.userMessage || apiError.message,
				timestamp: new Date()
			};
		}
	}

	/**
	 * 执行单次请求
	 */
	private async executeRequest<T>(
		url: string,
		options: RequestInit,
		config: APIClientConfig
	): Promise<APIResponse<T>> {
		// 创建AbortController用于超时控制
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), config.timeout);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			// 检查HTTP状态
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			// 解析响应
			const data = await response.json();

			return {
				data,
				success: true,
				timestamp: new Date()
			};

		} catch (error) {
			clearTimeout(timeoutId);
			throw error;
		}
	}

	/**
	 * 错误分类
	 */
	private classifyError(error: any): APIError {
		let errorType: ErrorType;
		let message: string;
		let retryable = false;

		if (error.name === 'AbortError') {
			errorType = ErrorTypeEnum.TIMEOUT_ERROR;
			message = 'Request timeout';
			retryable = true;
		} else if (error instanceof TypeError && error.message.includes('fetch')) {
			errorType = ErrorTypeEnum.NETWORK_ERROR;
			message = 'Network connection failed';
			retryable = true;
		} else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
			errorType = ErrorTypeEnum.AUTHENTICATION_ERROR;
			message = 'Authentication failed';
			retryable = false;
		} else if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
			errorType = ErrorTypeEnum.VALIDATION_ERROR;
			message = 'Invalid request data';
			retryable = false;
		} else if (error.message?.startsWith('HTTP')) {
			errorType = ErrorTypeEnum.API_ERROR;
			message = error.message;
			retryable = false;
		} else {
			errorType = ErrorTypeEnum.UNKNOWN_ERROR;
			message = formatApiError(error);
			retryable = true;
		}

		return {
			code: errorType,
			message,
			details: error,
			retryable
		};
	}

	/**
	 * 错误恢复建议
	 */
	getErrorRecovery(error: APIError): ErrorRecovery {
		const recoveryActions: RecoveryAction[] = [];

		switch (error.code) {
			case ErrorTypeEnum.NETWORK_ERROR:
				recoveryActions.push({
					label: '检查网络连接',
					action: async () => {
						// 可以实现网络连接检查逻辑

					},
					primary: true
				});
				recoveryActions.push({
					label: '重试请求',
					action: async () => {
						// 重试逻辑将由调用方处理

					},
					primary: false
				});
				break;

			case ErrorTypeEnum.TIMEOUT_ERROR:
				recoveryActions.push({
					label: '重试请求',
					action: async () => {

					},
					primary: true
				});
				break;

			case ErrorTypeEnum.AUTHENTICATION_ERROR:
				recoveryActions.push({
					label: '重新登录',
					action: async () => {
						// 重定向到登录页面或刷新token

					},
					primary: true
				});
				break;

			case ErrorTypeEnum.VALIDATION_ERROR:
				recoveryActions.push({
					label: '检查输入数据',
					action: async () => {

					},
					primary: true
				});
				break;

			default:
				recoveryActions.push({
					label: '重试请求',
					action: async () => {

					},
					primary: true
				});
				break;
		}

		return {
			canRecover: recoveryActions.length > 0,
			recoveryActions
		};
	}

	/**
	 * 记录错误
	 */
	private logError(error: APIError, strategy?: ErrorHandlingStrategy) {
		const logLevel = strategy?.logLevel || 'error';
		const logMessage = `API Error [${error.code}]: ${error.message}`;

		switch (logLevel) {
			case 'info':
				console.info(logMessage, error.details);
				break;
			case 'warn':
				console.warn(logMessage, error.details);
				break;
			case 'error':
				console.error(logMessage, error.details);
				break;
		}
	}

	/**
	 * 构建完整URL
	 */
	private buildUrl(endpoint: string): string {
		const baseUrl = this.config.baseURL.endsWith('/')
			? this.config.baseURL.slice(0, -1)
			: this.config.baseURL;
		const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
		return `${baseUrl}${cleanEndpoint}`;
	}

	/**
	 * 延迟函数
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * 更新配置
	 */
	updateConfig(newConfig: Partial<APIClientConfig>) {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * 获取当前配置
	 */
	getConfig(): APIClientConfig {
		return { ...this.config };
	}
}

// 创建默认的API客户端实例
export const apiClient = new APIClient();

// 导出便捷方法
export const api = {
	get: <T>(endpoint: string, config?: Partial<APIClientConfig & { headers?: Record<string, string> }>) =>
		apiClient.get<T>(endpoint, config),

	post: <T>(endpoint: string, data?: any, config?: Partial<APIClientConfig & { headers?: Record<string, string> }>) =>
		apiClient.post<T>(endpoint, data, config),

	put: <T>(endpoint: string, data?: any, config?: Partial<APIClientConfig & { headers?: Record<string, string> }>) =>
		apiClient.put<T>(endpoint, data, config),

	delete: <T>(endpoint: string, config?: Partial<APIClientConfig & { headers?: Record<string, string> }>) =>
		apiClient.delete<T>(endpoint, config),

	getErrorRecovery: (error: APIError) => apiClient.getErrorRecovery(error)
};