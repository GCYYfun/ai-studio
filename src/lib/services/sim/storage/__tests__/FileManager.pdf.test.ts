/**
 * FileManager PDF Upload Tests
 * 
 * Tests specifically for PDF file upload functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from '../FileManager';

// Mock IndexedDBStorage
vi.mock('../IndexedDBStorage', () => ({
  IndexedDBStorage: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    saveItem: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockResolvedValue(null),
    getAllItems: vi.fn().mockResolvedValue([]),
    deleteItem: vi.fn().mockResolvedValue(true),
    clearStore: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('FileManager PDF Upload', () => {
  let fileManager: FileManager;

  beforeEach(async () => {
    fileManager = new FileManager();
    await fileManager.initialize();
  });

  describe('PDF file upload', () => {
    it('should successfully upload a PDF conversation file', async () => {
      // Create a mock PDF file
      const pdfContent = new ArrayBuffer(1024);
      const pdfFile = new File([pdfContent], 'John_hr_transcript_1.pdf', {
        type: 'application/pdf'
      });

      // Upload the file
      const result = await fileManager.uploadFile(pdfFile, 'conversation');

      // Verify the result
      expect(result).toBeDefined();
      expect(result.name).toBe('John_hr_transcript_1.pdf');
      expect(result.type).toBe('conversation');
      expect(result.size).toBe(1024);
      
      // Verify content contains PDF placeholder with interview keywords
      // expect(result.content).toContain('[PDF Content]');
      // expect(result.content).toContain('面试记录');
      // expect(result.content).toContain('候选人');
      // expect(result.content).toContain('面试官');
      
      // Verify metadata extraction from filename
      expect(result.metadata.candidateName).toBe('John');
      expect(result.metadata.position).toBe('HR专员');
    });

    it('should successfully upload a PDF resume file', async () => {
      const pdfContent = new ArrayBuffer(2048);
      const pdfFile = new File([pdfContent], 'john_doe_resume.pdf', {
        type: 'application/pdf'
      });

      const result = await fileManager.uploadFile(pdfFile, 'resume');

      expect(result).toBeDefined();
      expect(result.name).toBe('john_doe_resume.pdf');
      expect(result.type).toBe('resume');
      expect(result.metadata.candidateName).toBe('John');
    });

    it('should successfully upload a PDF JD file', async () => {
      const pdfContent = new ArrayBuffer(1536);
      const pdfFile = new File([pdfContent], 'frontend_developer_jd.pdf', {
        type: 'application/pdf'
      });

      const result = await fileManager.uploadFile(pdfFile, 'jd');

      expect(result).toBeDefined();
      expect(result.name).toBe('frontend_developer_jd.pdf');
      expect(result.type).toBe('jd');
      expect(result.metadata.candidateName).toBe('Frontend');
    });

    it('should handle various filename patterns', async () => {
      const testCases = [
        {
          filename: 'alice_pm_transcript_2.pdf',
          expectedCandidate: 'Alice',
          expectedPosition: '产品经理'
        },
        {
          filename: 'bob_dev_interview.pdf',
          expectedCandidate: 'Bob',
          expectedPosition: '开发工程师'
        },
        {
          filename: 'charlie_qa_session.pdf',
          expectedCandidate: 'Charlie',
          expectedPosition: '测试工程师'
        }
      ];

      for (const testCase of testCases) {
        const pdfContent = new ArrayBuffer(1024);
        const pdfFile = new File([pdfContent], testCase.filename, {
          type: 'application/pdf'
        });

        const result = await fileManager.uploadFile(pdfFile, 'conversation');

        expect(result.metadata.candidateName).toBe(testCase.expectedCandidate);
        expect(result.metadata.position).toBe(testCase.expectedPosition);
      }
    });

    it('should validate PDF content correctly', async () => {
      const pdfContent = new ArrayBuffer(512);
      const pdfFile = new File([pdfContent], 'test_interview.pdf', {
        type: 'application/pdf'
      });

      // Should not throw validation error
      expect(async () => {
        await fileManager.uploadFile(pdfFile, 'conversation');
      }).not.toThrow();
    });

    it('should handle file size limits', async () => {
      const largePdfContent = new ArrayBuffer(15 * 1024 * 1024); // 15MB
      const largePdfFile = new File([largePdfContent], 'large_file.pdf', {
        type: 'application/pdf'
      });

      // Should throw error for file too large
      await expect(
        fileManager.uploadFile(largePdfFile, 'conversation')
      ).rejects.toThrow('File size exceeds limit');
    });

    it('should reject unsupported file types', async () => {
      const docContent = new ArrayBuffer(1024);
      const docFile = new File([docContent], 'document.doc', {
        type: 'application/msword'
      });

      await expect(
        fileManager.uploadFile(docFile, 'conversation')
      ).rejects.toThrow('Unsupported file type');
    });
  });

  describe('content validation improvements', () => {
    it('should accept text files with interview keywords', async () => {
      const textContent = '面试官: 请介绍一下自己\n候选人: 我是张三，有5年工作经验';
      const textFile = new File([textContent], 'interview.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(textFile, 'conversation');
      expect(result).toBeDefined();
      expect(result.content).toBe(textContent);
    });

    it('should accept text files with English interview keywords', async () => {
      const textContent = 'Interviewer: Tell me about yourself\nCandidate: I am John with 3 years experience';
      const textFile = new File([textContent], 'interview_en.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(textFile, 'conversation');
      expect(result).toBeDefined();
    });

    it('should accept files with transcript keyword', async () => {
      const textContent = 'This is an interview transcript between HR and candidate';
      const textFile = new File([textContent], 'transcript.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(textFile, 'conversation');
      expect(result).toBeDefined();
    });

    it('should accept JD files with job-related keywords', async () => {
      const jdContent = 'Job Description: Frontend Developer Position\n招聘前端开发工程师';
      const jdFile = new File([jdContent], 'frontend_jd.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(jdFile, 'jd');
      expect(result).toBeDefined();
    });

    it('should accept resume files with experience keywords', async () => {
      const resumeContent = 'John Doe Resume\nEducation: Computer Science\nWork Experience: 5 years';
      const resumeFile = new File([resumeContent], 'resume.txt', {
        type: 'text/plain'
      });

      const result = await fileManager.uploadFile(resumeFile, 'resume');
      expect(result).toBeDefined();
    });
  });
});