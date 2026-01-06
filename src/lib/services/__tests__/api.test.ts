import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from '../api';
import { ErrorType } from '../../types';

// Mock fetch
global.fetch = vi.fn();

describe('APIClient', () => {
	let apiClient: APIClient;

	beforeEach(() => {
		apiClient = new APIClient({
			baseURL: 'http://localhost:3001',
			timeout: 5000,
			retryAttempts: 2,
			retryDelay: 100
		});
		vi.clearAllMocks();
	});

	describe('request method', () => {
		it('should make successful GET request', async () => {
			const mockData = { message: 'success' };
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockData)
			});

			const response = await apiClient.get('/test');

			expect(response.success).toBe(true);
			expect(response.data).toEqual(mockData);
			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:3001/test',
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);
		});

		it('should handle network errors with retry', async () => {
			const networkError = new TypeError('Failed to fetch');
			(fetch as any)
				.mockRejectedValueOnce(networkError)
				.mockRejectedValueOnce(networkError)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ success: true })
				});

			const response = await apiClient.get('/test');

			expect(response.success).toBe(true);
			expect(fetch).toHaveBeenCalledTimes(3);
		});

		it('should handle timeout errors', async () => {
			const timeoutError = new Error('AbortError');
			timeoutError.name = 'AbortError';
			(fetch as any).mockRejectedValue(timeoutError);

			const response = await apiClient.get('/test');

			expect(response.success).toBe(false);
			expect(response.error).toContain('请求超时');
		});

		it('should handle API errors without retry', async () => {
			(fetch as any).mockResolvedValue({
				ok: false,
				status: 400,
				statusText: 'Bad Request'
			});

			const response = await apiClient.get('/test');

			expect(response.success).toBe(false);
			expect(fetch).toHaveBeenCalledTimes(1); // No retry for API errors
		});
	});

	describe('error classification', () => {
		it('should classify network errors correctly', async () => {
			const networkError = new TypeError('Failed to fetch');
			(fetch as any).mockRejectedValue(networkError);

			const response = await apiClient.get('/test');
			
			expect(response.success).toBe(false);
			expect(response.error).toContain('网络连接失败');
		});

		it('should classify authentication errors correctly', async () => {
			(fetch as any).mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			});

			const response = await apiClient.get('/test');
			
			expect(response.success).toBe(false);
			expect(response.error).toContain('身份验证失败');
		});
	});

	describe('POST requests', () => {
		it('should send POST request with data', async () => {
			const postData = { name: 'test' };
			const responseData = { id: 1, ...postData };
			
			(fetch as any).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(responseData)
			});

			const response = await apiClient.post('/users', postData);

			expect(response.success).toBe(true);
			expect(response.data).toEqual(responseData);
			expect(fetch).toHaveBeenCalledWith(
				'http://localhost:3001/users',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(postData),
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);
		});
	});

	describe('error recovery', () => {
		it('should provide recovery actions for network errors', () => {
			const networkError = {
				code: ErrorType.NETWORK_ERROR,
				message: 'Network failed',
				details: {},
				retryable: true
			};

			const recovery = apiClient.getErrorRecovery(networkError);

			expect(recovery.canRecover).toBe(true);
			expect(recovery.recoveryActions).toHaveLength(2);
			expect(recovery.recoveryActions[0].label).toBe('检查网络连接');
			expect(recovery.recoveryActions[1].label).toBe('重试请求');
		});

		it('should provide recovery actions for authentication errors', () => {
			const authError = {
				code: ErrorType.AUTHENTICATION_ERROR,
				message: 'Unauthorized',
				details: {},
				retryable: false
			};

			const recovery = apiClient.getErrorRecovery(authError);

			expect(recovery.canRecover).toBe(true);
			expect(recovery.recoveryActions).toHaveLength(1);
			expect(recovery.recoveryActions[0].label).toBe('重新登录');
		});
	});
});