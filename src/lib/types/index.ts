// Theme types
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeConfig {
	theme: Theme;
	colors: ColorPalette;
	transitions: boolean;
}

export interface ColorPalette {
	primary: string;
	secondary: string;
	background: string;
	surface: string;
	text: string;
	accent: string;
}

// API types
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

// Dashboard types
export interface APIStats {
	totalRequests: number;
	requestsPerMinute: number;
	averageResponseTime: number;
	errorRate: number;
	activeConnections: number;
	timestamp: Date;
}

export interface DashboardData {
	overview: {
		totalRequests: number;
		activeUsers: number;
		systemHealth: 'healthy' | 'warning' | 'critical';
		uptime: number;
	};
	
	metrics: {
		requestsOverTime: TimeSeriesData[];
		responseTimeDistribution: DistributionData[];
		errorsByType: CategoryData[];
		geographicDistribution: GeoData[];
	};
	
	alerts: Alert[];
	lastUpdated: Date;
}

export interface TimeSeriesData {
	timestamp: Date;
	value: number;
	label?: string;
}

export interface DistributionData {
	range: string;
	count: number;
	percentage: number;
}

export interface CategoryData {
	category: string;
	count: number;
	percentage: number;
}

export interface GeoData {
	country: string;
	requests: number;
	coordinates: [number, number];
}

export interface Alert {
	id: string;
	type: 'info' | 'warning' | 'error';
	message: string;
	timestamp: Date;
	acknowledged: boolean;
}

// Playground types
export interface ModelTest {
	id: string;
	input: string;
	parameters: ModelParameters;
	output?: string;
	timestamp: Date;
	duration?: number;
	status: 'pending' | 'success' | 'error';
	error?: string;
}

export interface ModelParameters {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	[key: string]: any;
}

export interface PlaygroundSession {
	id: string;
	name: string;
	model: string;
	tests: ModelTest[];
	createdAt: Date;
	updatedAt: Date;
}

export interface ModelConfig {
	name: string;
	endpoint: string;
	parameters: {
		[key: string]: {
			type: 'number' | 'string' | 'boolean';
			default: any;
			min?: number;
			max?: number;
			options?: string[];
		};
	};
}

// MengLong API types
export interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface ChatRequest {
	model: string;
	messages: Message[];
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
}

export interface ChatOutput {
	role: string;
	content: string;
}

export interface Usage {
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
}

export interface ChatResponse {
	id: string;
	model: string;
	created: number;
	output: ChatOutput;
	usage: Usage;
	finish_reason: string;
}

export interface StreamDelta {
	role?: string;
	content: string;
}

export interface StreamResponse {
	id: string;
	model: string;
	created: number;
	delta: StreamDelta;
	finish_reason: string | null;
	usage?: Usage;
}

export interface ModelInfo {
	id: string;
	name: string;
	provider: string;
	description: string | null;
	max_tokens: number | null;
	supports: {
		streaming: boolean;
		image: boolean;
		audio: boolean;
		file: boolean;
	};
	price: {
		input: number;
		cache_input: number;
		output: number;
	} | null;
}

// Error handling types
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

// Component props types
export interface PageComponent {
	load?: () => Promise<PageData>;
	title: string;
	description?: string;
}

export interface PageData {
	[key: string]: any;
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
	data: T | null;
	loading: boolean;
	error: string | null;
}

// Navigation types
export interface NavItem {
	href: string;
	label: string;
	icon: string;
	active?: boolean;
}