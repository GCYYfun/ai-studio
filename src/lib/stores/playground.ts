import { writable, derived } from 'svelte/store';
import type { 
	ModelTest, 
	ModelParameters, 
	PlaygroundSession, 
	ModelInfo,
	Message,
	LoadingState 
} from '$lib/types';

// 当前测试状态
export interface PlaygroundState {
	// 输入相关
	selectedModel: string;
	inputText: string;
	parameters: ModelParameters;
	
	// 输出相关
	currentOutput: string;
	currentTest: ModelTest | null;
	
	// 状态管理
	loadingState: LoadingState;
	error: string | null;
	
	// 模型和会话
	availableModels: ModelInfo[];
	currentSession: PlaygroundSession | null;
	testHistory: ModelTest[];
}

// 初始状态
const initialState: PlaygroundState = {
	selectedModel: 'deepseek-chat',
	inputText: '',
	parameters: {
		temperature: 0.7,
		maxTokens: 1000,
		topP: 1.0
	},
	currentOutput: '',
	currentTest: null,
	loadingState: 'idle',
	error: null,
	availableModels: [],
	currentSession: null,
	testHistory: []
};

// 创建主store
export const playgroundStore = writable<PlaygroundState>(initialState);

// 派生stores用于特定数据访问
export const selectedModel = derived(
	playgroundStore,
	$store => $store.selectedModel
);

export const inputText = derived(
	playgroundStore,
	$store => $store.inputText
);

export const parameters = derived(
	playgroundStore,
	$store => $store.parameters
);

export const currentOutput = derived(
	playgroundStore,
	$store => $store.currentOutput
);

export const loadingState = derived(
	playgroundStore,
	$store => $store.loadingState
);

export const error = derived(
	playgroundStore,
	$store => $store.error
);

export const availableModels = derived(
	playgroundStore,
	$store => $store.availableModels
);

export const testHistory = derived(
	playgroundStore,
	$store => $store.testHistory
);

// Actions
export const playgroundActions = {
	// 设置选中的模型
	setSelectedModel: (model: string) => {
		playgroundStore.update(state => ({
			...state,
			selectedModel: model
		}));
	},

	// 设置输入文本
	setInputText: (text: string) => {
		playgroundStore.update(state => ({
			...state,
			inputText: text
		}));
	},

	// 更新参数
	updateParameter: (key: keyof ModelParameters, value: any) => {
		playgroundStore.update(state => ({
			...state,
			parameters: {
				...state.parameters,
				[key]: value
			}
		}));
	},

	// 设置参数
	setParameters: (params: ModelParameters) => {
		playgroundStore.update(state => ({
			...state,
			parameters: { ...state.parameters, ...params }
		}));
	},

	// 设置输出
	setCurrentOutput: (output: string) => {
		playgroundStore.update(state => ({
			...state,
			currentOutput: output
		}));
	},

	// 追加输出（用于流式响应）
	appendOutput: (chunk: string) => {
		playgroundStore.update(state => ({
			...state,
			currentOutput: state.currentOutput + chunk
		}));
	},

	// 清空输出
	clearOutput: () => {
		playgroundStore.update(state => ({
			...state,
			currentOutput: ''
		}));
	},

	// 设置加载状态
	setLoadingState: (loadingState: LoadingState) => {
		playgroundStore.update(state => ({
			...state,
			loadingState
		}));
	},

	// 设置错误
	setError: (error: string | null) => {
		playgroundStore.update(state => ({
			...state,
			error
		}));
	},

	// 设置可用模型
	setAvailableModels: (models: ModelInfo[]) => {
		playgroundStore.update(state => ({
			...state,
			availableModels: models
		}));
	},

	// 开始新测试
	startTest: (input: string, parameters: ModelParameters) => {
		const test: ModelTest = {
			id: `test_${Date.now()}`,
			input,
			parameters,
			timestamp: new Date(),
			status: 'pending'
		};

		playgroundStore.update(state => ({
			...state,
			currentTest: test,
			currentOutput: '',
			loadingState: 'loading',
			error: null
		}));

		return test;
	},

	// 完成测试
	completeTest: (output: string, duration?: number, usage?: any) => {
		playgroundStore.update(state => {
			if (!state.currentTest) return state;

			const completedTest: ModelTest = {
				...state.currentTest,
				output,
				duration,
				status: 'success'
			};

			return {
				...state,
				currentTest: completedTest,
				testHistory: [completedTest, ...state.testHistory],
				loadingState: 'success'
			};
		});
	},

	// 测试失败
	failTest: (error: string) => {
		playgroundStore.update(state => {
			if (!state.currentTest) return state;

			const failedTest: ModelTest = {
				...state.currentTest,
				error,
				status: 'error'
			};

			return {
				...state,
				currentTest: failedTest,
				testHistory: [failedTest, ...state.testHistory],
				loadingState: 'error',
				error
			};
		});
	},

	// 重置状态
	reset: () => {
		playgroundStore.set(initialState);
	},

	// 清空历史
	clearHistory: () => {
		playgroundStore.update(state => ({
			...state,
			testHistory: []
		}));
	}
};

// 便捷的getter函数
export const getPlaygroundState = () => {
	let state: PlaygroundState;
	playgroundStore.subscribe(s => state = s)();
	return state!;
};