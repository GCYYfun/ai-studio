/**
 * Monitor Service
 * 
 * Service layer for Monitor functionality
 */

import { api } from '../core/HttpClient';
import { WebSocketClient } from '../core/WebSocketClient';
import type { WebSocketConfig } from '../core/WebSocketClient';
import { env } from '$lib/utils/env';
import type {
    APIResponse,
    MonitorStats,
    MonitorClient,
    MonitorEnvironment,
    WSEnvelope
} from '$lib/types';

export class MonitorService {
    private wsClient: WebSocketClient | null = null;

    /**
     * Get current statistics
     */
    async getStats(): Promise<APIResponse<MonitorStats>> {
        return api.get<MonitorStats>('/api/monitor/stats');
    }

    /**
     * Get all connected clients
     */
    async getClients(): Promise<APIResponse<MonitorClient[]>> {
        return api.get<MonitorClient[]>('/api/monitor/clients');
    }

    /**
     * Get all environments
     */
    async getEnvironments(): Promise<APIResponse<MonitorEnvironment[]>> {
        return api.get<MonitorEnvironment[]>('/api/monitor/environments');
    }

    /**
     * Connect to WebSocket for real-time updates
     */
    connectWebSocket(
        onMessage: (envelope: WSEnvelope) => void,
        onStatusChange: (connected: boolean) => void
    ): void {
        if (this.wsClient) {
            console.warn('[MonitorService] WebSocket already connected');
            return;
        }

        // Build WebSocket URL
        const clientId = `monitor_${Date.now()}`;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = env.apiBaseUrl.replace(/^https?:\/\//, '');
        const wsUrl = `${protocol}//${host}/ws/monitor/${clientId}`;

        const config: WebSocketConfig = {
            url: wsUrl,
            reconnectAttempts: 5,
            reconnectDelay: 1000,
            onMessage: (data: any) => {
                // Type guard for WSEnvelope
                if (this.isWSEnvelope(data)) {
                    onMessage(data);
                }
            },
            onOpen: () => onStatusChange(true),
            onClose: () => onStatusChange(false),
            onError: (error) => {
                console.error('[MonitorService] WebSocket error:', error);
            }
        };

        this.wsClient = new WebSocketClient(config);
        this.wsClient.connect();
    }

    /**
     * Type guard for WSEnvelope
     */
    private isWSEnvelope(data: any): data is WSEnvelope {
        return (
            typeof data === 'object' &&
            data !== null &&
            'type' in data &&
            'sender' in data &&
            'recipient' in data &&
            'data' in data
        );
    }

    /**
     * Disconnect WebSocket
     */
    disconnectWebSocket(): void {
        if (this.wsClient) {
            this.wsClient.disconnect();
            this.wsClient = null;
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isWebSocketConnected(): boolean {
        return this.wsClient?.isConnected() ?? false;
    }

    /**
     * Send message through WebSocket
     */
    sendWebSocketMessage(data: any): void {
        this.wsClient?.send(data);
    }
}

// Export singleton instance
export const monitorService = new MonitorService();

// Export for convenience
export const monitor = {
    getStats: () => monitorService.getStats(),
    getClients: () => monitorService.getClients(),
    getEnvironments: () => monitorService.getEnvironments(),
    connectWebSocket: (onMessage: (envelope: WSEnvelope) => void, onStatusChange: (connected: boolean) => void) =>
        monitorService.connectWebSocket(onMessage, onStatusChange),
    disconnectWebSocket: () => monitorService.disconnectWebSocket(),
    isConnected: () => monitorService.isWebSocketConnected(),
    send: (data: any) => monitorService.sendWebSocketMessage(data)
};
