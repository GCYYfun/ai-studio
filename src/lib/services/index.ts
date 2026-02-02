/**
 * Interview System Services
 * 
 * TypeScript native implementation of the interview simulation and evaluation system.
 * This replaces the Python integration with a complete TypeScript solution.
 */

// Core Types - Re-export from services/types to avoid conflicts
export type {
  InterviewConfig,
  InterviewContext,
  ConversationMessage,
  InterviewMetadata,
  InterviewResult,
  TopicAnalysisResult,
  DimensionScore,
  EvaluationResult,
  AnalysisResult,
  UploadedFile,
  FileMetadata,
  FilterCriteria,
  APIResponse,
  InterviewSession,
  InterviewRecord,
  StorageItem,
  FileStorage,
  InterviewEvent,
  ProcessEvent,
  InterviewError,
  InterviewErrorType,
  MessageRole,
  Message,
  StreamingResponse,
  EvaluatorConfig,
  BatchProcessConfig
} from './sim/types';

// Utility functions
export { generateId, isValidFileType, parseFileName } from './sim/types';

// AI Agents
export { BaseAgent } from './sim/agents/BaseAgent';
export { InterviewerAgent } from './sim/agents/InterviewerAgent';
export { CandidateAgent } from './sim/agents/CandidateAgent';
export { EvalAgent } from './sim/agents/EvalAgent';

// Core Services
export { InterviewSimulator } from './sim/interview/InterviewSimulator';
export { InterviewResultManager, interviewResultManager } from './sim/interview/InterviewResultManager';
export { EvaluationEngine } from './sim/evaluation/EvaluationEngine';

// Storage Services
export { FileManager } from './sim/storage/FileManager';
export { IndexedDBStorage } from './sim/storage/IndexedDBStorage';
export { InteractiveSelector } from './sim/storage/InteractiveSelector';

// Service Factory Functions
import { InterviewSimulator } from './sim/interview/InterviewSimulator';
import { InterviewResultManager } from './sim/interview/InterviewResultManager';
import { EvaluationEngine } from './sim/evaluation/EvaluationEngine';
import { FileManager } from './sim/storage/FileManager';
import { InteractiveSelector } from './sim/storage/InteractiveSelector';
import type { InterviewConfig } from './sim/types';

// Export additional types from result manager and selector
export type { ExportOptions, SavedResult } from './sim/interview/InterviewResultManager';
export type { 
  SelectorConfig, 
  SelectionResult, 
  BatchProcessOptions 
} from './sim/storage/InteractiveSelector';

/**
 * Create a new interview simulator instance
 */
export function createInterviewSimulator(config: InterviewConfig): InterviewSimulator {
  return new InterviewSimulator(config);
}

/**
 * Create a new evaluation engine instance
 */
export function createEvaluationEngine(model?: string): EvaluationEngine {
  return new EvaluationEngine(model);
}

/**
 * Create and initialize a file manager instance
 */
export async function createFileManager(): Promise<FileManager> {
  const fileManager = new FileManager();
  await fileManager.initialize();
  return fileManager;
}

/**
 * Create and initialize an interactive selector instance
 */
export async function createInteractiveSelector(config?: {
  resourcePath?: string;
  fileTypes?: string[];
  sortBy?: 'name' | 'date' | 'type' | 'size';
  sortOrder?: 'asc' | 'desc';
}): Promise<InteractiveSelector> {
  const selector = new InteractiveSelector(config);
  await selector.initialize();
  return selector;
}

// Default model configurations
export const DEFAULT_MODELS = {
  INTERVIEWER: 'anthropic/global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  CANDIDATE: 'anthropic/global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  EVALUATOR: 'anthropic/global.anthropic.claude-sonnet-4-5-20250929-v1:0'
} as const;

// Service status constants
export const SERVICE_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
  PAUSED: 'paused'
} as const;

/**
 * Utility function to create a complete interview configuration
 */
export function createInterviewConfig(
  jd: string,
  resume: string,
  options: Partial<InterviewConfig> = {}
): InterviewConfig {
  return {
    jd,
    resume,
    maxTurns: 20,
    interviewerModel: DEFAULT_MODELS.INTERVIEWER,
    candidateModel: DEFAULT_MODELS.CANDIDATE,
    temp: false,
    ...options
  };
}

/**
 * Validate interview configuration
 */
export function validateInterviewConfig(config: InterviewConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.jd || config.jd.trim().length === 0) {
    errors.push('JD content is required');
  }

  if (!config.resume || config.resume.trim().length === 0) {
    errors.push('Resume content is required');
  }

  if (config.maxTurns <= 0 || config.maxTurns > 100) {
    errors.push('Max turns must be between 1 and 100');
  }

  if (!config.interviewerModel || !config.candidateModel) {
    errors.push('Both interviewer and candidate models are required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}