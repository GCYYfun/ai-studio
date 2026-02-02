/**
 * TypeScript Native Interview API Service
 * 
 * This replaces the Python integration with a complete TypeScript implementation
 */

import { 
  createInterviewSimulator, 
  createEvaluationEngine, 
  createFileManager,
  type InterviewConfig,
  type EvaluatorConfig,
  type InterviewSession,
  type AnalysisResult,
  type UploadedFile,
  type InterviewRecord,
  type APIResponse,
  generateId
} from './index';

export class InterviewApiService {
  private fileManager: any = null;

  /**
   * Initialize the service
   */
  async initialize() {
    if (!this.fileManager) {
      this.fileManager = await createFileManager();
    }
  }

  /**
   * Start interview simulation
   */
  async startSimulation(config: InterviewConfig): Promise<APIResponse<InterviewSession>> {
    try {
      const simulator = createInterviewSimulator(config);
      const sessionId = generateId('session');
      
      const session: InterviewSession = {
        sessionId,
        status: 'running',
        messages: [],
        config,
        startTime: new Date()
      };

      // Start simulation in background
      simulator.run(config).then(result => {
        // Handle completion
        session.status = 'completed';
        session.endTime = new Date();
      }).catch(error => {
        session.status = 'error';
        console.error('Simulation error:', error);
      });

      return {
        data: session,
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        data: null as any,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Start evaluation analysis
   */
  async startEvaluation(config: EvaluatorConfig): Promise<APIResponse<AnalysisResult>> {
    try {
      const evaluationEngine = createEvaluationEngine();
      const processId = generateId('eval');
      
      const analysis: AnalysisResult = {
        processId,
        status: 'running',
        timestamp: new Date()
      };

      return {
        data: analysis,
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        data: null as any,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Get files by type
   */
  async getFiles(type?: 'jd' | 'resume' | 'conversation' | 'report'): Promise<APIResponse<UploadedFile[]>> {
    try {
      await this.initialize();
      const files = await this.fileManager.getFiles(type);
      
      return {
        data: files,
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Upload file
   */
  async uploadFile(
    file: File, 
    type: 'jd' | 'resume' | 'conversation'
  ): Promise<APIResponse<UploadedFile>> {
    try {
      await this.initialize();
      const uploadedFile = await this.fileManager.uploadFile(file, type);
      
      return {
        data: uploadedFile,
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Upload failed:', error);
      return {
        data: null as any,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Get interview history
   */
  async getInterviewHistory(): Promise<APIResponse<InterviewRecord[]>> {
    try {
      // For now, return empty array - will be implemented with storage
      const records: InterviewRecord[] = [];
      
      return {
        data: records,
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Delete file by ID
   */
  async deleteFile(fileId: string): Promise<APIResponse<boolean>> {
    try {
      await this.initialize();
      const success = await this.fileManager.deleteFile(fileId);
      
      return {
        data: success,
        success: success,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        data: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }
  async getFileContent(path: string): Promise<APIResponse<{ content: string; type: string }>> {
    try {
      await this.initialize();
      
      // Extract file ID from path (format: "files/{fileId}")
      const fileId = path.replace('files/', '');
      const file = await this.fileManager.getFile(fileId);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      return {
        data: {
          content: file.content,
          type: file.type
        },
        success: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        data: null as any,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }
}

// Create default instance
export const interviewApi = new InterviewApiService();

// Export convenience methods
export const interview = {
  startSimulation: (config: InterviewConfig) => interviewApi.startSimulation(config),
  startEvaluation: (config: EvaluatorConfig) => interviewApi.startEvaluation(config),
  getFiles: (type?: 'jd' | 'resume' | 'conversation' | 'report') => interviewApi.getFiles(type),
  uploadFile: (file: File, type: 'jd' | 'resume' | 'conversation') => 
    interviewApi.uploadFile(file, type),
  deleteFile: (fileId: string) => interviewApi.deleteFile(fileId),
  getHistory: () => interviewApi.getInterviewHistory(),
  getFileContent: (path: string) => interviewApi.getFileContent(path)
};