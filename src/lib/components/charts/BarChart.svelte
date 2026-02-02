<script lang="ts">
	import type { ApexOptions } from 'apexcharts';
	import { Chart } from '@flowbite-svelte-plugins/chart';
	import { Card, Heading } from 'flowbite-svelte';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	
	interface Props {
		title?: string;
		data: Array<{ name: string; data: number[]; color?: string }>;
		categories: string[];
		height?: string;
		loading?: boolean;
		error?: string;
		horizontal?: boolean;
		class?: string;
	}
	
	let {
		title,
		data = [],
		categories = [],
		height = '400px',
		loading = false,
		error,
		horizontal = false,
		class: className = ''
	}: Props = $props();
	
	// ApexCharts 配置
	let options: ApexOptions = $derived.by(() => ({
		chart: {
			height: height,
			type: 'bar',
			fontFamily: 'Inter, sans-serif',
			toolbar: {
				show: false
			},
			background: 'transparent'
		},
		plotOptions: {
			bar: {
				horizontal: horizontal,
				columnWidth: '70%',
				borderRadius: 4,
				dataLabels: {
					position: 'top'
				}
			}
		},
		tooltip: {
			enabled: true,
			theme: 'dark'
		},
		dataLabels: {
			enabled: false
		},
		grid: {
			show: true,
			strokeDashArray: 4,
			borderColor: '#374151',
			padding: {
				left: 2,
				right: 2,
				top: 0
			}
		},
		series: data.map(series => ({
			name: series.name,
			data: series.data,
			color: series.color || '#3B82F6'
		})),
		xaxis: {
			categories: categories,
			labels: {
				show: true,
				style: {
					colors: '#9CA3AF',
					fontSize: '12px'
				}
			},
			axisBorder: {
				show: false
			},
			axisTicks: {
				show: false
			}
		},
		yaxis: {
			show: true,
			labels: {
				style: {
					colors: '#9CA3AF',
					fontSize: '12px'
				}
			}
		},
		legend: {
			show: true,
			position: 'top',
			horizontalAlign: 'left',
			labels: {
				colors: '#9CA3AF'
			}
		},
		colors: data.map(series => series.color || '#3B82F6')
	}));
</script>

<Card class="w-full {className}">
	{#if title}
		<Heading tag="h3" class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
			{title}
		</Heading>
	{/if}
	
	<div class="w-full" style="height: {height};">
		{#if loading}
			<div class="flex items-center justify-center h-full">
				<LoadingSpinner size="lg" />
				<span class="ml-3 text-gray-600 dark:text-gray-400">加载图表数据...</span>
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div class="text-center">
					<svg class="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
				</div>
			</div>
		{:else if data.length > 0 && categories.length > 0}
			<Chart {options} />
		{:else}
			<div class="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div class="text-center">
					<svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
					</svg>
					<p class="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
				</div>
			</div>
		{/if}
	</div>
</Card>