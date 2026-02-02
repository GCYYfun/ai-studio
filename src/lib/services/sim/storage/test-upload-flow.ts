/**
 * Test the complete upload flow from UI to storage
 */

import { FileManager } from './FileManager';
import { interviewApi } from '$lib/services/interviewApi';

export async function testCompleteUploadFlow() {
  console.log('🔄 Testing complete upload flow...');
  
  try {
    // Test 1: Direct FileManager upload
    console.log('\n1️⃣ Testing direct FileManager upload...');
    const fileManager = new FileManager();
    await fileManager.initialize();
    
    // Create test PDF content
    const testPDFContent = `面试官 (00:01): 请介绍一下自己
候选人 (00:15): 我是朱泽辉，有5年HR工作经验，主要负责招聘和员工关系管理
面试官 (01:30): 你对这个HR专员职位有什么了解？
候选人 (01:45): 我了解这个职位主要负责招聘流程管理、员工入职培训等工作`;
    
    const mockFile = new File([testPDFContent], 'zhuzehui_hr_transcript_1.pdf', {
      type: 'application/pdf'
    });
    
    const directResult = await fileManager.uploadFile(mockFile, 'conversation');
    console.log('✅ Direct upload successful:', {
      id: directResult.id,
      name: directResult.name,
      metadata: directResult.metadata
    });
    
    // Test 2: API service upload
    console.log('\n2️⃣ Testing API service upload...');
    try {
      const apiResult = await interviewApi.uploadFile(mockFile, 'conversation');
      console.log('✅ API upload successful:', {
        id: apiResult.id,
        name: apiResult.name,
        metadata: apiResult.metadata
      });
    } catch (apiError) {
      console.error('❌ API upload failed:', apiError);
    }
    
    // Test 3: Verify storage consistency
    console.log('\n3️⃣ Testing storage consistency...');
    const storedFiles = await fileManager.getFiles('conversation');
    console.log(`✅ Found ${storedFiles.length} conversation files in storage`);
    
    // Test 4: Test different file types
    console.log('\n4️⃣ Testing different file types...');
    
    // Resume test
    const resumeContent = `# 简历 - Resume

## 个人信息
姓名: 朱泽辉
职位: HR专员

## 工作经验
- 5年HR工作经验
- 熟悉招聘流程和员工关系管理`;
    
    const resumeFile = new File([resumeContent], 'zhuzehui_resume.pdf', {
      type: 'application/pdf'
    });
    
    const resumeResult = await fileManager.uploadFile(resumeFile, 'resume');
    console.log('✅ Resume upload successful:', resumeResult.name);
    
    // JD test
    const jdContent = `职位描述 - Job Description
职位: HR专员
要求: 本科以上学历，3年以上HR工作经验
职责: 负责招聘、培训、员工关系管理等工作`;
    
    const jdFile = new File([jdContent], 'hr_specialist_jd.pdf', {
      type: 'application/pdf'
    });
    
    const jdResult = await fileManager.uploadFile(jdFile, 'jd');
    console.log('✅ JD upload successful:', jdResult.name);
    
    // Test 5: Verify all files
    console.log('\n5️⃣ Final verification...');
    const allFiles = await fileManager.getFiles();
    console.log(`✅ Total files in storage: ${allFiles.length}`);
    
    allFiles.forEach(file => {
      console.log(`  - ${file.name} (${file.type}): ${file.content.length} chars`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Upload flow test failed:', error);
    return false;
  }
}

// Browser test runner
export function runUploadFlowTest() {
  if (typeof window !== 'undefined') {
    console.log('🌐 Running complete upload flow test...');
    testCompleteUploadFlow().then(success => {
      if (success) {
        console.log('🎉 Complete upload flow test passed!');
      } else {
        console.log('💥 Upload flow test failed');
      }
    });
  } else {
    console.log('⚠️ Browser environment required for upload flow test');
  }
}

// Debug helper
export function debugUploadIssue() {
  console.log('🔍 Debugging upload issue...');
  console.log('Environment check:');
  console.log('- Window:', typeof window !== 'undefined');
  console.log('- FileReader:', typeof FileReader !== 'undefined');
  console.log('- IndexedDB:', typeof indexedDB !== 'undefined');
  
  if (typeof window !== 'undefined') {
    console.log('- PDF.js available:', typeof window.pdfjsLib !== 'undefined');
  }
}