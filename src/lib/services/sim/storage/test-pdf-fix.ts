/**
 * Test PDF Fix
 * 
 * Test PDF upload after fixing version mismatch
 */

export async function testPDFFix() {
  console.log('📄 Testing PDF upload after worker fix...');
  
  try {
    // Import the interview API
    const { interview } = await import('../../interviewApi');
    console.log('📦 Imported interview API');
    
    // Create a test PDF file (will use placeholder content in browser)
    const pdfContent = new ArrayBuffer(2048); // Larger buffer for more realistic test
    const pdfFile = new File([pdfContent], 'test_transcript_fix.pdf', {
      type: 'application/pdf'
    });
    
    console.log('📄 Created test PDF file:', {
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type
    });
    
    // Test upload
    console.log('📤 Starting PDF upload with worker fix...');
    const uploadResult = await interview.uploadFile(pdfFile, 'conversation');
    
    console.log('📋 PDF upload result:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ PDF upload successful after worker fix!');
      console.log('File ID:', uploadResult.data.id);
      console.log('File name:', uploadResult.data.name);
      console.log('File type:', uploadResult.data.type);
      console.log('Content preview:', uploadResult.data.content.substring(0, 200) + '...');
      
      // Test file retrieval
      console.log('\n📋 Testing PDF file retrieval...');
      const filesResult = await interview.getFiles('conversation');
      
      if (filesResult.success) {
        console.log('✅ PDF file retrieval successful!');
        const pdfFiles = filesResult.data.filter(f => f.name.endsWith('.pdf'));
        console.log('PDF files found:', pdfFiles.length);
        console.log('PDF files:', pdfFiles.map(f => ({ id: f.id, name: f.name })));
      } else {
        console.error('❌ PDF file retrieval failed:', filesResult.error);
      }
      
      return true;
    } else {
      console.error('❌ PDF upload still failed after worker fix:', uploadResult.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ PDF fix test failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return false;
  }
}

// Test with real PDF file name pattern
export async function testRealPDFPattern() {
  console.log('📄 Testing with real PDF file name pattern...');
  
  try {
    const { interview } = await import('../../interviewApi');
    
    // Create a test PDF with realistic filename
    const pdfContent = new ArrayBuffer(1024);
    const pdfFile = new File([pdfContent], 'zhuzehui_hr_transcript_1.pdf', {
      type: 'application/pdf'
    });
    
    console.log('📄 Created realistic PDF file:', {
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type
    });
    
    const uploadResult = await interview.uploadFile(pdfFile, 'conversation');
    console.log('📋 Realistic PDF upload result:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ Realistic PDF upload successful!');
      console.log('Extracted metadata:', uploadResult.data.metadata);
      console.log('Content preview:', uploadResult.data.content.substring(0, 100) + '...');
      return true;
    } else {
      console.error('❌ Realistic PDF upload failed:', uploadResult.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Realistic PDF test failed:', error);
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testPDFFix = testPDFFix;
  (window as any).testRealPDFPattern = testRealPDFPattern;
  
  console.log(`
📄 PDF Fix Test Tools Loaded!

Available functions:
- testPDFFix()         - 测试PDF版本修复
- testRealPDFPattern() - 测试真实PDF文件名模式

Run these in browser console to test PDF upload fix.
  `);
}