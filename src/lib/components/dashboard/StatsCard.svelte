<script lang="ts">
	import { Card, Badge } from 'flowbite-svelte';

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
		<div class="flex h-24 items-center justify-center">
			<div class="text-center">
				<svg
					class="mx-auto mb-2 h-8 w-8 text-red-400"
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
				<p class="text-sm text-red-600 dark:text-red-400">加载失败</p>
			</div>
		</div>
	{:else}
		<div class="flex items-center">
			<div class="flex-shrink-0">
				<div
					class="h-12 w-12 {iconBgColors[icon] ||
						iconBgColors.dashboard} flex items-center justify-center rounded-lg"
				>
					{#if loading}
						<div class="h-6 w-6 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
					{:else}
						<svg
							class="h-6 w-6 {iconColors[icon] || iconColors.dashboard}"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							{#if icon === 'api'}
								<path
									fill-rule="evenodd"
									d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							{:else if icon === 'clock'}
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
									clip-rule="evenodd"
								/>
							{:else if icon === 'alert'}
								<path
									fill-rule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clip-rule="evenodd"
								/>
							{:else if icon === 'users'}
								<path
									d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
								/>
							{:else}
								<path
									d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"
								/>
							{/if}
						</svg>
					{/if}
				</div>
			</div>
			<div class="ml-4 min-w-0 flex-1">
				<p class="truncate text-sm font-medium text-gray-600 dark:text-gray-400">
					{title}
				</p>
				<div class="flex items-baseline">
					<p
						class="text-2xl font-bold text-gray-900 dark:text-white {loading
							? 'animate-pulse rounded bg-gray-300 dark:bg-gray-600'
							: ''}"
					>
						{displayValue()}
					</p>
					{#if unit && !loading && !error}
						<span class="ml-1 text-sm text-gray-500 dark:text-gray-400">{unit}</span>
					{/if}
				</div>

				{#if change && !loading && !error}
					<div class="mt-1 flex items-center">
						{#if changeType === 'positive'}
							<svg
								class="mr-1 h-4 w-4 text-green-600 dark:text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 11l5-5m0 0l5 5m-5-5v12"
								></path>
							</svg>
						{:else if changeType === 'negative'}
							<svg
								class="mr-1 h-4 w-4 text-red-600 dark:text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 13l-5 5m0 0l-5-5m5 5V6"
								></path>
							</svg>
						{:else if trend === 'stable'}
							<svg
								class="mr-1 h-4 w-4 text-gray-600 dark:text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"
								></path>
							</svg>
						{/if}
						<Badge color={changeColors[changeType]} class="text-xs">
							{change}
						</Badge>
					</div>
				{/if}

				{#if description && !loading}
					<p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
						{description}
					</p>
				{/if}
			</div>
		</div>

		<!-- 趋势指示器 -->
		{#if trend && !loading && !error}
			<div class="absolute top-2 right-2">
				{#if trend === 'up'}
					<div class="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
				{:else if trend === 'down'}
					<div class="h-2 w-2 animate-pulse rounded-full bg-red-400"></div>
				{:else}
					<div class="h-2 w-2 rounded-full bg-gray-400"></div>
				{/if}
			</div>
		{/if}
	{/if}
</Card>
