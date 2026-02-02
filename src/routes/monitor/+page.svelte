<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { monitorStore } from '$lib/stores/monitor';
	import StatsPanel from '$lib/components/monitor/StatsPanel.svelte';
	import NetworkGraph from '$lib/components/monitor/NetworkGraph.svelte';
	import ClientList from '$lib/components/monitor/ClientList.svelte';
	import MessageLog from '$lib/components/monitor/MessageLog.svelte';

	let store = $derived($monitorStore);

	onMount(async () => {
		await monitorStore.init();
	});

	onDestroy(() => {
		monitorStore.cleanup();
	});

	function handleClearMessages() {
		monitorStore.clearMessages();
	}
</script>

<svelte:head>
	<title>Monitor - Star Protocol Hub</title>
	<meta
		name="description"
		content="Real-time monitoring of Star Protocol Hub connections and messages"
	/>
</svelte:head>

<!-- Header -->
<div class="mb-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Monitor</h1>
			<p class="mt-1 text-gray-600 dark:text-gray-400">Real-time monitoring of Star Protocol Hub</p>
		</div>

		<!-- Connection Status -->
		<div
			class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
		>
			<span
				class={`h-3 w-3 rounded-full ${store.connected ? 'animate-pulse bg-green-500' : 'bg-gray-400'}`}
			></span>
			<span class="text-sm font-medium text-gray-900 dark:text-white">
				{store.connected ? 'Connected' : 'Disconnected'}
			</span>
		</div>
	</div>
</div>

<!-- Loading State -->
{#if store.loading}
	<div class="flex h-64 items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
			></div>
			<p class="mt-4 text-gray-600 dark:text-gray-400">Connecting to monitor...</p>
		</div>
	</div>
{:else if store.error}
	<!-- Error State -->
	<div
		class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20"
	>
		<div class="flex items-start gap-3">
			<svg
				class="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400"
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
			<div>
				<h3 class="text-lg font-semibold text-red-900 dark:text-red-200">Connection Error</h3>
				<p class="mt-1 text-red-700 dark:text-red-300">{store.error}</p>
			</div>
		</div>
	</div>
{:else}
	<!-- Main Content -->
	<div class="space-y-6">
		<!-- Statistics Panel -->
		<StatsPanel bind:stats={store.stats} />

		<!-- Network Graph and Client List -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Network Graph (2/3 width) -->
			<div class="lg:col-span-2">
				<NetworkGraph bind:nodes={store.networkNodes} bind:links={store.networkLinks} />
			</div>

			<!-- Client List (1/3 width) -->
			<div>
				<ClientList bind:clients={store.clients} />
			</div>
		</div>

		<!-- Message Log -->
		<div class="h-[600px]">
			<MessageLog bind:messages={store.messages} onClear={handleClearMessages} />
		</div>
	</div>
{/if}
