/**
 * Playground types
 */

export interface ModelTest {
    id: string;
    input: string;
    parameters: ModelParameters;
    output?: string;
    timestamp: Date;
    duration?: number;
    status: 'pending' | 'success' | 'error';
    error?: string;
}

export interface ModelParameters {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    [key: string]: any;
}

export interface PlaygroundSession {
    id: string;
    name: string;
    model: string;
    tests: ModelTest[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ModelConfig {
    name: string;
    endpoint: string;
    parameters: {
        [key: string]: {
            type: 'number' | 'string' | 'boolean';
            default: any;
            min?: number;
            max?: number;
            options?: string[];
        };
    };
}

// MengLong API types
export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    model: string;
    messages: Message[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

export interface ChatOutput {
    role: string;
    content: string;
}

export interface Usage {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
}

export interface ChatResponse {
    id: string;
    model: string;
    created: number;
    output: ChatOutput;
    usage: Usage;
    finish_reason: string;
}

export interface StreamDelta {
    role?: string;
    content: string;
}

export interface StreamResponse {
    id: string;
    model: string;
    created: number;
    delta: StreamDelta;
    finish_reason: string | null;
    usage?: Usage;
}

export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    description: string | null;
    max_tokens: number | null;
    supports: {
        streaming: boolean;
        image: boolean;
        audio: boolean;
        file: boolean;
    };
    price: {
        input: number;
        cache_input: number;
        output: number;
    } | null;
}
