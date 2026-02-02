/**
 * Debug Error Helper
 * 
 * Capture and display detailed error information
 */

export async function captureUploadError() {
  console.log('🔍 Capturing upload error details...');
  
  try {
    // Test basic API functionality first
    console.log('📋 Step 1: Testing API initialization...');
    const { interview } = await import('../../interviewApi');
    console.log('✅ API imported successfully');
    
    // Create test PDF file
    console.log('📋 Step 2: Creating test PDF file...');
    const pdfContent = new ArrayBuffer(1024);
    const pdfFile = new File([pdfContent], 'zhuzehui_hr_transcript_1.pdf', {
      type: 'application/pdf'
    });
    console.log('✅ Test PDF file created:', {
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type
    });
    
    // Attempt upload with detailed error capture
    console.log('📋 Step 3: Attempting upload with error capture...');
    
    try {
      const result = await interview.uploadFile(pdfFile, 'conversation');
      console.log('📋 Upload result:', result);
      
      if (result.success) {
        console.log('✅ Upload successful!');
        return true;
      } else {
        console.error('❌ Upload failed with API error:', result.error);
        return false;
      }
    } catch (uploadError) {
      console.error('❌ Upload threw exception:', uploadError);
      console.error('Error type:', typeof uploadError);
      console.error('Error constructor:', uploadError.constructor.name);
      
      if (uploadError instanceof Error) {
        console.error('Error message:', uploadError.message);
        console.error('Error stack:', uploadError.stack);
        
        // Check for specific error patterns
        if (uploadError.message.includes('PDF')) {
          console.error('🔍 This is a PDF-related error');
        }
        if (uploadError.message.includes('worker')) {
          console.error('🔍 This is a worker-related error');
        }
        if (uploadError.message.includes('fetch')) {
          console.error('🔍 This is a network/fetch error');
        }
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error capture failed:', error);
    return false;
  }
}

// Test individual components
export async function testComponents() {
  console.log('🧪 Testing individual components...');
  
  try {
    // Test FileManager directly
    console.log('📋 Testing FileManager...');
    const { FileManager } = await import('./FileManager');
    const fileManager = new FileManager();
    await fileManager.initialize();
    console.log('✅ FileManager initialized');
    
    // Test PDF.js import
    console.log('📋 Testing PDF.js import...');
    try {
      const pdfjs = await import('pdfjs-dist');
      console.log('✅ PDF.js imported:', {
        version: pdfjs.version || 'unknown',
        hasGetDocument: typeof pdfjs.getDocument === 'function',
        hasGlobalWorkerOptions: typeof pdfjs.GlobalWorkerOptions === 'object'
      });
    } catch (pdfError) {
      console.error('❌ PDF.js import failed:', pdfError);
    }
    
    // Test worker import
    console.log('📋 Testing PDF.js worker import...');
    try {
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
      console.log('✅ PDF.js worker imported:', typeof worker);
    } catch (workerError) {
      console.error('❌ PDF.js worker import failed:', workerError);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Component testing failed:', error);
    return false;
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).captureUploadError = captureUploadError;
  (window as any).testComponents = testComponents;
  
  console.log(`
🔍 Debug Error Tools Loaded!

Available functions:
- captureUploadError() - 捕获详细的上传错误信息
- testComponents()     - 测试各个组件的加载情况

Run these to get detailed error information.
  `);
}