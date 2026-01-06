<script lang="ts">
	import { ui } from '$lib/ui';
	const { Card, Badge, Icon } = ui;
	
	interface Props {
		title: string;
		value: string | number;
		change?: string;
		changeType?: 'positive' | 'negative' | 'neutral';
		icon?: string;
		description?: string;
		loading?: boolean;
		error?: string;
		trend?: 'up' | 'down' | 'stable';
		unit?: string;
	}
	
	let {
		title,
		value,
		change,
		changeType = 'neutral',
		icon = 'dashboard',
		description,
		loading = false,
		error,
		trend,
		unit
	}: Props = $props();
	
	const changeColors: Record<string, any> = {
		positive: 'green',
		negative: 'red',
		neutral: 'gray'
	};
	
	const iconColors: Record<string, string> = {
		api: 'text-blue-600 dark:text-blue-400',
		clock: 'text-green-600 dark:text-green-400',
		alert: 'text-red-600 dark:text-red-400',
		users: 'text-purple-600 dark:text-purple-400',
		dashboard: 'text-gray-600 dark:text-gray-400'
	};
	
	const iconBgColors: Record<string, string> = {
		api: 'bg-blue-100 dark:bg-blue-900/20',
		clock: 'bg-green-100 dark:bg-green-900/20',
		alert: 'bg-red-100 dark:bg-red-900/20',
		users: 'bg-purple-100 dark:bg-purple-900/20',
		dashboard: 'bg-gray-100 dark:bg-gray-900/20'
	};
	
	// 格式化显示值
	const displayValue = $derived(() => {
		if (loading) return '...';
		if (error) return 'N/A';
		
		if (typeof value === 'number') {
			// 根据数值大小选择合适的格式
			if (value >= 1000000) {
				return `${(value / 1000000).toFixed(1)}M`;
			} else if (value >= 1000) {
				return `${(value / 1000).toFixed(1)}K`;
			}
			return value.toLocaleString();
		}
		
		return value;
	});
</script>

<Card class="relative overflow-hidden {loading ? 'animate-pulse' : ''}">
	{#if error}
		<div class="flex items-center justify-center h-24">
			<div class="text-center">
				<svg class="w-8 h-8 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				<p class="text-sm text-red-600 dark:text-red-400">加载失败</p>
			</div>
		</div>
	{:else}
		<div class="flex items-center">
			<div class="flex-shrink-0">
				<div class="w-12 h-12 {iconBgColors[icon] || iconBgColors.dashboard} rounded-lg flex items-center justify-center">
					{#if loading}
						<div class="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
					{:else}
						<Icon name={icon} size={24} class={iconColors[icon] || iconColors.dashboard} />
					{/if}
				</div>
			</div>
			<div class="ml-4 flex-1 min-w-0">
				<p class="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
					{title}
				</p>
				<div class="flex items-baseline">
					<p class="text-2xl font-bold text-gray-900 dark:text-white {loading ? 'bg-gray-300 dark:bg-gray-600 rounded animate-pulse' : ''}">
						{displayValue()}
					</p>
					{#if unit && !loading && !error}
						<span class="ml-1 text-sm text-gray-500 dark:text-gray-400">{unit}</span>
					{/if}
				</div>
				
				{#if change && !loading && !error}
					<div class="flex items-center mt-1">
						{#if changeType === 'positive'}
							<svg class="w-4 h-4 mr-1 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path>
							</svg>
						{:else if changeType === 'negative'}
							<svg class="w-4 h-4 mr-1 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path>
							</svg>
						{:else if trend === 'stable'}
							<svg class="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
							</svg>
						{/if}
						<Badge color={changeColors[changeType]} class="text-xs">
							{change}
						</Badge>
					</div>
				{/if}
				
				{#if description && !loading}
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
						{description}
					</p>
				{/if}
			</div>
		</div>
		
		<!-- 趋势指示器 -->
		{#if trend && !loading && !error}
			<div class="absolute top-2 right-2">
				{#if trend === 'up'}
					<div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
				{:else if trend === 'down'}
					<div class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
				{:else}
					<div class="w-2 h-2 bg-gray-400 rounded-full"></div>
				{/if}
			</div>
		{/if}
	{/if}
</Card>