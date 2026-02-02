/**
 * Example usage of FileManager and InteractiveSelector
 * 
 * This demonstrates how to use the file management services together
 */

import { FileManager } from './FileManager';
import { InteractiveSelector } from './InteractiveSelector';
import type { UploadedFile } from '../types';

/**
 * Example: Upload files and use interactive selector
 */
export async function exampleFileManagement() {
  // Initialize services
  const fileManager = new FileManager();
  const selector = new InteractiveSelector({
    sortBy: 'date',
    sortOrder: 'desc'
  });

  await fileManager.initialize();
  await selector.initialize();

  console.log('=== File Management Example ===');

  // Example 1: Upload files (in a real app, these would come from user uploads)
  console.log('\n1. Uploading example files...');
  
  // Simulate file uploads
  const mockFiles = [
    new File(['JD content for Java Developer position'], 'java_developer_jd.txt', { type: 'text/plain' }),
    new File(['Resume content for John Doe'], 'john_doe_resume.pdf', { type: 'application/pdf' }),
    new File(['Interview transcript between interviewer and John Doe'], 'john_doe_java_interview.txt', { type: 'text/plain' })
  ];

  const uploadedFiles: UploadedFile[] = [];
  for (const file of mockFiles) {
    try {
      const uploaded = await fileManager.uploadFile(
        file, 
        file.name.includes('jd') ? 'jd' : 
        file.name.includes('resume') ? 'resume' : 'conversation'
      );
      uploadedFiles.push(uploaded);
      console.log(`✓ Uploaded: ${uploaded.name} (${uploaded.type})`);
    } catch (error) {
      console.error(`✗ Failed to upload ${file.name}:`, error);
    }
  }

  // Example 2: Scan files with selector
  console.log('\n2. Scanning files with selector...');
  const scannedFiles = await selector.scan();
  console.log(`Found ${scannedFiles.length} files:`);
  scannedFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name} (${file.type}) - ${file.metadata.candidateName || 'Unknown'}`);
  });

  // Example 3: Filter files
  console.log('\n3. Filtering files...');
  const javaFiles = await selector.filter({ jd: 'java' });
  console.log(`Files related to Java: ${javaFiles.length}`);
  javaFiles.forEach(file => {
    console.log(`  - ${file.name}: ${file.metadata.position || 'No position'}`);
  });

  // Example 4: Advanced filtering
  console.log('\n4. Advanced filtering...');
  const recentFiles = await selector.advancedFilter({
    dateRange: [new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()], // Last 24 hours
    hasMetadata: true
  });
  console.log(`Recent files with metadata: ${recentFiles.length}`);

  // Example 5: Selection parsing
  console.log('\n5. Selection parsing examples...');
  const allFiles = selector.getFilteredFiles();
  
  // Parse different selection formats
  const selections = ['1', '1,3', '1-2', 'all'];
  for (const selection of selections) {
    const indices = selector.parseSelectionString(selection);
    const selected = selector.selectByIndices(indices);
    console.log(`Selection "${selection}" -> ${selected.length} files: ${selected.map(f => f.name).join(', ')}`);
  }

  // Example 6: Batch processing
  console.log('\n6. Batch processing example...');
  const selectedFiles = selector.selectAll();
  
  const result = await selector.batchProcess(
    selectedFiles,
    async (file) => {
      // Simulate processing (e.g., analysis)
      await new Promise(resolve => setTimeout(resolve, 100));
      return `Processed ${file.name}`;
    },
    { concurrency: 2 }
  );

  console.log(`Batch processing results:`);
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Results: ${result.results.join(', ')}`);

  // Example 7: Metadata summary
  console.log('\n7. Metadata summary...');
  const summary = selector.getMetadataSummary();
  console.log(`Total files: ${summary.totalFiles}`);
  console.log(`File types:`, summary.fileTypes);
  console.log(`Candidates: ${summary.candidatesCount}`);
  console.log(`Positions: ${summary.positionsCount}`);
  console.log(`Average size: ${Math.round(summary.averageSize)} bytes`);

  // Example 8: Export selection
  console.log('\n8. Export examples...');
  const exportFiles = selector.selectByIndices([0, 1]);
  
  const jsonExport = selector.exportSelection(exportFiles, 'json');
  console.log(`JSON export length: ${jsonExport.length} characters`);
  
  const csvExport = selector.exportSelection(exportFiles, 'csv');
  console.log(`CSV export:\n${csvExport.split('\n').slice(0, 2).join('\n')}...`);

  // Example 9: File statistics
  console.log('\n9. File statistics...');
  const stats = await fileManager.getStatistics();
  console.log(`Storage statistics:`);
  console.log(`  Total files: ${stats.totalFiles}`);
  console.log(`  Total size: ${stats.totalSize} bytes`);
  console.log(`  Files by type:`, stats.filesByType);
  console.log(`  Recent files: ${stats.recentFiles.length}`);

  console.log('\n=== Example completed ===');
  
  return {
    uploadedFiles,
    scannedFiles,
    filteredFiles: javaFiles,
    batchResult: result,
    summary,
    stats
  };
}

/**
 * Example: Interactive file selection workflow
 */
export async function exampleInteractiveWorkflow() {
  const selector = new InteractiveSelector();
  await selector.initialize();

  console.log('=== Interactive Workflow Example ===');

  // Step 1: Scan files
  const files = await selector.scan();
  console.log(`\nStep 1: Found ${files.length} files`);

  // Step 2: Apply filters
  const filtered = await selector.advancedFilter({
    search: 'interview',
    fileType: 'conversation'
  });
  console.log(`\nStep 2: After filtering: ${filtered.length} files`);

  // Step 3: Show selection options (simulated)
  console.log('\nStep 3: Available files for selection:');
  filtered.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name} - ${file.metadata.candidateName || 'Unknown'} (${file.metadata.position || 'Unknown position'})`);
  });

  // Step 4: Simulate user selection
  const userSelection = '1,2'; // User selects first two files
  const selectedIndices = selector.parseSelectionString(userSelection);
  const selectedFiles = selector.selectByIndices(selectedIndices);
  
  console.log(`\nStep 4: User selected "${userSelection}" -> ${selectedFiles.length} files`);

  // Step 5: Get selection statistics
  const stats = selector.getSelectionStats(selectedFiles);
  console.log(`\nStep 5: Selection statistics:`);
  console.log(`  Selected: ${stats.selectedFiles.length}`);
  console.log(`  Total available: ${stats.totalFiles}`);
  console.log(`  Selection rate: ${Math.round(stats.selectionRate * 100)}%`);

  // Step 6: Process selected files
  console.log(`\nStep 6: Processing ${selectedFiles.length} selected files...`);
  const processResult = await selector.batchProcess(
    selectedFiles,
    async (file) => {
      // Simulate analysis
      return {
        fileName: file.name,
        candidate: file.metadata.candidateName,
        position: file.metadata.position,
        analysisComplete: true
      };
    }
  );

  console.log(`Processing complete: ${processResult.processed} successful, ${processResult.failed} failed`);
  
  return {
    totalFiles: files.length,
    filteredFiles: filtered.length,
    selectedFiles: selectedFiles.length,
    processedFiles: processResult.processed,
    results: processResult.results
  };
}

// Export for use in other parts of the application
export { FileManager, InteractiveSelector };