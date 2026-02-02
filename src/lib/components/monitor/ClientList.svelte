<script lang="ts">
	import type { MonitorClient } from '$lib/types';

	let { clients = $bindable<MonitorClient[]>([]) } = $props();

	let selectedRole = $state<string>('all');

	const filteredClients = $derived(
		selectedRole === 'all' ? clients : clients.filter((c) => c.role === selectedRole)
	);

	function getRoleColor(role: string): string {
		switch (role) {
			case 'agent':
				return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
			case 'human':
				return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
			case 'monitor':
				return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
			case 'env':
				return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
			default:
				return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
		}
	}

	function getStateColor(state: string): string {
		return state === 'connected' ? 'bg-green-500' : 'bg-gray-400';
	}

	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString();
	}
</script>

<div
	class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
>
	<!-- Header -->
	<div class="border-b border-gray-200 p-4 dark:border-gray-700">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
				Clients ({filteredClients.length})
			</h3>

			<!-- Role Filter -->
			<select
				bind:value={selectedRole}
				class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			>
				<option value="all">All Roles</option>
				<option value="agent">Agents</option>
				<option value="human">Humans</option>
				<option value="monitor">Monitors</option>
				<option value="env">Environments</option>
			</select>
		</div>
	</div>

	<!-- Client List -->
	<div class="max-h-96 overflow-y-auto">
		{#if filteredClients.length === 0}
			<div class="p-8 text-center text-gray-500 dark:text-gray-400">
				<svg
					class="mx-auto mb-2 h-12 w-12 opacity-50"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
					></path>
				</svg>
				<p>No clients found</p>
			</div>
		{:else}
			<div class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each filteredClients as client (client.client_id)}
					<div class="p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<!-- Client ID -->
								<div class="mb-1 flex items-center gap-2">
									<span class={`h-2 w-2 rounded-full ${getStateColor(client.state)}`}></span>
									<p class="truncate font-mono text-sm text-gray-900 dark:text-white">
										{client.client_id}
									</p>
								</div>

								<!-- Role & Env -->
								<div class="flex flex-wrap items-center gap-2">
									<span
										class={`rounded px-2 py-0.5 text-xs font-medium ${getRoleColor(client.role)}`}
									>
										{client.role}
									</span>
									{#if client.env_id}
										<span
											class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
										>
											{client.env_id.substring(0, 12)}...
										</span>
									{/if}
								</div>

								<!-- Connected Time -->
								<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Connected: {formatTime(client.connected_at)}
								</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
