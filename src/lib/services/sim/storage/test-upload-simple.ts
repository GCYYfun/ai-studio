/**
 * Simple upload test script
 */

import { InterviewApiService } from '../../interviewApi';

export async function testSimpleUpload() {
  console.log('🧪 Testing simple upload functionality...');
  
  try {
    const apiService = new InterviewApiService();
    await apiService.initialize();
    console.log('✅ Service initialized');
    
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
    
    if (uploadResult.success) {
      console.log('✅ Upload successful!');
      console.log('Uploaded file:', uploadResult.data);
      
      // Test file retrieval
      console.log('📋 Testing file retrieval...');
      const filesResult = await apiService.getFiles('conversation');
      console.log('Files result:', filesResult);
      
      if (filesResult.success) {
        console.log('✅ File retrieval successful!');
        console.log('Found files:', filesResult.data.length);
        
        // Test file content retrieval
        if (filesResult.data.length > 0) {
          const fileId = filesResult.data[0].id;
          console.log('📖 Testing content retrieval for file:', fileId);
          
          const contentResult = await apiService.getFileContent(`files/${fileId}`);
          console.log('Content result:', contentResult);
          
          if (contentResult.success) {
            console.log('✅ Content retrieval successful!');
            console.log('Content preview:', contentResult.data.content.substring(0, 100) + '...');
          } else {
            console.error('❌ Content retrieval failed:', contentResult.error);
          }
        }
      } else {
        console.error('❌ File retrieval failed:', filesResult.error);
      }
    } else {
      console.error('❌ Upload failed:', uploadResult.error);
    }
    
    return uploadResult.success;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testSimpleUpload = testSimpleUpload;
  console.log('🧪 Simple upload test loaded! Run: testSimpleUpload()');
}