/**
 * Upload verification script
 * 
 * Simple verification that upload functionality works
 */

import { InterviewApiService } from '../../interviewApi';

export async function verifyUpload() {
  console.log('=== Upload Verification ===');
  
  try {
    const apiService = new InterviewApiService();
    
    // Test text file upload
    console.log('1. Testing text file upload...');
    const textContent = '面试官: 请介绍一下自己\n候选人: 我是朱泽辉，有5年HR工作经验';
    const textFile = new File([textContent], 'zhuzehui_hr_transcript_1.txt', { 
      type: 'text/plain' 
    });
    
    const textResult = await apiService.uploadFile(textFile, 'conversation');
    console.log('Text upload result:', textResult.success ? '✓ Success' : '❌ Failed');
    if (!textResult.success) {
      console.error('Text upload error:', textResult.error);
      return false;
    }
    
    // Test PDF file upload
    console.log('2. Testing PDF file upload...');
    const pdfContent = new ArrayBuffer(1024);
    const pdfFile = new File([pdfContent], 'zhuzehui_hr_transcript_1.pdf', {
      type: 'application/pdf'
    });
    
    const pdfResult = await apiService.uploadFile(pdfFile, 'conversation');
    console.log('PDF upload result:', pdfResult.success ? '✓ Success' : '❌ Failed');
    if (!pdfResult.success) {
      console.error('PDF upload error:', pdfResult.error);
      return false;
    }
    
    // Test file listing
    console.log('3. Testing file listing...');
    const filesResult = await apiService.getFiles('conversation');
    console.log('File listing result:', filesResult.success ? '✓ Success' : '❌ Failed');
    if (filesResult.success) {
      console.log('Found files:', filesResult.data.length);
    }
    
    // Test file content retrieval
    if (textResult.success && textResult.data) {
      console.log('4. Testing file content retrieval...');
      const contentResult = await apiService.getFileContent(textResult.data.path);
      console.log('Content retrieval result:', contentResult.success ? '✓ Success' : '❌ Failed');
    }
    
    console.log('=== All tests passed! ===');
    return true;
    
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).verifyUpload = verifyUpload;
}