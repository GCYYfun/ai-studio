/**
 * History Management Service
 * 
 * Manages interview history records, analysis results, and provides
 * search, filtering, comparison, and categorization functionality.
 * 
 * Requirements: 7.4, 7.5
 */

import type {
  InterviewRecord,
  AnalysisResult,
  InterviewResult,
  UploadedFile,
  EvaluationResult,
  TopicAnalysisResult
} from '../types';
import { generateId } from '../types';
import { IndexedDBStorage } from '../storage/IndexedDBStorage';

export interface HistoryFilter {
  search?: string;
  candidateName?: string;
  position?: string;
  status?: 'completed' | 'in_progress' | 'failed';
  dateRange?: [Date, Date];
  tags?: string[];
  hasAnalysis?: boolean;
  minRating?: number;
  maxRating?: number;
}

export interface HistoryRecord {
  id: string;
  interviewResult?: InterviewResult;
  analysisResult?: AnalysisResult;
  candidateName: string;
  position: string;
  interviewDate: Date;
  status: 'completed' | 'in_progress' | 'failed';
  tags: string[];
  notes?: string;
  metadata: {
    totalTurns?: number;
    duration?: number;
    overallRating?: number;
    confidence?: number;
  };
}

export interface ComparisonResult {
  records: HistoryRecord[];
  comparison: {
    candidates: string[];
    positions: string[];
    ratings: number[];
    confidences: number[];
    strengths: string[][];
    weaknesses: string[][];
    dimensions: {
      [dimension: string]: number[];
    };
  };
}

export interface HistoryStatistics {
  totalRecords: number;
  completedRecords: number;
  failedRecords: number;
  averageRating: number;
  averageConfidence: number;
  topCandidates: Array<{ name: string; rating: number }>;
  positionDistribution: Record<string, number>;
  tagDistribution: Record<string, number>;
  dateRange: [Date, Date] | null;
}

/**
 * Service for managing interview history and analysis results
 */
export class HistoryManagementService {
  private storage: IndexedDBStorage;
  private cache: Map<string, HistoryRecord> = new Map();

  constructor() {
    this.storage = new IndexedDBStorage();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.loadCache();
  }

  /**
   * Save interview and analysis to history
   */
  async saveToHistory(
    interviewResult?: InterviewResult,
    analysisResult?: AnalysisResult,
    tags: string[] = [],
    notes?: string
  ): Promise<string> {
    const id = generateId('history');

    const record: HistoryRecord = {
      id,
      interviewResult,
      analysisResult,
      candidateName: interviewResult?.metadata.candidateName || 
                     analysisResult?.evaluation?.candidate_name || 
                     'Unknown',
      position: interviewResult?.metadata.position || 
                analysisResult?.evaluation?.position || 
                'Unknown',
      interviewDate: interviewResult?.metadata.startTime || 
                     analysisResult?.timestamp || 
                     new Date(),
      status: this.determineStatus(interviewResult, analysisResult),
      tags,
      notes,
      metadata: {
        totalTurns: interviewResult?.metadata.totalTurns,
        duration: this.calculateDuration(interviewResult),
        overallRating: analysisResult?.evaluation?.overall_rating,
        confidence: analysisResult?.evaluation?.overall_confidence
      }
    };

    await this.storage.saveItem('interviews', id, record);
    this.cache.set(id, record);

    return id;
  }

  /**
   * Get history record by ID
   */
  async getRecord(id: string): Promise<HistoryRecord | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const record = await this.storage.getItem<HistoryRecord>('interviews', id);
    if (record) {
      this.cache.set(id, record);
    }

    return record;
  }

  /**
   * Get all history records
   */
  async getAllRecords(): Promise<HistoryRecord[]> {
    const records = await this.storage.getAllItems<HistoryRecord>('interviews');
    
    // Update cache
    for (const record of records) {
      this.cache.set(record.id, record);
    }

    return records.sort((a, b) => 
      b.interviewDate.getTime() - a.interviewDate.getTime()
    );
  }

  /**
   * Filter history records
   */
  async filterRecords(filter: HistoryFilter): Promise<HistoryRecord[]> {
    let records = await this.getAllRecords();

    // Text search
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      records = records.filter(record =>
        record.candidateName.toLowerCase().includes(searchLower) ||
        record.position.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower) ||
        record.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Candidate name filter
    if (filter.candidateName) {
      const nameLower = filter.candidateName.toLowerCase();
      records = records.filter(record =>
        record.candidateName.toLowerCase().includes(nameLower)
      );
    }

    // Position filter
    if (filter.position) {
      const positionLower = filter.position.toLowerCase();
      records = records.filter(record =>
        record.position.toLowerCase().includes(positionLower)
      );
    }

    // Status filter
    if (filter.status) {
      records = records.filter(record => record.status === filter.status);
    }

    // Date range filter
    if (filter.dateRange) {
      const [startDate, endDate] = filter.dateRange;
      records = records.filter(record => {
        const recordDate = new Date(record.interviewDate);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      records = records.filter(record =>
        filter.tags!.some(tag => record.tags.includes(tag))
      );
    }

    // Has analysis filter
    if (filter.hasAnalysis !== undefined) {
      records = records.filter(record =>
        (record.analysisResult !== undefined) === filter.hasAnalysis
      );
    }

    // Rating range filter
    if (filter.minRating !== undefined) {
      records = records.filter(record =>
        record.metadata.overallRating !== undefined &&
        record.metadata.overallRating >= filter.minRating!
      );
    }

    if (filter.maxRating !== undefined) {
      records = records.filter(record =>
        record.metadata.overallRating !== undefined &&
        record.metadata.overallRating <= filter.maxRating!
      );
    }

    return records;
  }

  /**
   * Compare multiple history records
   */
  async compareRecords(recordIds: string[]): Promise<ComparisonResult> {
    const records: HistoryRecord[] = [];

    for (const id of recordIds) {
      const record = await this.getRecord(id);
      if (record) {
        records.push(record);
      }
    }

    if (records.length === 0) {
      throw new Error('No valid records found for comparison');
    }

    // Extract comparison data
    const candidates = records.map(r => r.candidateName);
    const positions = records.map(r => r.position);
    const ratings = records.map(r => r.metadata.overallRating || 0);
    const confidences = records.map(r => r.metadata.confidence || 0);
    const strengths = records.map(r => r.analysisResult?.evaluation?.strengths || []);
    const weaknesses = records.map(r => r.analysisResult?.evaluation?.weaknesses || []);

    // Extract dimension scores
    const dimensions: { [dimension: string]: number[] } = {};
    const dimensionNames = ['聪明度', '勤奋度', '目标感', '皮实度', '迎难而上', '客户第一'];

    for (const dimName of dimensionNames) {
      dimensions[dimName] = records.map(r => {
        const evaluation = r.analysisResult?.evaluation;
        if (evaluation && evaluation.dimensions) {
          return evaluation.dimensions[dimName as keyof typeof evaluation.dimensions]?.score || 0;
        }
        return 0;
      });
    }

    return {
      records,
      comparison: {
        candidates,
        positions,
        ratings,
        confidences,
        strengths,
        weaknesses,
        dimensions
      }
    };
  }

  /**
   * Update history record
   */
  async updateRecord(
    id: string,
    updates: Partial<Omit<HistoryRecord, 'id'>>
  ): Promise<boolean> {
    const record = await this.getRecord(id);
    if (!record) {
      return false;
    }

    const updatedRecord: HistoryRecord = {
      ...record,
      ...updates
    };

    await this.storage.saveItem('interviews', id, updatedRecord);
    this.cache.set(id, updatedRecord);

    return true;
  }

  /**
   * Add tags to record
   */
  async addTags(id: string, tags: string[]): Promise<boolean> {
    const record = await this.getRecord(id);
    if (!record) {
      return false;
    }

    const existingTags = new Set(record.tags);
    for (const tag of tags) {
      existingTags.add(tag);
    }

    return this.updateRecord(id, {
      tags: Array.from(existingTags)
    });
  }

  /**
   * Remove tags from record
   */
  async removeTags(id: string, tags: string[]): Promise<boolean> {
    const record = await this.getRecord(id);
    if (!record) {
      return false;
    }

    const tagsToRemove = new Set(tags);
    const updatedTags = record.tags.filter(tag => !tagsToRemove.has(tag));

    return this.updateRecord(id, {
      tags: updatedTags
    });
  }

  /**
   * Delete history record
   */
  async deleteRecord(id: string): Promise<boolean> {
    const deleted = await this.storage.deleteItem('interviews', id);
    if (deleted) {
      this.cache.delete(id);
    }
    return deleted;
  }

  /**
   * Delete multiple records
   */
  async deleteRecords(ids: string[]): Promise<number> {
    let deletedCount = 0;

    for (const id of ids) {
      const deleted = await this.deleteRecord(id);
      if (deleted) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get history statistics
   */
  async getStatistics(): Promise<HistoryStatistics> {
    const records = await this.getAllRecords();

    if (records.length === 0) {
      return {
        totalRecords: 0,
        completedRecords: 0,
        failedRecords: 0,
        averageRating: 0,
        averageConfidence: 0,
        topCandidates: [],
        positionDistribution: {},
        tagDistribution: {},
        dateRange: null
      };
    }

    const completedRecords = records.filter(r => r.status === 'completed').length;
    const failedRecords = records.filter(r => r.status === 'failed').length;

    // Calculate averages
    const recordsWithRating = records.filter(r => r.metadata.overallRating !== undefined);
    const averageRating = recordsWithRating.length > 0
      ? recordsWithRating.reduce((sum, r) => sum + (r.metadata.overallRating || 0), 0) / recordsWithRating.length
      : 0;

    const recordsWithConfidence = records.filter(r => r.metadata.confidence !== undefined);
    const averageConfidence = recordsWithConfidence.length > 0
      ? recordsWithConfidence.reduce((sum, r) => sum + (r.metadata.confidence || 0), 0) / recordsWithConfidence.length
      : 0;

    // Top candidates
    const topCandidates = recordsWithRating
      .sort((a, b) => (b.metadata.overallRating || 0) - (a.metadata.overallRating || 0))
      .slice(0, 10)
      .map(r => ({
        name: r.candidateName,
        rating: r.metadata.overallRating || 0
      }));

    // Position distribution
    const positionDistribution: Record<string, number> = {};
    for (const record of records) {
      positionDistribution[record.position] = (positionDistribution[record.position] || 0) + 1;
    }

    // Tag distribution
    const tagDistribution: Record<string, number> = {};
    for (const record of records) {
      for (const tag of record.tags) {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      }
    }

    // Date range
    const dates = records.map(r => new Date(r.interviewDate).getTime());
    const dateRange: [Date, Date] = [
      new Date(Math.min(...dates)),
      new Date(Math.max(...dates))
    ];

    return {
      totalRecords: records.length,
      completedRecords,
      failedRecords,
      averageRating,
      averageConfidence,
      topCandidates,
      positionDistribution,
      tagDistribution,
      dateRange
    };
  }

  /**
   * Export history records
   */
  exportRecords(records: HistoryRecord[], format: 'json' | 'csv' | 'txt' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(records, null, 2);

      case 'csv':
        return this.exportToCSV(records);

      case 'txt':
        return this.exportToTXT(records);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Search records with advanced query
   */
  async searchRecords(query: string): Promise<HistoryRecord[]> {
    return this.filterRecords({ search: query });
  }

  /**
   * Get records by tag
   */
  async getRecordsByTag(tag: string): Promise<HistoryRecord[]> {
    return this.filterRecords({ tags: [tag] });
  }

  /**
   * Get all unique tags
   */
  async getAllTags(): Promise<string[]> {
    const records = await this.getAllRecords();
    const tagsSet = new Set<string>();

    for (const record of records) {
      for (const tag of record.tags) {
        tagsSet.add(tag);
      }
    }

    return Array.from(tagsSet).sort();
  }

  /**
   * Get all unique positions
   */
  async getAllPositions(): Promise<string[]> {
    const records = await this.getAllRecords();
    const positionsSet = new Set<string>();

    for (const record of records) {
      positionsSet.add(record.position);
    }

    return Array.from(positionsSet).sort();
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    await this.storage.clearStore('interviews');
    this.cache.clear();
  }

  /**
   * Private helper methods
   */

  private async loadCache(): Promise<void> {
    const records = await this.storage.getAllItems<HistoryRecord>('interviews');
    for (const record of records) {
      this.cache.set(record.id, record);
    }
  }

  private determineStatus(
    interviewResult?: InterviewResult,
    analysisResult?: AnalysisResult
  ): 'completed' | 'in_progress' | 'failed' {
    if (interviewResult?.status === 'error' || analysisResult?.status === 'error') {
      return 'failed';
    }

    if (interviewResult?.status === 'completed' && analysisResult?.status === 'completed') {
      return 'completed';
    }

    if (interviewResult?.status === 'completed' || analysisResult?.status === 'completed') {
      return 'completed';
    }

    return 'in_progress';
  }

  private calculateDuration(interviewResult?: InterviewResult): number | undefined {
    if (!interviewResult?.metadata.startTime || !interviewResult?.metadata.endTime) {
      return undefined;
    }

    return interviewResult.metadata.endTime.getTime() - 
           interviewResult.metadata.startTime.getTime();
  }

  private exportToCSV(records: HistoryRecord[]): string {
    const headers = [
      'Candidate Name',
      'Position',
      'Interview Date',
      'Status',
      'Overall Rating',
      'Confidence',
      'Total Turns',
      'Duration (min)',
      'Tags'
    ];

    let csv = headers.join(',') + '\n';

    for (const record of records) {
      const row = [
        `"${record.candidateName}"`,
        `"${record.position}"`,
        record.interviewDate.toISOString(),
        record.status,
        record.metadata.overallRating?.toString() || '',
        record.metadata.confidence?.toString() || '',
        record.metadata.totalTurns?.toString() || '',
        record.metadata.duration ? Math.round(record.metadata.duration / 60000).toString() : '',
        `"${record.tags.join(', ')}"`
      ];

      csv += row.join(',') + '\n';
    }

    return csv;
  }

  private exportToTXT(records: HistoryRecord[]): string {
    let output = '';

    output += `面试历史记录\n`;
    output += `=====================================\n`;
    output += `总记录数: ${records.length}\n`;
    output += `导出时间: ${new Date().toLocaleString()}\n`;
    output += `=====================================\n\n`;

    for (const record of records) {
      output += `候选人: ${record.candidateName}\n`;
      output += `职位: ${record.position}\n`;
      output += `面试日期: ${record.interviewDate.toLocaleString()}\n`;
      output += `状态: ${record.status}\n`;

      if (record.metadata.overallRating) {
        output += `评分: ${record.metadata.overallRating}\n`;
      }

      if (record.metadata.confidence) {
        output += `置信度: ${record.metadata.confidence}\n`;
      }

      if (record.metadata.totalTurns) {
        output += `总轮数: ${record.metadata.totalTurns}\n`;
      }

      if (record.tags.length > 0) {
        output += `标签: ${record.tags.join(', ')}\n`;
      }

      if (record.notes) {
        output += `备注: ${record.notes}\n`;
      }

      output += `-------------------------------------\n\n`;
    }

    return output;
  }
}

// Export singleton instance
export const historyManagementService = new HistoryManagementService();
