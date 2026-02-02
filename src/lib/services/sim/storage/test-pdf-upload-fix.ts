/**
 * Test PDF upload functionality after fixing worker import issues
 */

import { FileManager } from './FileManager';

export async function testPDFUploadFix() {
  console.log('🧪 Testing PDF upload functionality after fixes...');
  
  try {
    const fileManager = new FileManager();
    await fileManager.initialize();
    
    // Create a mock PDF file for testing
    const mockPDFContent = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
      0x0A, 0x25, 0xC4, 0xE5, 0xF2, 0xE5, 0xEB, 0xA7, 0xF3, 0xA0, 0xD0, 0xC4, 0xC6, 0x0A
    ]);
    
    const mockFile = new File([mockPDFContent], 'zhuzehui_hr_transcript_1.pdf', {
      type: 'application/pdf'
    });
    
    console.log('📄 Created mock PDF file:', mockFile.name, mockFile.size, 'bytes');
    
    // Test transcript upload
    try {
      const result = await fileManager.uploadFile(mockFile, 'conversation');
      console.log('✅ PDF transcript upload successful:', {
        id: result.id,
        name: result.name,
        type: result.type,
        contentLength: result.content.length,
        metadata: result.metadata
      });
      
      // Verify content was processed
      if (result.content.includes('面试官') || result.content.includes('候选人')) {
        console.log('✅ Content properly processed with interview format');
      } else {
        console.log('ℹ️ Content processed but no interview format detected');
      }
      
      return true;
    } catch (uploadError) {
      console.error('❌ PDF upload failed:', uploadError);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    return false;
  }
}

// Browser test function
export function runPDFUploadTest() {
  if (typeof window !== 'undefined') {
    console.log('🌐 Running PDF upload test in browser...');
    testPDFUploadFix().then(success => {
      if (success) {
        console.log('🎉 PDF upload test completed successfully!');
      } else {
        console.log('💥 PDF upload test failed');
      }
    });
  } else {
    console.log('⚠️ Browser environment required for PDF upload test');
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  // Don't auto-run, let user call manually
  console.log('📋 PDF upload test ready. Call runPDFUploadTest() to test.');
}