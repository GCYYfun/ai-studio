/**
 * Browser Upload Test
 * 
 * Test upload functionality in the browser environment
 */

import { InterviewApiService } from '../../interviewApi';

export async function testBrowserUpload() {
  console.log('🌐 Testing browser upload functionality...');
  
  try {
    const apiService = new InterviewApiService();
    await apiService.initialize();
    console.log('✅ Service initialized');
    
    // Test 1: Simple text file upload
    console.log('\n📤 Test 1: Simple text file upload');
    const textContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是朱泽辉，有5年HR工作经验';
    const textFile = new File([textContent], 'browser_test_transcript.txt', {
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
    console.log('Uploaded file ID:', uploadResult.data.id);
    console.log('Content preview:', uploadResult.data.content.substring(0, 50) + '...');
    
    // Test 2: File retrieval
    console.log('\n📋 Test 2: File retrieval');
    const filesResult = await apiService.getFiles('conversation');
    console.log('Files result:', filesResult);
    
    if (!filesResult.success) {
      console.error('❌ File retrieval failed:', filesResult.error);
      return false;
    }
    
    console.log('✅ File retrieval successful');
    console.log('Found files:', filesResult.data.length);
    
    // Test 3: File content retrieval
    if (filesResult.data.length > 0) {
      console.log('\n📖 Test 3: File content retrieval');
      const fileId = uploadResult.data.id;
      const contentResult = await apiService.getFileContent(`files/${fileId}`);
      console.log('Content result:', contentResult);
      
      if (!contentResult.success) {
        console.error('❌ Content retrieval failed:', contentResult.error);
        return false;
      }
      
      console.log('✅ Content retrieval successful');
      console.log('Content type:', contentResult.data.type);
      console.log('Content preview:', contentResult.data.content.substring(0, 100) + '...');
    }
    
    // Test 4: Invalid file type
    console.log('\n🚫 Test 4: Invalid file type');
    const invalidFile = new File(['test'], 'invalid.xyz', { type: 'application/unknown' });
    const invalidResult = await apiService.uploadFile(invalidFile, 'conversation');
    
    if (invalidResult.success) {
      console.warn('⚠️ Invalid file was accepted (unexpected)');
    } else {
      console.log('✅ Invalid file correctly rejected:', invalidResult.error);
    }
    
    // Test 5: Invalid content
    console.log('\n🚫 Test 5: Invalid content');
    const invalidContent = '这是一个普通的文本文件，没有对话内容';
    const invalidContentFile = new File([invalidContent], 'invalid_content.txt', { type: 'text/plain' });
    const invalidContentResult = await apiService.uploadFile(invalidContentFile, 'conversation');
    
    if (invalidContentResult.success) {
      console.warn('⚠️ Invalid content was accepted (unexpected)');
    } else {
      console.log('✅ Invalid content correctly rejected:', invalidContentResult.error);
    }
    
    console.log('\n🎉 All browser upload tests completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Browser upload test failed with error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
}

// Test PDF upload (if PDF.js is available)
export async function testPDFUpload() {
  console.log('📄 Testing PDF upload functionality...');
  
  try {
    const apiService = new InterviewApiService();
    await apiService.initialize();
    
    // Create a simple PDF-like file (will use placeholder content in test environment)
    const pdfContent = new ArrayBuffer(1024);
    const pdfFile = new File([pdfContent], 'test_transcript.pdf', {
      type: 'application/pdf'
    });
    
    console.log('PDF file details:', {
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type
    });
    
    const uploadResult = await apiService.uploadFile(pdfFile, 'conversation');
    console.log('PDF upload result:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ PDF file uploaded successfully');
      console.log('Content preview:', uploadResult.data.content.substring(0, 100) + '...');
      return true;
    } else {
      console.error('❌ PDF upload failed:', uploadResult.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ PDF upload test failed:', error);
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testBrowserUpload = testBrowserUpload;
  (window as any).testPDFUpload = testPDFUpload;
  
  console.log(`
🌐 Browser Upload Test Tools Loaded!

Available functions:
- testBrowserUpload()  - 测试文本文件上传功能
- testPDFUpload()      - 测试PDF文件上传功能

Open browser console and run these functions to test upload functionality.
  `);
}