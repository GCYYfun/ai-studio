// Application constants
export const APP_NAME = 'AI Studio Web';
export const APP_VERSION = '1.0.0';

// Theme constants
export const THEME_STORAGE_KEY = 'ai-studio-theme';
export const DEFAULT_THEME = 'system';

// API constants
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
	? 'http://ec2-3-101-72-10.us-west-1.compute.amazonaws.com:8000'
	: 'http://ec2-3-101-72-10.us-west-1.compute.amazonaws.com:8000'; // 'localhost:8000';

export const API_TIMEOUT = 120000; // 120 seconds (2 minutes) - increased for LLM responses
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY = 1000; // 1 second

// Dashboard constants
export const DASHBOARD_REFRESH_INTERVAL = 30000; // 30 seconds
export const CHART_ANIMATION_DURATION = 300;
export const MAX_CHART_DATA_POINTS = 100;

// Playground constants
export const MAX_INPUT_LENGTH = 10000;
export const MAX_HISTORY_ITEMS = 50;
export const DEFAULT_MODEL_PARAMETERS = {
	temperature: 0.7,
	maxTokens: 1000,
	topP: 0.9
};

// UI constants
export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;
export const DESKTOP_BREAKPOINT = 1280;

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
	FAST: 150,
	NORMAL: 300,
	SLOW: 500
};

// Z-index layers
export const Z_INDEX = {
	DROPDOWN: 1000,
	STICKY: 1020,
	FIXED: 1030,
	MODAL_BACKDROP: 1040,
	MODAL: 1050,
	POPOVER: 1060,
	TOOLTIP: 1070,
	TOAST: 1080
};

// Color palette for charts
export const CHART_COLORS = [
	'#0ea5e9', // primary blue
	'#10b981', // emerald
	'#f59e0b', // amber
	'#ef4444', // red
	'#8b5cf6', // violet
	'#06b6d4', // cyan
	'#84cc16', // lime
	'#f97316', // orange
	'#ec4899', // pink
	'#6366f1'  // indigo
];

// Error messages
export const ERROR_MESSAGES = {
	NETWORK_ERROR: '网络连接失败，请检查您的网络连接',
	API_ERROR: 'API请求失败，请稍后重试',
	VALIDATION_ERROR: '输入数据格式不正确',
	AUTHENTICATION_ERROR: '身份验证失败，请重新登录',
	TIMEOUT_ERROR: '请求超时，请稍后重试',
	UNKNOWN_ERROR: '发生未知错误，请稍后重试'
};

// Success messages
export const SUCCESS_MESSAGES = {
	DATA_SAVED: '数据保存成功',
	TEST_COMPLETED: '测试完成',
	SETTINGS_UPDATED: '设置更新成功'
};