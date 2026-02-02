/**
 * Upload Flow Tracer
 * 
 * Trace the complete upload flow from UI to storage
 */

import { InterviewApiService } from '../../interviewApi';

export async function traceUploadFlow() {
  console.log('🔍 Tracing upload flow from UI to storage...');
  
  try {
    // Step 1: Test API Service initialization
    console.log('\n📋 Step 1: Testing API Service initialization');
    const apiService = new InterviewApiService();
    console.log('API Service created:', apiService);
    
    await apiService.initialize();
    console.log('✅ API Service initialized');
    
    // Step 2: Test FileManager initialization
    console.log('\n📋 Step 2: Testing FileManager initialization');
    const fileManager = (apiService as any).fileManager;
    console.log('FileManager instance:', fileManager);
    
    if (!fileManager) {
      console.error('❌ FileManager not initialized');
      return false;
    }
    
    // Step 3: Test storage initialization
    console.log('\n📋 Step 3: Testing storage initialization');
    const storage = fileManager.storage;
    console.log('Storage instance:', storage);
    console.log('Storage DB:', storage.db);
    
    // Step 4: Test file creation
    console.log('\n📋 Step 4: Testing file creation');
    const testContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是测试用户';
    const testFile = new File([testContent], 'trace_test.txt', {
      type: 'text/plain'
    });
    
    console.log('Test file created:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type,
      lastModified: testFile.lastModified
    });
    
    // Step 5: Test file parsing (indirectly through upload)
    console.log('\n📋 Step 5: Testing file parsing (indirectly)');
    console.log('File parsing will be tested as part of upload process');
    
    // Step 6: Test content validation (indirectly)
    console.log('\n📋 Step 6: Testing content validation (indirectly)');
    console.log('Content validation will be tested as part of upload process');
    
    // Step 7: Test full upload process
    console.log('\n📋 Step 7: Testing full upload process');
    const uploadResult = await apiService.uploadFile(testFile, 'conversation');
    console.log('Upload result:', uploadResult);
    
    if (!uploadResult.success) {
      console.error('❌ Upload failed:', uploadResult.error);
      return false;
    }
    
    console.log('✅ Upload successful');
    console.log('Uploaded file ID:', uploadResult.data.id);
    
    // Step 8: Test file retrieval
    console.log('\n📋 Step 8: Testing file retrieval');
    const filesResult = await apiService.getFiles('conversation');
    console.log('Files retrieval result:', filesResult);
    
    if (!filesResult.success) {
      console.error('❌ File retrieval failed:', filesResult.error);
      return false;
    }
    
    console.log('✅ File retrieval successful');
    console.log('Retrieved files count:', filesResult.data.length);
    
    // Step 9: Test database state
    console.log('\n📋 Step 9: Testing database state');
    try {
      const allFiles = await storage.getAllItems('files');
      console.log('All files in database:', allFiles.length);
      console.log('Files:', allFiles);
    } catch (error) {
      console.error('❌ Database query failed:', error);
    }
    
    console.log('\n🎉 Upload flow trace completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Upload flow trace failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
}

// Test UI component integration
export async function traceUIFlow() {
  console.log('🖥️ Tracing UI component flow...');
  
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      console.log('⚠️ Not in browser environment, skipping UI trace');
      return false;
    }
    
    // Check for document store
    console.log('\n📋 Checking document store...');
    const { documentStore } = await import('$lib/stores/interview');
    console.log('Document store:', documentStore);
    
    // Check current documents
    let currentDocs: any[] = [];
    documentStore.documents.subscribe(docs => {
      currentDocs = docs;
    });
    
    console.log('Current documents in store:', currentDocs.length);
    console.log('Documents:', currentDocs);
    
    // Check upload progress
    let currentProgress: any = {};
    documentStore.uploadProgress.subscribe(progress => {
      currentProgress = progress;
    });
    
    console.log('Current upload progress:', currentProgress);
    
    return true;
    
  } catch (error) {
    console.error('❌ UI flow trace failed:', error);
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).traceUploadFlow = traceUploadFlow;
  (window as any).traceUIFlow = traceUIFlow;
  
  console.log(`
🔍 Upload Flow Tracer Loaded!

Available functions:
- traceUploadFlow()  - 追踪完整上传流程
- traceUIFlow()      - 追踪UI组件流程

Run these in browser console to debug upload issues.
  `);
}