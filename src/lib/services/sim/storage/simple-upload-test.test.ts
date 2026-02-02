/**
 * Simple upload test without complex dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from './FileManager';

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

describe('Simple Upload Test', () => {
  let fileManager: FileManager;
  let mockFiles: any[] = [];

  beforeEach(async () => {
    fileManager = new FileManager();
    mockFiles = []; // Reset mock files
    
    // Mock the storage methods
    vi.spyOn(fileManager['storage'], 'initialize').mockResolvedValue();
    vi.spyOn(fileManager['storage'], 'saveItem').mockImplementation(async (storeName, id, data) => {
      mockFiles.push(data);
    });
    vi.spyOn(fileManager['storage'], 'clearStore').mockImplementation(async () => {
      mockFiles = [];
    });
    vi.spyOn(fileManager['storage'], 'getAllItems').mockImplementation(async () => {
      return mockFiles;
    });
    
    await fileManager.initialize();
    await fileManager.clearAllFiles();
  });

  it('should upload a text file successfully', async () => {
    // Create a simple text file
    const textContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是朱泽辉，有5年HR工作经验';
    const textFile = new File([textContent], 'test_transcript.txt', {
      type: 'text/plain'
    });

    console.log('📤 Uploading text file...');
    console.log('File details:', {
      name: textFile.name,
      size: textFile.size,
      type: textFile.type
    });

    const uploadedFile = await fileManager.uploadFile(textFile, 'conversation');
    console.log('Upload result:', uploadedFile);

    expect(uploadedFile).toBeDefined();
    expect(uploadedFile.name).toBe('test_transcript.txt');
    expect(uploadedFile.type).toBe('conversation');
    expect(uploadedFile.content).toContain('面试官');
    expect(uploadedFile.content).toContain('朱泽辉');
  });

  it('should retrieve uploaded files', async () => {
    // First upload a file
    const textContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是测试用户';
    const textFile = new File([textContent], 'test_file.txt', {
      type: 'text/plain'
    });

    const uploadedFile = await fileManager.uploadFile(textFile, 'conversation');
    expect(uploadedFile).toBeDefined();

    // Then retrieve files
    const files = await fileManager.getFiles('conversation');
    console.log('Retrieved files:', files);

    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
    expect(files[0].name).toBe('test_file.txt');
  });

  it('should handle invalid file types', async () => {
    const invalidFile = new File(['test'], 'test.xyz', { type: 'application/unknown' });
    
    await expect(fileManager.uploadFile(invalidFile, 'conversation')).rejects.toThrow('Unsupported file type');
  });

  it('should handle large files', async () => {
    const largeContent = 'x'.repeat(15 * 1024 * 1024); // 15MB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
    
    await expect(fileManager.uploadFile(largeFile, 'conversation')).rejects.toThrow('File size exceeds limit');
  });

  it('should clean transcript content properly', async () => {
    const messyTranscript = `面试官 (00:01): 请介绍一下自己
这是一个续行
候选人 (00:15): 我是朱泽辉，
有5年HR工作经验
面试官 (01:30): 你对这个职位有什么了解？`;

    const textFile = new File([messyTranscript], 'messy_transcript.txt', {
      type: 'text/plain'
    });

    const uploadedFile = await fileManager.uploadFile(textFile, 'conversation');
    console.log('Cleaned content:', uploadedFile.content);

    // Should merge continuation lines
    expect(uploadedFile.content).toContain('面试官 (00:01): 请介绍一下自己 这是一个续行');
    expect(uploadedFile.content).toContain('候选人 (00:15): 我是朱泽辉， 有5年HR工作经验');
  });

  it('should validate conversation content', async () => {
    // Valid conversation content
    const validContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是测试用户';
    const validFile = new File([validContent], 'valid_transcript.txt', {
      type: 'text/plain'
    });

    const uploadedFile = await fileManager.uploadFile(validFile, 'conversation');
    expect(uploadedFile).toBeDefined();

    // Invalid conversation content (no interview keywords)
    const invalidContent = '这是一个普通的文本文件，没有面试内容';
    const invalidFile = new File([invalidContent], 'invalid.txt', {
      type: 'text/plain'
    });

    await expect(fileManager.uploadFile(invalidFile, 'conversation')).rejects.toThrow('Invalid content for file type: conversation');
  });
});