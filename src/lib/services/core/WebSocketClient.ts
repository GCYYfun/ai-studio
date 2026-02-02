/**
 * WebSocket Client
 * 
 * Generic WebSocket client with automatic reconnection
 */

export interface WebSocketConfig {
    url: string;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    onMessage?: (data: any) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
}

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts: number;
    private reconnectDelay: number;
    private shouldReconnect = true;
    private config: WebSocketConfig;

    constructor(config: WebSocketConfig) {
        this.config = config;
        this.maxReconnectAttempts = config.reconnectAttempts ?? 5;
        this.reconnectDelay = config.reconnectDelay ?? 1000;
    }

    connect(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn('[WebSocket] Already connected');
            return;
        }

        console.log('[WebSocket] Connecting to:', this.config.url);

        try {
            this.ws = new WebSocket(this.config.url);

            this.ws.onopen = () => {
                console.log('[WebSocket] Connected');
                this.reconnectAttempts = 0;
                this.config.onOpen?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.config.onMessage?.(data);
                } catch (error) {
                    console.error('[WebSocket] Failed to parse message:', error);
                    // Still pass raw data if JSON parsing fails
                    this.config.onMessage?.(event.data);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                this.config.onError?.(error);
            };

            this.ws.onclose = (event) => {
                console.log('[WebSocket] Disconnected:', event.code, event.reason);
                this.config.onClose?.();

                if (this.shouldReconnect) {
                    this.attemptReconnect();
                }
            };
        } catch (error) {
            console.error('[WebSocket] Connection failed:', error);
            this.config.onError?.(error as Event);

            if (this.shouldReconnect) {
                this.attemptReconnect();
            }
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(
                `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
            );

            setTimeout(() => {
                if (this.shouldReconnect) {
                    this.connect();
                }
            }, delay);
        } else {
            console.error('[WebSocket] Max reconnection attempts reached');
        }
    }

    disconnect(): void {
        console.log('[WebSocket] Disconnecting...');
        this.shouldReconnect = false;

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    send(data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws.send(message);
        } else {
            console.warn('[WebSocket] Cannot send message: not connected');
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    getReadyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }
}
