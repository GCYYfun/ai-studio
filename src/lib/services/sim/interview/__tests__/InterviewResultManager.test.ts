/**
 * Tests for InterviewResultManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InterviewResultManager } from '../InterviewResultManager';
import type { InterviewResult, ConversationMessage, InterviewMetadata } from '../../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn(),
  length: 0,
  clear: vi.fn()
};

// Mock global localStorage
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('InterviewResultManager', () => {
  let manager: InterviewResultManager;
  let mockResult: InterviewResult;

  beforeEach(() => {
    manager = new InterviewResultManager();
    vi.clearAllMocks();

    // Create mock interview result
    const mockMessages: ConversationMessage[] = [
      {
        role: 'interviewer',
        content: 'Hello, can you introduce yourself?',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        turn: 1
      },
      {
        role: 'candidate',
        content: 'Hi, I am John Doe, a software engineer.',
        timestamp: new Date('2024-01-01T10:01:00Z'),
        turn: 1
      }
    ];

    const mockMetadata: InterviewMetadata = {
      candidateName: 'John Doe',
      position: 'Software Engineer',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T10:05:00Z'),
      totalTurns: 1,
      endedByInterviewer: true,
      config: {
        jd: 'Software Engineer position',
        resume: 'John Doe resume',
        maxTurns: 20,
        interviewerModel: 'test-model',
        candidateModel: 'test-model'
      }
    };

    mockResult = {
      sessionId: 'test-session-123',
      messages: mockMessages,
      metadata: mockMetadata,
      status: 'completed'
    };
  });

  describe('saveResult', () => {
    it('should save result and return ID', async () => {
      const id = await manager.saveResult(mockResult);
      
      expect(id).toBeDefined();
      expect(id).toMatch(/^result_\d+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should save result with tags', async () => {
      const tags = ['important', 'senior-role'];
      const id = await manager.saveResult(mockResult, tags);
      
      const saved = manager.getSavedResult(id);
      expect(saved?.tags).toEqual(tags);
    });
  });

  describe('exportResult', () => {
    it('should export to JSON format', () => {
      const exported = manager.exportResult(mockResult, { format: 'json' });
      const parsed = JSON.parse(exported);
      
      expect(parsed.sessionId).toBe(mockResult.sessionId);
      expect(parsed.messages).toHaveLength(2);
      expect(parsed.status).toBe('completed');
    });

    it('should export to TXT format', () => {
      const exported = manager.exportResult(mockResult, { 
        format: 'txt',
        includeMetadata: true 
      });
      
      expect(exported).toContain('面试记录');
      expect(exported).toContain('John Doe');
      expect(exported).toContain('Software Engineer');
      expect(exported).toContain('面试官');
      expect(exported).toContain('候选人');
    });

    it('should export to Markdown format', () => {
      const exported = manager.exportResult(mockResult, { 
        format: 'md',
        includeMetadata: true 
      });
      
      expect(exported).toContain('# 面试记录');
      expect(exported).toContain('## 基本信息');
      expect(exported).toContain('🎯 面试官');
      expect(exported).toContain('👤 候选人');
    });

    it('should export to CSV format', () => {
      const exported = manager.exportResult(mockResult, { format: 'csv' });
      
      expect(exported).toContain('Turn,Role,Content');
      expect(exported).toContain('1,interviewer');
      expect(exported).toContain('1,candidate');
    });
  });

  describe('formatConversationForDisplay', () => {
    it('should format messages for display', () => {
      const formatted = manager.formatConversationForDisplay(mockResult.messages);
      
      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toHaveProperty('id');
      expect(formatted[0]).toHaveProperty('role', 'interviewer');
      expect(formatted[0]).toHaveProperty('content');
      expect(formatted[0]).toHaveProperty('timestamp');
    });
  });

  describe('getConversationStats', () => {
    it('should calculate conversation statistics', () => {
      const stats = manager.getConversationStats(mockResult.messages);
      
      expect(stats.totalMessages).toBe(2);
      expect(stats.interviewerMessages).toBe(1);
      expect(stats.candidateMessages).toBe(1);
      expect(stats.averageMessageLength).toBeGreaterThan(0);
      expect(stats.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('generateExportFilename', () => {
    it('should generate proper filename', () => {
      const filename = manager.generateExportFilename(mockResult, 'json');
      
      expect(filename).toMatch(/^interview_John_Doe_\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('createDownloadableFile', () => {
    it('should create blob with correct content and type', () => {
      const content = 'test content';
      const blob = manager.createDownloadableFile(content, 'test.txt', 'text/plain');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain');
      expect(blob.size).toBe(content.length);
    });
  });
});