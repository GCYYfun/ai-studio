/**
 * Debug script to identify upload issues
 */

import { FileManager } from './FileManager';

export async function debugUploadIssue() {
  console.log('🔍 Debugging upload issue...');
  
  // Environment check
  console.log('\n📋 Environment Check:');
  console.log('- Window:', typeof window !== 'undefined');
  console.log('- FileReader:', typeof FileReader !== 'undefined');
  console.log('- IndexedDB:', typeof indexedDB !== 'undefined');
  console.log('- PDF.js available:', typeof window !== 'undefined' && 'pdfjsLib' in window);
  
  if (typeof window === 'undefined') {
    console.log('⚠️ Not in browser environment, skipping upload test');
    return;
  }
  
  try {
    // Test 1: Initialize FileManager
    console.log('\n1️⃣ Testing FileManager initialization...');
    const fileManager = new FileManager();
    await fileManager.initialize();
    console.log('✅ FileManager initialized successfully');
    
    // Test 2: Create test file
    console.log('\n2️⃣ Creating test file...');
    const testContent = `面试官 (00:01): 请介绍一下自己
候选人 (00:15): 我是朱泽辉，有5年HR工作经验
面试官 (01:30): 你对这个职位有什么了解？
候选人 (01:45): 我了解这是一个HR专员的职位`;
    
    const testFile = new File([testContent], 'zhuzehui_hr_transcript_1.pdf', {
      type: 'application/pdf'
    });
    
    console.log('✅ Test file created:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // Test 3: File validation
    console.log('\n3️⃣ Testing file validation...');
    const isValidType = testFile.name.toLowerCase().endsWith('.pdf');
    const isValidSize = testFile.size <= 10 * 1024 * 1024;
    console.log('- Valid type:', isValidType);
    console.log('- Valid size:', isValidSize);
    
    // Test 4: Upload attempt
    console.log('\n4️⃣ Testing file upload...');
    try {
      const result = await fileManager.uploadFile(testFile, 'conversation');
      console.log('✅ Upload successful:', {
        id: result.id,
        name: result.name,
        type: result.type,
        contentLength: result.content.length,
        metadata: result.metadata
      });
      
      // Test 5: Verify storage
      console.log('\n5️⃣ Verifying storage...');
      const storedFile = await fileManager.getFile(result.id);
      if (storedFile) {
        console.log('✅ File found in storage:', storedFile.name);
      } else {
        console.log('❌ File not found in storage');
      }
      
      // Test 6: List all files
      console.log('\n6️⃣ Listing all files...');
      const allFiles = await fileManager.getFiles();
      console.log(`✅ Found ${allFiles.length} files in storage`);
      
      return true;
      
    } catch (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      
      // Detailed error analysis
      console.log('\n🔍 Error Analysis:');
      console.log('- Error type:', uploadError.constructor.name);
      console.log('- Error message:', uploadError.message);
      
      if (uploadError.message.includes('PDF')) {
        console.log('- This appears to be a PDF parsing error');
        console.log('- Checking PDF.js availability...');
        
        try {
          const pdfjs = await import('pdfjs-dist');
          console.log('✅ PDF.js imported successfully');
          console.log('- Version:', pdfjs.version);
        } catch (pdfError) {
          console.error('❌ PDF.js import failed:', pdfError);
        }
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return false;
  }
}

// Browser console helper
export function runUploadDebug() {
  if (typeof window !== 'undefined') {
    console.log('🌐 Running upload debug in browser...');
    debugUploadIssue().then(success => {
      if (success) {
        console.log('🎉 Upload debug completed successfully!');
      } else {
        console.log('💥 Upload debug found issues');
      }
    });
  } else {
    console.log('⚠️ Browser environment required for upload debug');
  }
}

// Auto-run helper message
if (typeof window !== 'undefined') {
  console.log('📋 Upload debug ready. Call runUploadDebug() to test.');
}