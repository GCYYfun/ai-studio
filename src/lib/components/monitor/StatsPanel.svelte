<script lang="ts">
	import type { MonitorStats } from '$lib/types';

	let { stats = $bindable<MonitorStats | null>(null) } = $props();

	function formatUptime(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '-';

		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	}

	function formatNumber(num: number | undefined): string {
		if (num === undefined || num === null || isNaN(num)) return '0';
		return new Intl.NumberFormat().format(num);
	}

	function safeGet(value: number | undefined, defaultValue: number = 0): number {
		return value !== undefined && value !== null && !isNaN(value) ? value : defaultValue;
	}
</script>

<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
	<!-- Total Connections -->
	<div
		class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center justify-between">
			<div class="min-w-0 flex-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">Total Connections</p>
				<p class="mt-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
					{stats ? formatNumber(stats.total_clients) : '0'}
				</p>
			</div>
			<div
				class="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30"
			>
				<svg
					class="h-6 w-6 text-blue-600 dark:text-blue-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					></path>
				</svg>
			</div>
		</div>
	</div>

	<!-- Environments -->
	<div
		class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center justify-between">
			<div class="min-w-0 flex-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">Environments</p>
				<p class="mt-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
					{stats ? formatNumber(stats.total_environments) : '0'}
				</p>
			</div>
			<div
				class="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30"
			>
				<svg
					class="h-6 w-6 text-green-600 dark:text-green-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
					></path>
				</svg>
			</div>
		</div>
	</div>

	<!-- Agents -->
	<div
		class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center justify-between">
			<div class="min-w-0 flex-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">Agents</p>
				<p class="mt-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
					{stats?.clients_by_role?.agent !== undefined
						? formatNumber(stats.clients_by_role.agent)
						: '0'}
				</p>
			</div>
			<div
				class="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30"
			>
				<svg
					class="h-6 w-6 text-purple-600 dark:text-purple-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
					></path>
				</svg>
			</div>
		</div>
	</div>

	<!-- Humans -->
	<div
		class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center justify-between">
			<div class="min-w-0 flex-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">Humans</p>
				<p class="mt-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
					{stats?.clients_by_role?.human !== undefined
						? formatNumber(stats.clients_by_role.human)
						: '0'}
				</p>
			</div>
			<div
				class="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30"
			>
				<svg
					class="h-6 w-6 text-orange-600 dark:text-orange-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					></path>
				</svg>
			</div>
		</div>
	</div>

	<!-- Uptime -->
	<div
		class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center justify-between">
			<div class="min-w-0 flex-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
				<p class="mt-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
					{stats ? formatUptime(stats.uptime) : '-'}
				</p>
			</div>
			<div
				class="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30"
			>
				<svg
					class="h-6 w-6 text-cyan-600 dark:text-cyan-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
			</div>
		</div>
	</div>

	<!-- Messages -->
	<div
		class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center justify-between">
			<div class="min-w-0 flex-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">Messages</p>
				<p class="mt-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
					{stats ? formatNumber(stats.message_count || 0) : '0'}
				</p>
				{#if stats && stats.message_rate && stats.message_rate > 0}
					<p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
						{stats.message_rate.toFixed(1)}/s
					</p>
				{/if}
			</div>
			<div
				class="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30"
			>
				<svg
					class="h-6 w-6 text-pink-600 dark:text-pink-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					></path>
				</svg>
			</div>
		</div>
	</div>
</div>
