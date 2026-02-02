/**
 * TypeScript Native Interview System Types
 * 
 * Core type definitions for the interview simulation and evaluation system
 */

// ============================================================================
// Core Interview Types
// ============================================================================

export interface InterviewConfig {
  jd: string;
  resume: string;
  transcript?: string;
  maxTurns: number;
  interviewerModel: string;
  candidateModel: string;
  outputDir?: string;
  temp?: boolean;
}

export interface InterviewContext {
  jd: string;
  resume: string;
  transcript?: string;
}

export interface ConversationMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: Date;
  turn: number;
  thinking?: string;
}

export interface InterviewMetadata {
  candidateName: string;
  position: string;
  startTime: Date;
  endTime?: Date;
  totalTurns: number;
  endedByInterviewer: boolean;
  config: InterviewConfig;
}

export interface InterviewResult {
  sessionId: string;
  messages: ConversationMessage[];
  metadata: InterviewMetadata;
  status: 'completed' | 'error' | 'interrupted';
}

// ============================================================================
// Analysis and Evaluation Types
// ============================================================================

export interface TopicAnalysisResult {
  analysis_date: string;
  topics: Array<{
    topic_name: string;
    dialogue: Array<{
      role: 'interviewer' | 'candidate';
      content: string;
      name: string;
      timestamp: string;
    }>;
    summary: string;
    key_points: string[];
    critical_info: string;
  }>;
  overall_summary: string;
}

export interface DimensionScore {
  score: number;
  assessment: string;
  missing_info: string;
  confidence_score: number;
  confidence_justification: string;
}

export interface EvaluationResult {
  candidate_name: string;
  position: string;
  evaluation_date: string;
  dimensions: {
    聪明度: DimensionScore;
    勤奋度: DimensionScore;
    目标感: DimensionScore;
    皮实度: DimensionScore;
    迎难而上: DimensionScore;
    客户第一: DimensionScore;
  };
  overall_rating: number;
  overall_confidence: number;
  strengths: string[];
  weaknesses: string[];
  interviewer_rating_assessment?: string;
  interviewer_rating?: number;
  suggested_follow_up_questions: Record<string, string>;
  summary: string;
  hiring_recommendation: string;
}

export interface AnalysisResult {
  processId: string;
  status: 'running' | 'completed' | 'error';
  timestamp: Date;
  topicAnalysis?: TopicAnalysisResult;
  evaluation?: EvaluationResult;
}

// ============================================================================
// File Management Types
// ============================================================================

export interface UploadedFile {
  id: string;
  name: string;
  type: 'jd' | 'resume' | 'conversation' | 'report';
  content: string;
  metadata: FileMetadata;
  uploadedAt: Date;
  size: number;
}

export interface FileMetadata {
  candidateName?: string;
  position?: string;
  jd?: string;
  candidate?: string;
  stage?: string;
  originalName: string;
  extension: string;
}

export interface FilterCriteria {
  jd?: string;
  candidate?: string;
  type?: string;
  dateRange?: [Date, Date];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface InterviewSession {
  sessionId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  messages: ConversationMessage[];
  config: InterviewConfig;
  startTime: Date;
  endTime?: Date;
}

export interface InterviewRecord {
  id: string;
  candidateName: string;
  position: string;
  interviewDate: Date;
  status: 'completed' | 'in_progress' | 'failed';
  transcriptPath: string;
  analysisResults?: AnalysisResult;
  tags?: string[];
}

// ============================================================================
// Storage Types
// ============================================================================

export interface StorageItem<T = any> {
  id: string;
  data: T;
  timestamp: Date;
  type: string;
}

export interface FileStorage {
  saveFile(file: UploadedFile): Promise<void>;
  getFile(id: string): Promise<UploadedFile | null>;
  getFiles(type?: string): Promise<UploadedFile[]>;
  deleteFile(id: string): Promise<boolean>;
  updateFile(id: string, updates: Partial<UploadedFile>): Promise<boolean>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface InterviewEvent {
  type: 'message' | 'status_change' | 'error' | 'progress';
  sessionId: string;
  data: any;
  timestamp: Date;
}

export interface ProcessEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  processId: string;
  data?: any;
  timestamp: Date;
}

// ============================================================================
// Error Types
// ============================================================================

export enum InterviewErrorType {
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  FILE_UPLOAD_ERROR = 'file_upload_error',
  ANALYSIS_ERROR = 'analysis_error',
  STREAM_ERROR = 'stream_error',
  VALIDATION_ERROR = 'validation_error'
}

export interface InterviewError {
  type: InterviewErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type MessageRole = 'interviewer' | 'candidate' | 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  error?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface EvaluatorConfig {
  transcriptName: string;
  step: 'all' | 'topic' | 'report';
  force: boolean;
  temp: boolean;
  stage: string;
  path?: string;
  jd?: string;
  candidate?: string;
}

export interface BatchProcessConfig {
  transcripts: string[];
  config: Omit<EvaluatorConfig, 'transcriptName'>;
  concurrency?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function generateId(prefix = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

export function isValidFileType(filename: string): boolean {
  const validExtensions = ['.pdf', '.txt', '.md'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(extension);
}

export function parseFileName(filename: string): FileMetadata {
  const extension = filename.substring(filename.lastIndexOf('.'));
  const baseName = filename.substring(0, filename.lastIndexOf('.'));
  const parts = baseName.split('_');
  
  return {
    originalName: filename,
    extension,
    candidateName: parts[0] || undefined,
    position: parts[1] || undefined,
    stage: parts[3] || undefined
  };
}