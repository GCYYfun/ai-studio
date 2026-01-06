<script lang="ts">
	import { ui } from '$lib/ui';
	const { Card, Badge } = ui;
	import { formatNumber, formatPercentage, formatRelativeTime } from '$lib/utils/formatters';
	import type { DashboardData } from '$lib/types';
	
	interface Props {
		data: DashboardData | null;
		loading?: boolean;
		error?: string;
	}
	
	let {
		data,
		loading = false,
		error
	}: Props = $props();
	
	// 计算API调用统计
	const callStats = $derived(() => {
		if (!data) return null;
		
		const overview = data.overview;
		const metrics = data.metrics;
		
		// 计算今日增长率（模拟）
		const todayGrowth = overview.totalRequests > 10000 ? 
			((overview.totalRequests - 8500) / 8500 * 100).toFixed(1) : '0.0';
		
		// 计算成功率
		const successRate = 100 - (metrics.errorsByType.reduce((sum, error) => sum + error.percentage, 0));
		
		return {
			total: overview.totalRequests,
			todayGrowth: `${todayGrowth}%`,
			successRate: successRate.toFixed(1),
			activeUsers: overview.activeUsers,
			topErrors: metrics.errorsByType.slice(0, 3),
			recentActivity: metrics.requestsOverTime.slice(-5)
		};
	});
	
	// 获取增长趋势颜色
	function getGrowthColor(growth: string): string {
		const value = parseFloat(growth);
		if (value > 10) return 'text-green-600 dark:text-green-400';
		if (value > 0) return 'text-blue-600 dark:text-blue-400';
		if (value < -5) return 'text-red-600 dark:text-red-400';
		return 'text-gray-600 dark:text-gray-400';
	}
	
	// 获取成功率颜色
	function getSuccessRateColor(rate: string): string {
		const value = parseFloat(rate);
		if (value >= 99) return 'text-green-600 dark:text-green-400';
		if (value >= 95) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	}
</script>

<Card>
	<div class="flex items-center justify-between mb-6">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
			API调用概览
		</h3>
		{#if data?.lastUpdated}
			<span class="text-xs text-gray-500 dark:text-gray-400">
				{formatRelativeTime(data.lastUpdated)}
			</span>
		{/if}
	</div>
	
	{#if loading}
		<div class="space-y-6">
			<!-- 主要指标骨架屏 -->
			<div class="grid grid-cols-2 gap-4">
				{#each Array(4) as _}
					<div class="text-center">
						<div class="h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2"></div>
						<div class="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
					</div>
				{/each}
			</div>
			
			<!-- 错误列表骨架屏 -->
			<div class="space-y-2">
				{#each Array(3) as _}
					<div class="flex justify-between">
						<div class="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-1/2"></div>
						<div class="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-1/4"></div>
					</div>
				{/each}
			</div>
		</div>
	{:else if error}
		<div class="text-center py-8">
			<svg class="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
			</svg>
			<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if callStats()}
		<div class="space-y-6">
			<!-- 主要指标 -->
			<div class="grid grid-cols-2 gap-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-gray-900 dark:text-white">
						{formatNumber(callStats()!.total)}
					</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">总调用次数</div>
				</div>
				
				<div class="text-center">
					<div class="text-2xl font-bold {getGrowthColor(callStats()!.todayGrowth)}">
						{callStats()!.todayGrowth}
					</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">今日增长</div>
				</div>
				
				<div class="text-center">
					<div class="text-2xl font-bold {getSuccessRateColor(callStats()!.successRate)}">
						{callStats()!.successRate}%
					</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">成功率</div>
				</div>
				
				<div class="text-center">
					<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
						{formatNumber(callStats()!.activeUsers)}
					</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">活跃用户</div>
				</div>
			</div>
			
			<!-- 错误类型分布 -->
			{#if callStats()!.topErrors.length > 0}
				<div>
					<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
						主要错误类型
					</h4>
					<div class="space-y-2">
						{#each callStats()!.topErrors as error}
							<div class="flex justify-between items-center">
								<span class="text-sm text-gray-600 dark:text-gray-400">
									{error.category}
								</span>
								<div class="flex items-center space-x-2">
									<span class="text-sm font-medium text-gray-900 dark:text-white">
										{error.count}
									</span>
									<Badge color="red" class="text-xs">
										{formatPercentage(error.percentage / 100)}
									</Badge>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			
			<!-- 最近活动趋势 -->
			{#if callStats()!.recentActivity.length > 0}
				<div>
					<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
						最近活动趋势
					</h4>
					<div class="flex items-end space-x-1 h-16">
						{#each callStats()!.recentActivity as activity, index}
							<div class="flex-1 bg-blue-200 dark:bg-blue-800 rounded-t" 
								 style="height: {Math.max(10, (activity.value / Math.max(...callStats()!.recentActivity.map(a => a.value))) * 100)}%"
								 title="{activity.label || ''}: {formatNumber(activity.value)}">
							</div>
						{/each}
					</div>
					<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
						<span>5个时间点前</span>
						<span>现在</span>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="text-center py-8">
			<svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
			</svg>
			<p class="text-sm text-gray-500 dark:text-gray-400">暂无API调用数据</p>
		</div>
	{/if}
</Card>