// UI组件接口定义
export interface UIComponents {
	// 基础组件
	Card: any;
	Button: any;
	Badge: any;
	Input: any;
	
	// 布局组件
	Sidebar: any;
	Navbar: any;
	
	// 数据展示组件
	Table: any;
	Avatar: any;
	
	// 反馈组件
	Alert: any;
	Modal: any;
	Toast: any;
	
	// 导航组件
	Breadcrumb: any;
	Pagination: any;
	
	// 表单组件
	Select: any;
	Checkbox: any;
	Radio: any;
	Toggle: any;
	
	// 数据可视化
	Chart: any;
	Progress: any;
	
	// 图标
	Icon: any;
}

// 主题相关类型
export interface ThemeConfig {
	primary: string;
	secondary: string;
	dark: boolean;
}