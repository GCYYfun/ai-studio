// UI Provider - 统一的UI组件入口
import type { UIComponents } from './types';

// 当前使用Flowbite作为UI提供者
import * as FlowbiteProvider from './providers/flowbite';

// 导出当前UI提供者
export const ui = FlowbiteProvider;

// 未来切换UI库只需要修改这里：
// import * as DaisyUIProvider from './providers/daisyui';
// export const ui = DaisyUIProvider;

// 导出类型
export type { UIComponents, ThemeConfig } from './types';