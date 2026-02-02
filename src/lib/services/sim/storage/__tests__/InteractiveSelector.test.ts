/**
 * InteractiveSelector Tests
 * 
 * Tests for the InteractiveSelector service class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractiveSelector } from '../InteractiveSelector';
import { FileManager } from '../FileManager';
import type { UploadedFile } from '../../types';

// Mock FileManager
vi.mock('../FileManager');

describe('InteractiveSelector', () => {
  let selector: InteractiveSelector;
  let mockFileManager: any;

  const mockFiles: UploadedFile[] = [
    {
      id: 'file1',
      name: 'john_doe_java_developer_interview.txt',
      type: 'conversation',
      content: 'Interview content for Java developer position',
      metadata: {
        candidateName: 'John Doe',
        position: 'Java Developer',
        originalName: 'john_doe_java_developer_interview.txt',
        extension: '.txt'
      },
      uploadedAt: new Date('2024-01-01'),
      size: 1024
    },
    {
      id: 'file2',
      name: 'jane_smith_frontend_interview.txt',
      type: 'conversation',
      content: 'Interview content for Frontend position',
      metadata: {
        candidateName: 'Jane Smith',
        position: 'Frontend Developer',
        originalName: 'jane_smith_frontend_interview.txt',
        extension: '.txt'
      },
      uploadedAt: new Date('2024-01-02'),
      size: 2048
    },
    {
      id: 'file3',
      name: 'bob_wilson_resume.pdf',
      type: 'resume',
      content: 'Resume content for Bob Wilson',
      metadata: {
        candidateName: 'Bob Wilson',
        position: 'Backend Developer',
        originalName: 'bob_wilson_resume.pdf',
        extension: '.pdf'
      },
      uploadedAt: new Date('2024-01-03'),
      size: 4096
    }
  ];

  beforeEach(() => {
    mockFileManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getFiles: vi.fn().mockResolvedValue(mockFiles),
      filterFiles: vi.fn().mockImplementation((criteria) => {
        return Promise.resolve(mockFiles.filter(file => {
          if (criteria.candidate) {
            return file.metadata.candidateName?.toLowerCase().includes(criteria.candidate.toLowerCase());
          }
          if (criteria.jd) {
            return file.metadata.position?.toLowerCase().includes(criteria.jd.toLowerCase());
          }
          return true;
        }));
      })
    };

    (FileManager as any).mockImplementation(() => mockFileManager);
    selector = new InteractiveSelector();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await selector.initialize();
      expect(mockFileManager.initialize).toHaveBeenCalled();
    });
  });

  describe('scan', () => {
    it('should scan and return all files', async () => {
      const files = await selector.scan();
      expect(files).toHaveLength(3);
      expect(files[0].name).toBe('bob_wilson_resume.pdf'); // Sorted by name
      expect(mockFileManager.getFiles).toHaveBeenCalledWith(undefined);
    });

    it('should scan files by type', async () => {
      await selector.scan('conversation');
      expect(mockFileManager.getFiles).toHaveBeenCalledWith('conversation');
    });
  });

  describe('filter', () => {
    it('should filter files by candidate name', async () => {
      const filtered = await selector.filter({ candidate: 'john' });
      expect(mockFileManager.filterFiles).toHaveBeenCalledWith({ candidate: 'john' });
    });

    it('should filter files by JD', async () => {
      const filtered = await selector.filter({ jd: 'java' });
      expect(mockFileManager.filterFiles).toHaveBeenCalledWith({ jd: 'java' });
    });
  });

  describe('selection parsing', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should parse single selection', () => {
      const indices = selector.parseSelectionString('1');
      expect(indices).toEqual([0]); // 1-based to 0-based conversion
    });

    it('should parse multiple selections', () => {
      const indices = selector.parseSelectionString('1,3');
      expect(indices).toEqual([0, 2]);
    });

    it('should parse range selections', () => {
      const indices = selector.parseSelectionString('1-3');
      expect(indices).toEqual([0, 1, 2]);
    });

    it('should parse "all" selection', () => {
      const indices = selector.parseSelectionString('all');
      expect(indices).toEqual([0, 1, 2]);
    });

    it('should handle invalid selections gracefully', () => {
      const indices = selector.parseSelectionString('invalid');
      expect(indices).toEqual([]);
    });
  });

  describe('selection by indices', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should select files by indices', () => {
      const selected = selector.selectByIndices([0, 2]);
      expect(selected).toHaveLength(2);
      expect(selected[0].name).toBe('bob_wilson_resume.pdf'); // First in alphabetical order
      expect(selected[1].name).toBe('john_doe_java_developer_interview.txt'); // Third in alphabetical order
    });

    it('should handle out-of-bounds indices', () => {
      const selected = selector.selectByIndices([0, 10]);
      expect(selected).toHaveLength(1);
      expect(selected[0].name).toBe('bob_wilson_resume.pdf');
    });
  });

  describe('selection by IDs', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should select files by IDs', () => {
      const selected = selector.selectByIds(['file1', 'file3']);
      expect(selected).toHaveLength(2);
      // Order depends on filtered files order (alphabetical), not input order
      expect(selected.map(f => f.id).sort()).toEqual(['file1', 'file3']);
    });
  });

  describe('select all', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should select all filtered files', () => {
      const selected = selector.selectAll();
      expect(selected).toHaveLength(3);
    });
  });

  describe('advanced filtering', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should filter by search text', async () => {
      const filtered = await selector.advancedFilter({ search: 'java' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata.position).toBe('Java Developer');
    });

    it('should filter by file type', async () => {
      const filtered = await selector.advancedFilter({ fileType: 'resume' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('resume');
    });

    it('should filter by size range', async () => {
      const filtered = await selector.advancedFilter({ sizeRange: [2000, 5000] });
      expect(filtered).toHaveLength(2); // files with size 2048 and 4096
    });

    it('should filter by date range', async () => {
      const filtered = await selector.advancedFilter({ 
        dateRange: [new Date('2024-01-01'), new Date('2024-01-02')] 
      });
      expect(filtered).toHaveLength(2); // first two files
    });
  });

  describe('metadata summary', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should generate metadata summary', () => {
      const summary = selector.getMetadataSummary();
      expect(summary.totalFiles).toBe(3);
      expect(summary.fileTypes).toEqual({
        conversation: 2,
        resume: 1
      });
      expect(summary.candidatesCount).toBe(3);
      expect(summary.positionsCount).toBe(3);
      expect(summary.averageSize).toBe((1024 + 2048 + 4096) / 3);
    });
  });

  describe('export selection', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should export selection as JSON', () => {
      const selected = selector.selectByIds(['file1']);
      const exported = selector.exportSelection(selected, 'json');
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('file1');
    });

    it('should export selection as CSV', () => {
      const selected = selector.selectByIds(['file1']);
      const exported = selector.exportSelection(selected, 'csv');
      expect(exported).toContain('ID,Name,Type,Candidate,Position,Size,Upload Date');
      expect(exported).toContain('file1,john_doe_java_developer_interview.txt');
    });

    it('should export selection as TXT', () => {
      const selected = selector.selectByIds(['file1']);
      const exported = selector.exportSelection(selected, 'txt');
      expect(exported).toContain('john_doe_java_developer_interview.txt (conversation) - John Doe - Java Developer');
    });
  });

  describe('batch processing', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should process files in batches', async () => {
      const selected = selector.selectAll();
      const processor = vi.fn().mockResolvedValue('processed');
      
      const result = await selector.batchProcess(selected, processor, { concurrency: 2 });
      
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    it('should handle processing errors', async () => {
      const selected = selector.selectAll();
      const processor = vi.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce('success');
      
      const result = await selector.batchProcess(selected, processor, { skipErrors: true });
      
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.message).toBe('Processing failed');
    });
  });

  describe('selection statistics', () => {
    beforeEach(async () => {
      await selector.scan();
    });

    it('should calculate selection statistics', () => {
      const selected = selector.selectByIndices([0, 1]);
      const stats = selector.getSelectionStats(selected);
      
      expect(stats.selectedFiles).toHaveLength(2);
      expect(stats.totalFiles).toBe(3);
      expect(stats.filteredFiles).toBe(3);
      expect(stats.selectionRate).toBeCloseTo(2/3);
    });
  });
});