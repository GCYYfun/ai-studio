/**
 * Page-level Upload Test
 * 
 * Test upload functionality directly from the page
 */

export async function testPageUpload() {
  console.log('🖥️ Testing page-level upload functionality...');
  
  try {
    // Create a test file
    const testContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是页面测试用户，有3年工作经验';
    const testFile = new File([testContent], 'page_test_transcript.txt', {
      type: 'text/plain'
    });
    
    console.log('📄 Created test file:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // Import the interview API
    const { interview } = await import('../../interviewApi');
    console.log('📦 Imported interview API');
    
    // Test upload
    console.log('📤 Starting upload...');
    const uploadResult = await interview.uploadFile(testFile, 'conversation');
    
    console.log('📋 Upload result:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ Upload successful!');
      console.log('File ID:', uploadResult.data.id);
      console.log('File name:', uploadResult.data.name);
      console.log('File type:', uploadResult.data.type);
      console.log('Content preview:', uploadResult.data.content.substring(0, 100) + '...');
      
      // Test file retrieval
      console.log('\n📋 Testing file retrieval...');
      const filesResult = await interview.getFiles('conversation');
      
      if (filesResult.success) {
        console.log('✅ File retrieval successful!');
        console.log('Total files:', filesResult.data.length);
        console.log('Files:', filesResult.data.map(f => ({ id: f.id, name: f.name, type: f.type })));
      } else {
        console.error('❌ File retrieval failed:', filesResult.error);
      }
      
      return true;
    } else {
      console.error('❌ Upload failed:', uploadResult.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Page upload test failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return false;
  }
}

// Test with invalid content
export async function testInvalidContent() {
  console.log('🚫 Testing invalid content upload...');
  
  try {
    const invalidContent = '这是一个普通的文本文件，没有对话内容';
    const invalidFile = new File([invalidContent], 'invalid_content.txt', {
      type: 'text/plain'
    });
    
    const { interview } = await import('../../interviewApi');
    const result = await interview.uploadFile(invalidFile, 'conversation');
    
    if (result.success) {
      console.warn('⚠️ Invalid content was accepted (this should not happen)');
      console.log('Result:', result.data);
      return false;
    } else {
      console.log('✅ Invalid content correctly rejected:', result.error);
      return true;
    }
    
  } catch (error) {
    console.error('❌ Invalid content test failed:', error);
    return false;
  }
}

// Test file type validation
export async function testFileTypeValidation() {
  console.log('📁 Testing file type validation...');
  
  try {
    const invalidFile = new File(['test content'], 'test.xyz', {
      type: 'application/unknown'
    });
    
    const { interview } = await import('../../interviewApi');
    const result = await interview.uploadFile(invalidFile, 'conversation');
    
    if (result.success) {
      console.warn('⚠️ Invalid file type was accepted (this should not happen)');
      return false;
    } else {
      console.log('✅ Invalid file type correctly rejected:', result.error);
      return true;
    }
    
  } catch (error) {
    console.error('❌ File type validation test failed:', error);
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testPageUpload = testPageUpload;
  (window as any).testInvalidContent = testInvalidContent;
  (window as any).testFileTypeValidation = testFileTypeValidation;
  
  console.log(`
🖥️ Page Upload Test Tools Loaded!

Available functions:
- testPageUpload()         - 测试页面级上传功能
- testInvalidContent()     - 测试无效内容验证
- testFileTypeValidation() - 测试文件类型验证

Run these in browser console to test upload functionality.
  `);
}