/**
 * Upload diagnosis script
 * 
 * Diagnose upload issues step by step
 */

import { InterviewApiService } from '../../interviewApi';

export async function diagnoseUpload() {
  console.log('🔍 Diagnosing upload issues...');
  
  const apiService = new InterviewApiService();
  
  try {
    // Step 1: Test service initialization
    console.log('📋 Step 1: Testing service initialization...');
    await apiService.initialize();
    console.log('✅ Service initialized successfully');
    
    // Step 2: Test simple text file upload
    console.log('📤 Step 2: Testing simple text file upload...');
    const textContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是测试用户';
    const textFile = new File([textContent], 'test_upload.txt', {
      type: 'text/plain'
    });
    
    console.log('File details:', {
      name: textFile.name,
      size: textFile.size,
      type: textFile.type
    });
    
    const uploadResult = await apiService.uploadFile(textFile, 'conversation');
    console.log('Upload result:', uploadResult);
    
    if (!uploadResult.success) {
      console.error('❌ Upload failed:', uploadResult.error);
      return false;
    }
    
    console.log('✅ Text file uploaded successfully');
    
    // Step 3: Test file retrieval
    console.log('📋 Step 3: Testing file retrieval...');
    const filesResult = await apiService.getFiles('conversation');
    console.log('Files result:', filesResult);
    
    if (!filesResult.success) {
      console.error('❌ File retrieval failed:', filesResult.error);
      return false;
    }
    
    console.log('✅ Files retrieved successfully');
    console.log('Found files:', filesResult.data.length);
    
    // Step 4: Test PDF upload
    console.log('📤 Step 4: Testing PDF upload...');
    const pdfContent = new ArrayBuffer(1024);
    const pdfFile = new File([pdfContent], 'test_transcript.pdf', {
      type: 'application/pdf'
    });
    
    console.log('PDF file details:', {
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type
    });
    
    const pdfUploadResult = await apiService.uploadFile(pdfFile, 'conversation');
    console.log('PDF upload result:', pdfUploadResult);
    
    if (!pdfUploadResult.success) {
      console.error('❌ PDF upload failed:', pdfUploadResult.error);
      return false;
    }
    
    console.log('✅ PDF file uploaded successfully');
    
    // Step 5: Test file content retrieval
    console.log('📋 Step 5: Testing file content retrieval...');
    const contentResult = await apiService.getFileContent(`files/${uploadResult.data.id}`);
    console.log('Content result:', contentResult);
    
    if (!contentResult.success) {
      console.error('❌ Content retrieval failed:', contentResult.error);
      return false;
    }
    
    console.log('✅ File content retrieved successfully');
    
    console.log('🎉 All upload diagnosis tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Upload diagnosis failed with error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
}

// Test specific error scenarios
export async function testErrorScenarios() {
  console.log('🧪 Testing error scenarios...');
  
  const apiService = new InterviewApiService();
  
  try {
    await apiService.initialize();
    
    // Test 1: Invalid file type
    console.log('🔍 Test 1: Invalid file type...');
    const invalidFile = new File(['test'], 'test.xyz', { type: 'application/unknown' });
    const invalidResult = await apiService.uploadFile(invalidFile, 'conversation');
    
    if (invalidResult.success) {
      console.warn('⚠️ Invalid file was accepted (unexpected)');
    } else {
      console.log('✅ Invalid file correctly rejected:', invalidResult.error);
    }
    
    // Test 2: Empty file
    console.log('🔍 Test 2: Empty file...');
    const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
    const emptyResult = await apiService.uploadFile(emptyFile, 'conversation');
    
    if (emptyResult.success) {
      console.warn('⚠️ Empty file was accepted (might be expected)');
    } else {
      console.log('✅ Empty file rejected:', emptyResult.error);
    }
    
    // Test 3: Large file
    console.log('🔍 Test 3: Large file...');
    const largeContent = 'x'.repeat(15 * 1024 * 1024); // 15MB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
    const largeResult = await apiService.uploadFile(largeFile, 'conversation');
    
    if (largeResult.success) {
      console.warn('⚠️ Large file was accepted (unexpected)');
    } else {
      console.log('✅ Large file correctly rejected:', largeResult.error);
    }
    
    console.log('🎉 Error scenario tests completed');
    return true;
    
  } catch (error) {
    console.error('❌ Error scenario testing failed:', error);
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).diagnoseUpload = diagnoseUpload;
  (window as any).testErrorScenarios = testErrorScenarios;
  
  console.log(`
🔍 Upload Diagnosis Tools Loaded!

Available functions:
- diagnoseUpload()      - 完整上传诊断测试
- testErrorScenarios()  - 测试错误场景
  `);
}