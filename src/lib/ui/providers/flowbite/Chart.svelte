<script lang="ts">
	import { LineChart, BarChart, PieChart, AreaChart } from '$lib/components/charts';
	import type { ChartSeries } from '$lib/components/charts';
	
	interface Props {
		title?: string;
		data?: ChartSeries[] | number[];
		categories?: string[];
		labels?: string[];
		type?: 'line' | 'bar' | 'pie' | 'area';
		height?: string;
		loading?: boolean;
		error?: string;
		class?: string;
	}
	
	let {
		title = '',
		data = [],
		categories = [],
		labels = [],
		type = 'line',
		height = '400px',
		loading = false,
		error,
		class: className = ''
	}: Props = $props();
	
	// 根据图表类型转换数据格式
	const chartData = $derived(() => {
		if (type === 'pie') {
			return {
				data: data as number[],
				labels: labels || []
			};
		} else {
			return {
				data: data as ChartSeries[],
				categories: categories || []
			};
		}
	});
</script>

{#if type === 'line'}
	<LineChart 
		{title} 
		data={chartData().data as ChartSeries[]} 
		categories={chartData().categories || []} 
		{height} 
		{loading} 
		{error} 
		class={className} 
	/>
{:else if type === 'bar'}
	<BarChart 
		{title} 
		data={chartData().data as ChartSeries[]} 
		categories={chartData().categories || []} 
		{height} 
		{loading} 
		{error} 
		class={className} 
	/>
{:else if type === 'pie'}
	<PieChart 
		{title} 
		data={chartData().data as number[]} 
		labels={chartData().labels || []} 
		{height} 
		{loading} 
		{error} 
		class={className} 
	/>
{:else if type === 'area'}
	<AreaChart 
		{title} 
		data={chartData().data as ChartSeries[]} 
		categories={chartData().categories || []} 
		{height} 
		{loading} 
		{error} 
		class={className} 
	/>
{/if}