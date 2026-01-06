// Date and time formatters
export function formatDate(date: Date | string, locale = 'zh-CN'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

export function formatDateTime(date: Date | string, locale = 'zh-CN'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatTime(date: Date | string, locale = 'zh-CN'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleTimeString(locale, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
}

export function formatRelativeTime(date: Date | string, locale = 'zh-CN'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

	if (diffInSeconds < 60) {
		return '刚刚';
	} else if (diffInSeconds < 3600) {
		const minutes = Math.floor(diffInSeconds / 60);
		return `${minutes}分钟前`;
	} else if (diffInSeconds < 86400) {
		const hours = Math.floor(diffInSeconds / 3600);
		return `${hours}小时前`;
	} else if (diffInSeconds < 2592000) {
		const days = Math.floor(diffInSeconds / 86400);
		return `${days}天前`;
	} else {
		return formatDate(d, locale);
	}
}

// Number formatters
export function formatNumber(num: number, locale = 'zh-CN'): string {
	return num.toLocaleString(locale);
}

export function formatPercentage(num: number, decimals = 1): string {
	return `${(num * 100).toFixed(decimals)}%`;
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(milliseconds: number): string {
	if (milliseconds < 1000) {
		return `${milliseconds}ms`;
	} else if (milliseconds < 60000) {
		return `${(milliseconds / 1000).toFixed(1)}s`;
	} else if (milliseconds < 3600000) {
		const minutes = Math.floor(milliseconds / 60000);
		const seconds = Math.floor((milliseconds % 60000) / 1000);
		return `${minutes}m ${seconds}s`;
	} else {
		const hours = Math.floor(milliseconds / 3600000);
		const minutes = Math.floor((milliseconds % 3600000) / 60000);
		return `${hours}h ${minutes}m`;
	}
}

// Text formatters
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - suffix.length) + suffix;
}

export function capitalizeFirst(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function camelToKebab(text: string): string {
	return text.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

export function kebabToCamel(text: string): string {
	return text.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// API response formatters
export function formatApiError(error: any): string {
	if (typeof error === 'string') return error;
	if (error?.message) return error.message;
	if (error?.error) return error.error;
	return '未知错误';
}

// Chart data formatters
export function formatChartValue(value: number, type: 'number' | 'percentage' | 'bytes' | 'duration' = 'number'): string {
	switch (type) {
		case 'percentage':
			return formatPercentage(value);
		case 'bytes':
			return formatBytes(value);
		case 'duration':
			return formatDuration(value);
		default:
			return formatNumber(value);
	}
}