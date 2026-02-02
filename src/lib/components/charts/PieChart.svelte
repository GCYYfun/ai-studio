<script lang="ts">
	import type { ApexOptions } from 'apexcharts';
	import { Chart } from '@flowbite-svelte-plugins/chart';
	import { Card, Heading } from 'flowbite-svelte';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	
	interface Props {
		title?: string;
		data: number[];
		labels: string[];
		colors?: string[];
		height?: string;
		loading?: boolean;
		error?: string;
		donut?: boolean;
		class?: string;
	}
	
	let {
		title,
		data = [],
		labels = [],
		colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
		height = '400px',
		loading = false,
		error,
		donut = false,
		class: className = ''
	}: Props = $props();
	
	// ApexCharts 配置
	let options: ApexOptions = $derived.by(() => ({
		chart: {
			height: height,
			type: donut ? 'donut' : 'pie',
			fontFamily: 'Inter, sans-serif',
			toolbar: {
				show: false
			},
			background: 'transparent'
		},
		tooltip: {
			enabled: true,
			theme: 'dark'
		},
		dataLabels: {
			enabled: true,
			style: {
				colors: ['#fff']
			}
		},
		series: data,
		labels: labels,
		colors: colors,
		legend: {
			show: true,
			position: 'bottom',
			horizontalAlign: 'center',
			labels: {
				colors: '#9CA3AF'
			}
		},
		plotOptions: {
			pie: {
				donut: {
					size: donut ? '70%' : '0%'
				}
			}
		},
		responsive: [
			{
				breakpoint: 480,
				options: {
					chart: {
						width: 300
					},
					legend: {
						position: 'bottom'
					}
				}
			}
		]
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
		{:else if data.length > 0 && labels.length > 0}
			<Chart {options} />
		{:else}
			<div class="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div class="text-center">
					<svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
					</svg>
					<p class="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
				</div>
			</div>
		{/if}
	</div>
</Card>