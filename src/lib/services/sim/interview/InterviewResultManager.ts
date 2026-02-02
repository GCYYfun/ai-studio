/**
 * Interview Result Manager
 * 
 * Handles saving, formatting, and exporting interview results in multiple formats.
 * Manages metadata and provides various export options.
 */

import type { 
  InterviewResult, 
  ConversationMessage, 
  InterviewMetadata,
  UploadedFile 
} from '../types';
import { generateId } from '../types';

export interface ExportOptions {
  format: 'json' | 'txt' | 'md' | 'csv';
  includeMetadata?: boolean;
  includeThinking?: boolean;
  includeTimestamps?: boolean;
  customTemplate?: string;
}

export interface SavedResult {
  id: string;
  result: InterviewResult;
  savedAt: Date;
  exportPath?: string;
  tags?: string[];
}

export class InterviewResultManager {
  private savedResults: Map<string, SavedResult> = new Map();

  /**
   * Save interview result with metadata
   */
  async saveResult(result: InterviewResult, tags?: string[]): Promise<string> {
    const savedResult: SavedResult = {
      id: generateId('result'),
      result: { ...result },
      savedAt: new Date(),
      tags: tags || []
    };

    this.savedResults.set(savedResult.id, savedResult);
    
    // Also save to browser storage if available
    try {
      const storageKey = `interview_result_${savedResult.id}`;
      localStorage.setItem(storageKey, JSON.stringify(savedResult));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }

    return savedResult.id;
  }

  /**
   * Get saved result by ID
   */
  getSavedResult(id: string): SavedResult | null {
    let result = this.savedResults.get(id);
    
    if (!result) {
      // Try to load from localStorage
      try {
        const storageKey = `interview_result_${id}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          result = JSON.parse(stored);
          if (result) {
            this.savedResults.set(id, result);
          }
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
    }

    return result || null;
  }

  /**
   * Get all saved results
   */
  getAllSavedResults(): SavedResult[] {
    // Load from localStorage if not in memory
    this.loadFromStorage();
    return Array.from(this.savedResults.values()).sort((a, b) => 
      b.savedAt.getTime() - a.savedAt.getTime()
    );
  }

  /**
   * Delete saved result
   */
  deleteSavedResult(id: string): boolean {
    const deleted = this.savedResults.delete(id);
    
    // Also remove from localStorage
    try {
      const storageKey = `interview_result_${id}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }

    return deleted;
  }

  /**
   * Export interview result to specified format
   */
  exportResult(result: InterviewResult, options: ExportOptions): string {
    switch (options.format) {
      case 'json':
        return this.exportToJSON(result, options);
      case 'txt':
        return this.exportToTXT(result, options);
      case 'md':
        return this.exportToMarkdown(result, options);
      case 'csv':
        return this.exportToCSV(result, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(result: InterviewResult, options: ExportOptions): string {
    const exportData: any = {
      sessionId: result.sessionId,
      status: result.status,
      messages: result.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        turn: msg.turn,
        ...(options.includeTimestamps && { timestamp: msg.timestamp }),
        ...(options.includeThinking && msg.thinking && { thinking: msg.thinking })
      }))
    };

    if (options.includeMetadata) {
      exportData.metadata = result.metadata;
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export to plain text format
   */
  private exportToTXT(result: InterviewResult, options: ExportOptions): string {
    let output = '';

    if (options.includeMetadata) {
      output += `面试记录\n`;
      output += `=====================================\n`;
      output += `候选人: ${result.metadata.candidateName}\n`;
      output += `职位: ${result.metadata.position}\n`;
      output += `开始时间: ${result.metadata.startTime.toLocaleString()}\n`;
      if (result.metadata.endTime) {
        output += `结束时间: ${result.metadata.endTime.toLocaleString()}\n`;
      }
      output += `总轮数: ${result.metadata.totalTurns}\n`;
      output += `状态: ${result.status}\n`;
      output += `=====================================\n\n`;
    }

    result.messages.forEach((message, index) => {
      const speaker = message.role === 'interviewer' ? '面试官' : '候选人';
      
      if (options.includeTimestamps) {
        output += `[${message.timestamp.toLocaleTimeString()}] `;
      }
      
      output += `${speaker} (第${message.turn}轮): ${message.content}\n`;
      
      if (options.includeThinking && message.thinking) {
        output += `  思考过程: ${message.thinking}\n`;
      }
      
      output += '\n';
    });

    return output;
  }

  /**
   * Export to Markdown format
   */
  private exportToMarkdown(result: InterviewResult, options: ExportOptions): string {
    let output = '';

    if (options.includeMetadata) {
      output += `# 面试记录\n\n`;
      output += `## 基本信息\n\n`;
      output += `- **候选人**: ${result.metadata.candidateName}\n`;
      output += `- **职位**: ${result.metadata.position}\n`;
      output += `- **开始时间**: ${result.metadata.startTime.toLocaleString()}\n`;
      if (result.metadata.endTime) {
        output += `- **结束时间**: ${result.metadata.endTime.toLocaleString()}\n`;
      }
      output += `- **总轮数**: ${result.metadata.totalTurns}\n`;
      output += `- **状态**: ${result.status}\n\n`;
    }

    output += `## 对话记录\n\n`;

    result.messages.forEach((message, index) => {
      const speaker = message.role === 'interviewer' ? '🎯 面试官' : '👤 候选人';
      
      output += `### ${speaker} (第${message.turn}轮)\n\n`;
      
      if (options.includeTimestamps) {
        output += `*时间: ${message.timestamp.toLocaleTimeString()}*\n\n`;
      }
      
      output += `${message.content}\n\n`;
      
      if (options.includeThinking && message.thinking) {
        output += `<details>\n<summary>思考过程</summary>\n\n${message.thinking}\n\n</details>\n\n`;
      }
    });

    return output;
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(result: InterviewResult, options: ExportOptions): string {
    const headers = ['Turn', 'Role', 'Content'];
    
    if (options.includeTimestamps) {
      headers.push('Timestamp');
    }
    
    if (options.includeThinking) {
      headers.push('Thinking');
    }

    let csv = headers.join(',') + '\n';

    result.messages.forEach(message => {
      const row = [
        message.turn.toString(),
        message.role,
        `"${message.content.replace(/"/g, '""')}"` // Escape quotes
      ];

      if (options.includeTimestamps) {
        row.push(message.timestamp.toISOString());
      }

      if (options.includeThinking) {
        row.push(message.thinking ? `"${message.thinking.replace(/"/g, '""')}"` : '');
      }

      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Create downloadable file from export
   */
  createDownloadableFile(content: string, filename: string, mimeType: string): Blob {
    return new Blob([content], { type: mimeType });
  }

  /**
   * Generate filename for export
   */
  generateExportFilename(result: InterviewResult, format: string): string {
    const candidateName = result.metadata.candidateName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const date = result.metadata.startTime.toISOString().split('T')[0];
    return `interview_${candidateName}_${date}.${format}`;
  }

  /**
   * Format conversation for display
   */
  formatConversationForDisplay(messages: ConversationMessage[]): Array<{
    id: string;
    role: 'interviewer' | 'candidate';
    content: string;
    turn: number;
    timestamp: string;
    thinking?: string;
  }> {
    return messages.map((message, index) => ({
      id: `msg_${index}`,
      role: message.role,
      content: message.content,
      turn: message.turn,
      timestamp: message.timestamp.toLocaleString(),
      thinking: message.thinking
    }));
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(messages: ConversationMessage[]): {
    totalMessages: number;
    interviewerMessages: number;
    candidateMessages: number;
    averageMessageLength: number;
    totalDuration: number;
    averageTurnTime: number;
  } {
    const interviewerMessages = messages.filter(m => m.role === 'interviewer').length;
    const candidateMessages = messages.filter(m => m.role === 'candidate').length;
    
    const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const averageMessageLength = messages.length > 0 ? Math.round(totalLength / messages.length) : 0;

    let totalDuration = 0;
    let averageTurnTime = 0;

    if (messages.length > 1) {
      const firstTime = messages[0].timestamp.getTime();
      const lastTime = messages[messages.length - 1].timestamp.getTime();
      totalDuration = Math.round((lastTime - firstTime) / 1000); // seconds
      averageTurnTime = Math.round(totalDuration / messages.length);
    }

    return {
      totalMessages: messages.length,
      interviewerMessages,
      candidateMessages,
      averageMessageLength,
      totalDuration,
      averageTurnTime
    };
  }

  /**
   * Search through saved results
   */
  searchResults(query: string, tags?: string[]): SavedResult[] {
    const allResults = this.getAllSavedResults();
    
    return allResults.filter(savedResult => {
      const result = savedResult.result;
      
      // Search in metadata
      const metadataMatch = 
        result.metadata.candidateName.toLowerCase().includes(query.toLowerCase()) ||
        result.metadata.position.toLowerCase().includes(query.toLowerCase());

      // Search in conversation content
      const contentMatch = result.messages.some(msg => 
        msg.content.toLowerCase().includes(query.toLowerCase())
      );

      // Check tags if provided
      const tagMatch = !tags || tags.length === 0 || 
        (savedResult.tags && tags.some(tag => savedResult.tags!.includes(tag)));

      return (metadataMatch || contentMatch) && tagMatch;
    });
  }

  /**
   * Load results from localStorage
   */
  private loadFromStorage(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('interview_result_')) {
          const id = key.replace('interview_result_', '');
          if (!this.savedResults.has(id)) {
            const stored = localStorage.getItem(key);
            if (stored) {
              const result = JSON.parse(stored);
              this.savedResults.set(id, result);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load results from localStorage:', error);
    }
  }

  /**
   * Clear all saved results
   */
  clearAllResults(): void {
    // Clear from memory
    this.savedResults.clear();

    // Clear from localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('interview_result_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

// Export singleton instance
export const interviewResultManager = new InterviewResultManager();