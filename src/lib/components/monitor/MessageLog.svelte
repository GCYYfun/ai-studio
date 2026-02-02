<script lang="ts">
	import type { MessageLogEntry } from '$lib/types';

	let { messages = $bindable<MessageLogEntry[]>([]), onClear = () => {} } = $props();

	let selectedType = $state<string>('all');
	let autoScroll = $state(true);
	let expandedMessage = $state<string | null>(null);

	const filteredMessages = $derived(
		selectedType === 'all' ? messages : messages.filter((m) => m.type === selectedType)
	);

	function getTypeColor(type: string): string {
		switch (type) {
			case 'system':
				return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
			case 'message':
				return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
			case 'broadcast':
				return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
			default:
				return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
		}
	}

	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function formatJSON(data: any): string {
		try {
			return JSON.stringify(data, null, 2);
		} catch {
			return String(data);
		}
	}

	function toggleExpand(messageId: string): void {
		expandedMessage = expandedMessage === messageId ? null : messageId;
	}

	function copyToClipboard(text: string): void {
		navigator.clipboard.writeText(text);
	}
</script>

<div
	class="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
>
	<!-- Header -->
	<div class="flex-shrink-0 border-b border-gray-200 p-4 dark:border-gray-700">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
				Message Log ({filteredMessages.length})
			</h3>

			<div class="flex items-center gap-2">
				<!-- Type Filter -->
				<select
					bind:value={selectedType}
					class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				>
					<option value="all">All Types</option>
					<option value="system">System</option>
					<option value="message">Message</option>
					<option value="broadcast">Broadcast</option>
				</select>

				<!-- Auto Scroll Toggle -->
				<button
					onclick={() => (autoScroll = !autoScroll)}
					class={`rounded-lg border px-3 py-1 text-sm transition-colors ${
						autoScroll
							? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
							: 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
					}`}
					title="Auto scroll"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 14l-7 7m0 0l-7-7m7 7V3"
						></path>
					</svg>
				</button>

				<!-- Clear Button -->
				<button
					onclick={() => onClear()}
					class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
					title="Clear messages"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						></path>
					</svg>
				</button>
			</div>
		</div>
	</div>

	<!-- Message List -->
	<div class="min-h-0 flex-1 overflow-y-auto" class:auto-scroll={autoScroll}>
		{#if filteredMessages.length === 0}
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
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					></path>
				</svg>
				<p>No messages yet</p>
				<p class="mt-1 text-sm">Messages will appear here in real-time</p>
			</div>
		{:else}
			<div class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each filteredMessages as message (message.id)}
					<div class="p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
						<!-- Message Header -->
						<div class="flex items-start gap-3">
							<!-- Time -->
							<span class="w-20 flex-shrink-0 font-mono text-xs text-gray-500 dark:text-gray-400">
								{formatTime(message.timestamp)}
							</span>

							<!-- Type Badge -->
							<span
								class={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${getTypeColor(message.type)}`}
							>
								{message.type}
							</span>

							<!-- Route -->
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm text-gray-900 dark:text-white">
									<span class="font-mono">{message.sender}</span>
									<svg
										class="mx-1 inline h-4 w-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 7l5 5m0 0l-5 5m5-5H6"
										></path>
									</svg>
									<span class="font-mono">{message.recipient}</span>
								</p>
							</div>

							<!-- Expand Button -->
							<button
								onclick={() => toggleExpand(message.id)}
								class="flex-shrink-0 rounded p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
								title={expandedMessage === message.id ? 'Collapse' : 'Expand'}
							>
								<svg
									class={`h-4 w-4 text-gray-600 transition-transform dark:text-gray-400 ${expandedMessage === message.id ? 'rotate-180' : ''}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									></path>
								</svg>
							</button>
						</div>

						<!-- Expanded Data -->
						{#if expandedMessage === message.id}
							<div class="mt-2 ml-24">
								<div class="relative rounded bg-gray-50 p-3 dark:bg-gray-900">
									<button
										onclick={() => copyToClipboard(formatJSON(message.data))}
										class="absolute top-2 right-2 rounded p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
										title="Copy to clipboard"
									>
										<svg
											class="h-4 w-4 text-gray-600 dark:text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											></path>
										</svg>
									</button>
									<pre
										class="overflow-x-auto pr-8 font-mono text-xs text-gray-800 dark:text-gray-200">{formatJSON(
											message.data
										)}</pre>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.auto-scroll {
		display: flex;
		flex-direction: column-reverse;
	}
</style>
