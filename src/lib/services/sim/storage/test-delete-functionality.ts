/**
 * Test script to verify delete functionality
 */

import { FileManager } from './FileManager';
import { InterviewApiService } from '../../interviewApi';

export async function testDeleteFunctionality() {
  console.log('🧪 Testing delete functionality...');
  
  const fileManager = new FileManager();
  const apiService = new InterviewApiService();
  
  try {
    // Initialize services
    await fileManager.initialize();
    await apiService.initialize();
    
    // 1. Upload a test file
    console.log('📤 Step 1: Uploading test file...');
    const testContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是测试用户';
    const testFile = new File([testContent], 'test_delete_file.txt', {
      type: 'text/plain'
    });
    
    const uploadResult = await apiService.uploadFile(testFile, 'conversation');
    if (!uploadResult.success) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }
    
    const uploadedFile = uploadResult.data;
    console.log('✅ File uploaded:', uploadedFile.id);
    
    // 2. Verify file exists in database
    console.log('🔍 Step 2: Verifying file exists in database...');
    const filesBeforeDelete = await apiService.getFiles('conversation');
    const fileExists = filesBeforeDelete.data.some(f => f.id === uploadedFile.id);
    
    if (!fileExists) {
      throw new Error('File not found in database after upload');
    }
    console.log('✅ File exists in database');
    
    // 3. Delete the file using API
    console.log('🗑️ Step 3: Deleting file via API...');
    const deleteResult = await apiService.deleteFile(uploadedFile.id);
    
    if (!deleteResult.success) {
      throw new Error(`Delete failed: ${deleteResult.error}`);
    }
    console.log('✅ File deleted via API');
    
    // 4. Verify file is removed from database
    console.log('🔍 Step 4: Verifying file is removed from database...');
    const filesAfterDelete = await apiService.getFiles('conversation');
    const fileStillExists = filesAfterDelete.data.some(f => f.id === uploadedFile.id);
    
    if (fileStillExists) {
      throw new Error('File still exists in database after deletion');
    }
    console.log('✅ File successfully removed from database');
    
    // 5. Try to get the deleted file directly
    console.log('🔍 Step 5: Verifying file cannot be retrieved directly...');
    const getFileResult = await apiService.getFileContent(`files/${uploadedFile.id}`);
    
    if (getFileResult.success) {
      throw new Error('Deleted file can still be retrieved');
    }
    console.log('✅ Deleted file cannot be retrieved (expected behavior)');
    
    console.log('🎉 All delete functionality tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Delete functionality test failed:', error);
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testDeleteFunctionality = testDeleteFunctionality;
  
  console.log(`
🧪 Delete Functionality Test Loaded!

Run: await testDeleteFunctionality()
  `);
}