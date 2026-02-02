/**
 * Batch Evaluation Service Tests
 * 
 * Basic unit tests for batch evaluation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchEvaluationService } from '../BatchEvaluationService';
import type { UploadedFile, BatchEvaluationConfig } from '../../types';

describe('BatchEvaluationService', () => {
  let service: BatchEvaluationService;

  beforeEach(() => {
    service = new BatchEvaluationService();
  });

  it('should create a new instance', () => {
    expect(service).toBeDefined();
  });

  it('should return not processing initially', () => {
    const status = service.getProcessingStatus();
    expect(status.isProcessing).toBe(false);
    expect(status.currentBatchId).toBeNull();
  });

  it('should chunk array correctly', () => {
    // Access private method through any cast for testing
    const chunks = (service as any).chunkArray([1, 2, 3, 4, 5], 2);
    expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should export batch results to CSV format', () => {
    const mockSummary = {
      batchId: 'test-batch',
      startTime: new Date('2024-01-01'),
      endTime: new Date('2024-01-01'),
      totalFiles: 2,
      successCount: 1,
      failureCount: 1,
      results: [
        {
          fileId: 'file1',
          fileName: 'test1.txt',
          success: true,
          duration: 1000,
          result: {
            processId: 'proc1',
            status: 'completed' as const,
            timestamp: new Date(),
            evaluation: {
              candidate_name: 'Test Candidate',
              position: 'Engineer',
              evaluation_date: '2024-01-01',
              dimensions: {
                聪明度: { score: 8, assessment: '', missing_info: '', confidence_score: 0.9, confidence_justification: '' },
                勤奋度: { score: 7, assessment: '', missing_info: '', confidence_score: 0.8, confidence_justification: '' },
                目标感: { score: 6, assessment: '', missing_info: '', confidence_score: 0.7, confidence_justification: '' },
                皮实度: { score: 7, assessment: '', missing_info: '', confidence_score: 0.8, confidence_justification: '' },
                迎难而上: { score: 8, assessment: '', missing_info: '', confidence_score: 0.9, confidence_justification: '' },
                客户第一: { score: 7, assessment: '', missing_info: '', confidence_score: 0.8, confidence_justification: '' }
              },
              overall_rating: 7.5,
              overall_confidence: 0.85,
              strengths: [],
              weaknesses: [],
              suggested_follow_up_questions: {},
              summary: '',
              hiring_recommendation: ''
            }
          }
        },
        {
          fileId: 'file2',
          fileName: 'test2.txt',
          success: false,
          duration: 500,
          error: 'Test error'
        }
      ],
      totalDuration: 1500,
      averageDuration: 750,
      statistics: {
        topicAnalysisCount: 0,
        evaluationCount: 1,
        averageOverallRating: 7.5,
        averageConfidence: 0.85
      }
    };

    const csv = service.exportBatchResults(mockSummary, 'csv');
    expect(csv).toContain('File Name');
    expect(csv).toContain('test1.txt');
    expect(csv).toContain('test2.txt');
    expect(csv).toContain('7.5');
    expect(csv).toContain('Test error');
  });

  it('should export batch results to JSON format', () => {
    const mockSummary = {
      batchId: 'test-batch',
      startTime: new Date('2024-01-01'),
      endTime: new Date('2024-01-01'),
      totalFiles: 1,
      successCount: 1,
      failureCount: 0,
      results: [],
      totalDuration: 1000,
      averageDuration: 1000,
      statistics: {
        topicAnalysisCount: 0,
        evaluationCount: 0
      }
    };

    const json = service.exportBatchResults(mockSummary, 'json');
    const parsed = JSON.parse(json);
    expect(parsed.batchId).toBe('test-batch');
    expect(parsed.totalFiles).toBe(1);
  });

  it('should cancel batch processing', () => {
    service.cancelBatch();
    const status = service.getProcessingStatus();
    expect(status.isProcessing).toBe(false);
  });
});
