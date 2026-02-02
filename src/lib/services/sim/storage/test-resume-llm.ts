/**
 * Test Resume LLM Parsing
 * 
 * Test LLM-based resume parsing functionality
 */

export async function testResumeLLMParsing() {
  console.log('📄 Testing LLM-based resume parsing...');
  
  try {
    // Import the interview API
    const { interview } = await import('../../interviewApi');
    console.log('📦 Imported interview API');
    
    // Create a test resume PDF file
    const pdfContent = new ArrayBuffer(2048);
    const resumeFile = new File([pdfContent], 'zhangsan_resume.pdf', {
      type: 'application/pdf'
    });
    
    console.log('📄 Created test resume PDF file:', {
      name: resumeFile.name,
      size: resumeFile.size,
      type: resumeFile.type
    });
    
    // Test resume upload with LLM parsing
    console.log('📤 Starting resume upload with LLM parsing...');
    const uploadResult = await interview.uploadFile(resumeFile, 'resume');
    
    console.log('📋 Resume upload result:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ Resume upload successful with LLM parsing!');
      console.log('File ID:', uploadResult.data.id);
      console.log('File name:', uploadResult.data.name);
      console.log('File type:', uploadResult.data.type);
      console.log('Content preview (first 500 chars):', uploadResult.data.content.substring(0, 500) + '...');
      
      // Check if content is in markdown format
      const isMarkdown = uploadResult.data.content.includes('#') || 
                        uploadResult.data.content.includes('##') ||
                        uploadResult.data.content.includes('**') ||
                        uploadResult.data.content.includes('- ');
      
      if (isMarkdown) {
        console.log('✅ Content appears to be in Markdown format (LLM parsing successful)');
      } else {
        console.log('⚠️ Content may not be properly formatted as Markdown');
      }
      
      // Test file retrieval
      console.log('\n📋 Testing resume file retrieval...');
      const filesResult = await interview.getFiles('resume');
      
      if (filesResult.success) {
        console.log('✅ Resume file retrieval successful!');
        const resumeFiles = filesResult.data.filter(f => f.name.includes('resume'));
        console.log('Resume files found:', resumeFiles.length);
        console.log('Resume files:', resumeFiles.map(f => ({ id: f.id, name: f.name })));
      } else {
        console.error('❌ Resume file retrieval failed:', filesResult.error);
      }
      
      return true;
    } else {
      console.error('❌ Resume upload failed:', uploadResult.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Resume LLM parsing test failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return false;
  }
}

// Test with text resume content
export async function testTextResumeWithLLM() {
  console.log('📄 Testing text resume with LLM parsing...');
  
  try {
    const { interview } = await import('../../interviewApi');
    
    // Create a text resume file
    const resumeContent = `张三
软件工程师
电话：138-0000-0000
邮箱：zhangsan@example.com

工作经验：
2020-2023 ABC公司 前端工程师
- 负责React项目开发
- 参与产品架构设计
- 团队协作开发

教育背景：
2016-2020 清华大学 计算机科学与技术 本科

技能：
- JavaScript, TypeScript
- React, Vue.js
- Node.js, Python`;

    const textResumeFile = new File([resumeContent], 'zhangsan_resume.txt', {
      type: 'text/plain'
    });
    
    console.log('📄 Created text resume file:', {
      name: textResumeFile.name,
      size: textResumeFile.size,
      type: textResumeFile.type
    });
    
    const uploadResult = await interview.uploadFile(textResumeFile, 'resume');
    console.log('📋 Text resume upload result:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ Text resume upload successful!');
      console.log('Content preview:', uploadResult.data.content.substring(0, 300) + '...');
      
      // For text files, LLM parsing is not applied (only for PDFs)
      console.log('ℹ️ Note: LLM parsing is only applied to PDF files');
      return true;
    } else {
      console.error('❌ Text resume upload failed:', uploadResult.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Text resume test failed:', error);
    return false;
  }
}

// Test LLM API directly
export async function testLLMAPI() {
  console.log('🤖 Testing LLM API directly...');
  
  try {
    const { menglongApi } = await import('$lib/services/menglongApi');
    
    const testResume = `张三 软件工程师 电话：138-0000-0000 工作经验：2020-2023 ABC公司 前端工程师`;
    
    const chatRequest = {
      model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
      messages: [
        {
          role: 'user' as const,
          content: `解析resume文件内容。并markdown格式输出。\n\n以下是简历的原始文本内容：\n\n${testResume}`
        }
      ],
      stream: false
    };
    
    console.log('📤 Sending request to LLM API...');
    const response = await menglongApi.chat(chatRequest);
    
    console.log('📋 LLM API response:', response);
    
    if (response.success) {
      console.log('✅ LLM API call successful!');
      console.log('Response content:', response.data?.output?.content?.substring(0, 300) + '...');
      return true;
    } else {
      console.error('❌ LLM API call failed:', response.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ LLM API test failed:', error);
    return false;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testResumeLLMParsing = testResumeLLMParsing;
  (window as any).testTextResumeWithLLM = testTextResumeWithLLM;
  (window as any).testLLMAPI = testLLMAPI;
  
  console.log(`
📄 Resume LLM Parsing Test Tools Loaded!

Available functions:
- testResumeLLMParsing()   - 测试PDF简历的LLM解析
- testTextResumeWithLLM()  - 测试文本简历上传
- testLLMAPI()             - 直接测试LLM API调用

Run these in browser console to test resume LLM parsing.
  `);
}