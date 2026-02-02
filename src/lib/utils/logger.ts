/**
 * 日志工具
 * 
 * 提供统一的日志管理,支持环境变量控制日志级别
 * 
 * @example
 * ```ts
 * import { logger } from '$lib/utils/logger';
 * 
 * logger.debug('Debug message', { data: 'value' });
 * logger.info('Info message');
 * logger.warn('Warning message');
 * logger.error('Error message', error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface LoggerConfig {
    level: LogLevel;
    isDev: boolean;
    enableTimestamp: boolean;
}

class Logger {
    private config: LoggerConfig;

    constructor() {
        this.config = {
            isDev: import.meta.env.DEV,
            level: this.getLogLevel(),
            enableTimestamp: true
        };
    }

    /**
     * 获取日志级别
     */
    private getLogLevel(): LogLevel {
        const envLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel;

        // 开发环境默认 debug,生产环境默认 warn
        if (envLevel) {
            return envLevel;
        }

        return this.config?.isDev ? 'debug' : 'warn';
    }

    /**
     * 判断是否应该输出日志
     */
    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];
        const currentLevelIndex = levels.indexOf(this.config.level);
        const requestedLevelIndex = levels.indexOf(level);

        return requestedLevelIndex >= currentLevelIndex;
    }

    /**
     * 格式化日志消息
     */
    private formatMessage(level: string, message: string): string {
        const timestamp = this.config.enableTimestamp
            ? new Date().toISOString().split('T')[1].split('.')[0]
            : '';

        const prefix = timestamp ? `[${timestamp}]` : '';
        return `${prefix}[${level.toUpperCase()}] ${message}`;
    }

    /**
     * 调试日志 (仅开发环境)
     */
    debug(message: string, ...args: any[]): void {
        if (this.config.isDev && this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message), ...args);
        }
    }

    /**
     * 信息日志
     */
    info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message), ...args);
        }
    }

    /**
     * 警告日志
     */
    warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message), ...args);
        }
    }

    /**
     * 错误日志
     */
    error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message), ...args);
        }
    }

    /**
     * 分组日志开始
     */
    group(label: string): void {
        if (this.config.isDev && this.shouldLog('debug')) {
            console.group(this.formatMessage('group', label));
        }
    }

    /**
     * 分组日志结束
     */
    groupEnd(): void {
        if (this.config.isDev && this.shouldLog('debug')) {
            console.groupEnd();
        }
    }

    /**
     * 性能计时开始
     */
    time(label: string): void {
        if (this.config.isDev && this.shouldLog('debug')) {
            console.time(label);
        }
    }

    /**
     * 性能计时结束
     */
    timeEnd(label: string): void {
        if (this.config.isDev && this.shouldLog('debug')) {
            console.timeEnd(label);
        }
    }
}

// 导出单例
export const logger = new Logger();

// 便捷方法导出
export const log = {
    debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
    info: (message: string, ...args: any[]) => logger.info(message, ...args),
    warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
    error: (message: string, ...args: any[]) => logger.error(message, ...args),
    group: (label: string) => logger.group(label),
    groupEnd: () => logger.groupEnd(),
    time: (label: string) => logger.time(label),
    timeEnd: (label: string) => logger.timeEnd(label)
};
