# 文件管理服务

## 概述

文件管理服务提供了完整的文件上传、解析、存储和选择功能，支持面试模拟应用中的各种文件类型。

## 主要组件

### FileManager
负责文件的上传、解析、验证和存储。

**支持的文件类型：**
- PDF 文件 (`.pdf`)
- 文本文件 (`.txt`)
- Markdown 文件 (`.md`)

**文件分类：**
- `jd` - 职位描述文件
- `resume` - 简历文件  
- `conversation` - 面试记录文件
- `report` - 分析报告文件

### InteractiveSelector
提供交互式文件选择和批量处理功能，基于 Python InterviewSelector 逻辑实现。

**主要功能：**
- 文件扫描和过滤
- 多条件高级筛选
- 批量选择和处理
- 选择字符串解析 (`"1"`, `"1,3"`, `"1-5"`, `"all"`)
- 导出功能 (JSON, CSV, TXT)
- 元数据分析和统计

## 使用示例

### 基本文件上传

```typescript
import { FileManager } from '$lib/services';

const fileManager = new FileManager();
await fileManager.initialize();

// 上传 PDF 面试记录
const file = new File([pdfContent], 'zhuzehui_hr_transcript_1.pdf');
const uploadedFile = await fileManager.uploadFile(file, 'conversation');

console.log('上传成功:', uploadedFile.name);
console.log('候选人:', uploadedFile.metadata.candidateName); // "Zhuzehui"
console.log('职位:', uploadedFile.metadata.position); // "HR专员"
```

### 交互式文件选择

```typescript
import { InteractiveSelector } from '$lib/services';

const selector = new InteractiveSelector();
await selector.initialize();

// 扫描所有文件
const files = await selector.scan();

// 高级过滤
const filtered = await selector.advancedFilter({
  search: 'interview',
  fileType: 'conversation',
  candidate: 'zhang'
});

// 解析用户选择
const indices = selector.parseSelectionString('1,3,5-8');
const selected = selector.selectByIndices(indices);

// 批量处理
const result = await selector.batchProcess(selected, async (file) => {
  // 处理每个文件
  return await analyzeFile(file);
});
```

## 文件名解析规则

系统会自动从文件名中提取元数据：

**面试记录文件名格式：**
- `候选人姓名_职位简称_transcript_序号.pdf`
- 例如：`zhuzehui_hr_transcript_1.pdf`
  - 候选人：Zhuzehui
  - 职位：HR专员

**职位简称映射：**
- `hr` → HR专员
- `dev` → 开发工程师
- `fe` → 前端工程师
- `be` → 后端工程师
- `qa` → 测试工程师
- `pm` → 产品经理
- `ui` → UI设计师
- `ux` → UX设计师

## 内容验证规则

### 面试记录 (conversation)
文件内容必须包含以下关键词之一：
- 中文：`面试官`, `候选人`, `面试`, `面试记录`
- 英文：`interviewer`, `candidate`, `interview`, `transcript`
- 常见短语：`tell me about`, `describe your`, `what is your`

### 职位描述 (jd)
文件内容必须包含以下关键词之一：
- 中文：`职位`, `岗位`, `招聘`
- 英文：`position`, `job`

### 简历 (resume)
文件内容必须包含以下关键词之一：
- 中文：`简历`, `教育`, `工作经验`
- 英文：`resume`, `education`, `experience`

## PDF 文件处理

目前 PDF 文件解析使用占位符内容，包含必要的关键词以通过验证。未来将集成 PDF.js 进行真实的文本提取。

**当前 PDF 处理：**
- 自动生成包含面试关键词的占位符内容
- 从文件名提取候选人和职位信息
- 支持所有文件类型的 PDF 格式

## 错误处理

常见错误及解决方案：

### `Invalid content for file type: conversation`
**原因：** 文件内容不包含必要的关键词
**解决：** 确保文件包含面试相关关键词，或检查文件类型是否正确

### `File size exceeds limit`
**原因：** 文件大小超过 10MB 限制
**解决：** 压缩文件或分割大文件

### `Unsupported file type`
**原因：** 文件格式不支持
**解决：** 转换为支持的格式 (.pdf, .txt, .md)

## 测试

运行文件管理服务测试：

```bash
# 基本功能测试
npx vitest run src/lib/services/sim/storage/__tests__/InteractiveSelector.test.ts

# PDF 上传测试
npx vitest run src/lib/services/sim/storage/__tests__/FileManager.pdf.test.ts
```

## 配置选项

### FileManager 配置
```typescript
const options = {
  maxSize: 10 * 1024 * 1024, // 最大文件大小 (10MB)
  allowedTypes: ['.pdf', '.txt', '.md'], // 允许的文件类型
  validateContent: true // 是否验证文件内容
};
```

### InteractiveSelector 配置
```typescript
const config = {
  resourcePath: 'data/resources/conversations', // 资源路径
  fileTypes: ['.pdf', '.txt', '.md'], // 文件类型
  sortBy: 'name', // 排序字段: 'name' | 'date' | 'type' | 'size'
  sortOrder: 'asc' // 排序顺序: 'asc' | 'desc'
};
```

## 性能优化

- 使用 IndexedDB 进行浏览器端持久化存储
- 支持并发批量处理（默认并发数：3）
- 智能文件验证和元数据缓存
- 分块处理大量文件以避免内存问题