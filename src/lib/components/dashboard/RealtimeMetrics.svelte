<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, Badge } from 'flowbite-svelte';
	import { formatNumber, formatDuration, formatPercentage } from '$lib/utils/formatters';
	import type { APIStats } from '$lib/types';

	interface Props {
		stats: APIStats | null;
		loading?: boolean;
		error?: string;
		autoUpdate?: boolean;
		updateInterval?: number;
	}

	let { stats, loading = false, error, autoUpdate = true, updateInterval = 5000 }: Props = $props();

	let lastUpdateTime = $state<Date | null>(null);
	let updateTimer: NodeJS.Timeout | null = null;

	// 计算实时指标的趋势
	const metricsWithTrend = $derived(() => {
		if (!stats) return [];

		return [
			{
				label: '每分钟请求数',
				value: formatNumber(stats.requestsPerMinute),
				trend:
					stats.requestsPerMinute > 100 ? 'high' : stats.requestsPerMinute > 50 ? 'medium' : 'low',
				color:
					stats.requestsPerMinute > 100
						? 'text-red-600'
						: stats.requestsPerMinute > 50
							? 'text-yellow-600'
							: 'text-green-600'
			},
			{
				label: '平均响应时间',
				value: formatDuration(stats.averageResponseTime),
				trend:
					stats.averageResponseTime > 1000
						? 'high'
						: stats.averageResponseTime > 500
							? 'medium'
							: 'low',
				color:
					stats.averageResponseTime > 1000
						? 'text-red-600'
						: stats.averageResponseTime > 500
							? 'text-yellow-600'
							: 'text-green-600'
			},
			{
				label: '错误率',
				value: formatPercentage(stats.errorRate / 100),
				trend: stats.errorRate > 5 ? 'high' : stats.errorRate > 1 ? 'medium' : 'low',
				color:
					stats.errorRate > 5
						? 'text-red-600'
						: stats.errorRate > 1
							? 'text-yellow-600'
							: 'text-green-600'
			},
			{
				label: '活跃连接',
				value: formatNumber(stats.activeConnections),
				trend:
					stats.activeConnections > 1000
						? 'high'
						: stats.activeConnections > 500
							? 'medium'
							: 'low',
				color:
					stats.activeConnections > 1000
						? 'text-red-600'
						: stats.activeConnections > 500
							? 'text-yellow-600'
							: 'text-green-600'
			}
		];
	});

	// 整体系统健康状态
	const systemHealth = $derived(() => {
		if (!stats) return { status: 'unknown', color: 'gray' as const, label: '未知' };

		const highLoad = stats.requestsPerMinute > 100;
		const slowResponse = stats.averageResponseTime > 1000;
		const highErrors = stats.errorRate > 5;

		if (highErrors || (highLoad && slowResponse)) {
			return { status: 'critical', color: 'red' as const, label: '严重' };
		} else if (slowResponse || stats.errorRate > 1 || highLoad) {
			return { status: 'warning', color: 'yellow' as const, label: '警告' };
		} else {
			return { status: 'healthy', color: 'green' as const, label: '正常' };
		}
	});

	function updateLastUpdateTime() {
		lastUpdateTime = new Date();
	}

	onMount(() => {
		if (autoUpdate) {
			updateTimer = setInterval(updateLastUpdateTime, updateInterval);
		}
		updateLastUpdateTime();
	});

	onDestroy(() => {
		if (updateTimer) {
			clearInterval(updateTimer);
		}
	});
</script>

<Card class="relative">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">实时系统状态</h3>
		<div class="flex items-center space-x-2">
			<Badge color={systemHealth().color}>
				{systemHealth().label}
			</Badge>
			{#if autoUpdate}
				<div class="h-2 w-2 animate-pulse rounded-full bg-green-400" title="实时更新中"></div>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="space-y-4">
			{#each Array(4) as _}
				<div class="flex items-center justify-between">
					<div class="h-4 w-1/3 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
					<div class="h-4 w-1/4 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="py-8 text-center">
			<svg
				class="mx-auto mb-4 h-12 w-12 text-red-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if stats}
		<div class="space-y-4">
			{#each metricsWithTrend() as metric}
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600 dark:text-gray-400">
						{metric.label}
					</span>
					<div class="flex items-center space-x-2">
						<span class="font-medium {metric.color}">
							{metric.value}
						</span>
						<div
							class="h-2 w-2 rounded-full {metric.trend === 'high'
								? 'bg-red-400'
								: metric.trend === 'medium'
									? 'bg-yellow-400'
									: 'bg-green-400'}"
						></div>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
			<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
				<span>总请求数: {formatNumber(stats.totalRequests)}</span>
				{#if lastUpdateTime}
					<span>更新于: {lastUpdateTime.toLocaleTimeString('zh-CN')}</span>
				{/if}
			</div>
		</div>
	{:else}
		<div class="py-8 text-center">
			<svg
				class="mx-auto mb-4 h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				></path>
			</svg>
			<p class="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
		</div>
	{/if}
</Card>
