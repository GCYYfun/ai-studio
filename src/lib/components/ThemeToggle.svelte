<script lang="ts">
	import { themeStore } from '$lib/stores/theme.js';
	import { onMount } from 'svelte';
	import { ui } from '$lib/ui';
	const { Button, Icon } = ui;

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	function toggleTheme() {
		themeStore.toggle();
	}
</script>

{#if mounted}
	<Button
		onclick={toggleTheme}
		color="light"
		class="!p-2.5"
		size="sm"
		aria-label="Toggle theme"
	>
		{#if $themeStore.current === 'dark'}
			<Icon name="sun" size={16} />
		{:else}
			<Icon name="moon" size={16} />
		{/if}
	</Button>
{/if}