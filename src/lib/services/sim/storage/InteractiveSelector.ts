/**
 * Interactive Selector Service
 * 
 * TypeScript implementation of Python InterviewSelector logic.
 * Provides file filtering, batch selection, and metadata parsing functionality.
 */

import type { 
  UploadedFile, 
  FilterCriteria, 
  InterviewRecord,
  FileMetadata 
} from '../types';
import { FileManager } from './FileManager';

export interface SelectorConfig {
  resourcePath?: string;
  fileTypes?: string[];
  sortBy?: 'name' | 'date' | 'type' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface SelectionResult {
  selectedFiles: UploadedFile[];
  totalFiles: number;
  filteredFiles: number;
  selectionRate: number;
}

export interface BatchProcessOptions {
  concurrency?: number;
  validateFiles?: boolean;
  skipErrors?: boolean;
}

/**
 * Interactive file selector for batch processing and filtering
 * Based on Python InterviewSelector logic
 */
export class InteractiveSelector {
  private fileManager: FileManager;
  private config: SelectorConfig;
  private scannedFiles: UploadedFile[] = [];
  private filteredFiles: UploadedFile[] = [];

  constructor(config: SelectorConfig = {}) {
    this.config = {
      resourcePath: 'data/resources/conversations',
      fileTypes: ['.pdf', '.txt', '.md'],
      sortBy: 'name',
      sortOrder: 'asc',
      ...config
    };
    this.fileManager = new FileManager();
  }

  /**
   * Initialize the selector
   */
  async initialize(): Promise<void> {
    await this.fileManager.initialize();
  }

  /**
   * Scan directory for files and parse metadata
   * Equivalent to Python scan() method
   */
  async scan(type?: string): Promise<UploadedFile[]> {
    try {
      this.scannedFiles = await this.fileManager.getFiles(type);
      this.filteredFiles = [...this.scannedFiles];
      
      // Sort files based on config
      this.sortFiles(this.filteredFiles);
      
      return this.filteredFiles;
    } catch (error) {
      console.error('Failed to scan files:', error);
      return [];
    }
  }

  /**
   * Filter scanned files based on criteria
   * Equivalent to Python filter() method
   */
  async filter(criteria: FilterCriteria): Promise<UploadedFile[]> {
    if (this.scannedFiles.length === 0) {
      await this.scan();
    }

    this.filteredFiles = await this.fileManager.filterFiles(criteria);
    this.sortFiles(this.filteredFiles);
    
    return this.filteredFiles;
  }

  /**
   * Advanced filtering with multiple criteria
   */
  async advancedFilter(filters: {
    search?: string;
    jd?: string;
    candidate?: string;
    fileType?: string;
    dateRange?: [Date, Date];
    sizeRange?: [number, number];
    hasMetadata?: boolean;
  }): Promise<UploadedFile[]> {
    if (this.scannedFiles.length === 0) {
      await this.scan();
    }

    let filtered = [...this.scannedFiles];

    // Text search across name and content
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchLower) ||
        file.content.toLowerCase().includes(searchLower) ||
        file.metadata.candidateName?.toLowerCase().includes(searchLower) ||
        file.metadata.position?.toLowerCase().includes(searchLower)
      );
    }

    // JD filter
    if (filters.jd) {
      const jdLower = filters.jd.toLowerCase();
      filtered = filtered.filter(file => 
        file.metadata.jd?.toLowerCase().includes(jdLower) ||
        file.metadata.position?.toLowerCase().includes(jdLower)
      );
    }

    // Candidate filter
    if (filters.candidate) {
      const candidateLower = filters.candidate.toLowerCase();
      filtered = filtered.filter(file => 
        file.metadata.candidateName?.toLowerCase().includes(candidateLower) ||
        file.name.toLowerCase().includes(candidateLower)
      );
    }

    // File type filter
    if (filters.fileType) {
      filtered = filtered.filter(file => file.type === filters.fileType);
    }

    // Date range filter
    if (filters.dateRange) {
      const [startDate, endDate] = filters.dateRange;
      filtered = filtered.filter(file => {
        const fileDate = file.uploadedAt;
        return fileDate >= startDate && fileDate <= endDate;
      });
    }

    // Size range filter
    if (filters.sizeRange) {
      const [minSize, maxSize] = filters.sizeRange;
      filtered = filtered.filter(file => 
        file.size >= minSize && file.size <= maxSize
      );
    }

    // Has metadata filter
    if (filters.hasMetadata !== undefined) {
      filtered = filtered.filter(file => {
        const hasMetadata = !!(file.metadata.candidateName || file.metadata.position);
        return hasMetadata === filters.hasMetadata;
      });
    }

    this.filteredFiles = filtered;
    this.sortFiles(this.filteredFiles);
    
    return this.filteredFiles;
  }

  /**
   * Select files by indices (equivalent to Python interactive selection parsing)
   */
  selectByIndices(indices: number[]): UploadedFile[] {
    const selected: UploadedFile[] = [];
    
    for (const index of indices) {
      if (index >= 0 && index < this.filteredFiles.length) {
        selected.push(this.filteredFiles[index]);
      }
    }
    
    return selected;
  }

  /**
   * Select files by ID array
   */
  selectByIds(ids: string[]): UploadedFile[] {
    const idSet = new Set(ids);
    return this.filteredFiles.filter(file => idSet.has(file.id));
  }

  /**
   * Select all filtered files
   */
  selectAll(): UploadedFile[] {
    return [...this.filteredFiles];
  }

  /**
   * Parse selection string (e.g., "1,3,5-8" or "all")
   * Based on Python interactive_select parsing logic
   */
  parseSelectionString(selection: string): number[] {
    const indices: Set<number> = new Set();
    
    if (selection.toLowerCase() === 'all') {
      return Array.from({ length: this.filteredFiles.length }, (_, i) => i);
    }

    try {
      const parts = selection.split(',');
      
      for (const part of parts) {
        const trimmed = part.trim();
        
        if (trimmed.includes('-')) {
          // Range selection (e.g., "1-5")
          const [startStr, endStr] = trimmed.split('-');
          const start = parseInt(startStr) - 1; // Convert to 0-based
          const end = parseInt(endStr) - 1;
          
          for (let i = start; i <= end; i++) {
            if (i >= 0 && i < this.filteredFiles.length) {
              indices.add(i);
            }
          }
        } else {
          // Single selection
          const index = parseInt(trimmed) - 1; // Convert to 0-based
          if (index >= 0 && index < this.filteredFiles.length) {
            indices.add(index);
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse selection string:', error);
      return [];
    }

    return Array.from(indices).sort((a, b) => a - b);
  }

  /**
   * Get selection statistics
   */
  getSelectionStats(selectedFiles: UploadedFile[]): SelectionResult {
    return {
      selectedFiles,
      totalFiles: this.scannedFiles.length,
      filteredFiles: this.filteredFiles.length,
      selectionRate: this.filteredFiles.length > 0 
        ? selectedFiles.length / this.filteredFiles.length 
        : 0
    };
  }

  /**
   * Batch process selected files
   */
  async batchProcess<T>(
    selectedFiles: UploadedFile[],
    processor: (file: UploadedFile) => Promise<T>,
    options: BatchProcessOptions = {}
  ): Promise<{
    results: T[];
    errors: Array<{ file: UploadedFile; error: Error }>;
    processed: number;
    failed: number;
  }> {
    const {
      concurrency = 3,
      validateFiles = true,
      skipErrors = true
    } = options;

    const results: T[] = [];
    const errors: Array<{ file: UploadedFile; error: Error }> = [];

    // Validate files if requested
    if (validateFiles) {
      const validFiles = selectedFiles.filter(file => this.validateFile(file));
      if (validFiles.length !== selectedFiles.length) {
        console.warn(`${selectedFiles.length - validFiles.length} files failed validation`);
        selectedFiles = validFiles;
      }
    }

    // Process files with concurrency control
    const chunks = this.chunkArray(selectedFiles, concurrency);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (file) => {
        try {
          const result = await processor(file);
          results.push(result);
          return { success: true, file, result };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push({ file, error: err });
          
          if (!skipErrors) {
            throw err;
          }
          
          return { success: false, file, error: err };
        }
      });

      await Promise.all(promises);
    }

    return {
      results,
      errors,
      processed: results.length,
      failed: errors.length
    };
  }

  /**
   * Get file metadata summary
   */
  getMetadataSummary(): {
    totalFiles: number;
    fileTypes: Record<string, number>;
    candidatesCount: number;
    positionsCount: number;
    averageSize: number;
    dateRange: [Date, Date] | null;
  } {
    if (this.scannedFiles.length === 0) {
      return {
        totalFiles: 0,
        fileTypes: {},
        candidatesCount: 0,
        positionsCount: 0,
        averageSize: 0,
        dateRange: null
      };
    }

    const fileTypes: Record<string, number> = {};
    const candidates = new Set<string>();
    const positions = new Set<string>();
    let totalSize = 0;
    let minDate = this.scannedFiles[0].uploadedAt;
    let maxDate = this.scannedFiles[0].uploadedAt;

    for (const file of this.scannedFiles) {
      // File types
      fileTypes[file.type] = (fileTypes[file.type] || 0) + 1;
      
      // Candidates and positions
      if (file.metadata.candidateName) {
        candidates.add(file.metadata.candidateName);
      }
      if (file.metadata.position) {
        positions.add(file.metadata.position);
      }
      
      // Size
      totalSize += file.size;
      
      // Date range
      if (file.uploadedAt < minDate) minDate = file.uploadedAt;
      if (file.uploadedAt > maxDate) maxDate = file.uploadedAt;
    }

    return {
      totalFiles: this.scannedFiles.length,
      fileTypes,
      candidatesCount: candidates.size,
      positionsCount: positions.size,
      averageSize: totalSize / this.scannedFiles.length,
      dateRange: [minDate, maxDate]
    };
  }

  /**
   * Export selection results
   */
  exportSelection(selectedFiles: UploadedFile[], format: 'json' | 'csv' | 'txt' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(selectedFiles, null, 2);
      
      case 'csv':
        const headers = ['ID', 'Name', 'Type', 'Candidate', 'Position', 'Size', 'Upload Date'];
        const rows = selectedFiles.map(file => [
          file.id,
          file.name,
          file.type,
          file.metadata.candidateName || '',
          file.metadata.position || '',
          file.size.toString(),
          file.uploadedAt.toISOString()
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      case 'txt':
        return selectedFiles.map(file => 
          `${file.name} (${file.type}) - ${file.metadata.candidateName || 'Unknown'} - ${file.metadata.position || 'Unknown'}`
        ).join('\n');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get current filtered files
   */
  getFilteredFiles(): UploadedFile[] {
    return [...this.filteredFiles];
  }

  /**
   * Get current scanned files
   */
  getScannedFiles(): UploadedFile[] {
    return [...this.scannedFiles];
  }

  /**
   * Reset filters to show all scanned files
   */
  resetFilters(): UploadedFile[] {
    this.filteredFiles = [...this.scannedFiles];
    this.sortFiles(this.filteredFiles);
    return this.filteredFiles;
  }

  /**
   * Private helper methods
   */

  private sortFiles(files: UploadedFile[]): void {
    const { sortBy, sortOrder } = this.config;
    
    files.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private validateFile(file: UploadedFile): boolean {
    // Basic validation
    if (!file.id || !file.name || !file.content) {
      return false;
    }
    
    // Check file type
    if (this.config.fileTypes && !this.config.fileTypes.includes(file.metadata.extension)) {
      return false;
    }
    
    // Check content is not empty
    if (file.content.trim().length === 0) {
      return false;
    }
    
    return true;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}