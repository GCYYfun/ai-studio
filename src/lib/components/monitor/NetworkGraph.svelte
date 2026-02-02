<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import type { NetworkNode, NetworkLink } from '$lib/types';

	let { nodes = $bindable<NetworkNode[]>([]), links = $bindable<NetworkLink[]>([]) } = $props();

	let container: HTMLDivElement;
	let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
	let simulation: d3.Simulation<NetworkNode, NetworkLink>;

	const width = 800;
	const height = 600;

	// Node colors by type
	const nodeColors: Record<string, string> = {
		hub: '#3b82f6', // blue
		env: '#10b981', // green
		agent: '#a855f7', // purple
		human: '#f97316', // orange
		monitor: '#06b6d4' // cyan
	};

	// Node sizes by type
	const nodeSizes: Record<string, number> = {
		hub: 20,
		env: 15,
		agent: 10,
		human: 10,
		monitor: 10
	};

	onMount(() => {
		initializeGraph();
	});

	onDestroy(() => {
		if (simulation) {
			simulation.stop();
		}
	});

	function initializeGraph() {
		// Create SVG
		svg = d3
			.select(container)
			.append('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');

		// Add zoom behavior
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.5, 3])
			.on('zoom', (event) => {
				g.attr('transform', event.transform);
			});

		svg.call(zoom);

		// Create container group
		const g = svg.append('g');

		// Create arrow marker for directed edges
		svg
			.append('defs')
			.append('marker')
			.attr('id', 'arrowhead')
			.attr('viewBox', '-0 -5 10 10')
			.attr('refX', 20)
			.attr('refY', 0)
			.attr('orient', 'auto')
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.append('path')
			.attr('d', 'M 0,-5 L 10,0 L 0,5')
			.attr('fill', '#999');

		// Create force simulation
		simulation = d3
			.forceSimulation<NetworkNode>(nodes)
			.force(
				'link',
				d3
					.forceLink<NetworkNode, NetworkLink>(links)
					.id((d) => d.id)
					.distance(100)
			)
			.force('charge', d3.forceManyBody().strength(-300))
			.force('center', d3.forceCenter(width / 2, height / 2))
			.force('collision', d3.forceCollide().radius(30));

		updateGraph(g);
	}

	function updateGraph(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
		// Update links
		const link = g.selectAll<SVGLineElement, NetworkLink>('.link').data(links, (d: NetworkLink) => {
			const source = typeof d.source === 'string' ? d.source : d.source.id;
			const target = typeof d.target === 'string' ? d.target : d.target.id;
			return `${source}-${target}`;
		});

		link.exit().remove();

		const linkEnter = link
			.enter()
			.append('line')
			.attr('class', 'link')
			.attr('stroke', '#999')
			.attr('stroke-opacity', 0.6)
			.attr('stroke-width', 2)
			.attr('marker-end', 'url(#arrowhead)');

		const linkMerge = linkEnter.merge(link);

		// Update link animation
		linkMerge
			.classed('animated', (d) => d.animated || false)
			.attr('stroke', (d) => (d.animated ? '#3b82f6' : '#999'))
			.attr('stroke-width', (d) => (d.animated ? 3 : 2));

		// Update nodes
		const node = g
			.selectAll<SVGGElement, NetworkNode>('.node')
			.data(nodes, (d: NetworkNode) => d.id);

		node.exit().remove();

		const nodeEnter = node
			.enter()
			.append('g')
			.attr('class', 'node')
			.call(
				d3
					.drag<SVGGElement, NetworkNode>()
					.on('start', dragstarted)
					.on('drag', dragged)
					.on('end', dragended)
			);

		// Add circles
		nodeEnter
			.append('circle')
			.attr('r', (d) => nodeSizes[d.type] || 10)
			.attr('fill', (d) => nodeColors[d.type] || '#999');

		// Add labels
		nodeEnter
			.append('text')
			.attr('dx', 15)
			.attr('dy', 4)
			.attr('font-size', '12px')
			.attr('fill', 'currentColor')
			.text((d) => d.label);

		const nodeMerge = nodeEnter.merge(node);

		// Update simulation
		simulation.nodes(nodes);
		(simulation.force('link') as d3.ForceLink<NetworkNode, NetworkLink>).links(links);
		simulation.alpha(0.3).restart();

		// Update positions on tick
		simulation.on('tick', () => {
			linkMerge
				.attr('x1', (d) => {
					const source = d.source as NetworkNode;
					return source.x || 0;
				})
				.attr('y1', (d) => {
					const source = d.source as NetworkNode;
					return source.y || 0;
				})
				.attr('x2', (d) => {
					const target = d.target as NetworkNode;
					return target.x || 0;
				})
				.attr('y2', (d) => {
					const target = d.target as NetworkNode;
					return target.y || 0;
				});

			nodeMerge.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
		});
	}

	function dragstarted(event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>) {
		if (!event.active) simulation.alphaTarget(0.3).restart();
		event.subject.fx = event.subject.x;
		event.subject.fy = event.subject.y;
	}

	function dragged(event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>) {
		event.subject.fx = event.x;
		event.subject.fy = event.y;
	}

	function dragended(event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>) {
		if (!event.active) simulation.alphaTarget(0);
		event.subject.fx = null;
		event.subject.fy = null;
	}

	// Watch for changes in nodes/links
	$effect(() => {
		if (svg && simulation) {
			const g = svg.select('g');
			updateGraph(g as unknown as d3.Selection<SVGGElement, unknown, null, undefined>);
		}
	});
</script>

<div
	class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
>
	<!-- Header -->
	<div class="border-b border-gray-200 p-4 dark:border-gray-700">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Network Graph</h3>
		<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
			Drag nodes to reposition • Scroll to zoom
		</p>
	</div>

	<!-- Graph Container -->
	<div class="p-4">
		<div
			bind:this={container}
			class="w-full overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900"
			style="height: 600px;"
		></div>
	</div>

	<!-- Legend -->
	<div class="border-t border-gray-200 p-4 dark:border-gray-700">
		<div class="flex flex-wrap gap-4 text-sm">
			<div class="flex items-center gap-2">
				<div class="h-4 w-4 rounded-full" style="background-color: {nodeColors.hub}"></div>
				<span class="text-gray-700 dark:text-gray-300">Hub</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full" style="background-color: {nodeColors.env}"></div>
				<span class="text-gray-700 dark:text-gray-300">Environment</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-2.5 w-2.5 rounded-full" style="background-color: {nodeColors.agent}"></div>
				<span class="text-gray-700 dark:text-gray-300">Agent</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-2.5 w-2.5 rounded-full" style="background-color: {nodeColors.human}"></div>
				<span class="text-gray-700 dark:text-gray-300">Human</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-2.5 w-2.5 rounded-full" style="background-color: {nodeColors.monitor}"></div>
				<span class="text-gray-700 dark:text-gray-300">Monitor</span>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.link.animated) {
		animation: pulse 1s ease-in-out;
	}

	@keyframes pulse {
		0%,
		100% {
			stroke-opacity: 0.6;
		}
		50% {
			stroke-opacity: 1;
		}
	}

	:global(.node) {
		cursor: pointer;
	}

	:global(.node circle) {
		stroke: #fff;
		stroke-width: 2px;
	}

	:global(.node text) {
		pointer-events: none;
		user-select: none;
	}
</style>
