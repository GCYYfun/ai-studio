/**
 * Debug utilities for file management
 * 
 * Browser console functions for testing and debugging file upload functionality
 */

import { FileManager } from './FileManager';
import { InteractiveSelector } from './InteractiveSelector';
import { DatabaseManager } from './database-manager';
import { testDeleteFunctionality } from './test-delete-functionality';
import './browser-upload-test';
import './trace-upload-flow';
import './page-upload-test';
import './test-pdf-fix';
import './debug-error';
import './test-resume-llm';
import { debugUploadIssue, runUploadDebug } from './debug-upload-issue';
import { testPDFJSWorker, runPDFJSTest } from './test-pdfjs-worker';
import { testCompleteUploadFlow, runUploadFlowTest } from './test-upload-flow';
import { testPDFUploadFix, runPDFUploadTest } from './test-pdf-upload-fix';

// Initialize services
const fileManager = new FileManager();
const selector = new InteractiveSelector();
const dbManager = new DatabaseManager();

/**
 * Debug file upload functionality
 */
export async function debugFileUpload() {
  console.log('🔍 Starting file upload debug...');
  
  try {
    await fileManager.initialize();
    
    // Test text file upload
    const textContent = '面试官 (00:01): 请介绍一下自己\n候选人 (00:15): 我是朱泽辉，有5年HR工作经验';
    const textFile = new File([textContent], 'zhuzehui_hr_transcript_1.txt', { 
      type: 'text/plain' 
    });
    
    console.log('📄 Testing text file upload...');
    const textResult = await fileManager.uploadFile(textFile, 'conversation');
    console.log('✅ Text upload successful:', textResult);
    
    // Test file retrieval
    console.log('📋 Testing file retrieval...');
    const files = await fileManager.getFiles('conversation');
    console.log('📁 Found files:', files.length);
    
    // Test file statistics
    console.log('📊 Getting file statistics...');
    const stats = await fileManager.getStatistics();
    console.log('📈 Statistics:', stats);
    
    return { textResult, files, stats };
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return null;
  }
}

/**
 * Debug PDF upload functionality
 */
export async function debugPDFUpload() {
  console.log('🔍 Starting PDF upload debug...');
  
  try {
    await fileManager.initialize();
    
    // Create a simple PDF-like content for testing
    const pdfContent = new ArrayBuffer(1024);
    const pdfFile = new File([pdfContent], 'zhuzehui_hr_transcript_1.pdf', {
      type: 'application/pdf'
    });
    
    console.log('📄 Testing PDF file upload...');
    const pdfResult = await fileManager.uploadFile(pdfFile, 'conversation');
    console.log('✅ PDF upload successful:', pdfResult);
    
    return pdfResult;
  } catch (error) {
    console.error('❌ PDF debug failed:', error);
    return null;
  }
}

/**
 * Debug file selection functionality
 */
export async function debugFileSelection() {
  console.log('🔍 Starting file selection debug...');
  
  try {
    await selector.initialize();
    
    // Scan files
    console.log('📋 Scanning files...');
    const scannedFiles = await selector.scan();
    console.log('📁 Scanned files:', scannedFiles.length);
    
    // Test filtering
    console.log('🔍 Testing file filtering...');
    const filterCriteria: any = { fileType: 'conversation' };
    const filteredFiles = await selector.filter(filterCriteria);
    console.log('💬 Filtered files:', filteredFiles.length);
    
    // Test advanced filtering
    if (filteredFiles.length > 0) {
      console.log('🎯 Testing advanced filtering...');
      const advancedResult = await selector.advancedFilter({
        search: '朱泽辉',
        fileType: 'conversation'
      });
      console.log('✅ Advanced filter result:', advancedResult.length);
    }
    
    return { scannedFiles, filteredFiles };
  } catch (error) {
    console.error('❌ Selection debug failed:', error);
    return null;
  }
}

/**
 * Debug database management
 */
export async function debugDatabase() {
  console.log('🔍 Starting database debug...');
  
  try {
    console.log('📊 Getting database info...');
    const info = await dbManager.getDatabaseInfo();
    console.log('🗄️ Database info:', info);
    
    console.log('💾 Getting storage usage...');
    const usage = await dbManager.getStorageUsage();
    console.log('📈 Storage usage:', usage);
    
    return { info, usage };
  } catch (error) {
    console.error('❌ Database debug failed:', error);
    return null;
  }
}

/**
 * Clean up all test data
 */
export async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    const result = await dbManager.clearAllData();
    if (result) {
      console.log('✅ All test data cleaned up');
    } else {
      console.log('❌ Failed to clean up test data');
    }
    return result;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return false;
  }
}

// Export to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).debugFileUpload = debugFileUpload;
  (window as any).debugPDFUpload = debugPDFUpload;
  (window as any).debugFileSelection = debugFileSelection;
  (window as any).debugDatabase = debugDatabase;
  (window as any).cleanupTestData = cleanupTestData;
  (window as any).testDeleteFunctionality = testDeleteFunctionality;
  (window as any).debugUploadIssue = debugUploadIssue;
  (window as any).runUploadDebug = runUploadDebug;
  (window as any).testPDFJSWorker = testPDFJSWorker;
  (window as any).runPDFJSTest = runPDFJSTest;
  (window as any).testCompleteUploadFlow = testCompleteUploadFlow;
  (window as any).runUploadFlowTest = runUploadFlowTest;
  (window as any).testPDFUploadFix = testPDFUploadFix;
  (window as any).runPDFUploadTest = runPDFUploadTest;
  
  // Database management shortcuts
  (window as any).fileManager = fileManager;
  (window as any).selector = selector;
  (window as any).dbManager = dbManager;
  
  console.log(`
🛠️ File Management Debug Tools Loaded!

File Testing:
- debugFileUpload()     - 测试文件上传功能
- debugPDFUpload()      - 测试PDF上传功能  
- debugFileSelection()  - 测试文件选择功能
- debugDatabase()       - 查看数据库状态
- cleanupTestData()     - 清理测试数据
- testDeleteFunctionality() - 测试删除功能

New Upload Tests:
- runUploadDebug()      - 诊断上传问题
- runPDFJSTest()        - 测试PDF.js工作器
- runUploadFlowTest()   - 测试完整上传流程
- runPDFUploadTest()    - 测试PDF上传修复

Database Management:
- showDB()              - 查看数据库信息
- clearFiles()          - 清除所有文件
- clearAllDB()          - 清除所有数据
- deleteDB()            - 永久删除数据库
- exportDB()            - 导出数据库备份
- storageUsage()        - 查看存储使用情况

Direct Access:
- fileManager           - 文件管理器
- selector              - 文件选择器
- dbManager             - 数据库管理器
  `);
}