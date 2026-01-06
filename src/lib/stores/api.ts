import { writable, derived, get } from 'svelte/store';
import { apiService } from '$lib/services/apiService';
import type { 
	DashboardData, 
	APIStats, 
	ModelTest, 
	PlaygroundSession,
	AsyncState,
	APIError 
} from '$lib/types';

/**
 * API连接状态
 */
export interface APIConnectionState {
	connected: boolean;
	lastCheck: Date | null;
	error: string | null;
}

/**
 * 仪表板数据状态
 */
export interface DashboardState extends AsyncState<DashboardData> {
	lastUpdated: Date | null;
	autoRefresh: boolean;
	refreshInterval: number;
}

/**
 * 实时统计状态
 */
export interface RealtimeStatsState extends AsyncState<APIStats> {
	lastUpdated: Date | null;
	autoRefresh: boolean;
}

/**
 * Playground状态
 */
export interface PlaygroundState {
	sessions: AsyncState<PlaygroundSession[]>;
	currentSession: PlaygroundSession | null;
	testHistory: AsyncState<ModelTest[]>;
	currentTest: AsyncState<ModelTest>;
}

// API连接状态store
function createAPIConnectionStore() {
	const { subscribe, set, update } = writable<APIConnectionState>({
		connected: false,
		lastCheck: null,
		error: null
	});

	return {
		subscribe,
		
		async checkConnection(): Promise<boolean> {
			try {
				const response = await apiService.healthCheck();
				const isConnected = response.success;
				
				set({
					connected: isConnected,
					lastCheck: new Date(),
					error: isConnected ? null : response.error || 'Connection failed'
				});
				
				return isConnected;
			} catch (error) {
				set({
					connected: false,
					lastCheck: new Date(),
					error: error instanceof Error ? error.message : 'Unknown error'
				});
				return false;
			}
		},

		setConnected(connected: boolean, error?: string) {
			update(state => ({
				...state,
				connected,
				error: error || null,
				lastCheck: new Date()
			}));
		}
	};
}

// 仪表板数据store
function createDashboardStore() {
	const { subscribe, set, update } = writable<DashboardState>({
		data: null,
		loading: false,
		error: null,
		lastUpdated: null,
		autoRefresh: true,
		refreshInterval: 30000 // 30秒
	});

	let refreshTimer: NodeJS.Timeout | null = null;

	return {
		subscribe,

		async loadData(timeRange?: string, forceRefresh = false): Promise<void> {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const response = await apiService.getDashboardStats(timeRange, !forceRefresh);
				
				if (response.success && response.data) {
					update(state => ({
						...state,
						data: response.data,
						loading: false,
						error: null,
						lastUpdated: new Date()
					}));
				} else {
					update(state => ({
						...state,
						loading: false,
						error: response.error || 'Failed to load dashboard data'
					}));
				}
			} catch (error) {
				update(state => ({
					...state,
					loading: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}));
			}
		},

		startAutoRefresh(): void {
			const state = get({ subscribe });
			if (refreshTimer) {
				clearInterval(refreshTimer);
			}

			refreshTimer = setInterval(() => {
				if (state.autoRefresh) {
					this.loadData();
				}
			}, state.refreshInterval);

			update(state => ({ ...state, autoRefresh: true }));
		},

		stopAutoRefresh(): void {
			if (refreshTimer) {
				clearInterval(refreshTimer);
				refreshTimer = null;
			}
			update(state => ({ ...state, autoRefresh: false }));
		},

		setRefreshInterval(interval: number): void {
			update(state => ({ ...state, refreshInterval: interval }));
			
			// 重启自动刷新以应用新间隔
			if (get({ subscribe }).autoRefresh) {
				this.stopAutoRefresh();
				this.startAutoRefresh();
			}
		},

		invalidateCache(): void {
			apiService.invalidateCache('dashboard');
		}
	};
}

// 实时统计store
function createRealtimeStatsStore() {
	const { subscribe, set, update } = writable<RealtimeStatsState>({
		data: null,
		loading: false,
		error: null,
		lastUpdated: null,
		autoRefresh: true
	});

	let refreshTimer: NodeJS.Timeout | null = null;

	return {
		subscribe,

		async loadData(forceRefresh = false): Promise<void> {
			update(state => ({ ...state, loading: true, error: null }));

			try {
				const response = await apiService.getRealtimeStats(!forceRefresh);
				
				if (response.success && response.data) {
					update(state => ({
						...state,
						data: response.data,
						loading: false,
						error: null,
						lastUpdated: new Date()
					}));
				} else {
					update(state => ({
						...state,
						loading: false,
						error: response.error || 'Failed to load realtime stats'
					}));
				}
			} catch (error) {
				update(state => ({
					...state,
					loading: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}));
			}
		},

		startAutoRefresh(): void {
			if (refreshTimer) {
				clearInterval(refreshTimer);
			}

			refreshTimer = setInterval(() => {
				const state = get({ subscribe });
				if (state.autoRefresh) {
					this.loadData();
				}
			}, 10000); // 10秒间隔

			update(state => ({ ...state, autoRefresh: true }));
		},

		stopAutoRefresh(): void {
			if (refreshTimer) {
				clearInterval(refreshTimer);
				refreshTimer = null;
			}
			update(state => ({ ...state, autoRefresh: false }));
		}
	};
}

// Playground store
function createPlaygroundStore() {
	const { subscribe, set, update } = writable<PlaygroundState>({
		sessions: { data: null, loading: false, error: null },
		currentSession: null,
		testHistory: { data: null, loading: false, error: null },
		currentTest: { data: null, loading: false, error: null }
	});

	return {
		subscribe,

		async loadSessions(): Promise<void> {
			update(state => ({
				...state,
				sessions: { ...state.sessions, loading: true, error: null }
			}));

			try {
				const response = await apiService.getPlaygroundSessions();
				
				if (response.success && response.data) {
					update(state => ({
						...state,
						sessions: {
							data: response.data,
							loading: false,
							error: null
						}
					}));
				} else {
					update(state => ({
						...state,
						sessions: {
							...state.sessions,
							loading: false,
							error: response.error || 'Failed to load sessions'
						}
					}));
				}
			} catch (error) {
				update(state => ({
					...state,
					sessions: {
						...state.sessions,
						loading: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					}
				}));
			}
		},

		async createSession(name: string, model: string): Promise<boolean> {
			try {
				const response = await apiService.createSession(name, model);
				
				if (response.success && response.data) {
					// 重新加载会话列表
					await this.loadSessions();
					
					// 设置为当前会话
					update(state => ({
						...state,
						currentSession: response.data
					}));
					
					return true;
				}
				return false;
			} catch (error) {
				console.error('Failed to create session:', error);
				return false;
			}
		},

		setCurrentSession(session: PlaygroundSession | null): void {
			update(state => ({
				...state,
				currentSession: session
			}));

			// 如果设置了会话，加载其历史记录
			if (session) {
				this.loadTestHistory(session.id);
			}
		},

		async loadTestHistory(sessionId?: string): Promise<void> {
			update(state => ({
				...state,
				testHistory: { ...state.testHistory, loading: true, error: null }
			}));

			try {
				const response = await apiService.getTestHistory(sessionId);
				
				if (response.success && response.data) {
					update(state => ({
						...state,
						testHistory: {
							data: response.data,
							loading: false,
							error: null
						}
					}));
				} else {
					update(state => ({
						...state,
						testHistory: {
							...state.testHistory,
							loading: false,
							error: response.error || 'Failed to load test history'
						}
					}));
				}
			} catch (error) {
				update(state => ({
					...state,
					testHistory: {
						...state.testHistory,
						loading: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					}
				}));
			}
		},

		async submitTest(
			input: string, 
			parameters: Record<string, any>, 
			model?: string
		): Promise<boolean> {
			update(state => ({
				...state,
				currentTest: { data: null, loading: true, error: null }
			}));

			try {
				const response = await apiService.submitModelTest(input, parameters, model);
				
				if (response.success && response.data) {
					update(state => ({
						...state,
						currentTest: {
							data: response.data,
							loading: false,
							error: null
						}
					}));

					// 重新加载测试历史
					const currentState = get({ subscribe });
					if (currentState.currentSession) {
						this.loadTestHistory(currentState.currentSession.id);
					} else {
						this.loadTestHistory();
					}

					return true;
				} else {
					update(state => ({
						...state,
						currentTest: {
							data: null,
							loading: false,
							error: response.error || 'Test failed'
						}
					}));
					return false;
				}
			} catch (error) {
				update(state => ({
					...state,
					currentTest: {
						data: null,
						loading: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					}
				}));
				return false;
			}
		},

		clearCurrentTest(): void {
			update(state => ({
				...state,
				currentTest: { data: null, loading: false, error: null }
			}));
		}
	};
}

// 创建store实例
export const apiConnection = createAPIConnectionStore();
export const dashboardStore = createDashboardStore();
export const realtimeStatsStore = createRealtimeStatsStore();
export const playgroundStore = createPlaygroundStore();

// 派生store - 整体API状态
export const apiStatus = derived(
	[apiConnection, dashboardStore, realtimeStatsStore],
	([$connection, $dashboard, $realtime]) => ({
		connected: $connection.connected,
		lastCheck: $connection.lastCheck,
		error: $connection.error,
		dashboardLoading: $dashboard.loading,
		realtimeLoading: $realtime.loading,
		hasErrors: !!($connection.error || $dashboard.error || $realtime.error)
	})
);

// 初始化函数
export async function initializeAPI(): Promise<void> {
	try {
		// 检查API连接
		const connected = await apiConnection.checkConnection();
		
		if (connected) {
			// 预加载数据
			await apiService.preloadData();
			
			// 启动自动刷新
			dashboardStore.startAutoRefresh();
			realtimeStatsStore.startAutoRefresh();
			
			console.info('API initialized successfully');
		} else {
			console.warn('API connection failed during initialization');
		}
	} catch (error) {
		console.error('Failed to initialize API:', error);
	}
}

// 清理函数
export function cleanupAPI(): void {
	dashboardStore.stopAutoRefresh();
	realtimeStatsStore.stopAutoRefresh();
}