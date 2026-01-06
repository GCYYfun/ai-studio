// Basic validation functions
export function isEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function isUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

export function isValidJson(str: string): boolean {
	try {
		JSON.parse(str);
		return true;
	} catch {
		return false;
	}
}

// String validators
export function isNotEmpty(value: string): boolean {
	return value.trim().length > 0;
}

export function hasMinLength(value: string, minLength: number): boolean {
	return value.length >= minLength;
}

export function hasMaxLength(value: string, maxLength: number): boolean {
	return value.length <= maxLength;
}

export function isAlphanumeric(value: string): boolean {
	const alphanumericRegex = /^[a-zA-Z0-9]+$/;
	return alphanumericRegex.test(value);
}

// Number validators
export function isPositiveNumber(value: number): boolean {
	return typeof value === 'number' && value > 0 && !isNaN(value);
}

export function isInRange(value: number, min: number, max: number): boolean {
	return typeof value === 'number' && value >= min && value <= max && !isNaN(value);
}

export function isInteger(value: number): boolean {
	return typeof value === 'number' && Number.isInteger(value);
}

// API parameter validators
export function validateModelParameters(params: Record<string, any>): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Temperature validation
	if (params.temperature !== undefined) {
		if (!isInRange(params.temperature, 0, 2)) {
			errors.push('Temperature must be between 0 and 2');
		}
	}

	// Max tokens validation
	if (params.maxTokens !== undefined) {
		if (!isPositiveNumber(params.maxTokens) || !isInteger(params.maxTokens)) {
			errors.push('Max tokens must be a positive integer');
		}
		if (params.maxTokens > 4096) {
			errors.push('Max tokens cannot exceed 4096');
		}
	}

	// Top P validation
	if (params.topP !== undefined) {
		if (!isInRange(params.topP, 0, 1)) {
			errors.push('Top P must be between 0 and 1');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

// Input validation for playground
export function validatePlaygroundInput(input: string): { valid: boolean; error?: string } {
	if (!isNotEmpty(input)) {
		return { valid: false, error: '输入不能为空' };
	}

	if (!hasMaxLength(input, 10000)) {
		return { valid: false, error: '输入长度不能超过10000个字符' };
	}

	return { valid: true };
}

// Theme validation
export function isValidTheme(theme: string): theme is 'light' | 'dark' | 'system' {
	return ['light', 'dark', 'system'].includes(theme);
}

// API response validation
export function validateApiResponse<T>(response: any): response is { data: T; success: boolean; error?: string } {
	return (
		typeof response === 'object' &&
		response !== null &&
		'success' in response &&
		typeof response.success === 'boolean' &&
		'data' in response
	);
}

// Form validation helpers
export interface ValidationRule<T> {
	validator: (value: T) => boolean;
	message: string;
}

export function validateField<T>(value: T, rules: ValidationRule<T>[]): { valid: boolean; error?: string } {
	for (const rule of rules) {
		if (!rule.validator(value)) {
			return { valid: false, error: rule.message };
		}
	}
	return { valid: true };
}

// Common validation rule sets
export const commonRules = {
	required: <T>(value: T): ValidationRule<T> => ({
		validator: (v) => v !== null && v !== undefined && v !== '',
		message: '此字段为必填项'
	}),
	
	minLength: (min: number): ValidationRule<string> => ({
		validator: (value) => hasMinLength(value, min),
		message: `最少需要${min}个字符`
	}),
	
	maxLength: (max: number): ValidationRule<string> => ({
		validator: (value) => hasMaxLength(value, max),
		message: `最多允许${max}个字符`
	}),
	
	email: (): ValidationRule<string> => ({
		validator: isEmail,
		message: '请输入有效的邮箱地址'
	}),
	
	url: (): ValidationRule<string> => ({
		validator: isUrl,
		message: '请输入有效的URL地址'
	}),
	
	positiveNumber: (): ValidationRule<number> => ({
		validator: isPositiveNumber,
		message: '请输入正数'
	}),
	
	range: (min: number, max: number): ValidationRule<number> => ({
		validator: (value) => isInRange(value, min, max),
		message: `值必须在${min}到${max}之间`
	})
};