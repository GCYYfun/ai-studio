/**
 * HTTP and API types
 */

export interface APIClientConfig {
    baseURL: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
}

export interface APIResponse<T> {
    data: T;
    success: boolean;
    error?: string;
    timestamp: Date;
}

export interface APIError {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
}
