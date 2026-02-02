import { writable } from 'svelte/store';
import { dashboardService } from '$lib/services/dashboard/DashboardService';

/**
 * API连接状态
 */
export interface APIConnectionState {
    connected: boolean;
    lastCheck: Date | null;
    error: string | null;
}

/**
 * API连接状态 Store
 */
function createAPIConnectionStore() {
    const { subscribe, set, update } = writable<APIConnectionState>({
        connected: false,
        lastCheck: null,
        error: null
    });

    return {
        subscribe,

        async checkConnection(): Promise<boolean> {
            try {
                // Try to get dashboard stats as a health check
                const response = await dashboardService.getStats(undefined, false);
                const isConnected = response.success;

                set({
                    connected: isConnected,
                    lastCheck: new Date(),
                    error: isConnected ? null : response.error || 'Connection failed'
                });

                return isConnected;
            } catch (error) {
                set({
                    connected: false,
                    lastCheck: new Date(),
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                return false;
            }
        },

        setConnected(connected: boolean, error?: string) {
            update(state => ({
                ...state,
                connected,
                error: error || null,
                lastCheck: new Date()
            }));
        },

        reset() {
            set({
                connected: false,
                lastCheck: null,
                error: null
            });
        }
    };
}

export const apiConnection = createAPIConnectionStore();
