<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		error?: string;
		helperText?: string;
	}

	let {
		label,
		error,
		helperText,
		class: className = '',
		id,
		...restProps
	}: Props = $props();

	let inputId = $derived(id || `input-${Math.random().toString(36).substr(2, 9)}`);
	
	let inputClasses = $derived(`
		flex h-10 w-full rounded-md border px-3 py-2 text-sm 
		bg-white dark:bg-dark-surface
		border-gray-300 dark:border-dark-border
		text-gray-900 dark:text-dark-text
		placeholder:text-gray-500 dark:placeholder:text-dark-text-muted
		focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
		disabled:cursor-not-allowed disabled:opacity-50
		${error ? 'border-red-500 focus:ring-red-500' : ''}
		${className}
	`.trim().replace(/\s+/g, ' '));
</script>

<div class="space-y-2">
	{#if label}
		<label for={inputId} class="text-sm font-medium text-gray-700 dark:text-dark-text">
			{label}
		</label>
	{/if}
	
	<input
		id={inputId}
		class={inputClasses}
		{...restProps}
	/>
	
	{#if error}
		<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if helperText}
		<p class="text-sm text-gray-500 dark:text-dark-text-muted">{helperText}</p>
	{/if}
</div>