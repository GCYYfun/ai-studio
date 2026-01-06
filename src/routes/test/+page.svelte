<script lang="ts">
	import { ui } from '$lib/ui';
	import { themeStore } from '$lib/stores/theme.js';
	const { Card, Button, Badge, Heading, P, Alert } = ui;
</script>

<svelte:head>
	<title>UI测试页面 - AI Studio Web</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<Heading tag="h1" class="text-3xl font-bold mb-4">UI组件测试页面</Heading>
		<P>这个页面用于测试主题系统和UI组件是否正常工作。</P>
	</div>

	<!-- 主题信息 -->
	<Card>
		<Heading tag="h2" class="text-xl font-semibold mb-4">主题信息</Heading>
		<div class="space-y-2">
			<P>当前主题: <Badge color="blue">{$themeStore.theme}</Badge></P>
			<P>解析主题: <Badge color={$themeStore.current === 'dark' ? 'gray' : 'blue'}>{$themeStore.current}</Badge></P>
			<P>系统偏好: <Badge color="gray">{$themeStore.systemPreference}</Badge></P>
		</div>
		<div class="mt-4 flex gap-2">
			<Button color="blue" onclick={() => themeStore.setTheme('light')}>浅色主题</Button>
			<Button color="alternative" onclick={() => themeStore.setTheme('dark')}>深色主题</Button>
			<Button color="alternative" onclick={() => themeStore.setTheme('system')}>系统主题</Button>
		</div>
	</Card>

	<!-- 组件测试 -->
	<div class="grid md:grid-cols-2 gap-6">
		<Card>
			<Heading tag="h3" class="text-lg font-semibold mb-4">按钮组件</Heading>
			<div class="space-y-3">
				<div class="flex gap-2 flex-wrap">
					<Button color="blue">主要按钮</Button>
					<Button color="alternative">次要按钮</Button>
					<Button color="light">浅色按钮</Button>
					<Button color="alternative">深色按钮</Button>
				</div>
				<div class="flex gap-2 flex-wrap">
					<Button color="green">成功</Button>
					<Button color="red">危险</Button>
					<Button color="yellow">警告</Button>
					<Button color="purple">紫色</Button>
				</div>
			</div>
		</Card>

		<Card>
			<Heading tag="h3" class="text-lg font-semibold mb-4">徽章组件</Heading>
			<div class="space-y-3">
				<div class="flex gap-2 flex-wrap">
					<Badge color="blue">蓝色</Badge>
					<Badge color="green">绿色</Badge>
					<Badge color="red">红色</Badge>
					<Badge color="yellow">黄色</Badge>
				</div>
				<div class="flex gap-2 flex-wrap">
					<Badge color="indigo">靛蓝</Badge>
					<Badge color="purple">紫色</Badge>
					<Badge color="pink">粉色</Badge>
					<Badge color="gray">灰色</Badge>
				</div>
			</div>
		</Card>
	</div>

	<!-- 颜色测试 -->
	<Card>
		<Heading tag="h3" class="text-lg font-semibold mb-4">颜色系统测试</Heading>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<P class="text-sm font-medium text-gray-900 dark:text-white">背景色</P>
				<P class="text-xs text-gray-500 dark:text-gray-400">gray-50/gray-800</P>
			</div>
			<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
				<P class="text-sm font-medium text-blue-900 dark:text-blue-100">蓝色背景</P>
				<P class="text-xs text-blue-600 dark:text-blue-400">blue-50/blue-900</P>
			</div>
			<div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
				<P class="text-sm font-medium text-green-900 dark:text-green-100">绿色背景</P>
				<P class="text-xs text-green-600 dark:text-green-400">green-50/green-900</P>
			</div>
			<div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
				<P class="text-sm font-medium text-red-900 dark:text-red-100">红色背景</P>
				<P class="text-xs text-red-600 dark:text-red-400">red-50/red-900</P>
			</div>
		</div>
	</Card>

	<!-- 警告组件 -->
	<Alert color="blue">
		<span class="font-medium">信息提示!</span> 这是一个蓝色的信息警告框。
	</Alert>

	<Alert color="green">
		<span class="font-medium">成功!</span> 这是一个绿色的成功警告框。
	</Alert>

	<Alert color="yellow">
		<span class="font-medium">注意!</span> 这是一个黄色的警告框。
	</Alert>

	<Alert color="red">
		<span class="font-medium">错误!</span> 这是一个红色的错误警告框。
	</Alert>
</div>