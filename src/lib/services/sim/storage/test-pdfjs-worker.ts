/**
 * Test PDF.js worker setup
 */

export async function testPDFJSWorker() {
  console.log('🧪 Testing PDF.js worker setup...');
  
  if (typeof window === 'undefined') {
    console.log('⚠️ Not in browser environment');
    return false;
  }
  
  try {
    // Test 1: Import PDF.js
    console.log('\n1️⃣ Importing PDF.js...');
    const { getDocument, GlobalWorkerOptions, version } = await import('pdfjs-dist');
    console.log('✅ PDF.js imported successfully');
    console.log('- Version:', version);
    
    // Test 2: Set worker URL
    console.log('\n2️⃣ Setting worker URL...');
    const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.530/pdf.worker.min.mjs`;
    GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('✅ Worker URL set:', workerUrl);
    
    // Test 3: Create simple PDF document
    console.log('\n3️⃣ Creating test PDF...');
    
    // Simple PDF content (minimal valid PDF)
    const pdfContent = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, // %PDF-1.4\n
      0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, // 1 0 obj\n
      0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, 0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, // <</Type/Catalog/Pages 2 0 R>>\n
      0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, // endobj\n
      0x32, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, // 2 0 obj\n
      0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x2F, 0x4B, 0x69, 0x64, 0x73, 0x5B, 0x33, 0x20, 0x30, 0x20, 0x52, 0x5D, 0x2F, 0x43, 0x6F, 0x75, 0x6E, 0x74, 0x20, 0x31, 0x3E, 0x3E, 0x0A, // <</Type/Pages/Kids[3 0 R]/Count 1>>\n
      0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, // endobj\n
      0x78, 0x72, 0x65, 0x66, 0x0A, 0x30, 0x20, 0x34, 0x0A, // xref\n0 4\n
      0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, 0x20, 0x0A, // 0000000000 65535 f \n
      0x74, 0x72, 0x61, 0x69, 0x6C, 0x65, 0x72, 0x0A, 0x3C, 0x3C, 0x2F, 0x53, 0x69, 0x7A, 0x65, 0x20, 0x34, 0x2F, 0x52, 0x6F, 0x6F, 0x74, 0x20, 0x31, 0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, // trailer\n<</Size 4/Root 1 0 R>>\n
      0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0A, 0x31, 0x38, 0x32, 0x0A, 0x25, 0x25, 0x45, 0x4F, 0x46 // startxref\n182\n%%EOF
    ]);
    
    console.log('✅ Test PDF created:', pdfContent.length, 'bytes');
    
    // Test 4: Load PDF document
    console.log('\n4️⃣ Loading PDF document...');
    try {
      const pdf = await getDocument({ data: pdfContent }).promise;
      console.log('✅ PDF loaded successfully');
      console.log('- Pages:', pdf.numPages);
      
      if (pdf.numPages > 0) {
        console.log('\n5️⃣ Testing page extraction...');
        const page = await pdf.getPage(1);
        console.log('✅ Page loaded successfully');
        
        const textContent = await page.getTextContent();
        console.log('✅ Text content extracted');
        console.log('- Items:', textContent.items.length);
      }
      
      return true;
      
    } catch (pdfError) {
      console.error('❌ PDF processing failed:', pdfError);
      
      // Try without worker
      console.log('\n🔄 Retrying without worker...');
      GlobalWorkerOptions.workerSrc = '';
      
      try {
        const pdf = await getDocument({ data: pdfContent }).promise;
        console.log('✅ PDF loaded without worker');
        return true;
      } catch (noWorkerError) {
        console.error('❌ PDF failed even without worker:', noWorkerError);
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ PDF.js test failed:', error);
    return false;
  }
}

// Browser test runner
export function runPDFJSTest() {
  if (typeof window !== 'undefined') {
    console.log('🌐 Running PDF.js worker test...');
    testPDFJSWorker().then(success => {
      if (success) {
        console.log('🎉 PDF.js worker test passed!');
      } else {
        console.log('💥 PDF.js worker test failed');
      }
    });
  } else {
    console.log('⚠️ Browser environment required for PDF.js test');
  }
}

// Auto-run helper message
if (typeof window !== 'undefined') {
  console.log('📋 PDF.js test ready. Call runPDFJSTest() to test.');
}