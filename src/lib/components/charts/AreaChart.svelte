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
		stacked?: boolean;
		class?: string;
	}
	
	let {
		title,
		data = [],
		categories = [],
		height = '400px',
		loading = false,
		error,
		stacked = false,
		class: className = ''
	}: Props = $props();
	
	// ApexCharts 配置
	let options: ApexOptions = $derived.by(() => ({
		chart: {
			height: height,
			type: 'area',
			fontFamily: 'Inter, sans-serif',
			dropShadow: {
				enabled: false
			},
			toolbar: {
				show: false
			},
			background: 'transparent',
			stacked: stacked
		},
		tooltip: {
			enabled: true,
			x: {
				show: true
			},
			theme: 'dark'
		},
		fill: {
			type: 'gradient',
			gradient: {
				opacityFrom: 0.55,
				opacityTo: 0,
				shade: '#1C64F2',
				gradientToColors: data.map(series => series.color || '#3B82F6')
			}
		},
		dataLabels: {
			enabled: false
		},
		stroke: {
			width: 2,
			curve: 'smooth'
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
		}
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
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
					</svg>
					<p class="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
				</div>
			</div>
		{/if}
	</div>
</Card>