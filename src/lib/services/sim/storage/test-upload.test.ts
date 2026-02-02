/**
 * Upload functionality test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InterviewApiService } from '../../interviewApi';

describe('Upload Functionality', () => {
  let apiService: InterviewApiService;

  beforeEach(async () => {
    apiService = new InterviewApiService();
    await apiService.initialize();
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

    const uploadResult = await apiService.uploadFile(textFile, 'conversation');
    console.log('Upload result:', uploadResult);

    expect(uploadResult.success).toBe(true);
    expect(uploadResult.data).toBeDefined();
    expect(uploadResult.data.name).toBe('test_transcript.txt');
    expect(uploadResult.data.type).toBe('conversation');
  });

  it('should retrieve uploaded files', async () => {
    // First upload a file
    const textContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是测试用户';
    const textFile = new File([textContent], 'test_file.txt', {
      type: 'text/plain'
    });

    const uploadResult = await apiService.uploadFile(textFile, 'conversation');
    expect(uploadResult.success).toBe(true);

    // Then retrieve files
    const filesResult = await apiService.getFiles('conversation');
    console.log('Files result:', filesResult);

    expect(filesResult.success).toBe(true);
    expect(filesResult.data).toBeDefined();
    expect(Array.isArray(filesResult.data)).toBe(true);
    expect(filesResult.data.length).toBeGreaterThan(0);
  });

  it('should retrieve file content', async () => {
    // First upload a file
    const textContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是内容测试用户';
    const textFile = new File([textContent], 'content_test.txt', {
      type: 'text/plain'
    });

    const uploadResult = await apiService.uploadFile(textFile, 'conversation');
    expect(uploadResult.success).toBe(true);

    // Then retrieve content
    const contentResult = await apiService.getFileContent(`files/${uploadResult.data.id}`);
    console.log('Content result:', contentResult);

    expect(contentResult.success).toBe(true);
    expect(contentResult.data).toBeDefined();
    expect(contentResult.data.content).toContain('面试官');
    expect(contentResult.data.content).toContain('内容测试用户');
  });

  it('should handle invalid file types', async () => {
    const invalidFile = new File(['test'], 'test.xyz', { type: 'application/unknown' });
    
    const uploadResult = await apiService.uploadFile(invalidFile, 'conversation');
    console.log('Invalid file upload result:', uploadResult);

    expect(uploadResult.success).toBe(false);
    expect(uploadResult.error).toBeDefined();
    expect(uploadResult.error).toContain('Unsupported file type');
  });

  it('should handle large files', async () => {
    const largeContent = 'x'.repeat(15 * 1024 * 1024); // 15MB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
    
    const uploadResult = await apiService.uploadFile(largeFile, 'conversation');
    console.log('Large file upload result:', uploadResult);

    expect(uploadResult.success).toBe(false);
    expect(uploadResult.error).toBeDefined();
    expect(uploadResult.error).toContain('File size exceeds limit');
  });
});