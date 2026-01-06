// 图表组件导出
export { default as LineChart } from './LineChart.svelte';
export { default as BarChart } from './BarChart.svelte';
export { default as PieChart } from './PieChart.svelte';
export { default as AreaChart } from './AreaChart.svelte';

// 图表数据类型
export interface ChartSeries {
	name: string;
	data: number[];
	color?: string;
}

export interface ChartData {
	series: ChartSeries[];
	categories: string[];
}

export interface PieChartData {
	data: number[];
	labels: string[];
	colors?: string[];
}