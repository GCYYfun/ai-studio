/**
 * Monitor types
 * 
 * Type definitions for the Monitor page
 */

// WebSocket message envelope
export interface WSEnvelope {
    type: 'system' | 'message' | 'broadcast';
    sender: string;
    recipient: string;
    data: any;
    timestamp?: string;
}

// Client information
export interface MonitorClient {
    client_id: string;
    role: 'agent' | 'human' | 'monitor' | 'env';
    state: 'connected' | 'disconnected';
    env_id?: string;
    connected_at: string;
}

// Environment information
export interface MonitorEnvironment {
    env_id: string;
    name: string;
    created_at: string;
    client_count: number;
}

// Statistics
export interface MonitorStats {
    total_clients: number;
    clients_by_role: {
        agent: number;
        environment: number;
        human: number;
        monitor: number;
    };
    total_environments: number;
    uptime: number;
    message_count?: number;
    message_rate: number;
}

// Network graph node
export interface NetworkNode {
    id: string;
    type: 'hub' | 'env' | 'agent' | 'human' | 'monitor';
    label: string;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

// Network graph link
export interface NetworkLink {
    source: string | NetworkNode;
    target: string | NetworkNode;
    type: 'connection' | 'message';
    animated?: boolean;
}

// Message log entry
export interface MessageLogEntry {
    id: string;
    timestamp: string;
    type: string;
    sender: string;
    recipient: string;
    data: any;
}

// Monitor state
export interface MonitorState {
    connected: boolean;
    stats: MonitorStats | null;
    clients: MonitorClient[];
    environments: MonitorEnvironment[];
    messages: MessageLogEntry[];
    networkNodes: NetworkNode[];
    networkLinks: NetworkLink[];
    loading: boolean;
    error: string | null;
}
