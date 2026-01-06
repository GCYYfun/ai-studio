# AI Studio Web

一个现代化的 AI 模型管理和测试平台，提供统计仪表板和交互式 Playground 功能。

## 🚀 功能特性

### 📊 统计仪表板
- **实时监控**: API 调用次数、成功率、Token 使用量和费用统计
- **可视化图表**: 支持折线图、柱状图、饼图等多种图表类型
- **时间范围筛选**: 支持自定义时间范围查询
- **管理员功能**: 查看所有用户统计和排行榜
- **自动刷新**: 30秒自动更新数据

### 🎮 AI Playground
- **多模型支持**: 支持 DeepSeek、GPT、Claude、Gemini 等多个 AI 模型
- **参数调节**: 实时调整 Temperature、Max Tokens、Top P 等参数
- **流式输出**: 支持流式和非流式两种对话模式
- **响应分析**: 显示响应时间、Token 使用量等详细信息

### 🎨 用户体验
- **响应式设计**: 完美适配桌面和移动设备
- **深色模式**: 支持明暗主题切换
- **现代 UI**: 基于 Tailwind CSS 和 Flowbite 组件库
- **实时反馈**: 加载状态、错误提示和成功反馈

## 🛠️ 技术栈

- **前端框架**: [SvelteKit](https://kit.svelte.dev/) 5.x
- **UI 组件**: [Flowbite Svelte](https://flowbite-svelte.com/)
- **样式框架**: [Tailwind CSS](https://tailwindcss.com/) 4.x
- **图表库**: [Flowbite Charts](https://flowbite.com/docs/plugins/charts/)
- **开发语言**: TypeScript
- **构建工具**: Vite
- **包管理器**: pnpm

## 📋 系统要求

- Node.js 18.0 或更高版本
- pnpm 8.0 或更高版本
- 现代浏览器（支持 ES2022）

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd ai-studio-web
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:5173](http://localhost:5173) 查看应用。

### 4. 构建生产版本

```bash
pnpm build
```

### 5. 预览生产版本

```bash
pnpm preview
```

## 🔧 配置说明

### API 服务配置

本项目需要连接到 MengLong API 服务，默认配置：

- **服务地址**: `http://localhost:8000`
- **认证方式**: API Key (Bearer Token 或 X-API-Key)
- **支持的端点**:
  - `/menglong/models` - 获取模型列表
  - `/menglong/chat` - 对话接口
  - `/statistics/*` - 统计接口

### 环境变量

创建 `.env` 文件（可选）：

```env
# API 基础地址
VITE_API_BASE_URL=http://localhost:8000

# 默认主题
VITE_DEFAULT_THEME=system
```

## 📁 项目结构

```
src/
├── lib/
│   ├── components/          # 可复用组件
│   │   ├── charts/         # 图表组件
│   │   ├── dashboard/      # 仪表板组件
│   │   └── ui/            # UI 基础组件
│   ├── services/           # API 服务层
│   │   ├── menglongApi.ts # MengLong API 客户端
│   │   └── statisticsApi.ts # 统计 API 客户端
│   ├── stores/            # 状态管理
│   │   ├── api.ts         # API 状态
│   │   ├── playground.ts  # Playground 状态
│   │   └── theme.ts       # 主题状态
│   ├── types/             # TypeScript 类型定义
│   └── utils/             # 工具函数
├── routes/                # 页面路由
│   ├── dashboard/         # 统计仪表板
│   └── playground/        # AI Playground
└── app.html              # HTML 模板
```

## 🎯 主要功能

### 统计仪表板 (`/dashboard`)

1. **连接配置**
   - 输入 API Key 连接到统计服务
   - 自动检测管理员权限
   - 支持断开重连

2. **数据展示**
   - 关键指标卡片：API调用数、成功率、Token使用量、总费用
   - 趋势图表：API调用趋势、Token使用分布
   - 系统状态：服务器状态、成功率、用户权限

3. **管理员功能**
   - 查看所有用户统计
   - 用户排行榜（按费用排序）
   - 总体统计概览

### AI Playground (`/playground`)

1. **模型配置**
   - 选择 AI 模型（DeepSeek、GPT、Claude 等）
   - 调整参数：Temperature、Max Tokens、Top P
   - 实时参数预览

2. **对话测试**
   - 输入测试内容
   - 选择流式或非流式输出
   - 查看响应时间和 Token 使用

3. **结果分析**
   - 响应内容展示
   - 请求详情统计
   - 错误信息提示

## 🔌 API 集成

### MengLong API

```typescript
import { menglongApi } from '$lib/services/menglongApi';

// 设置 API Key
menglongApi.setApiKey('sk-your-api-key');

// 获取模型列表
const models = await menglongApi.getModels();

// 发送对话请求
const response = await menglongApi.chat({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7
});
```

### Statistics API

```typescript
import { statsApi } from '$lib/services/statisticsApi';

// 设置 API Key
statsApi.setApiKey('sk-your-api-key');

// 获取我的统计
const stats = await statsApi.getMyStats();

// 获取总体统计（管理员）
const overview = await statsApi.getOverview();
```

## 🎨 主题定制

### 切换主题

```typescript
import { themeStore } from '$lib/stores/theme';

// 切换到深色模式
themeStore.setTheme('dark');

// 切换到浅色模式
themeStore.setTheme('light');

// 跟随系统
themeStore.setTheme('system');
```

### 自定义样式

项目使用 Tailwind CSS，可以通过修改 `tailwind.config.js` 自定义主题：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    }
  }
}
```

## 📊 图表组件

### 使用示例

```svelte
<script>
  import { LineChart, BarChart, PieChart } from '$lib/components/charts';
  
  const data = [
    { name: 'API调用', data: [100, 200, 150], color: '#3B82F6' }
  ];
  const categories = ['周一', '周二', '周三'];
</script>

<LineChart 
  title="API调用趋势" 
  {data}
  {categories}
/>
```

## 🧪 开发指南

### 添加新页面

1. 在 `src/routes/` 下创建新目录
2. 添加 `+page.svelte` 文件
3. 可选：添加 `+page.ts` 用于数据加载

### 创建新组件

1. 在 `src/lib/components/` 下创建组件文件
2. 使用 TypeScript 和 Svelte 5 语法
3. 导出组件供其他地方使用

### 状态管理

使用 Svelte 5 的 runes 进行状态管理：

```typescript
// stores/example.ts
import { writable } from 'svelte/store';

export const exampleStore = writable({
  data: null,
  loading: false,
  error: null
});
```

## 🔍 调试和测试

### 开发工具

- **Svelte DevTools**: 浏览器扩展，用于调试 Svelte 组件
- **TypeScript**: 类型检查和智能提示
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化

### 运行检查

```bash
# 类型检查
pnpm check

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

## 📦 部署

### 静态部署

```bash
# 构建静态文件
pnpm build

# 部署 build/ 目录到静态服务器
```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue
3. 联系项目维护者

## 🔗 相关链接

- [SvelteKit 文档](https://kit.svelte.dev/docs)
- [Flowbite Svelte 文档](https://flowbite-svelte.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [MengLong API 文档](docs/MENGLONG_API.md)
- [Statistics API 文档](docs/STATISTICS_API.md)

---

**AI Studio Web** - 让 AI 模型管理和测试变得简单高效 🚀