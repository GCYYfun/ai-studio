/**
 * Monitor Store
 * 
 * State management for Monitor page
 */

import { writable, derived, get } from 'svelte/store';
import { monitorService } from '$lib/services/monitor/MonitorService';
import type {
    MonitorState,
    MonitorStats,
    MonitorClient,
    MonitorEnvironment,
    WSEnvelope,
    MessageLogEntry,
    NetworkNode,
    NetworkLink
} from '$lib/types';

function createMonitorStore() {
    const { subscribe, set, update } = writable<MonitorState>({
        connected: false,
        stats: null,
        clients: [],
        environments: [],
        messages: [],
        networkNodes: [],
        networkLinks: [],
        loading: false,
        error: null
    });

    let statsInterval: NodeJS.Timeout | null = null;
    let clientsInterval: NodeJS.Timeout | null = null;

    return {
        subscribe,

        /**
         * Initialize monitor - connect WebSocket and start polling
         */
        async init(): Promise<void> {
            console.log('[MonitorStore] Initializing...');
            update(s => ({ ...s, loading: true, error: null }));

            try {
                // Connect WebSocket
                console.log('[MonitorStore] Connecting WebSocket...');
                monitorService.connectWebSocket(
                    (envelope) => this.handleMessage(envelope),
                    (connected) => {
                        console.log('[MonitorStore] WebSocket status:', connected);
                        update(s => ({ ...s, connected }));
                    }
                );

                // Load initial data
                console.log('[MonitorStore] Loading initial data...');
                await Promise.all([
                    this.loadStats(),
                    this.loadClients(),
                    this.loadEnvironments()
                ]);

                // Start polling for stats and clients
                console.log('[MonitorStore] Starting polling...');
                this.startPolling();

                update(s => ({ ...s, loading: false }));
                console.log('[MonitorStore] Initialization complete');
            } catch (error) {
                console.error('[MonitorStore] Initialization error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to initialize monitor';
                update(s => ({ ...s, loading: false, error: errorMessage }));
            }
        },

        /**
         * Cleanup - disconnect and stop polling
         */
        cleanup(): void {
            monitorService.disconnectWebSocket();
            this.stopPolling();
            set({
                connected: false,
                stats: null,
                clients: [],
                environments: [],
                messages: [],
                networkNodes: [],
                networkLinks: [],
                loading: false,
                error: null
            });
        },

        /**
         * Load statistics
         */
        async loadStats(): Promise<void> {
            console.log('[MonitorStore] Loading stats...');
            const response = await monitorService.getStats();
            console.log('[MonitorStore] Stats response:', response);
            if (response.success && response.data) {
                update(s => ({ ...s, stats: response.data }));
            } else {
                console.warn('[MonitorStore] Stats load failed:', response);
            }
        },

        /**
         * Load clients
         */
        async loadClients(): Promise<void> {
            console.log('[MonitorStore] Loading clients...');
            const response = await monitorService.getClients();
            console.log('[MonitorStore] Clients response:', response);
            if (response.success && response.data) {
                // Handle both array and object with clients property
                const clientsData = Array.isArray(response.data)
                    ? response.data
                    : (response.data as any).clients || [];

                console.log('[MonitorStore] Clients data:', clientsData);
                update(s => ({ ...s, clients: clientsData }));
                this.updateNetworkGraph(clientsData);
            } else {
                console.warn('[MonitorStore] Clients load failed:', response);
            }
        },

        /**
         * Load environments
         */
        async loadEnvironments(): Promise<void> {
            console.log('[MonitorStore] Loading environments...');
            const response = await monitorService.getEnvironments();
            console.log('[MonitorStore] Environments response:', response);
            if (response.success && response.data) {
                // Handle both array and object with environments property
                const envsData = Array.isArray(response.data)
                    ? response.data
                    : (response.data as any).environments || [];

                console.log('[MonitorStore] Environments data:', envsData);
                update(s => ({ ...s, environments: envsData }));
            } else {
                console.warn('[MonitorStore] Environments load failed:', response);
            }
        },

        /**
         * Handle incoming WebSocket message
         */
        handleMessage(envelope: WSEnvelope): void {
            const state = get({ subscribe });

            // Add to message log
            const logEntry: MessageLogEntry = {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: envelope.timestamp || new Date().toISOString(),
                type: envelope.type,
                sender: envelope.sender,
                recipient: envelope.recipient,
                data: envelope.data
            };

            update(s => ({
                ...s,
                messages: [logEntry, ...s.messages].slice(0, 1000) // Keep last 1000 messages
            }));

            // Animate message flow in network graph
            this.animateMessage(envelope.sender, envelope.recipient);

            // Handle specific message types
            if (envelope.type === 'system' && envelope.data?.type === 'client_connected') {
                // Reload clients when new client connects
                this.loadClients();
            } else if (envelope.type === 'system' && envelope.data?.type === 'client_disconnected') {
                // Reload clients when client disconnects
                this.loadClients();
            }
        },

        /**
         * Update network graph based on clients
         */
        updateNetworkGraph(clients: MonitorClient[]): void {
            const nodes: NetworkNode[] = [
                { id: 'hub', type: 'hub', label: 'Hub' }
            ];

            const links: NetworkLink[] = [];

            // Add environment nodes
            const envs = new Set(clients.filter(c => c.env_id).map(c => c.env_id!));
            envs.forEach(envId => {
                nodes.push({
                    id: envId,
                    type: 'env',
                    label: envId.substring(0, 12) + '...'
                });
                links.push({
                    source: 'hub',
                    target: envId,
                    type: 'connection'
                });
            });

            // Add client nodes
            clients.forEach(client => {
                const shortId = client.client_id.substring(0, 12) + '...';
                nodes.push({
                    id: client.client_id,
                    type: client.role as any,
                    label: shortId
                });

                const parent = client.env_id || 'hub';
                links.push({
                    source: parent,
                    target: client.client_id,
                    type: 'connection'
                });
            });

            update(s => ({
                ...s,
                networkNodes: nodes,
                networkLinks: links
            }));
        },

        /**
         * Animate message flow between nodes
         */
        animateMessage(from: string, to: string): void {
            update(s => ({
                ...s,
                networkLinks: s.networkLinks.map(link => {
                    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

                    if ((sourceId === from && targetId === to) ||
                        (sourceId === to && targetId === from)) {
                        return { ...link, animated: true };
                    }
                    return link;
                })
            }));

            // Remove animation after 1 second
            setTimeout(() => {
                update(s => ({
                    ...s,
                    networkLinks: s.networkLinks.map(link => ({
                        ...link,
                        animated: false
                    }))
                }));
            }, 1000);
        },

        /**
         * Start polling for updates
         */
        startPolling(): void {
            // Poll stats every 5 seconds
            statsInterval = setInterval(() => {
                this.loadStats();
            }, 5000);

            // Poll clients every 10 seconds
            clientsInterval = setInterval(() => {
                this.loadClients();
            }, 10000);
        },

        /**
         * Stop polling
         */
        stopPolling(): void {
            if (statsInterval) {
                clearInterval(statsInterval);
                statsInterval = null;
            }
            if (clientsInterval) {
                clearInterval(clientsInterval);
                clientsInterval = null;
            }
        },

        /**
         * Clear messages
         */
        clearMessages(): void {
            update(s => ({ ...s, messages: [] }));
        }
    };
}

export const monitorStore = createMonitorStore();

// Derived stores
export const connectedClients = derived(
    monitorStore,
    $monitor => $monitor.clients.filter(c => c.state === 'connected')
);

export const clientsByRole = derived(
    monitorStore,
    $monitor => {
        const byRole: Record<string, MonitorClient[]> = {
            agent: [],
            human: [],
            monitor: [],
            env: []
        };

        $monitor.clients.forEach(client => {
            if (byRole[client.role]) {
                byRole[client.role].push(client);
            }
        });

        return byRole;
    }
);
