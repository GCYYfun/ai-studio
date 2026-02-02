/**
 * Tests for FileManager Python logic compatibility
 * 
 * Verifies that TypeScript implementation matches Python FileParser behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from '../FileManager';

// Mock IndexedDB for test environment
const mockIndexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn(),
          delete: vi.fn(),
          put: vi.fn(),
          clear: vi.fn()
        }))
      }))
    }
  }))
};

// Mock global indexedDB
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

describe('FileManager Python Logic Compatibility', () => {
  let fileManager: FileManager;

  beforeEach(async () => {
    fileManager = new FileManager();
    
    // Mock the storage initialization
    vi.spyOn(fileManager['storage'], 'initialize').mockResolvedValue();
    vi.spyOn(fileManager['storage'], 'saveItem').mockResolvedValue();
    vi.spyOn(fileManager['storage'], 'getItem').mockResolvedValue(null);
    vi.spyOn(fileManager['storage'], 'getAllItems').mockResolvedValue([]);
    
    await fileManager.initialize();
  });

  describe('PDF file type detection', () => {
    it('should detect transcript PDF from filename', async () => {
      const transcriptContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是朱泽辉，有5年HR工作经验';
      const file = new File([transcriptContent], 'zhuzehui_hr_transcript_1.pdf', {
        type: 'application/pdf'
      });

      // Should not throw error for transcript PDF
      const result = await fileManager.uploadFile(file, 'conversation');
      expect(result).toBeDefined();
      expect(result.name).toBe('zhuzehui_hr_transcript_1.pdf');
    });

    it('should detect resume PDF from filename', async () => {
      const resumeContent = '# 简历\n姓名: 张三\n工作经验: 3年开发经验';
      const file = new File([resumeContent], 'zhangsan_resume.pdf', {
        type: 'application/pdf'
      });

      const result = await fileManager.uploadFile(file, 'resume');
      expect(result).toBeDefined();
      expect(result.name).toBe('zhangsan_resume.pdf');
    });

    it('should detect JD PDF from filename', async () => {
      const jdContent = '职位: 前端工程师\n要求: 3年以上经验';
      const file = new File([jdContent], 'frontend_jd.pdf', {
        type: 'application/pdf'
      });

      const result = await fileManager.uploadFile(file, 'jd');
      expect(result).toBeDefined();
      expect(result.name).toBe('frontend_jd.pdf');
    });

    it('should reject PDF without proper naming convention', async () => {
      const content = 'Some random content';
      const file = new File([content], 'random_file.pdf', {
        type: 'application/pdf'
      });

      await expect(fileManager.uploadFile(file, 'conversation'))
        .rejects.toThrow('未预期的PDF,请遵循命名规范,文件名携带 transcript, jd or resume');
    });
  });

  describe('transcript cleaning logic', () => {
    it('should clean transcript with proper speaker format', async () => {
      // Simulate raw transcript that needs cleaning
      const rawTranscript = `面试官 (00:01): 请介绍一下自己
这是一个很重要的问题
候选人 (00:15): 我是朱泽辉，
有5年HR工作经验
面试官 (01:30): 你对这个职位有什么了解？
候选人 (01:45): 我了解这是一个HR专员的职位`;

      const file = new File([rawTranscript], 'test_transcript.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'conversation');
      
      // Should merge continuation lines
      const lines = result.content.split('\n');
      expect(lines).toHaveLength(4); // 4 speaker turns
      expect(lines[0]).toBe('面试官 (00:01): 请介绍一下自己 这是一个很重要的问题');
      expect(lines[1]).toBe('候选人 (00:15): 我是朱泽辉， 有5年HR工作经验');
    });

    it('should handle different bracket types in timestamps', async () => {
      const transcript = `面试官 [00:01]: 请介绍一下自己
候选人 【00:15】: 我是张三
面试官 （01:30）： 很好
候选人 (01:45): 谢谢`;

      const file = new File([transcript], 'test_transcript.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'conversation');
      
      // All lines should be preserved as they have proper speaker format
      const lines = result.content.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toContain('面试官 [00:01]:');
      expect(lines[1]).toContain('候选人 【00:15】:');
      expect(lines[2]).toContain('面试官 （01:30）：');
      expect(lines[3]).toContain('候选人 (01:45):');
    });

    it('should handle different time formats', async () => {
      const transcript = `面试官 (0:01): 短格式
候选人 (00:15): 标准格式
面试官 (1:30:45): 长格式
候选人 (01:45:30): 完整格式`;

      const file = new File([transcript], 'test_transcript.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'conversation');
      
      const lines = result.content.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toContain('(0:01):');
      expect(lines[1]).toContain('(00:15):');
      expect(lines[2]).toContain('(1:30:45):');
      expect(lines[3]).toContain('(01:45:30):');
    });
  });

  describe('content validation', () => {
    it('should validate transcript content with timestamp patterns', async () => {
      const validTranscript = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是朱泽辉';
      const file = new File([validTranscript], 'test_transcript.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'conversation');
      expect(result).toBeDefined();
    });

    it('should validate resume content with proper keywords', async () => {
      const validResume = '# 简历\n姓名: 张三\n教育背景: 本科\n工作经验: 3年';
      const file = new File([validResume], 'test_resume.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'resume');
      expect(result).toBeDefined();
    });

    it('should validate JD content with job-related keywords', async () => {
      const validJD = '职位: 前端工程师\n要求: 本科以上学历\n职责: 负责前端开发工作';
      const file = new File([validJD], 'test_jd.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'jd');
      expect(result).toBeDefined();
    });

    it('should reject invalid content for conversation type', async () => {
      const invalidContent = 'This is just random text without any interview markers';
      const file = new File([invalidContent], 'test.txt', {
        type: 'text/plain'
      });

      await expect(fileManager.uploadFile(file, 'conversation'))
        .rejects.toThrow('Invalid content for file type: conversation');
    });
  });

  describe('metadata extraction', () => {
    it('should extract candidate name from transcript content', async () => {
      const transcript = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是朱泽辉，有5年经验';
      const file = new File([transcript], 'test_transcript.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'conversation');
      expect(result.metadata.candidateName).toBe('朱泽辉');
    });

    it('should extract candidate name from resume markdown format', async () => {
      const resume = '# 简历\n\n## 个人信息\n姓名: 张三\n年龄: 28';
      const file = new File([resume], 'test_resume.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'resume');
      expect(result.metadata.candidateName).toBe('张三');
    });

    it('should extract position from JD content', async () => {
      const jd = '职位: 前端工程师\n部门: 技术部\n要求: 3年以上经验';
      const file = new File([jd], 'test_jd.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(file, 'jd');
      expect(result.metadata.position).toBe('前端工程师');
    });
  });
});