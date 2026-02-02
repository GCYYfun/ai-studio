/**
 * Error handling types
 */

export enum ErrorType {
    NETWORK_ERROR = 'network_error',
    API_ERROR = 'api_error',
    VALIDATION_ERROR = 'validation_error',
    AUTHENTICATION_ERROR = 'auth_error',
    TIMEOUT_ERROR = 'timeout_error',
    UNKNOWN_ERROR = 'unknown_error'
}

export interface ErrorHandlingStrategy {
    type: ErrorType;
    retryable: boolean;
    maxRetries: number;
    retryDelay: number;
    userMessage: string;
    logLevel: 'info' | 'warn' | 'error';
}

export interface ErrorRecovery {
    canRecover: boolean;
    recoveryActions: RecoveryAction[];
    fallbackData?: any;
}

export interface RecoveryAction {
    label: string;
    action: () => Promise<void>;
    primary: boolean;
}
