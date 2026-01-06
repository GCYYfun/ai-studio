<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.js';
	import Navigation from '$lib/components/Navigation.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let cleanup: (() => void) | undefined;

	onMount(() => {
		// 确保主题系统正确初始化
		cleanup = themeStore.init();
		
		return () => {
			cleanup?.();
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- 确保整个应用有正确的背景和文字颜色 -->
<div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
	<!-- Sidebar Navigation - 确保在桌面端始终显示 -->
	<Navigation />
	
	<!-- Main Content Area - 为侧边栏留出空间 -->
	<div class="lg:pl-64 pt-16 lg:pt-0">
		<main class="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
			<div class="max-w-7xl mx-auto">
				{@render children()}
			</div>
		</main>
	</div>
</div>
