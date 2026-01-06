<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let {
		size = 'md',
		class: className = ''
	}: Props = $props();

	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8'
	};

	let classes = $derived(`spinner ${sizeClasses[size]} ${className}`);
</script>

<div class={classes} role="status" aria-label="Loading">
	<span class="sr-only">Loading...</span>
</div>