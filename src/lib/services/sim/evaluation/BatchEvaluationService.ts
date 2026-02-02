/**
 * Batch Evaluation Service
 * 
 * Handles batch processing of interview evaluations with parallel processing,
 * progress tracking, and result aggregation.
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import type {
  UploadedFile,
  InterviewContext,
  TopicAnalysisResult,
  EvaluationResult,
  AnalysisResult,
  EvaluatorConfig
} from '../types';
import { generateId } from '../types';
import { EvaluationEngine } from './EvaluationEngine';
import { InteractiveSelector } from '../storage/InteractiveSelector';
import { IndexedDBStorage } from '../storage/IndexedDBStorage';

export interface BatchEvaluationConfig {
  files: UploadedFile[];
  step: 'all' | 'topic' | 'report';
  stage?: string;
  concurrency?: number;
  skipErrors?: boolean;
  saveResults?: boolean;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
  percentage: number;
}

export interface BatchResult {
  fileId: string;
  fileName: string;
  success: boolean;
  result?: AnalysisResult;
  error?: string;
  duration: number;
}

export interface BatchSummary {
  batchId: string;
  startTime: Date;
  endTime: Date;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: BatchResult[];
  totalDuration: number;
  averageDuration: number;
  statistics: {
    topicAnalysisCount: number;
    evaluationCount: number;
    averageOverallRating?: number;
    averageConfidence?: number;
  };
}

export type ProgressCallback = (progress: BatchProgress) => void;

/**
 * Service for batch processing interview evaluations
 */
export class BatchEvaluationService {
  private evaluationEngine: EvaluationEngine;
  private storage: IndexedDBStorage;
  private selector: InteractiveSelector;
  private currentBatchId: string | null = null;
  private isProcessing = false;

  constructor() {
    this.evaluationEngine = new EvaluationEngine();
    this.storage = new IndexedDBStorage();
    this.selector = new InteractiveSelector();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.selector.initialize();
  }

  /**
   * Process batch evaluation with progress tracking
   */
  async processBatch(
    config: BatchEvaluationConfig,
    onProgress?: ProgressCallback
  ): Promise<BatchSummary> {
    if (this.isProcessing) {
      throw new Error('Batch processing already in progress');
    }

    this.isProcessing = true;
    this.currentBatchId = generateId('batch');

    const {
      files,
      step,
      stage = '1',
      concurrency = 3,
      skipErrors = true,
      saveResults = true
    } = config;

    const startTime = new Date();
    const results: BatchResult[] = [];
    const progress: BatchProgress = {
      total: files.length,
      completed: 0,
      failed: 0,
      percentage: 0
    };

    try {
      // Process files in chunks for concurrency control
      const chunks = this.chunkArray(files, concurrency);

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (file) => {
          const fileStartTime = Date.now();
          progress.current = file.name;

          if (onProgress) {
            onProgress({ ...progress });
          }

          try {
            // Parse conversation content
            const context = this.parseConversationContext(file);

            // Perform evaluation based on step
            let analysisResult: AnalysisResult | null = null;

            if (step === 'all' || step === 'topic') {
              const topicAnalysis = await this.evaluationEngine.analyzeTopics(
                this.parseConversationMessages(file.content),
                context
              );

              analysisResult = {
                processId: generateId('analysis'),
                status: 'completed',
                timestamp: new Date(),
                topicAnalysis
              };
            }

            if (step === 'all' || step === 'report') {
              const evaluation = await this.evaluationEngine.evaluateInterview(
                this.parseConversationMessages(file.content),
                context,
                stage
              );

              if (analysisResult) {
                analysisResult.evaluation = evaluation;
              } else {
                analysisResult = {
                  processId: generateId('analysis'),
                  status: 'completed',
                  timestamp: new Date(),
                  evaluation
                };
              }
            }

            // Save result if requested
            if (saveResults && analysisResult) {
              await this.storage.saveItem('analyses', analysisResult.processId, analysisResult);
            }

            const duration = Date.now() - fileStartTime;
            const result: BatchResult = {
              fileId: file.id,
              fileName: file.name,
              success: true,
              result: analysisResult || undefined,
              duration
            };

            results.push(result);
            progress.completed++;
          } catch (error) {
            const duration = Date.now() - fileStartTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            const result: BatchResult = {
              fileId: file.id,
              fileName: file.name,
              success: false,
              error: errorMessage,
              duration
            };

            results.push(result);
            progress.failed++;

            if (!skipErrors) {
              throw error;
            }
          }

          progress.percentage = Math.round(
            ((progress.completed + progress.failed) / progress.total) * 100
          );

          if (onProgress) {
            onProgress({ ...progress });
          }
        });

        await Promise.all(chunkPromises);
      }

      const endTime = new Date();
      const totalDuration = endTime.getTime() - startTime.getTime();

      // Calculate statistics
      const statistics = this.calculateStatistics(results);

      const summary: BatchSummary = {
        batchId: this.currentBatchId,
        startTime,
        endTime,
        totalFiles: files.length,
        successCount: progress.completed,
        failureCount: progress.failed,
        results,
        totalDuration,
        averageDuration: results.length > 0 ? totalDuration / results.length : 0,
        statistics
      };

      // Save batch summary
      if (saveResults) {
        await this.storage.saveItem('batches', this.currentBatchId, summary);
      }

      return summary;
    } finally {
      this.isProcessing = false;
      this.currentBatchId = null;
    }
  }

  /**
   * Process batch with file selection
   */
  async processBatchWithSelection(
    selectionCriteria: {
      search?: string;
      jd?: string;
      candidate?: string;
      fileType?: string;
      dateRange?: [Date, Date];
    },
    evaluationConfig: Omit<BatchEvaluationConfig, 'files'>,
    onProgress?: ProgressCallback
  ): Promise<BatchSummary> {
    // Scan and filter files
    await this.selector.scan('conversation');
    const selectedFiles = await this.selector.advancedFilter(selectionCriteria);

    if (selectedFiles.length === 0) {
      throw new Error('No files match the selection criteria');
    }

    // Process the selected files
    return this.processBatch(
      {
        ...evaluationConfig,
        files: selectedFiles
      },
      onProgress
    );
  }

  /**
   * Get batch processing status
   */
  getProcessingStatus(): {
    isProcessing: boolean;
    currentBatchId: string | null;
  } {
    return {
      isProcessing: this.isProcessing,
      currentBatchId: this.currentBatchId
    };
  }

  /**
   * Cancel current batch processing
   */
  cancelBatch(): void {
    if (this.isProcessing) {
      this.isProcessing = false;
      this.currentBatchId = null;
    }
  }

  /**
   * Get batch summary by ID
   */
  async getBatchSummary(batchId: string): Promise<BatchSummary | null> {
    return await this.storage.getItem<BatchSummary>('batches', batchId);
  }

  /**
   * Get all batch summaries
   */
  async getAllBatchSummaries(): Promise<BatchSummary[]> {
    return await this.storage.getAllItems<BatchSummary>('batches');
  }

  /**
   * Delete batch summary
   */
  async deleteBatchSummary(batchId: string): Promise<boolean> {
    return await this.storage.deleteItem('batches', batchId);
  }

  /**
   * Export batch results
   */
  exportBatchResults(summary: BatchSummary, format: 'json' | 'csv' | 'txt' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(summary, null, 2);

      case 'csv':
        return this.exportToCSV(summary);

      case 'txt':
        return this.exportToTXT(summary);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Private helper methods
   */

  private parseConversationContext(file: UploadedFile): InterviewContext {
    return {
      jd: file.metadata.jd || file.metadata.position || '',
      resume: file.metadata.candidateName || '',
      transcript: file.content
    };
  }

  private parseConversationMessages(content: string): any[] {
    // Parse conversation content into messages
    // This is a simplified parser - adjust based on actual format
    const lines = content.split('\n');
    const messages: any[] = [];

    let currentRole: 'interviewer' | 'candidate' | null = null;
    let currentContent = '';

    for (const line of lines) {
      if (line.includes('面试官:') || line.includes('Interviewer:')) {
        if (currentRole && currentContent) {
          messages.push({
            role: currentRole,
            content: currentContent.trim(),
            timestamp: new Date()
          });
        }
        currentRole = 'interviewer';
        currentContent = line.split(':')[1] || '';
      } else if (line.includes('候选人:') || line.includes('Candidate:')) {
        if (currentRole && currentContent) {
          messages.push({
            role: currentRole,
            content: currentContent.trim(),
            timestamp: new Date()
          });
        }
        currentRole = 'candidate';
        currentContent = line.split(':')[1] || '';
      } else if (currentRole) {
        currentContent += '\n' + line;
      }
    }

    if (currentRole && currentContent) {
      messages.push({
        role: currentRole,
        content: currentContent.trim(),
        timestamp: new Date()
      });
    }

    return messages;
  }

  private calculateStatistics(results: BatchResult[]): BatchSummary['statistics'] {
    const successfulResults = results.filter(r => r.success && r.result);

    let topicAnalysisCount = 0;
    let evaluationCount = 0;
    let totalRating = 0;
    let totalConfidence = 0;
    let ratingCount = 0;

    for (const result of successfulResults) {
      if (result.result?.topicAnalysis) {
        topicAnalysisCount++;
      }
      if (result.result?.evaluation) {
        evaluationCount++;
        totalRating += result.result.evaluation.overall_rating;
        totalConfidence += result.result.evaluation.overall_confidence;
        ratingCount++;
      }
    }

    return {
      topicAnalysisCount,
      evaluationCount,
      averageOverallRating: ratingCount > 0 ? totalRating / ratingCount : undefined,
      averageConfidence: ratingCount > 0 ? totalConfidence / ratingCount : undefined
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private exportToCSV(summary: BatchSummary): string {
    const headers = [
      'File Name',
      'Success',
      'Duration (ms)',
      'Overall Rating',
      'Confidence',
      'Error'
    ];

    let csv = headers.join(',') + '\n';

    for (const result of summary.results) {
      const row = [
        `"${result.fileName}"`,
        result.success ? 'Yes' : 'No',
        result.duration.toString(),
        result.result?.evaluation?.overall_rating?.toString() || '',
        result.result?.evaluation?.overall_confidence?.toString() || '',
        result.error ? `"${result.error.replace(/"/g, '""')}"` : ''
      ];

      csv += row.join(',') + '\n';
    }

    return csv;
  }

  private exportToTXT(summary: BatchSummary): string {
    let output = '';

    output += `批量评估报告\n`;
    output += `=====================================\n`;
    output += `批次ID: ${summary.batchId}\n`;
    output += `开始时间: ${summary.startTime.toLocaleString()}\n`;
    output += `结束时间: ${summary.endTime.toLocaleString()}\n`;
    output += `总文件数: ${summary.totalFiles}\n`;
    output += `成功: ${summary.successCount}\n`;
    output += `失败: ${summary.failureCount}\n`;
    output += `总耗时: ${Math.round(summary.totalDuration / 1000)}秒\n`;
    output += `平均耗时: ${Math.round(summary.averageDuration / 1000)}秒\n`;
    output += `=====================================\n\n`;

    output += `统计信息:\n`;
    output += `- 主题分析数: ${summary.statistics.topicAnalysisCount}\n`;
    output += `- 能力评估数: ${summary.statistics.evaluationCount}\n`;
    if (summary.statistics.averageOverallRating) {
      output += `- 平均评分: ${summary.statistics.averageOverallRating.toFixed(2)}\n`;
    }
    if (summary.statistics.averageConfidence) {
      output += `- 平均置信度: ${summary.statistics.averageConfidence.toFixed(2)}\n`;
    }
    output += `\n`;

    output += `详细结果:\n`;
    output += `=====================================\n`;

    for (const result of summary.results) {
      output += `\n文件: ${result.fileName}\n`;
      output += `状态: ${result.success ? '成功' : '失败'}\n`;
      output += `耗时: ${Math.round(result.duration / 1000)}秒\n`;

      if (result.success && result.result?.evaluation) {
        output += `评分: ${result.result.evaluation.overall_rating}\n`;
        output += `置信度: ${result.result.evaluation.overall_confidence}\n`;
      }

      if (result.error) {
        output += `错误: ${result.error}\n`;
      }

      output += `-------------------------------------\n`;
    }

    return output;
  }
}

// Export singleton instance
export const batchEvaluationService = new BatchEvaluationService();
