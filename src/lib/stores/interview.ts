import { writable } from 'svelte/store';
import type { 
	InterviewConfig, 
	ConversationMessage, 
	AnalysisResult,
	UploadedFile,
	InterviewRecord
} from '$lib/services/sim/types';

// Re-export types for backward compatibility
export type { InterviewConfig, ConversationMessage as InterviewMessage, AnalysisResult };

// 面试状态管理
export const interviewStore = {
	// 当前配置
	currentConfig: writable<InterviewConfig | null>(null),
	
	// 面试会话
	currentSession: writable<{
		sessionId: string;
		status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
		messages: ConversationMessage[];
	} | null>(null),
	
	// 分析结果
	currentAnalysis: writable<AnalysisResult | null>(null),
	
	// UI状态
	uiState: writable<{
		activePanel: 'config' | 'simulation' | 'analysis';
		showThinking: boolean;
		isFullscreen: boolean;
	}>({
		activePanel: 'config',
		showThinking: true,
		isFullscreen: false
	})
};

// 文档管理状态 - using new types
export const documentStore = {
	documents: writable<UploadedFile[]>([]),
	selectedDocument: writable<UploadedFile | null>(null),
	uploadProgress: writable<{[fileId: string]: number}>({})
};

// 历史记录状态 - using new types
export const historyStore = {
	records: writable<InterviewRecord[]>([]),
	selectedRecord: writable<InterviewRecord | null>(null),
	filters: writable<{
		dateRange: [Date, Date] | null;
		interviewType: string | null;
		status: string | null;
	}>({
		dateRange: null,
		interviewType: null,
		status: null
	})
};